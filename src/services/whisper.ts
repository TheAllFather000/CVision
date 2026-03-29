import { API_KEYS } from "../constants/config";
import { Audio } from "react-native";

interface WhisperResponse {
  text: string;
  language?: string;
  duration?: number;
}

export const transcribeAudio = async (audioUri: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      type: "audio/m4a",
      name: "recording.m4a",
    } as any);
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEYS.OPENAI}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const data: WhisperResponse = await response.json();
    return data.text;
  } catch (error) {
    console.error("Whisper transcription error:", error);
    throw error;
  }
};

export const startRecording = async (): Promise<string> => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  return "";
};

export const stopRecording = async (): Promise<string> => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
  });
  return "";
};
