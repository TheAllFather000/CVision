import { speak, stop as stopSpeaking } from "./tts";
import { checkAccessibility, formatAccessibilityReport } from "./accessibility";
import { describeEnvironment } from "./visionAI";
import { whisperService, parseVoiceCommand } from "./whisper";

type CommandHandler = (args: string) => Promise<void>;

const commands: Record<string, CommandHandler> = {
  describe: async () => {
    speak("Say 'what's around me' to hear a description of your surroundings.", "normal");
  },

  dangers: async () => {
    speak("I'm continuously scanning for hazards in your path. I'll alert you immediately if I detect anything dangerous.", "normal");
  },

  navigate: async (address: string) => {
    if (!address) {
      speak("Please provide an address or location.", "normal");
      return;
    }
    speak(`Checking accessibility for ${address}...`, "normal");
    try {
      const info = await checkAccessibility(address);
      const report = formatAccessibilityReport(info);
      speak(report, "normal");
    } catch {
      speak("Sorry, I couldn't check that location's accessibility.", "normal");
    }
  },

  help: async () => {
    speak(
      'Here are my commands: Say "what\'s around me" for a full description of your surroundings. ' +
      'Say "quick scan" for a brief overview. ' +
      'Say "navigate to" followed by an address to check building accessibility. ' +
      'Say "help" to repeat these commands. ' +
      'Say "stop" to stop me from speaking.',
    );
  },

  stop: async () => {
    stopSpeaking();
    speak("Stopped.", "normal");
  },

  pause: async () => {
    speak("Scanning paused. Say "resume" to continue.", "normal");
  },

  resume: async () => {
    speak("Scanning resumed. I'll alert you to any hazards in your path.", "normal");
  },
};

export const processCommand = async (transcript: string): Promise<{ needsAnalysis: boolean; type?: "full" | "quick" }> => {
  const enhanced = await whisperService.enhanceTranscription(transcript);
  const parsed = parseVoiceCommand(enhanced);

  switch (parsed.action) {
    case "stop":
      stopSpeaking();
      return { needsAnalysis: false };

    case "pause":
      await commands.pause("");
      return { needsAnalysis: false };

    case "resume":
      await commands.resume("");
      return { needsAnalysis: false };

    case "navigate":
      await commands.navigate(parsed.params || "");
      return { needsAnalysis: false };

    case "help":
      await commands.help("");
      return { needsAnalysis: false };

    case "describe":
      return { needsAnalysis: true, type: "full" };

    case "scan":
      return { needsAnalysis: true, type: "quick" };

    default:
      speak("I didn't understand that. Say 'help' for available commands.", "normal");
      return { needsAnalysis: false };
  }
};

export const speakAnalysisResult = async (imageBase64: string): Promise<void> => {
  const result = await describeEnvironment(imageBase64);
  if (typeof result === "object" && "message" in result) {
    speak("Sorry, I couldn't analyze your surroundings right now.", "normal");
  } else {
    speak(result, "normal");
  }
};
