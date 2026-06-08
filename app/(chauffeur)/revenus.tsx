import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useChauffeurRevenus, useChauffeurStats } from "@/src/hooks/useChauffeur";
import { useWallet } from "@/src/hooks/useWallet";
import { formatFCFA } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

export default function RevenusScreen() {
  const {
    data: revenus,
    isLoading: revLoading,
    refetch,
    isRefetching,
  } = useChauffeurRevenus();
  const { data: stats, isLoading: statsLoading } = useChauffeurStats();

  const { data: wallet } = useWallet();
  const isLoading = revLoading || statsLoading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Mes Revenus</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <>
          {/* Total card */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>REVENUS TOTAUX</Text>
            <Text style={styles.totalAmount}>{formatFCFA(revenus?.total ?? 0)}</Text>
            <Text style={styles.totalSub}>
              {stats?.nombre_trajets ?? 0} trajet{(stats?.nombre_trajets ?? 0) > 1 ? "s" : ""} effectué{(stats?.nombre_trajets ?? 0) > 1 ? "s" : ""}
            </Text>
          </View>

          {/* Solde wallet + bouton retrait */}
          <View style={styles.walletCard}>
            <View style={styles.walletLeft}>
              <View style={styles.walletIconWrap}>
                <Ionicons name="wallet" size={22} color={colors.success} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>Solde disponible</Text>
                <Text style={styles.walletAmount}>{formatFCFA(wallet?.solde ?? 0)}</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.retraitBtn, pressed && { opacity: 0.82 }]}
              onPress={() => router.push("/(chauffeur)/retrait" as any)}
            >
              <Ionicons name="arrow-up-circle" size={16} color={colors.white} />
              <Text style={styles.retraitBtnTxt}>Retirer</Text>
            </Pressable>
          </View>

          {/* Periods grid */}
          <View style={styles.periodsRow}>
            <View style={styles.periodCard}>
              <Text style={styles.periodLabel}>Aujourd'hui</Text>
              <Text style={styles.periodAmount}>{formatFCFA(revenus?.aujourd_hui ?? 0)}</Text>
            </View>
            <View style={styles.periodCard}>
              <Text style={styles.periodLabel}>Cette semaine</Text>
              <Text style={styles.periodAmount}>{formatFCFA(revenus?.semaine ?? 0)}</Text>
            </View>
          </View>

          <View style={[styles.periodCard, styles.periodCardFull]}>
            <Text style={styles.periodLabel}>Ce mois</Text>
            <Text style={[styles.periodAmount, styles.periodAmountLarge]}>
              {formatFCFA(revenus?.mois ?? 0)}
            </Text>
          </View>

          {/* Performance stats */}
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Performances</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Note moyenne</Text>
              <Text style={styles.statValue}>
                ⭐ {stats?.note_moyenne ? stats.note_moyenne.toFixed(1) : "—"}
              </Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Avis reçus</Text>
              <Text style={styles.statValue}>{stats?.nombre_avis ?? 0} avis</Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total trajets</Text>
              <Text style={styles.statValue}>{stats?.nombre_trajets ?? 0}</Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Statut</Text>
              <View
                style={[
                  styles.onlineBadge,
                  stats?.en_ligne ? styles.onlineBadgeActive : styles.onlineBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.onlineBadgeText,
                    stats?.en_ligne ? styles.onlineBadgeTextActive : null,
                  ]}
                >
                  {stats?.en_ligne ? "En ligne" : "Hors ligne"}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    gap: spacing.md,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.textPrimary,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  totalCard: {
    margin: spacing["2xl"],
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.lg,
  },
  totalLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  totalAmount: {
    fontSize: typography.fontSize["5xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
  },
  totalSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.6)",
  },

  // Wallet card
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing["2xl"],
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: `${colors.success}25`,
    ...shadows.sm,
  },
  walletLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  walletIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.successBg,
    alignItems: "center", justifyContent: "center",
  },
  walletInfo: { gap: 2 },
  walletLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  walletAmount: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.success,
  },
  retraitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retraitBtnTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  periodsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  periodCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.xs,
    ...shadows.sm,
  },
  periodCardFull: {
    flex: undefined,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing["2xl"],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  periodAmount: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  periodAmountLarge: {
    fontSize: typography.fontSize["2xl"],
  },
  statsCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  onlineBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  onlineBadgeActive: { backgroundColor: colors.successBg },
  onlineBadgeInactive: { backgroundColor: colors.border },
  onlineBadgeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  onlineBadgeTextActive: { color: colors.primary },
});
