import { Vibration } from "react-native";

type VibrationPattern = "success" | "caution" | "warning" | "light" | "medium" | "heavy";

const patterns: Record<VibrationPattern, number[] | number> = {
  success: [0, 100, 50, 100],
  caution: [0, 200, 100, 200],
  warning: [0, 300, 100, 300, 100, 300],
  light: 50,
  medium: 100,
  heavy: 200,
};

export const triggerPattern = (pattern: VibrationPattern): void => {
  const vibrationSequence = patterns[pattern];
  Vibration.vibrate(vibrationSequence);
};

export const triggerAccessibleVibration = (
  type: "navigation" | "notification" | "action" | "error",
): void => {
  const vibrationMap: Record<string, VibrationPattern> = {
    navigation: "light",
    notification: "medium",
    action: "success",
    error: "warning",
  };

  triggerPattern(vibrationMap[type] || "medium");
};

export const cancelVibration = (): void => {
  Vibration.cancel();
};

export const useAccessibleHaptics = () => {
  return {
    onSuccess: () => triggerPattern("success"),
    onWarning: () => triggerPattern("warning"),
    onCaution: () => triggerPattern("caution"),
    onAction: () => triggerPattern("success"),
    onError: () => triggerPattern("warning"),
  };
};
