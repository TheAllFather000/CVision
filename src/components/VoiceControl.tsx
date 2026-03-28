import React, { useEffect, useCallback } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  AccessibilityInfo,
} from "react-native";
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from "@react-native-voice/voice";
import * as Haptics from "../utils/haptics";

interface VoiceCommandHandlers {
  onAccessibilityRepeat?: () => void;
  onNavigationRepeat?: () => void;
  onDismiss?: () => void;
  onAnalyze?: () => void;
}

interface VoiceControlProps {
  isListening: boolean;
  transcript: string;
  onStart: () => void;
  onStop: () => void;
  onTranscriptChange?: (transcript: string) => void;
  customHandlers?: VoiceCommandHandlers;
}

const VOICE_COMMANDS = {
  REPEAT_ACCESSIBILITY: ["repeat", "say again", "what was that", "repeat rating"],
  REPEAT_NAVIGATION: ["repeat navigation", "say navigation", "repeat directions"],
  DISMISS: ["dismiss", "close", "hide", "go back"],
  ANALYZE: ["analyze", "scan", "look around", "what's here"],
};

const parseVoiceCommand = (transcript: string): string | null => {
  const lowerTranscript = transcript.toLowerCase().trim();

  for (const cmd of VOICE_COMMANDS.REPEAT_ACCESSIBILITY) {
    if (lowerTranscript.includes(cmd)) return "repeat_accessibility";
  }
  for (const cmd of VOICE_COMMANDS.REPEAT_NAVIGATION) {
    if (lowerTranscript.includes(cmd)) return "repeat_navigation";
  }
  for (const cmd of VOICE_COMMANDS.DISMISS) {
    if (lowerTranscript.includes(cmd)) return "dismiss";
  }
  for (const cmd of VOICE_COMMANDS.ANALYZE) {
    if (lowerTranscript.includes(cmd)) return "analyze";
  }

  return null;
};

export const VoiceControl: React.FC<VoiceControlProps> = ({
  isListening,
  transcript,
  onStart,
  onStop,
  onTranscriptChange,
  customHandlers = {},
}) => {
  const handleSpeechResults = useCallback(
    (event: SpeechResultsEvent) => {
      const newTranscript = event.value?.[0] || "";
      onTranscriptChange?.(newTranscript);

      const command = parseVoiceCommand(newTranscript);

      switch (command) {
        case "repeat_accessibility":
          customHandlers.onAccessibilityRepeat?.();
          Haptics.triggerPattern("success");
          AccessibilityInfo.announceForAccessibilityWithOptions?.(
            "Repeating accessibility information",
            { queue: true }
          );
          break;
        case "repeat_navigation":
          customHandlers.onNavigationRepeat?.();
          Haptics.triggerPattern("success");
          AccessibilityInfo.announceForAccessibilityWithOptions?.(
            "Repeating navigation",
            { queue: true }
          );
          break;
        case "dismiss":
          customHandlers.onDismiss?.();
          Haptics.triggerPattern("light");
          AccessibilityInfo.announceForAccessibilityWithOptions?.(
            "Dismissed",
            { queue: true }
          );
          break;
        case "analyze":
          customHandlers.onAnalyze?.();
          Haptics.triggerPattern("caution");
          AccessibilityInfo.announceForAccessibilityWithOptions?.(
            "Starting analysis",
            { queue: true }
          );
          break;
      }
    },
    [customHandlers, onTranscriptChange],
  );

  const handleSpeechError = useCallback((event: SpeechErrorEvent) => {
    console.error("Speech recognition error:", event.error);
    Haptics.triggerPattern("warning");
    AccessibilityInfo.announceForAccessibilityWithOptions?.(
      "Voice recognition error. Please try again.",
      { queue: true }
    );
  }, []);

  useEffect(() => {
    Voice.onSpeechResults = handleSpeechResults;
    Voice.onSpeechError = handleSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [handleSpeechResults, handleSpeechError]);

  const getAccessibilityLabel = (): string => {
    if (isListening) {
      return `Listening. You said: ${transcript || "Waiting for speech"}. Say "repeat" to hear accessibility rating again, or "dismiss" to close.`;
    }
    return "Tap to start voice control. Double tap to start listening.";
  };

  return (
    <View style={styles.container}>
      <View style={styles.transcriptContainer}>
        <Text
          style={styles.transcript}
          accessibilityRole="text"
          accessibilityLabel={transcript || "No speech detected"}
        >
          {transcript || "Tap microphone to speak"}
        </Text>
        {isListening && (
          <Text style={styles.listeningHint}>
            Say "repeat" for accessibility, "dismiss" to close, or "analyze" to scan
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.micButton, isListening && styles.micButtonActive]}
        onPress={isListening ? onStop : onStart}
        accessible={true}
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityRole="button"
        accessibilityHint={
          isListening
            ? "Double tap to stop listening"
            : "Double tap to start listening"
        }
        accessibilityState={{ selected: isListening }}
      >
        <Text style={styles.micIcon} accessibilityElementsHidden={true}>
          {isListening ? "⏹" : "🎤"}
        </Text>
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
  listeningHint: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 4,
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
