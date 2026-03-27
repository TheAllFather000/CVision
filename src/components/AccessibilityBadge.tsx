import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface AccessibilityBadgeProps {
  rating?: "high" | "medium" | "low" | null;
}

export const AccessibilityBadge: React.FC<AccessibilityBadgeProps> = ({
  rating,
}) => {
  if (!rating) return null;

  const colors = {
    high: "#4ade80",
    medium: "#fbbf24",
    low: "#ef4444",
  };

  const labels = {
    high: "Accessible",
    medium: "Partially Accessible",
    low: "Limited Access",
  };

  return (
    <View style={[styles.badge, { backgroundColor: colors[rating] }]}>
      <Text style={styles.text}>{labels[rating]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
