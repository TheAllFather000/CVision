import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useSettings } from "../context/SettingsContext";
import { speak } from "../services/tts";
import * as Haptics from "../utils/haptics";

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to defaults?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetSettings();
            Haptics.triggerPattern("success");
            speak("Settings reset to defaults", "normal");
          },
        },
      ]
    );
  };

  const handleTestSpeech = () => {
    speak("This is how I will speak at your current rate setting.", "normal");
  };

  const handleTestHaptic = () => {
    Haptics.triggerPattern("warning");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detection</Text>
          
          <View style={styles.setting}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Proximity Alert Distance</Text>
              <Text style={styles.settingValue}>{settings.proximityThreshold}m</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={0.5}
              value={settings.proximityThreshold}
              onSlidingComplete={(value) => {
                Haptics.triggerPattern("light");
                updateSettings({ proximityThreshold: value });
              }}
              minimumTrackTintColor="#e94560"
              maximumTrackTintColor="#3a3a5a"
              thumbTintColor="#e94560"
            />
            <Text style={styles.settingHint}>
              Alert when hazards are within {settings.proximityThreshold} meters
            </Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Continuous Alerts</Text>
              <Text style={styles.settingHint}>Alert for every hazard detected</Text>
            </View>
            <Switch
              value={settings.continuousAlert}
              onValueChange={(value) => {
                Haptics.triggerPattern("light");
                updateSettings({ continuousAlert: value });
              }}
              trackColor={{ false: "#3a3a5a", true: "#e94560" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingHint}>Vibrate on hazard detection</Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(value) => {
                if (value) handleTestHaptic();
                updateSettings({ hapticFeedback: value });
              }}
              trackColor={{ false: "#3a3a5a", true: "#e94560" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice</Text>

          <View style={styles.setting}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Speech Rate</Text>
              <Text style={styles.settingValue}>{Math.round(settings.speechRate * 100)}%</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0.3}
              maximumValue={0.8}
              step={0.05}
              value={settings.speechRate}
              onSlidingComplete={(value) => {
                updateSettings({ speechRate: value });
              }}
              minimumTrackTintColor="#e94560"
              maximumTrackTintColor="#3a3a5a"
              thumbTintColor="#e94560"
            />
            <TouchableOpacity onPress={handleTestSpeech} style={styles.testButton}>
              <Text style={styles.testButtonText}>Test Voice</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Voice Commands</Text>
              <Text style={styles.settingHint}>Enable "What's around me" and more</Text>
            </View>
            <Switch
              value={settings.voiceCommands}
              onValueChange={(value) => {
                Haptics.triggerPattern("light");
                updateSettings({ voiceCommands: value });
              }}
              trackColor={{ false: "#3a3a5a", true: "#e94560" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>CVision</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              AI-powered accessibility assistant for visually impaired users.
              Real-time hazard detection, voice commands, and environment descriptions.
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0f3460",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeText: {
    color: "#e94560",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e94560",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  setting: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  settingValue: {
    fontSize: 14,
    color: "#e94560",
    fontWeight: "600",
  },
  settingHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  slider: {
    width: "100%",
    height: 40,
    marginTop: 8,
  },
  testButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  testButtonText: {
    color: "#e94560",
    fontSize: 14,
    fontWeight: "600",
  },
  aboutCard: {
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e94560",
  },
  aboutVersion: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  aboutDescription: {
    fontSize: 14,
    color: "#a0a0a0",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  resetButton: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    height: 40,
  },
});
