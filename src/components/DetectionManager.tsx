import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { DetectionAlert, HazardAlert } from "./DetectionAlert";

interface DetectionManagerProps {
  maxVisible?: number;
  alertDuration?: number;
}

export const DetectionManager: React.FC<DetectionManagerProps> = ({
  maxVisible = 1,
  alertDuration = 4000,
}) => {
  const [activeAlert, setActiveAlert] = useState<HazardAlert | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const updateAlert = useCallback((hazard: HazardAlert | null) => {
    const now = Date.now();
    if (hazard && now - lastUpdateRef.current > 1000) {
      lastUpdateRef.current = now;
      setActiveAlert(hazard);
    } else if (!hazard) {
      setActiveAlert(null);
    }
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {activeAlert && (
        <DetectionAlert
          detection={activeAlert}
          autoHideDelay={alertDuration}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
