import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { useChauffeurStats, useChauffeurRevenus, useGoOnline, useGoOffline } from "@/src/hooks/useChauffeur";
import { useIncomingReservations } from "@/src/hooks/useReservations";
import { formatFCFA } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const { showToast } = useToast();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching } = useChauffeurStats();
  const { data: revenus } = useChauffeurRevenus();
  const { data: incoming } = useIncomingReservations();
  const { mutateAsync: goOnline, isPending: goingOnline } = useGoOnline();
  const { mutateAsync: goOffline, isPending: goingOffline } = useGoOffline();

  const isOnline = stats?.en_ligne ?? false;
  const pendingCount = incoming?.length ?? 0;

  const handleToggleOnline = async () => {
    try {
      if (isOnline) {
        await goOffline();
        showToast("Vous êtes maintenant hors ligne", "info");
      } else {
        await goOnline();
        showToast("Vous êtes maintenant en ligne", "success");
      }
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetchStats} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Tableau de bord</Text>
          <Text style={styles.name}>{user?.prenom} {user?.nom} 🚗</Text>
        </View>
        <Pressable
          onPress={handleToggleOnline}
          disabled={goingOnline || goingOffline}
          style={[styles.onlineToggle, isOnline ? styles.onlineActive : styles.onlineInactive]}
        >
          {goingOnline || goingOffline ? (
            <ActivityIndicator size="small" color={isOnline ? colors.white : colors.textSecondary} />
          ) : (
            <Text style={[styles.onlineLabel, isOnline && styles.onlineLabelActive]}>
              {isOnline ? "En ligne" : "Hors ligne"}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Revenus du jour</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.revenueAmount}>{formatFCFA(revenus?.aujourd_hui ?? 0)}</Text>
        )}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.nombre_trajets ?? 0}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatFCFA(revenus?.mois ?? 0)}</Text>
            <Text style={styles.statLabel}>Ce mois</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats?.note_moyenne ? stats.note_moyenne.toFixed(1) : "-"}
            </Text>
            <Text style={styles.statLabel}>Note ⭐</Text>
          </View>
        </View>
      </View>

      {pendingCount > 0 && (
        <Pressable
          style={styles.alertCard}
          onPress={() => router.push("/(chauffeur)/reservations" as any)}
        >
          <Text style={styles.alertIcon}>🔔</Text>
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>
              {pendingCount} réservation{pendingCount > 1 ? "s" : ""} en attente
            </Text>
            <Text style={styles.alertSub}>Appuyez pour voir et accepter</Text>
          </View>
          <Text style={styles.alertArrow}>›</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.quickActions}>
        <Pressable
          style={[styles.qaCard, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(chauffeur)/voyages/publish" as any)}
        >
          <Text style={styles.qaIcon}>🗺️</Text>
          <Text style={styles.qaLabel}>Publier un trajet</Text>
          <Text style={styles.qaDesc}>Nouveau départ</Text>
        </Pressable>
        <Pressable
          style={[styles.qaCard, { backgroundColor: colors.black }]}
          onPress={() => router.push("/(chauffeur)/reservations" as any)}
        >
          <Text style={styles.qaIcon}>📋</Text>
          <Text style={styles.qaLabel}>Réservations</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  name: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  onlineToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    minWidth: 90,
    alignItems: "center",
    minHeight: 32,
    justifyContent: "center",
  },
  onlineActive: { backgroundColor: colors.primary },
  onlineInactive: { backgroundColor: colors.border },
  onlineLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  onlineLabelActive: { color: colors.white },
  revenueCard: {
    margin: spacing["2xl"],
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.sm,
    ...shadows.lg,
  },
  revenueLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  revenueAmount: {
    fontSize: typography.fontSize["5xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.md,
    padding: spacing.md,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  statValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.6)",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningBg,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  alertIcon: { fontSize: 24 },
  alertInfo: { flex: 1 },
  alertTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.warningText,
  },
  alertSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.warningText,
  },
  alertArrow: {
    fontSize: typography.fontSize["2xl"],
    color: colors.warningText,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
  },
  qaCard: {
    flex: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.xs,
    ...shadows.md,
  },
  qaIcon: { fontSize: 32 },
  qaLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  qaDesc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.7)",
  },
  badge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.error,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});