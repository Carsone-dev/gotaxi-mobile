import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import { Button } from "@/src/components/ui/Button";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleChauffeurMode = useAuthStore((s) => s.toggleChauffeurMode);
  const isChauffeurMode = useAuthStore((s) => s.isChauffeurMode);

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : "?";

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.prenom} {user?.nom}</Text>
        <Text style={styles.phone}>{user?.telephone}</Text>
        <View style={[styles.badge, user?.telephone_verifie ? styles.badgeVerified : styles.badgePending]}>
          <Text style={styles.badgeText}>
            {user?.telephone_verifie ? "✓ Vérifié" : "En attente de vérification"}
          </Text>
        </View>
      </View>

      <View style={styles.menu}>
        {user?.role === "CHAUFFEUR" && (
          <Pressable style={styles.menuItem} onPress={toggleChauffeurMode}>
            <Text style={styles.menuLabel}>Mode chauffeur</Text>
            <Text style={[styles.menuValue, isChauffeurMode ? styles.menuValueActive : null]}>
              {isChauffeurMode ? "Actif" : "Inactif"}
            </Text>
          </Pressable>
        )}
        <Pressable style={styles.menuItem} onPress={() => router.push("/(auth)/otp" as any)}>
          <Text style={styles.menuLabel}>Vérifier mon numéro</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable style={styles.menuItem}>
          <Text style={styles.menuLabel}>Paramètres</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <Pressable style={styles.menuItem}>
          <Text style={styles.menuLabel}>Aide</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>

      <Button variant="danger" onPress={handleLogout} style={styles.logoutBtn}>
        Se déconnecter
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingTop: 56,
    gap: spacing["2xl"],
  },
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
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    marginTop: spacing.xs,
  },
  badgeVerified: { backgroundColor: colors.successBg },
  badgePending: { backgroundColor: colors.warningBg },
  badgeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  menuLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  menuValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  menuValueActive: { color: colors.primary },
  menuArrow: {
    fontSize: typography.fontSize.xl,
    color: colors.textMuted,
  },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
  logoutBtn: { marginHorizontal: spacing["2xl"] },
});