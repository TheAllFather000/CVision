import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { speak } from "../services/tts";
import * as Haptics from "../utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
  voiceText: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    icon: "👁️",
    title: "Welcome to CVision",
    description: "Your AI-powered accessibility assistant. I'll help you navigate the world safely.",
    voiceText: "Welcome to CVision. I'm your AI-powered accessibility assistant.",
  },
  {
    id: "2",
    icon: "⚠️",
    title: "Real-Time Hazard Detection",
    description: "I continuously scan your surroundings and alert you to dangers like stairs, pits, and obstacles.",
    voiceText: "I'll continuously scan your surroundings and alert you to dangers.",
  },
  {
    id: "3",
    icon: "🎤",
    title: "Voice Commands",
    description: 'Say "What\'s around me" for a full description, or "Quick scan" for a brief overview.',
    voiceText: "Use voice commands to get descriptions of your surroundings.",
  },
  {
    id: "4",
    icon: "🗣️",
    title: "Tap to Speak",
    description: "Press the microphone button anytime to give a voice command or ask questions.",
    voiceText: "Press the microphone button anytime to speak.",
  },
  {
    id: "5",
    icon: "🚀",
    title: "Ready to Go",
    description: "Point your camera forward and I'll keep watch. Let's explore together!",
    voiceText: "You're all set! Let's explore together.",
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
      speak(SLIDES[index].voiceText, "normal");
    }
  };

  const handleNext = () => {
    Haptics.triggerPattern("light");
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    Haptics.triggerPattern("light");
    onComplete();
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <Text style={styles.nextText}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: "#6b7280",
    fontSize: 16,
  },
  slide: {
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#a0a0a0",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    paddingTop: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3a3a5a",
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: "#e94560",
    width: 24,
  },
  nextButton: {
    backgroundColor: "#e94560",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  nextText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
