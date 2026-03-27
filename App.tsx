import React, { useEffect } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { CameraView } from "./src/components/CameraView";
import { VoiceControl } from "./src/components/VoiceControl";
import { AccessibilityBadge } from "./src/components/AccessibilityBadge";
import { useCameraPermission } from "./src/hooks/useCameraPermission";
import { useVoiceRecognition } from "./src/hooks/useVoiceRecognition";
import { AppProvider, useAppContext } from "./src/context/AppContext";
import { processCommand } from "./src/services/navigation";

const AppContent = () => {
  const { hasPermission } = useCameraPermission();
  const { isListening, transcript, startListening, stopListening } =
    useVoiceRecognition();
  const { state } = useAppContext();

  const handleVoiceCommand = async (text: string) => {
    await processCommand(text);
  };

  useEffect(() => {
    if (transcript && !isListening) {
      handleVoiceCommand(transcript);
    }
  }, [transcript, isListening]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <Text style={styles.title}>CVision</Text>
        <AccessibilityBadge rating={state.accessibilityRating} />
      </View>
      <View style={styles.cameraContainer}>
        {hasPermission ? (
          <CameraView />
        ) : (
          <Text style={styles.permissionText}>
            Camera permission required for CVision to work
          </Text>
        )}
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
  cameraContainer: {
    flex: 1,
  },
  permissionText: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#a0a0a0",
    fontSize: 16,
    padding: 20,
  },
});

export default App;
