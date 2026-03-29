import { NativeModules } from "react-native";

interface ProximityAudioInterface {
  start(): void;
  stop(): void;
  update(frequency: number, volume: number): void;
}

export const ProximityAudio: ProximityAudioInterface =
  NativeModules.ProximityAudio;
