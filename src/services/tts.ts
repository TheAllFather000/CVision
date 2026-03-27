import Tts from "react-native-tts";

Tts.setDefaultRate(0.5);
Tts.setDefaultPitch(1.0);

export const speak = (
  text: string,
  priority: "normal" | "urgent" = "normal",
) => {
  if (priority === "urgent") {
    Tts.stop();
  }
  Tts.speak(text);
};

export const stopSpeaking = () => {
  Tts.stop();
};

export const announceDanger = (danger: string) => {
  speak(`Warning: ${danger}`, "urgent");
};

export const announceNavigation = (instruction: string) => {
  speak(instruction, "normal");
};
