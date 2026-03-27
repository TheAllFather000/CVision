import { useState, useEffect, useCallback } from "react";
import Voice from "@react-native-voice/voice";

export const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    Voice.onSpeechResults = (event: any) => {
      if (event.value && event.value[0]) {
        setTranscript(event.value[0]);
      }
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startListening = useCallback(async () => {
    try {
      setTranscript("");
      await Voice.start("en-US");
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start voice recognition:", error);
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error("Failed to stop voice recognition:", error);
    }
  }, []);

  return { isListening, transcript, startListening, stopListening };
};
