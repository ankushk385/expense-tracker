import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import C from "@/constants/colors";

const { width: SW } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "wallet" as const,
    iconColor: C.red,
    bgColor: C.redDim,
    title: "Track Every Rupee",
    subtitle:
      "Add income and expenses in seconds. Know exactly where your money goes with beautiful charts and insights.",
  },
  {
    icon: "pie-chart" as const,
    iconColor: "#4CC9F0",
    bgColor: "rgba(76,201,240,0.15)",
    title: "Smart Analytics",
    subtitle:
      "See spending by category, compare months, and spot trends before they become problems.",
  },
  {
    icon: "sparkles" as const,
    iconColor: C.green,
    bgColor: C.greenDim,
    title: "AI Finance Coach",
    subtitle:
      "Ask your personal AI anything about your finances. Get insights, tips, and answers in plain English.",
  },
];

function Slide({ slide, index, scrollX }: { slide: (typeof SLIDES)[0]; index: number; scrollX: SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * SW, index * SW, (index + 1) * SW],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollX.value,
      [(index - 1) * SW, index * SW, (index + 1) * SW],
      [0.85, 1, 0.85],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[styles.slide, animStyle]}>
      <View style={[styles.iconCircle, { backgroundColor: slide.bgColor }]}>
        <Ionicons name={slide.icon} size={56} color={slide.iconColor} />
      </View>
      <Text style={styles.slideTitle}>{slide.title}</Text>
      <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: next * SW, animated: true });
      setCurrentIndex(next);
      scrollX.value = withTiming(next * SW);
    } else {
      await AsyncStorage.setItem("@expense_tracker_onboarded", "true");
      router.replace("/(auth)/login");
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("@expense_tracker_onboarded", "true");
    router.replace("/(auth)/login");
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      {/* Skip */}
      <View style={styles.topBar}>
        <View />
        <Pressable accessibilityLabel="Skip onboarding" onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slider}
      >
        {SLIDES.map((slide, i) => (
          <Slide key={i} slide={slide} index={i} scrollX={scrollX} />
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: i === currentIndex ? 24 : 8,
                backgroundColor: i === currentIndex ? C.red : C.mediumGray,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <Pressable
        accessibilityLabel={currentIndex === SLIDES.length - 1 ? "Get started" : "Continue onboarding"}
        style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
        onPress={handleNext}
      >
        <Text style={styles.ctaText}>
          {currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
        </Text>
        <Ionicons name="arrow-forward" size={18} color={C.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black, alignItems: "center" },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  skipBtn: { padding: 8 },
  skipText: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.lightGray },
  slider: { flex: 1, width: SW },
  slide: {
    width: SW,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 24,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  slideTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: C.white,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: C.lightGray,
    textAlign: "center",
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 24,
  },
  dot: { height: 8, borderRadius: 4 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.red,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: SW - 48,
    marginBottom: 12,
  },
  ctaText: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: C.white },
});
