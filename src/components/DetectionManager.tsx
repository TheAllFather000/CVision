import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { DetectionAlert, DetectedObject } from "./DetectionAlert";

interface DetectionManagerProps {
  maxVisible?: number;
  alertDuration?: number;
}

export const DetectionManager: React.FC<DetectionManagerProps> = ({
  maxVisible = 3,
  alertDuration = 3000,
}) => {
  const [activeAlerts, setActiveAlerts] = useState<DetectedObject[]>([]);
  const queueRef = useRef<DetectedObject[]>([]);
  const processingRef = useRef(false);

  const addDetection = useCallback((detection: DetectedObject) => {
    const isDuplicate = activeAlerts.some(
      (a) => a.label === detection.label && 
           a.direction === detection.direction &&
           Date.now() - (a as any).timestamp < 5000
    );

    if (isDuplicate) return;

    const detectionWithTimestamp = {
      ...detection,
      timestamp: Date.now(),
    } as DetectedObject & { timestamp: number };

    if (activeAlerts.length < maxVisible) {
      setActiveAlerts((prev) => [...prev, detectionWithTimestamp]);
    } else {
      queueRef.current.push(detectionWithTimestamp);
    }
  }, [activeAlerts, maxVisible]);

  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      processingRef.current = false;
      return;
    }

    const next = queueRef.current.shift()!;
    setActiveAlerts((prev) => [...prev.slice(-maxVisible + 1), next]);

    setTimeout(processQueue, 1000);
  }, [maxVisible]);

  const removeAlert = useCallback((index: number) => {
    setActiveAlerts((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      
      if (queueRef.current.length > 0 && !processingRef.current) {
        processingRef.current = true;
        setTimeout(() => {
          const next = queueRef.current.shift()!;
          setActiveAlerts((current) => [...current, next]);
          processingRef.current = false;
          processQueue();
        }, 500);
      }
      
      return updated;
    });
  }, [processQueue]);

  return (
    <View style={styles.container} pointerEvents="none">
      {activeAlerts.map((detection, index) => (
        <DetectionAlert
          key={`${detection.label}-${detection.direction}-${index}`}
          detection={detection}
          onComplete={() => removeAlert(index)}
          autoHideDelay={alertDuration}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
