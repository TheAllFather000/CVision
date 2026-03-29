import { useState, useCallback } from "react";
import { PermissionsAndroid, Platform } from "react-native";

export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return false;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: "Camera permission",
      message: "CVision needs the camera to scan your surroundings.",
      buttonPositive: "OK",
    }
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const useCameraPermission = () => {
  const [hasPermission, setHasPermission] = useState(false);

  const request = useCallback(async () => {
    const ok = await requestCameraPermission();
    setHasPermission(ok);
    return ok;
  }, []);

  return { hasPermission, requestPermission: request };
};
