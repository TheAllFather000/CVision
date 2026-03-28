import { speak, stop as stopSpeaking } from "./tts";
import { checkAccessibility, formatAccessibilityReport } from "./accessibility";
import { describeEnvironment } from "./visionAI";

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
  const lower = transcript.toLowerCase().trim();

  if (lower.includes("stop") || lower.includes("shut up")) {
    stopSpeaking();
    return { needsAnalysis: false };
  }

  if (lower.includes("pause") || lower.includes("hold on") || lower.includes("wait")) {
    await commands.pause("");
    return { needsAnalysis: false };
  }

  if (lower.includes("resume") || lower.includes("continue") || lower.includes("start")) {
    await commands.resume("");
    return { needsAnalysis: false };
  }

  if (lower.includes("navigate to") || lower.includes("go to") || lower.includes("find")) {
    const address = lower.replace(/navigate to|go to|find/gi, "").trim();
    await commands.navigate(address);
    return { needsAnalysis: false };
  }

  if (lower.includes("help") || lower.includes("commands") || lower.includes("what can you do")) {
    await commands.help("");
    return { needsAnalysis: false };
  }

  if (lower.includes("dangers") || lower.includes("hazards") || lower.includes("obstacles")) {
    await commands.dangers("");
    return { needsAnalysis: false };
  }

  if (
    lower.includes("describe") || 
    lower.includes("around me") || 
    lower.includes("what's around") ||
    lower.includes("whats around") ||
    lower.includes("around") ||
    lower.includes("surroundings")
  ) {
    if (lower.includes("quick") || lower.includes("brief") || lower.includes("summary")) {
      return { needsAnalysis: true, type: "quick" };
    }
    return { needsAnalysis: true, type: "full" };
  }

  if (lower.includes("quick") || lower.includes("scan") || lower.includes("look")) {
    return { needsAnalysis: true, type: "quick" };
  }

  speak("I didn't understand that. Say 'help' for available commands.", "normal");
  return { needsAnalysis: false };
};

export const speakAnalysisResult = async (imageBase64: string): Promise<void> => {
  const result = await describeEnvironment(imageBase64);
  if (typeof result === "object" && "message" in result) {
    speak("Sorry, I couldn't analyze your surroundings right now.", "normal");
  } else {
    speak(result, "normal");
  }
};
