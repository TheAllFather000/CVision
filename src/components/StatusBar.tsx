import React from "react";
import { View, Text, StyleSheet } from "react-native";

type AppMode =
  | "rest"
  | "listening"
  | "speaking"
  | "navigating"
  | "observing"
  | "error";

interface Props {
  mode: AppMode;
  message?: string;
}

const modeConfig: Record<
  AppMode,
  { icon: string; color: string; label: string }
> = {
  rest: { icon: "😴", color: "#4a5568", label: "Resting" },
  listening: { icon: "👂", color: "#f59e0b", label: "Listening" },
  speaking: { icon: "🗣️", color: "#e94560", label: "Speaking" },
  navigating: { icon: "🧭", color: "#4ade80", label: "Navigating" },
  observing: { icon: "📷", color: "#38bdf8", label: "Camera scan" },
  error: { icon: "⚠️", color: "#ef4444", label: "Error" },
};

const StatusBar: React.FC<Props> = ({ mode, message }) => {
  const config = modeConfig[mode];

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
      {message ? (
        <Text style={styles.message} numberOfLines={1} ellipsizeMode="tail">
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0a0a0f",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: "#a0a0a0",
  },
});

export default StatusBar;
export type { AppMode };
