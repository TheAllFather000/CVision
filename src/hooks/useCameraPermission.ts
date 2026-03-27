import { useState, useEffect } from "react";
import { Camera } from "react-native-vision-camera";

export const useCameraPermission = () => {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const requestPermission = async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
    };
    requestPermission();
  }, []);

  return { hasPermission };
};
