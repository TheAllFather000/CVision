import { NativeModules } from "react-native";

const { ProximityAudio } = NativeModules;

interface ProximityAlert {
  distance: number;
  severity: "warning" | "caution" | "danger" | "critical";
  label: string;
  direction: string;
}

// Hazard labels that trigger proximity alerts
const HAZARD_LABELS = [
  "stairs",
  "staircase",
  "step",
  "ramp",
  "hole",
  "gap",
  "crack",
  "car",
  "vehicle",
  "bicycle",
  "motorcycle",
  "truck",
  "bus",
  "pole",
  "pillar",
  "fence",
  "wall",
  "barrier",
  "construction",
  "curb",
  "edge",
  "drop",
  "person",
  "bench",
  "chair",
  "furniture",
  "household",
  "obstacle",
  "structural",
  "building",
];

// Determine proximity alert level
export const getProximityAlert = (
  distance: number,
  label: string,
  direction: string = "ahead"
): ProximityAlert | null => {
  if (!HAZARD_LABELS.some((h) => label.toLowerCase().includes(h))) {
    return null;
  }

  let severity: ProximityAlert["severity"];

  if (distance < 0.5) {
    severity = "critical";
  } else if (distance < 1) {
    severity = "danger";
  } else if (distance < 2) {
    severity = "caution";
  } else if (distance < 3) {
    severity = "warning";
  } else {
    return null; // Too far to alert
  }

  return { distance, severity, label, direction };
};

// Get direction from bounding box position
export const getDirection = (
  boxX: number,
  boxWidth: number,
  frameWidth: number
): string => {
  const centerX = boxX + boxWidth / 2;
  const frameCenter = frameWidth / 2;
  const threshold = frameWidth * 0.2;

  if (centerX < frameCenter - threshold) {
    return "to your left";
  } else if (centerX > frameCenter + threshold) {
    return "to your right";
  }
  return "ahead";
};

/** Map heuristic area (from object detection) to a severity for ProximityAudio. */
export const severityFromArea = (
  area: number
): ProximityAlert["severity"] => {
  if (area > 0.12) return "critical";
  if (area > 0.06) return "danger";
  if (area > 0.025) return "caution";
  return "warning";
};

// Audio feedback control
export const startProximityAudio = (): void => {
  ProximityAudio?.start();
};

export const stopProximityAudio = (): void => {
  ProximityAudio?.stop();
};

export const updateProximityAudio = (
  distance: number,
  severity: ProximityAlert["severity"]
): void => {
  let frequency: number;
  let volume: number;

  switch (severity) {
    case "critical":
      frequency = 1200;
      volume = 1.0;
      break;
    case "danger":
      frequency = 800;
      volume = 0.8;
      break;
    case "caution":
      frequency = 600;
      volume = 0.6;
      break;
    case "warning":
      frequency = 400;
      volume = 0.4;
      break;
    default:
      return;
  }

  ProximityAudio?.update(frequency, volume);
};

// Format spoken proximity warning
export const formatProximityWarning = (alert: ProximityAlert): string => {
  const distanceStr =
    alert.distance < 1
      ? `${Math.round(alert.distance * 100)} centimeters`
      : `${alert.distance.toFixed(1)} meters`;

  const urgency = {
    warning: "",
    caution: "Caution: ",
    danger: "Warning: ",
    critical: "Stop! ",
  };

  return `${urgency[alert.severity]}${alert.label} ${
    alert.direction
  }, ${distanceStr} away`;
};
