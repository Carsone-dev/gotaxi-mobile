import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { colors, typography, spacing } from "@/src/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>Page introuvable</Text>
      <Link href="/(auth)/login" style={styles.link}>
        Retour à l'accueil
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    gap: spacing.xl,
  },
  emoji: { fontSize: 64 },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  link: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
});