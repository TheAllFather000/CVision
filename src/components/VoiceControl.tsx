import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  AccessibilityInfo,
} from "react-native";

interface VoiceControlProps {
  isListening: boolean;
  transcript: string;
  onStart: () => void;
  onStop: () => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  isListening,
  transcript,
  onStart,
  onStop,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.transcriptContainer}>
        <Text style={styles.transcript}>
          {transcript || "Tap microphone to speak"}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.micButton, isListening && styles.micButtonActive]}
        onPress={isListening ? onStop : onStart}
        accessible={true}
        accessibilityLabel={isListening ? "Stop listening" : "Start listening"}
        accessibilityRole="button"
      >
        <Text style={styles.micIcon}>{isListening ? "⏹" : "🎤"}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#16213e",
    borderTopWidth: 1,
    borderTopColor: "#0f3460",
  },
  transcriptContainer: {
    flex: 1,
    marginRight: 16,
  },
  transcript: {
    color: "#a0a0a0",
    fontSize: 14,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0f3460",
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: "#e94560",
  },
  micIcon: {
    fontSize: 24,
  },
});
