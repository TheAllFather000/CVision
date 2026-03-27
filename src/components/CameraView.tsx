import React from "react";
import { StyleSheet, View } from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";

interface CameraViewProps {
  onFrame?: (frame: any) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onFrame }) => {
  const device = useCameraDevice("back");

  if (!device) return null;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={false}
        frameProcessor={onFrame}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
