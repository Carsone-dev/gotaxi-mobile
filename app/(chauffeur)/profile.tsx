import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { Button } from "@/src/components/ui/Button";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

export default function ChauffeurProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : "?";

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.prenom} {user?.nom}</Text>
        <Text style={styles.phone}>{user?.telephone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Chauffeur</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/(chauffeur)/revenus" as any)}
        >
          <Text style={styles.menuIcon}>💰</Text>
          <Text style={styles.menuLabel}>Mes revenus</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/(chauffeur)/settings" as any)}
        >
          <Text style={styles.menuIcon}>🚗</Text>
          <Text style={styles.menuLabel}>Paramètres & véhicules</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable style={styles.menuItem}>
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={styles.menuLabel}>Aide & support</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>

      <Button variant="danger" onPress={handleLogout} style={styles.logoutBtn}>
        Se déconnecter
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingTop: 56, gap: spacing["2xl"], paddingBottom: 40 },
  header: {
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.sm,
    paddingBottom: spacing["2xl"],
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  name: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  phone: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  roleBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  roleText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  menu: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  menuIcon: { fontSize: 20, width: 28, textAlign: "center" },
  menuLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  menuArrow: {
    fontSize: typography.fontSize.xl,
    color: colors.textMuted,
  },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
  logoutBtn: { marginHorizontal: spacing["2xl"] },
});