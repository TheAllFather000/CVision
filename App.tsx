import React, { useState, useCallback, useEffect } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { CameraView } from "./src/components/CameraView";
import { VoiceControl } from "./src/components/VoiceControl";
import { DetectionManager } from "./src/components/DetectionManager";
import { SettingsScreen } from "./src/components/SettingsScreen";
import { OnboardingScreen } from "./src/components/OnboardingScreen";
import { useCameraPermission } from "./src/hooks/useCameraPermission";
import { useVoiceRecognition } from "./src/hooks/useVoiceRecognition";
import { useSceneAnalysis } from "./src/hooks/useSceneAnalysis";
import { SettingsProvider, useSettings } from "./src/context/SettingsContext";
import { AppProvider, useAppContext } from "./src/context/AppContext";
import { processCommand } from "./src/services/navigation";
import { speak } from "./src/services/tts";
import * as Haptics from "./src/utils/haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "@cvison_onboarding_complete";

const MainScreen: React.FC = () => {
  const { hasPermission } = useCameraPermission();
  const { isListening, transcript, startListening, stopListening } = useVoiceRecognition();
  const { dispatch } = useAppContext();
  const { settings } = useSettings();
  const { isAnalyzing, quickDescription, describeSurroundings } = useSceneAnalysis();
  
  const [isScanning, setIsScanning] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Failed to check onboarding:", error);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch (error) {
      console.error("Failed to save onboarding:", error);
    }
    setShowOnboarding(false);
    speak("Welcome! I'm here to help you navigate safely.", "normal");
  };

  const handleScan = useCallback((objects: any[]) => {
    dispatch({ type: "SET_DANGERS", payload: objects.map(o => o.label) });
  }, [dispatch]);

  const handleHazard = useCallback((hazard: any) => {
    if (hazard && settings.continuousAlert) {
      dispatch({ type: "SET_DANGERS", payload: [`⚠ ${hazard.label} ${hazard.direction}`] });
    }
  }, [dispatch, settings.continuousAlert]);

  const handleVoiceCommand = useCallback(async (text: string) => {
    const result = await processCommand(text);
    
    if (result.needsAnalysis) {
      if (result.type === "quick") {
        quickDescription();
      } else {
        describeSurroundings();
      }
    }
  }, [quickDescription, describeSurroundings]);

  const handleVoiceTranscriptChange = useCallback((newTranscript: string) => {
    if (newTranscript && newTranscript !== transcript && settings.voiceCommands) {
      handleVoiceCommand(newTranscript);
    }
  }, [transcript, handleVoiceCommand, settings.voiceCommands]);

  const toggleScanning = () => {
    setIsScanning(prev => {
      const newState = !prev;
      Haptics.triggerPattern(newState ? "success" : "light");
      speak(newState ? "Scanning resumed." : "Scanning paused.", "normal");
      return newState;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>CVision</Text>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isScanning ? "#4ade80" : "#ef4444" }
          ]} />
          <Text style={styles.statusText}>
            {isScanning ? "Scanning" : "Paused"}
          </Text>
        </View>
      </View>

      <View style={styles.cameraContainer}>
        {hasPermission ? (
          <CameraView
            isActive={isScanning}
            onHazard={handleHazard}
            proximityThreshold={settings.proximityThreshold}
          />
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionIcon}>📷</Text>
            <Text style={styles.permissionText}>
              Camera permission required
            </Text>
            <Text style={styles.permissionSubtext}>
              Enable camera access for CVision to scan your surroundings
            </Text>
          </View>
        )}
        
        <DetectionManager alertDuration={settings.alertDuration} />
        
        <View style={styles.analysisOverlay}>
          {isAnalyzing && (
            <View style={styles.analyzingIndicator}>
              <ActivityIndicator size="small" color="#e94560" />
              <Text style={styles.analyzingText}>Analyzing...</Text>
            </View>
          )}
        </View>
        
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionButton, isAnalyzing && styles.actionButtonDisabled]}
            onPress={quickDescription}
            disabled={isAnalyzing}
          >
            <Text style={styles.actionButtonText}>🔍 Quick Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, isAnalyzing && styles.actionButtonDisabled]}
            onPress={describeSurroundings}
            disabled={isAnalyzing}
          >
            <Text style={styles.actionButtonText}>🗣 Describe</Text>
          </TouchableOpacity>
        </View>
      </View>

      <VoiceControl
        isListening={isListening}
        transcript={transcript}
        onStart={startListening}
        onStop={stopListening}
        onTranscriptChange={handleVoiceTranscriptChange}
      />

      <Modal visible={showSettings} animationType="slide">
        <SettingsScreen onClose={() => setShowSettings(false)} />
      </Modal>

      {showOnboarding && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
    </SafeAreaView>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <SettingsProvider>
        <MainScreen />
      </SettingsProvider>
    </AppProvider>
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
    paddingVertical: 12,
    backgroundColor: "#16213e",
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e94560",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    color: "#a0a0a0",
    fontSize: 14,
  },
  cameraContainer: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionText: {
    color: "#e94560",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  permissionSubtext: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
  },
  analysisOverlay: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
  },
  analyzingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 33, 62, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
  },
  analyzingText: {
    color: "#e94560",
    fontSize: 14,
    marginLeft: 8,
  },
  quickActions: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    backgroundColor: "#16213e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e94560",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default App;
