import React, { useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, AccessibilityInfo } from "react-native";
import { Camera, useCameraDevice, useCameraFormat, Frame } from "react-native-vision-camera";
import * as Haptics from "../utils/haptics";

interface DetectedObject {
  type: "obstacle" | "feature" | "door" | "stairs" | "ramp" | "person" | "vehicle";
  label: string;
  direction: "ahead" | "left" | "right" | "behind";
  distance: number;
  confidence: number;
  priority: "critical" | "warning" | "info";
}

interface CameraViewProps {
  onDetection?: (objects: DetectedObject[]) => void;
  isActive?: boolean;
  continuous?: boolean;
}

const OBJECT_DETECTION_PROMPT = `Analyze this image for environmental features relevant to visually impaired navigation. For each object detected, provide:
- type: obstacle|feature|door|stairs|ramp|person|vehicle
- label: specific name (e.g., "stairs", "automatic door", "parked car")
- direction: ahead|left|right|behind (relative to camera view)
- distance: estimated distance in meters
- confidence: 0-1 confidence score
- priority: critical (danger)|warning (caution)|info (helpful)

Respond with JSON array of detected objects. Only include items with confidence > 0.7.`;

export const CameraView: React.FC<CameraViewProps> = ({
  onDetection,
  isActive = true,
  continuous = true,
}) => {
  const device = useCameraDevice("back");
  const lastProcessTime = useRef(0);
  const isProcessing = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processFrame = useCallback(async (frame: Frame) => {
    if (isProcessing.current || !onDetection) return;
    
    const now = Date.now();
    if (now - lastProcessTime.current < 1000) return;
    
    isProcessing.current = true;
    lastProcessTime.current = now;

    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const base64Image = await frame.toBase64({ quality: 0.5 });

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [
                { type: "OBJECT_LOCALIZATION", maxResults: 20 },
                { type: "LABEL_DETECTION", maxResults: 15 },
              ],
            }],
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      const data = await response.json();
      const detectedObjects = parseVisionResponse(data);
      
      if (detectedObjects.length > 0) {
        const prioritizedObjects = sortByPriority(detectedObjects);
        
        const critical = prioritizedObjects.filter(o => o.priority === "critical");
        if (critical.length > 0) {
          Haptics.triggerPattern("warning");
          AccessibilityInfo.announceForAccessibilityWithOptions?.(
            `${critical.length} potential hazard${critical.length > 1 ? 's' : ''} detected`,
            { queue: false }
          );
        }
        
        onDetection(prioritizedObjects);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Frame processing error:", error);
      }
    } finally {
      isProcessing.current = false;
    }
  }, [onDetection]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!device) return null;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        video={continuous}
        audio={false}
        frameProcessor={continuous ? processFrame : undefined}
      />
    </View>
  );
};

function parseVisionResponse(data: any): DetectedObject[] {
  if (!data.responses?.[0]) return [];

  const objects = data.responses[0].localizedObjects || [];
  const labels = data.responses[0].labelAnnotations || [];

  const allItems = [
    ...objects.map((obj: any) => ({
      raw: obj,
      type: classifyObject(obj.name || obj.label),
      label: obj.name || obj.label,
      confidence: obj.score || obj.confidence || 0.5,
    })),
    ...labels.map((label: any) => ({
      raw: label,
      type: classifyObject(label.description),
      label: label.description,
      confidence: label.score || 0.5,
    })),
  ];

  return allItems
    .filter((item) => item.confidence > 0.7)
    .map((item) => ({
      type: item.type,
      label: item.label,
      direction: estimateDirection(item.raw),
      distance: estimateDistance(item.raw),
      confidence: item.confidence,
      priority: determinePriority(item.type, item.label),
    }));
}

function classifyObject(name: string): DetectedObject["type"] {
  const lower = name.toLowerCase();
  
  if (["stairs", "staircase", "steps", "step"].some(s => lower.includes(s))) return "stairs";
  if (["ramp", "incline"].some(s => lower.includes(s))) return "ramp";
  if (["door", "entrance", "exit"].some(s => lower.includes(s))) return "door";
  if (["car", "truck", "bus", "vehicle", "bicycle", "motorcycle"].some(s => lower.includes(s))) return "vehicle";
  if (["person", "pedestrian", "people"].some(s => lower.includes(s))) return "person";
  if (["pole", "tree", "barrier", "block", "fence", "sign"].some(s => lower.includes(s))) return "obstacle";
  
  return "feature";
}

function estimateDirection(raw: any): DetectedObject["direction"] {
  const bbox = raw.boundingBox || raw.boundingPoly || {};
  const x = (bbox.minX || 0 + bbox.maxX || 0) / 2;
  const normalizedX = x / 1280;

  if (normalizedX < 0.33) return "left";
  if (normalizedX > 0.66) return "right";
  return "ahead";
}

function estimateDistance(raw: any): number {
  const bbox = raw.boundingBox || raw.boundingPoly || {};
  const height = (bbox.maxY || 0) - (bbox.minY || 0);
  const normalizedHeight = height / 720;

  const minDistance = 0.5;
  const maxDistance = 20;
  const distance = maxDistance - (normalizedHeight * (maxDistance - minDistance));
  
  return Math.max(minDistance, Math.min(maxDistance, distance));
}

function determinePriority(type: string, label: string): DetectedObject["priority"] {
  const lower = label.toLowerCase();
  
  const criticalTypes = ["stairs", "vehicle", "person", "obstacle"];
  const criticalWords = ["pothole", "hole", "gap", "construction", "barrier", "blocked"];
  
  if (criticalTypes.includes(type) || criticalWords.some(w => lower.includes(w))) {
    return "critical";
  }
  
  const warningTypes = ["door", "ramp"];
  if (warningTypes.includes(type)) {
    return "warning";
  }
  
  return "info";
}

function sortByPriority(objects: DetectedObject[]): DetectedObject[] {
  const priorityOrder: Record<DetectedObject["priority"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  
  return [...objects].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    return a.distance - b.distance;
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
