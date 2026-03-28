import { speak } from "./tts";
import { checkAccessibility, formatAccessibilityReport } from "./accessibility";

type CommandHandler = (args: string) => Promise<void>;

const commands: Record<string, CommandHandler> = {
  describe: async () => {
    speak("Continuous scanning is active. I'll announce objects as I detect them.", "normal");
  },

  dangers: async () => {
    speak("Scanning for hazards in your path...", "normal");
  },

  navigate: async (address: string) => {
    if (!address) {
      speak("Please provide an address or location.", "normal");
      return;
    }
    speak(`Checking accessibility for ${address}...`, "normal");
    const info = await checkAccessibility(address);
    const report = formatAccessibilityReport(info);
    speak(report, "normal");
  },

  help: async () => {
    speak(
      'Available commands: Say "scan" to confirm scanning is active. ' +
        'Say "dangers" to focus on hazards. ' +
        'Say "navigate to" followed by an address to check building accessibility. ' +
        'Say "stop" to stop speaking. ' +
        'Say "pause" to pause scanning.',
    );
  },

  stop: async () => {
    speak("Stopping speech.", "normal");
  },

  pause: async () => {
    speak("Scanning paused. Say "scan" to resume.", "normal");
  },

  resume: async () => {
    speak("Scanning resumed.", "normal");
  },
};

export const processCommand = async (transcript: string): Promise<void> => {
  const lower = transcript.toLowerCase().trim();

  if (lower.includes("stop")) {
    speak("Stopping.", "normal");
    return;
  }

  if (lower.includes("pause") || lower.includes("hold on")) {
    await commands.pause("");
    return;
  }

  if (lower.includes("resume") || lower.includes("continue") || lower.includes("scan")) {
    await commands.resume("");
    return;
  }

  if (lower.includes("navigate to") || lower.includes("go to")) {
    const address = lower.replace(/navigate to|go to/gi, "").trim();
    await commands.navigate(address);
    return;
  }

  if (lower.includes("help") || lower.includes("commands")) {
    await commands.help("");
    return;
  }

  if (lower.includes("dangers") || lower.includes("hazards") || lower.includes("obstacles")) {
    await commands.dangers("");
    return;
  }

  if (lower.includes("describe") || lower.includes("around") || lower.includes("what's here")) {
    await commands.describe("");
    return;
  }

  speak("I didn't understand that. Say 'help' for available commands.", "normal");
};

export const processSceneAnalysis = async (
  imageBase64: string,
): Promise<void> => {
  try {
    const scene = await analyzeFrame(imageBase64);

    if (scene.dangers.length > 0) {
      scene.dangers.forEach((danger) => announceDanger(danger));
    }

    // Only announce navigation hints occasionally to avoid overwhelming
    if (scene.navigation.length > 0 && Math.random() < 0.3) {
      announceNavigation(scene.navigation[0]);
    }
  } catch (error) {
    console.error("Scene analysis failed:", error);
  }
};
