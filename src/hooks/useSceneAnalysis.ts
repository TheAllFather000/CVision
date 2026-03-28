import { useState, useCallback, useRef } from "react";
import { Camera, Frame } from "react-native-vision-camera";
import { analyzeScene, describeEnvironment, SceneDescription } from "../services/visionAI";
import { speak, stop as stopSpeaking } from "../services/tts";

interface UseSceneAnalysisReturn {
  isAnalyzing: boolean;
  lastAnalysis: SceneDescription | null;
  error: string | null;
  describeSurroundings: () => Promise<void>;
  quickDescription: () => Promise<void>;
}

export const useSceneAnalysis = (): UseSceneAnalysisReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<SceneDescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<Frame | null>(null);

  const captureAndAnalyze = useCallback(async (type: "full" | "quick") => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    stopSpeaking();

    try {
      const devices = await Camera.getAvailableCameraDevices();
      const device = devices.find(d => d.position === "back");
      
      if (!device) {
        setError("No camera available");
        setIsAnalyzing(false);
        return;
      }

      const photo = await Camera.takePhoto({
        qualityPrioritization: "quality",
        flash: "off",
      });

      const base64 = photo.base64;
      if (!base64) {
        setError("Failed to capture image");
        setIsAnalyzing(false);
        return;
      }

      if (type === "quick") {
        const result = await describeEnvironment(base64);
        if (typeof result === "object" && "message" in result) {
          setError(result.message);
          speak("Sorry, I couldn't analyze the scene.");
        } else {
          speak(result);
        }
      } else {
        const result = await analyzeScene(base64);
        if ("message" in result) {
          setError(result.message);
          speak("Sorry, I couldn't analyze the scene.");
        } else {
          setLastAnalysis(result);
          speakAnalysis(result);
        }
      }
    } catch (err: any) {
      setError(err.message);
      speak("Sorry, something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const speakAnalysis = (analysis: SceneDescription) => {
    const parts: string[] = [];

    if (analysis.description) {
      parts.push(analysis.description);
    }

    if (analysis.dangers.length > 0) {
      parts.push(`Watch out for: ${analysis.dangers.slice(0, 3).join(", ")}`);
    }

    if (analysis.objects.length > 0) {
      parts.push(`I can see: ${analysis.objects.slice(0, 3).join(", ")}`);
    }

    if (analysis.navigation.length > 0) {
      parts.push(analysis.navigation[0]);
    }

    speak(parts.join(". "));
  };

  const describeSurroundings = useCallback(() => {
    captureAndAnalyze("full");
  }, [captureAndAnalyze]);

  const quickDescription = useCallback(() => {
    captureAndAnalyze("quick");
  }, [captureAndAnalyze]);

  return {
    isAnalyzing,
    lastAnalysis,
    error,
    describeSurroundings,
    quickDescription,
  };
};
