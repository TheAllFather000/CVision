import { NativeModules, NativeEventEmitter } from "react-native";

const { TTS } = NativeModules;

let isReady = false;
let pendingQueue: { text: string; priority: "normal" | "urgent" }[] = [];

const emitter = new NativeEventEmitter(TTS);

// Poll for readiness since the native TTS engine initializes async
const checkReady = () => {
  TTS.isAvailable()
    .then((ready: boolean) => {
      isReady = ready;
      if (ready && pendingQueue.length > 0) {
        pendingQueue.forEach((item) => speak(item.text, item.priority));
        pendingQueue = [];
      }
    })
    .catch(() => {});
};
// Check immediately and again after a short delay
checkReady();
setTimeout(checkReady, 1500);

export const speak = (
  text: string,
  priority: "normal" | "urgent" = "normal"
) => {
  console.log(
    "[tts] speak called, isReady:",
    isReady,
    "text:",
    text.substring(0, 50)
  );
  if (!isReady) {
    pendingQueue.push({ text, priority });
    console.log("[tts] not ready, queued:", pendingQueue.length);
    return;
  }
  TTS.speak(text, priority)
    .then(() => {
      console.log("[tts] speak resolved");
    })
    .catch((err: any) => {
      console.warn("[tts] speak error:", err);
    });
};

export const stopSpeaking = () => {
  TTS.stop().catch(() => {});
};

export const announceDanger = (danger: string) => {
  speak(`Warning: ${danger}`, "urgent");
};

export const announceNavigation = (instruction: string) => {
  speak(instruction, "normal");
};

// Event listeners for coordination if needed
export const onTTSStart = (cb: () => void) => {
  const sub = emitter.addListener("tts-start", cb);
  return () => sub.remove();
};

export const onTTSFinish = (cb: () => void) => {
  const sub = emitter.addListener("tts-finish", cb);
  return () => sub.remove();
};
