import { Camera, Frame } from "react-native-vision-camera";

export const frameToBase64 = async (frame: Frame): Promise<string> => {
  // Convert frame to base64 for API processing
  // Note: This is a simplified version. In production, use native modules for performance.
  const cameraModule = Camera;
  const base64 = await cameraModule.takePhoto({
    qualityPrioritization: "speed",
    flash: "off",
    enableShutterSound: false,
  });
  return base64;
};

export const resizeImage = (base64: string, maxWidth: number = 640): string => {
  // Image resizing would be done with react-native-image-resizer
  // For now, return as-is
  return base64;
};
