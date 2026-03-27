import { speak, announceDanger, announceNavigation } from "./tts";
import { checkAccessibility, formatAccessibilityReport } from "./accessibility";
import { analyzeFrame } from "./visionAI";

type CommandHandler = (args: string) => Promise<void>;

const commands: Record<string, CommandHandler> = {
  describe: async () => {
    speak("Analyzing surroundings...");
  },

  dangers: async () => {
    speak("Scanning for dangers...");
  },

  navigate: async (address: string) => {
    if (!address) {
      speak("Please provide an address or location.");
      return;
    }
    speak(`Checking accessibility for ${address}...`);
    const info = await checkAccessibility(address);
    const report = formatAccessibilityReport(info);
    speak(report);
  },

  help: async () => {
    speak(
      'Available commands: Say "describe" to hear your surroundings. ' +
        'Say "dangers" to scan for hazards. ' +
        'Say "navigate" followed by an address to check building accessibility. ' +
        'Say "stop" to stop speaking.',
    );
  },

  stop: async () => {
    // Handled by TTS service
  },
};

export const processCommand = async (transcript: string): Promise<void> => {
  const lower = transcript.toLowerCase().trim();

  if (lower.includes("stop")) {
    speak("Stopping.");
    return;
  }

  if (lower.includes("navigate to") || lower.includes("go to")) {
    const address = lower.replace(/navigate to|go to/gi, "").trim();
    await commands.navigate(address);
    return;
  }

  for (const [cmd, handler] of Object.entries(commands)) {
    if (lower.includes(cmd)) {
      await handler("");
      return;
    }
  }

  // Default: treat as accessibility query if it sounds like an address
  if (/\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way)/i.test(lower)) {
    await commands.navigate(lower);
    return;
  }

  speak("I didn't understand. Say 'help' for available commands.");
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
