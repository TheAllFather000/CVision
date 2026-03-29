import { NativeModules } from "react-native";

import { getDirection } from "./proximity";

const { CameraModule } = NativeModules as {
  CameraModule: {
    analyzeObjects(path: string): Promise<NativeDetection[]>;
    analyzeImageLabels(path: string): Promise<ImageLabel[]>;
    capturePhoto(): Promise<string>;
    capturePhotoAuto(): Promise<string>;
    finalizeCaptureFlow(): Promise<boolean>;
    getOrphanCapturePath(): Promise<string | null>;
  };
};

export type ImageLabel = {
  text: string;
  confidence: number;
};

export type SceneDescription = {
  description: string;
  dangers: string[];
  objects: string[];
  navigation: string[];
};

export type NativeDetection = {
  labels: { text: string; confidence: number }[];
  box: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

/** Map ML Kit coarse categories to spoken hazard hints (offline model). */
const CATEGORY_HINTS: Record<string, string> = {
  food: "food or packaging",
  fashion: "clothing or personal item",
  "fashion good": "clothing or personal item",
  "home good": "furniture or household object",
  place: "building or structural feature",
  plant: "plants or vegetation",
  sport: "sports equipment",
  product: "object",
};

function labelToHint(text: string): string {
  const t = text.toLowerCase().trim();
  for (const [k, v] of Object.entries(CATEGORY_HINTS)) {
    if (t.includes(k)) return v;
  }
  return text;
}

/** Heuristic: larger normalized box area ≈ closer (no true depth without stereo / LiDAR). */
export function areaToPseudoMeters(area: number): number {
  const a = Math.max(0.0001, Math.min(area, 0.99));
  return Math.max(0.4, 3.0 * (1.0 - Math.sqrt(a)));
}

export function pickPrimaryHazard(
  detections: NativeDetection[]
): { label: string; area: number; direction: string } | null {
  if (!detections.length) return null;

  let best = detections[0];
  let bestArea = best.box.width * best.box.height;
  for (const d of detections) {
    const ar = d.box.width * d.box.height;
    if (ar > bestArea) {
      best = d;
      bestArea = ar;
    }
  }

  const primary =
    best.labels?.sort((a, b) => b.confidence - a.confidence)[0]?.text ??
    "object";
  const direction = getDirection(best.box.left, best.box.width, 1);

  return { label: labelToHint(primary), area: bestArea, direction };
}

export async function analyzeCapturedImage(
  imagePath: string
): Promise<SceneDescription> {
  const raw: NativeDetection[] = await CameraModule.analyzeObjects(imagePath);
  return formatNativeDetections(raw);
}

export function formatNativeDetections(
  raw: NativeDetection[]
): SceneDescription {
  console.log("[hazard] Raw detections:", JSON.stringify(raw.slice(0, 2)));
  const objects: string[] = [];
  const dangers: string[] = [];
  const navigation: string[] = [];

  for (const det of raw) {
    const parts: string[] = [];
    for (const lb of det.labels || []) {
      console.log("[hazard] Label:", lb.text, "confidence:", lb.confidence);
      if (lb.text && lb.confidence > 0.3) parts.push(labelToHint(lb.text));
    }
    const dir = getDirection(det.box.left, det.box.width, 1);
    const area = det.box.width * det.box.height;
    const dist = areaToPseudoMeters(area);
    const summary =
      parts.length > 0
        ? `${parts.join(", ")} ${dir}, roughly ${dist.toFixed(1)} meters`
        : `Object ${dir}, roughly ${dist.toFixed(1)} meters`;
    objects.push(summary);

    const joined = parts.join(" ").toLowerCase();
    if (
      joined.includes("furniture") ||
      joined.includes("household") ||
      joined.includes("structural") ||
      joined.includes("building")
    ) {
      dangers.push(`Possible obstacle: ${summary}`);
    }
    if (joined.includes("building") || joined.includes("place")) {
      navigation.push(`Structure ${dir}`);
    }
  }

  const description =
    objects.length > 0
      ? `I detected ${objects.length} object${
          objects.length > 1 ? "s" : ""
        }: ${objects.slice(0, 4).join(". ")}`
      : "I did not detect clear objects. Try better lighting or move closer.";

  return { description, dangers, objects, navigation };
}

// More natural, conversational hazard descriptions
const HAZARD_KEYWORDS = [
  "person",
  "car",
  "vehicle",
  "bicycle",
  "motorcycle",
  "truck",
  "bus",
  "chair",
  "table",
  "bench",
  "bench",
  "stool",
  "furniture",
  "wall",
  "fence",
  "pole",
  "pillar",
  "post",
  "stairs",
  "step",
  "staircase",
  "ramp",
  "curb",
  "edge",
  "door",
  "gate",
  "entrance",
  "exit",
  "hole",
  "gap",
  "crack",
  "obstacle",
  "barrier",
  "construction",
];

const ENTRANCE_KEYWORDS = ["door", "entrance", "exit", "gate"];

// Format scene using ML Kit Image Labels (better general detection)
export function formatImageLabels(
  labels: ImageLabel[],
  raw: NativeDetection[]
): SceneDescription {
  const dangers: string[] = [];
  const entrances: string[] = [];
  const observations: string[] = [];

  // Get position from object detection if available
  let dir = "ahead";
  let dist = 2.0;
  if (raw.length > 0) {
    const primary = raw[0];
    dir = getDirection(primary.box.left, primary.box.width, 1);
    const area = primary.box.width * primary.box.height;
    dist = areaToPseudoMeters(area);
  }

  // Use image labels (these are generally better)
  const significantLabels = labels.filter((l) => l.confidence > 0.3);

  for (const label of significantLabels.slice(0, 5)) {
    const text = label.text.toLowerCase();
    const readable = label.text.replace(/_/g, " ");

    // Check for hazards
    if (HAZARD_KEYWORDS.some((k) => text.includes(k))) {
      // Distance-based warning
      if (dist < 1.5) {
        dangers.push(`Watch out! There's a ${readable} right ${dir}`);
      } else if (dist < 3) {
        dangers.push(`Careful, ${readable} ${dir}`);
      } else {
        dangers.push(`There's a ${readable} ahead`);
      }
    }

    // Check for entrances
    if (ENTRANCE_KEYWORDS.some((k) => text.includes(k))) {
      entrances.push(`Door ${dir}`);
    }

    // General observations (non-hazard)
    if (!observations.includes(readable)) {
      observations.push(readable);
    }
  }

  // Build conversational description
  let description = "";

  if (observations.length === 0) {
    description = "I'm not seeing much. Try moving around a bit.";
  } else if (observations.length === 1) {
    description = `I see a ${observations[0]} ${dir}.`;
  } else if (observations.length === 2) {
    description = `I see a ${observations[0]} and a ${observations[1]} ${dir}.`;
  } else if (observations.length >= 3) {
    const last = observations[observations.length - 1];
    const rest = observations.slice(0, -1).join(", ");
    description = `I see ${rest}, and a ${last} ${dir}.`;
  }

  return { description, dangers, objects: observations, navigation: entrances };
}

export async function captureAndAnalyze(): Promise<SceneDescription> {
  const path = await CameraModule.capturePhoto();
  return analyzeCapturedImage(path);
}

export async function analyzeFullFromPath(path: string): Promise<{
  scene: SceneDescription;
  raw: NativeDetection[];
  labels: ImageLabel[];
}> {
  // Use image labeling which gives better general object detection
  const labels: ImageLabel[] = await CameraModule.analyzeImageLabels(path);
  console.log("[hazard] Image labels:", JSON.stringify(labels.slice(0, 5)));

  // Also get object detection for position info
  const raw: NativeDetection[] = await CameraModule.analyzeObjects(path);

  // Format using image labels (which are better)
  const scene = formatImageLabels(labels, raw);
  return { scene, raw, labels };
}

export async function captureAndAnalyzeFull(): Promise<{
  scene: SceneDescription;
  raw: NativeDetection[];
}> {
  const path = await CameraModule.capturePhoto();
  return analyzeFullFromPath(path);
}

export async function finalizeNativeCaptureFlow(): Promise<void> {
  try {
    await CameraModule.finalizeCaptureFlow();
  } catch {
    /* native optional */
  }
}

export async function getOrphanCapturePath(): Promise<string | null> {
  try {
    const p = await CameraModule.getOrphanCapturePath();
    return p ?? null;
  } catch {
    return null;
  }
}
