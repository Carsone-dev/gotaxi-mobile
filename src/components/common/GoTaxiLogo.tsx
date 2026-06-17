import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, radii } from "@/src/theme";

interface GoTaxiLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const CONFIG = {
  sm: { ring: 52, inner: 38, icon: 20, text: 24, tagline: 11 },
  md: { ring: 72, inner: 54, icon: 28, text: 32, tagline: 12 },
  lg: { ring: 92, inner: 68, icon: 34, text: 40, tagline: 14 },
};

export function GoTaxiLogo({ size = "md", showTagline = true }: GoTaxiLogoProps) {
  const c = CONFIG[size];

  return (
    <View style={s.wrap}>
      {/* Icône voiture */}
      <View style={[s.ring, { width: c.ring, height: c.ring, borderRadius: c.ring / 2 }]}>
        <View style={[s.inner, { width: c.inner, height: c.inner, borderRadius: c.inner / 2 }]}>
          <Ionicons name="car-sport" size={c.icon} color={colors.primary} />
        </View>
        <View style={[s.badge, size === "sm" && s.badgeSm]}>
          <Ionicons name="location-sharp" size={size === "sm" ? 7 : 9} color={colors.primary} />
        </View>
      </View>

      {/* Texte GoTaxi */}
      <View style={s.textRow}>
        <Text style={[s.go, { fontSize: c.text }]}>Go</Text>
        <Text style={[s.taxi, { fontSize: c.text }]}>Taxi</Text>
      </View>

      {/* Tagline optionnelle */}
      {showTagline && (
        <Text style={[s.tagline, { fontSize: c.tagline }]}>
          Votre taxi interurbain au Bénin
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  ring: {
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  inner: {
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeSm: {
    width: 15,
    height: 15,
    borderRadius: 8,
    bottom: 1,
    right: 1,
  },
  textRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
  },
  go: {
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    letterSpacing: -0.5,
    lineHeight: undefined,
  },
  taxi: {
    fontFamily: typography.fontFamily.extraBold,
    color: colors.yellow,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: typography.fontFamily.medium,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
