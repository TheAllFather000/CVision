import Tts from "react-native-tts";

Tts.setDefaultRate(0.5);
Tts.setDefaultPitch(1.0);
Tts.setIgnoreSilentSwitch("ignore");

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

export const speakAccessibilityRating = (
  rating: "high" | "medium" | "low",
  location: string,
  features: string[] = [],
): void => {
  let announcement = "";

  switch (rating) {
    case "high":
      announcement = `Great news! ${location} is fully accessible.`;
      Tts.setDefaultRate(0.55);
      break;
    case "medium":
      announcement = `Attention. ${location} has partial accessibility.`;
      Tts.setDefaultRate(0.5);
      break;
    case "low":
      announcement = `Caution. ${location} has limited accessibility.`;
      Tts.setDefaultRate(0.45);
      break;
  }

  if (features.length > 0) {
    announcement += ` Available features include: ${features.join(", ")}.`;
  }

  speak(announcement, "normal");

  Tts.setDefaultRate(0.5);
};

export const speakPlaceDescription = (
  description: string,
  keyFeatures: string[],
): void => {
  let announcement = description;

  if (keyFeatures.length > 0) {
    announcement += ` Key features: ${keyFeatures.join(", ")}.`;
  }

  speak(announcement, "normal");
};

export const announceRatingChange = (
  newRating: "high" | "medium" | "low",
  previousRating: "high" | "medium" | "low" | null,
): void => {
  if (previousRating === null) {
    speakAccessibilityRating(newRating, "", []);
    return;
  }

  const comparisonText =
    newRating === previousRating
      ? "Accessibility rating unchanged."
      : newRating === "high"
        ? "Accessibility rating improved to high."
        : newRating === "medium"
          ? previousRating === "low"
            ? "Accessibility rating improved to medium."
            : "Accessibility rating decreased to medium."
          : "Accessibility rating decreased to low.";

  speak(comparisonText, "normal");
};

export const setSpeechRate = (rate: number): void => {
  const clampedRate = Math.max(0.01, Math.min(1.0, rate));
  Tts.setDefaultRate(clampedRate);
};

export const setSpeechPitch = (pitch: number): void => {
  const clampedPitch = Math.max(0.5, Math.min(2.0, pitch));
  Tts.setDefaultPitch(clampedPitch);
};

export const announceDetection = (
  label: string,
  direction: string,
  distance: number,
): void => {
  const distanceText = formatDistance(distance);
  const directionText = formatDirection(direction);
  
  speak(`${label} ${directionText}, ${distanceText}`, "urgent");
};

export const announceCriticalDetection = (
  label: string,
  direction: string,
  distance: number,
): void => {
  Tts.setDefaultRate(0.65);
  Tts.setDefaultPitch(1.1);
  
  const distanceText = formatDistance(distance);
  const directionText = formatDirection(direction);
  
  speak(`Alert! ${label} ${directionText}, ${distanceText}!`, "urgent");
  
  Tts.setDefaultRate(0.5);
  Tts.setDefaultPitch(1.0);
};

export const announceQuickUpdate = (message: string): void => {
  Tts.setDefaultRate(0.6);
  speak(message, "normal");
  Tts.setDefaultRate(0.5);
};

export const announceDetectionSummary = (
  count: number,
  hasCritical: boolean,
): void => {
  if (hasCritical) {
    Tts.setDefaultRate(0.6);
    speak(`${count} item${count > 1 ? 's' : ''} detected, including potential hazards`, "urgent");
  } else {
    speak(`${count} item${count > 1 ? 's' : ''} detected nearby`, "normal");
  }
  Tts.setDefaultRate(0.5);
};

function formatDistance(meters: number): string {
  if (meters < 1) return "very close";
  if (meters < 3) return `${Math.round(meters)} meters`;
  return `${Math.round(meters)} meters`;
}

function formatDirection(direction: string): string {
  const map: Record<string, string> = {
    ahead: "ahead",
    left: "on your left",
    right: "on your right",
    behind: "behind you",
  };
  return map[direction] || direction;
}
