import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { colors, typography } from "@/src/theme";

export default function SplashScreen() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const redirected = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const run = async () => {
      await restoreSession();
      if (redirected.current) return;
      redirected.current = true;

      const { isAuthenticated, isChauffeurMode } = useAuthStore.getState();
      if (isAuthenticated) {
        router.replace(isChauffeurMode ? "/(chauffeur)/dashboard" : "/(client)/home");
      } else {
        router.replace("/(auth)/discover");
      }
    };

    const timer = setTimeout(run, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale }], opacity }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>G</Text>
        </View>
        <Text style={styles.appName}>GoTaxi</Text>
        <Text style={styles.tagline}>Voyagez sereinement</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  logoContainer: { alignItems: "center", gap: 16 },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 56,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    lineHeight: 64,
  },
  appName: {
    fontSize: typography.fontSize["5xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
  },
  tagline: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.8)",
  },
});