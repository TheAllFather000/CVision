export const API_KEYS = {
  GOOGLE_VISION: "YOUR_GOOGLE_VISION_API_KEY",
  GOOGLE_PLACES: "YOUR_GOOGLE_PLACES_API_KEY",
  OPENAI: "YOUR_OPENAI_API_KEY",
};

export const CONFIG = {
  ANALYSIS_INTERVAL_MS: 2000,
  MAX_TOKENS_VISION: 300,
  TTS_RATE: 0.5,
  TTS_PITCH: 1.0,
  SUPPORTED_LOCALES: ["en-US", "en-GB", "af-ZA"],
  DANGER_PRIORITY_KEYWORDS: [
    "stairs",
    "step",
    "hole",
    "gap",
    "traffic",
    "car",
    "obstacle",
    "barrier",
    "wet floor",
  ],
};

export const SPOKEN_RESPONSES = {
  LISTENING: "Listening...",
  ANALYZING: "Analyzing your surroundings...",
  DANGER_PREFIX: "Warning: ",
  NAVIGATION_PREFIX: "Navigation: ",
  COMMANDS_HELP:
    "Say 'describe' for surroundings, 'navigate' plus an address for accessibility, 'dangers' for hazards.",
  ERROR: "Sorry, something went wrong. Please try again.",
};
