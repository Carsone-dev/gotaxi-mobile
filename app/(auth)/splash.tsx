import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { GoTaxiLogo } from "@/src/components/common/GoTaxiLogo";
import { colors } from "@/src/theme";

export default function SplashScreen() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const redirected = useRef(false);

  // Animations
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(30)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Entrée du logo
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 9,
      }),
    ]).start(() => {
      // Points pulsants après l'entrée du logo
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(startDotsPulse);
    });

    const run = async () => {
      await restoreSession();
      if (redirected.current) return;
      redirected.current = true;
      const { isAuthenticated, isChauffeurMode } = useAuthStore.getState();
      router.replace(
        isAuthenticated
          ? isChauffeurMode
            ? "/(chauffeur)/dashboard"
            : "/(client)/home"
          : "/(auth)/discover"
      );
    };

    const timer = setTimeout(run, 1500);
    return () => clearTimeout(timer);
  }, []);

  function startDotsPulse() {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    pulse(dot1, 0);
    pulse(dot2, 160);
    pulse(dot3, 320);
  }

  return (
    <View style={s.container}>
      {/* Cercles décoratifs */}
      <View style={s.deco1} />
      <View style={s.deco2} />
      <View style={s.deco3} />
      <View style={s.deco4} />

      {/* Logo animé */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
        }}
      >
        <GoTaxiLogo size="lg" showTagline />
      </Animated.View>

      {/* Points de chargement */}
      <Animated.View style={[s.dots, { opacity: dotsOpacity }]}>
        <Animated.View style={[s.dot, { opacity: dot1 }]} />
        <Animated.View style={[s.dot, { opacity: dot2 }]} />
        <Animated.View style={[s.dot, { opacity: dot3 }]} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },

  /* Cercles décoratifs */
  deco1: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -100,
    right: -100,
  },
  deco2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 80,
    left: -70,
  },
  deco3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.07)",
    top: 120,
    left: -30,
  },
  deco4: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 180,
    right: 30,
  },

  /* Points de chargement */
  dots: {
    position: "absolute",
    bottom: 72,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});
