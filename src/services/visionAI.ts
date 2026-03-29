/**
 * Scene analysis uses native ML Kit object detection (see hazardDetection.ts).
 * MediaPipe JS tasks were not usable in React Native (WASM / image types).
 */
export {
  analyzeCapturedImage,
  captureAndAnalyze,
  captureAndAnalyzeFull,
  formatNativeDetections,
  pickPrimaryHazard,
  areaToPseudoMeters,
  type SceneDescription,
} from "./hazardDetection";
