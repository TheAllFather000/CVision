import React, { useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, Text, AccessibilityInfo } from "react-native";
import { Camera, useCameraDevice, Frame } from "react-native-vision-camera";
import * as Haptics from "../utils/haptics";
import { API_KEYS } from "../constants/config";

interface HazardAlert {
  type: "stairs" | "pit" | "vehicle" | "barrier" | "obstacle";
  label: string;
  direction: "ahead" | "left" | "right";
  distance: number;
  urgency: "critical" | "warning";
}

interface CameraViewProps {
  onHazard?: (hazard: HazardAlert | null) => void;
  isActive?: boolean;
  proximityThreshold?: number;
}

const HAZARD_KEYWORDS = [
  "stairs", "staircase", "steps", "step",
  "pothole", "hole", "gap", "pit",
  "car", "truck", "bus", "bicycle", "motorcycle",
  "barrier", "block", "construction", "cone",
  "pole", "tree", "fence", "wall",
  "pedestrian", "person", "people",
];

const PROXIMITY_THRESHOLD_DEFAULT = 3;

export const CameraView: React.FC<CameraViewProps> = ({
  onHazard,
  isActive = true,
  proximityThreshold = PROXIMITY_THRESHOLD_DEFAULT,
}) => {
  const device = useCameraDevice("back");
  const lastProcessTime = useRef(0);
  const isProcessing = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastAnnouncedHazard = useRef<string>("");

  const processFrame = useCallback(async (frame: Frame) => {
    if (isProcessing.current || !onHazard) return;
    
    const now = Date.now();
    if (now - lastProcessTime.current < 800) return;
    
    isProcessing.current = true;
    lastProcessTime.current = now;

    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const base64Image = await frame.toBase64({ quality: 0.4 });
      const { width, height } = frame;

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${API_KEYS.GOOGLE_VISION}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [
                { type: "OBJECT_LOCALIZATION", maxResults: 15 },
              ],
            }],
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const hazards = findHazards(data, width, height, proximityThreshold);
      
      if (hazards.length > 0) {
        const nearest = hazards[0];
        
        const hazardKey = `${nearest.type}-${nearest.direction}-${Math.round(nearest.distance)}`;
        if (hazardKey !== lastAnnouncedHazard.current) {
          lastAnnouncedHazard.current = hazardKey;
          Haptics.triggerPattern(nearest.urgency === "critical" ? "warning" : "light");
          
          const announcement = `${nearest.label} ${nearest.direction}, ${Math.round(nearest.distance)} meters`;
          AccessibilityInfo.announceForAccessibilityWithOptions?.(announcement, { queue: false });
        }
        
        onHazard(nearest);
      } else {
        lastAnnouncedHazard.current = "";
        onHazard(null);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Frame processing error:", error);
      }
    } finally {
      isProcessing.current = false;
    }
  }, [onHazard, proximityThreshold]);

  useEffect(() => {
    lastProcessTime.current = 0;
    lastAnnouncedHazard.current = "";
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [isActive]);

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.noCamera}>
          <Text style={styles.noCameraText}>Camera not available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo={true}
        audio={false}
        frameProcessor={processFrame}
      />
    </View>
  );
};

function findHazards(data: any, frameWidth: number, frameHeight: number, threshold: number): HazardAlert[] {
  if (!data.responses?.[0]?.localizedObjects) return [];

  const objects = data.responses[0].localizedObjects;
  const hazards: HazardAlert[] = [];

  for (const obj of objects) {
    const name = obj.name?.toLowerCase() || "";
    const confidence = obj.score || 0;
    
    if (confidence < 0.65) continue;
    
    const isHazard = HAZARD_KEYWORDS.some(kw => name.includes(kw));
    if (!isHazard) continue;

    const distance = estimateDistance(obj, frameHeight);
    if (distance > threshold) continue;

    const direction = estimateDirection(obj, frameWidth);
    const urgency = determineUrgency(name, distance);

    hazards.push({
      type: classifyHazard(name),
      label: obj.name,
      direction,
      distance,
      urgency,
    });
  }

  return hazards.sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency === "critical" ? -1 : 1;
    return a.distance - b.distance;
  });
}

function classifyHazard(name: string): HazardAlert["type"] {
  const lower = name.toLowerCase();
  
  if (["stairs", "staircase", "steps", "step"].some(s => lower.includes(s))) return "stairs";
  if (["pothole", "hole", "gap", "pit"].some(s => lower.includes(s))) return "pit";
  if (["car", "truck", "bus", "bicycle", "motorcycle"].some(s => lower.includes(s))) return "vehicle";
  if (["barrier", "block", "construction", "cone"].some(s => lower.includes(s))) return "barrier";
  
  return "obstacle";
}

function estimateDirection(raw: any, frameWidth: number): HazardAlert["direction"] {
  const bbox = raw.boundingPoly?.normalizedVertices || raw.boundingBox || {};
  const vertices = raw.boundingPoly?.normalizedVertices;
  
  let centerX: number;
  if (vertices && vertices.length >= 4) {
    centerX = (vertices[0].x + vertices[2].x) / 2;
  } else {
    centerX = ((bbox.minX || 0) + (bbox.maxX || 0)) / 2;
  }

  if (centerX < 0.33) return "left";
  if (centerX > 0.66) return "right";
  return "ahead";
}

function estimateDistance(raw: any, frameHeight: number): number {
  const bbox = raw.boundingPoly?.normalizedVertices || raw.boundingBox || {};
  const vertices = raw.boundingPoly?.normalizedVertices;
  
  let height: number;
  if (vertices && vertices.length >= 4) {
    height = vertices[2].y - vertices[0].y;
  } else {
    height = ((bbox.maxY || 0) - (bbox.minY || 0));
  }

  const normalizedHeight = height || 0.1;
  const minDistance = 0.5;
  const maxDistance = 10;
  const distance = maxDistance / normalizedHeight;
  
  return Math.max(minDistance, Math.min(maxDistance, distance));
}

function determineUrgency(label: string, distance: number): HazardAlert["urgency"] {
  const lower = label.toLowerCase();
  const criticalKeywords = ["stairs", "pothole", "hole", "gap", "pit", "car", "truck", "bus"];
  
  if (criticalKeywords.some(k => lower.includes(k)) || distance < 1.5) {
    return "critical";
  }
  return "warning";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noCamera: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  noCameraText: {
    color: "#e94560",
    fontSize: 16,
  },
});
