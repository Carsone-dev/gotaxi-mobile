import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/src/components/ui/Button";
import { colors, typography, spacing } from "@/src/theme";

const { width } = Dimensions.get("window");

const slides = [
  { id: "1", emoji: "🚗", titleKey: "onboarding.slide1_title", descKey: "onboarding.slide1_desc" },
  { id: "2", emoji: "📦", titleKey: "onboarding.slide2_title", descKey: "onboarding.slide2_desc" },
  { id: "3", emoji: "💳", titleKey: "onboarding.slide3_title", descKey: "onboarding.slide3_desc" },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const next = () => {
    if (current < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1 });
      setCurrent(current + 1);
    } else {
      router.replace("/(auth)/login");
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.skip} onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
      </Pressable>

      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrent(idx);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.desc}>{t(item.descKey)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>
        <Button onPress={next} size="lg" style={styles.btn}>
          {current === slides.length - 1 ? t("onboarding.start") : t("common.next")}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  skip: { position: "absolute", top: 56, right: spacing["2xl"], zIndex: 10 },
  skipText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
    gap: spacing.xl,
  },
  emoji: { fontSize: 80 },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  desc: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: typography.fontSize.lg * typography.lineHeight.relaxed,
  },
  footer: { paddingHorizontal: spacing["2xl"], paddingBottom: 48, gap: spacing["2xl"] },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { width: 24, backgroundColor: colors.primary },
  btn: { width: "100%" },
});