import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";

interface Props {
  isActive: boolean;
  barCount?: number;
  color?: string;
  height?: number;
}

const VoiceVisualizer: React.FC<Props> = ({
  isActive,
  barCount = 20,
  color = "#e94560",
  height = 40,
}) => {
  const bars = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0))
  ).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => stopAnimation();
  }, [isActive]);

  const startAnimation = () => {
    const createBarAnimation = (bar: Animated.Value, index: number) => {
      const delay = index * 50;
      const duration = 200 + Math.random() * 300;

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(bar, {
            toValue: 0.3 + Math.random() * 0.7,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.1 + Math.random() * 0.3,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
    };

    animationRef.current = Animated.parallel(
      bars.map((bar, i) => createBarAnimation(bar, i))
    );
    animationRef.current.start();
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Animate bars to zero
    Animated.parallel(
      bars.map((bar) =>
        Animated.timing(bar, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        })
      )
    ).start();
  };

  return (
    <View style={[styles.container, { height }]}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: ["4px", `${height}px`],
              }),
              opacity: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
});

export default VoiceVisualizer;
