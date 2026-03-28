import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from "react-native";
import * as Haptics from "../utils/haptics";

export interface HazardAlert {
  type: "stairs" | "pit" | "vehicle" | "barrier" | "obstacle";
  label: string;
  direction: "ahead" | "left" | "right";
  distance: number;
  urgency: "critical" | "warning";
}

interface DetectionAlertProps {
  detection: HazardAlert;
  onComplete?: () => void;
  autoHideDelay?: number;
}

export const DetectionAlert: React.FC<DetectionAlertProps> = ({
  detection,
  onComplete,
  autoHideDelay = 3000,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const config = {
    critical: {
      backgroundColor: "rgba(239, 68, 68, 0.95)",
      icon: "⚠",
      vibration: "warning" as const,
    },
    warning: {
      backgroundColor: "rgba(251, 191, 36, 0.95)",
      icon: "⚡",
      vibration: "light" as const,
    },
  };

  const currentConfig = config[detection.urgency];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    Haptics.triggerPattern(currentConfig.vibration);

    const announcement = generateAnnouncement();
    AccessibilityInfo.announceForAccessibilityWithOptions?.(announcement, {
      queue: true,
    });

    const timer = setTimeout(() => {
      hideAndComplete();
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, []);

  const generateAnnouncement = (): string => {
    const distanceText = formatDistance(detection.distance);
    const directionText = formatDirection(detection.direction);

    if (detection.urgency === "critical") {
      return `${detection.label} ${directionText}, ${distanceText}!`;
    }
    return `${detection.label} ${directionText}, ${distanceText}.`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1) return "very close";
    if (meters < 3) return `${Math.round(meters)} meters`;
    if (meters < 10) return `${Math.round(meters)} meters ahead`;
    return `${Math.round(meters)} meters ahead`;
  };

  const formatDirection = (direction: string): string => {
    const map: Record<string, string> = {
      ahead: "ahead",
      left: "on your left",
      right: "on your right",
      behind: "behind you",
    };
    return map[direction] || direction;
  };

  const hideAndComplete = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: currentConfig.backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${detection.label} ${detection.direction}, ${detection.distance} meters`}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{currentConfig.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{detection.label}</Text>
          <Text style={styles.detail}>
            {formatDirection(detection.direction)} • {Math.round(detection.distance)}m
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  detail: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 2,
  },
});
