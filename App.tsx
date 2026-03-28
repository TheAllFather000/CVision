import React, { useState, useCallback } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { CameraView } from "./src/components/CameraView";
import { VoiceControl } from "./src/components/VoiceControl";
import { DetectionManager } from "./src/components/DetectionManager";
import { useCameraPermission } from "./src/hooks/useCameraPermission";
import { useVoiceRecognition } from "./src/hooks/useVoiceRecognition";
import { AppProvider, useAppContext } from "./src/context/AppContext";
import { processCommand } from "./src/services/navigation";
import * as Haptics from "./src/utils/haptics";

const AppContent = () => {
  const { hasPermission } = useCameraPermission();
  const { isListening, transcript, startListening, stopListening } =
    useVoiceRecognition();
  const { dispatch } = useAppContext();
  const [isScanning, setIsScanning] = useState(true);

  const handleHazard = useCallback((hazard: any) => {
    if (hazard) {
      dispatch({ type: "SET_DANGERS", payload: [`${hazard.label} ${hazard.direction}`] });
    } else {
      dispatch({ type: "SET_DANGERS", payload: [] });
    }
  }, [dispatch]);

  const handleVoiceCommand = async (text: string) => {
    await processCommand(text);
  };

  const toggleScanning = () => {
    setIsScanning(prev => !prev);
    Haptics.triggerPattern(isScanning ? "light" : "success");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
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
        <DetectionManager alertDuration={4000} />
      </View>
      <VoiceControl
        isListening={isListening}
        transcript={transcript}
        onStart={startListening}
        onStop={stopListening}
      />
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
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
});

export default App;
