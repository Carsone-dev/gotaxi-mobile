import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWallet, useWalletActivity } from "@/src/hooks/useWallet";
import { formatFCFA, formatRelative } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Transaction, TransactionType, TransactionStatut, OperateurMM } from "@/src/api/types";

// ── Opérateurs ────────────────────────────────────────────────────────────────
const OPERATEUR_CFG: Record<OperateurMM, { label: string; color: string }> = {
  MTN_MOMO:     { label: "MTN MoMo",     color: colors.mtnYellow },
  ORANGE_MONEY: { label: "Orange Money", color: colors.orangeOrange },
  MOOV_MONEY:   { label: "Moov Money",   color: colors.moovBlue },
};

// ── Types de transactions ─────────────────────────────────────────────────────
const TX_CFG: Record<TransactionType, { label: string; icon: string; sign: "+" | "-" }> = {
  RECHARGE:        { label: "Recharge",        icon: "arrow-down-circle", sign: "+" },
  PAIEMENT_VOYAGE: { label: "Voyage",          icon: "car-sport",         sign: "-" },
  PAIEMENT_COLIS:  { label: "Colis",           icon: "cube",              sign: "-" },
  REVERSEMENT:     { label: "Reversement",     icon: "swap-horizontal",   sign: "+" },
  REMBOURSEMENT:   { label: "Remboursement",   icon: "refresh-circle",    sign: "+" },
  COMMISSION:      { label: "Commission",      icon: "trending-down",     sign: "-" },
};

const STATUT_COLOR: Record<TransactionStatut, string> = {
  EN_ATTENTE: colors.warningText,
  EN_COURS:   colors.info,
  REUSSI:     colors.success,
  ECHEC:      colors.error,
  ANNULE:     colors.textMuted,
};

// ── Carte transaction ─────────────────────────────────────────────────────────
function TxCard({ tx }: { tx: Transaction }) {
  const cfg     = TX_CFG[tx.type] ?? TX_CFG.RECHARGE;
  const statCol = STATUT_COLOR[tx.statut] ?? colors.textMuted;
  const isCredit = cfg.sign === "+";
  const opLabel = tx.operateur ? OPERATEUR_CFG[tx.operateur]?.label : null;

  return (
    <View style={styles.txCard}>
      <View style={[styles.txIconWrap, { backgroundColor: isCredit ? colors.successBg : colors.errorBg }]}>
        <Ionicons
          name={cfg.icon as any}
          size={20}
          color={isCredit ? colors.success : colors.error}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txLabel}>{cfg.label}</Text>
        {opLabel ? <Text style={styles.txSub}>{opLabel}</Text> : null}
        <Text style={styles.txDate}>{formatRelative(tx.created_at)}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.textPrimary }]}>
          {isCredit ? "+" : "−"}{formatFCFA(tx.montant)}
        </Text>
        <View style={[styles.txStatutPill, { backgroundColor: `${statCol}18` }]}>
          <Text style={[styles.txStatutText, { color: statCol }]}>
            {tx.statut === "REUSSI" ? "Réussi"
              : tx.statut === "EN_ATTENTE" ? "En attente"
              : tx.statut === "EN_COURS" ? "En cours"
              : tx.statut === "ECHEC" ? "Échec"
              : "Annulé"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function WalletScreen() {
  const { data: wallet, isLoading, refetch, isRefetching } = useWallet();
  const { data: activity, isLoading: actLoading, refetch: refetchAct } = useWalletActivity(1);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchAct();
    }, [refetch, refetchAct]),
  );

  const handleRefresh = () => {
    refetch();
    refetchAct();
  };

  return (
    <View style={styles.root}>
      {/* ── Header fixe ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mon Wallet</Text>
          <Text style={styles.headerSub}>Gérez vos paiements GoTaxi</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          onPress={handleRefresh}
          disabled={isRefetching}
        >
          {isRefetching
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={styles.refreshIcon}>↻</Text>}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Carte solde ── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardAccent} />
          <View style={styles.balanceBody}>
            <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
            {isLoading ? (
              <ActivityIndicator color={colors.white} style={{ marginVertical: 8 }} />
            ) : (
              <Text style={styles.balanceAmount}>{formatFCFA(wallet?.solde ?? 0)}</Text>
            )}
            <View style={styles.balanceMeta}>
              <View style={[styles.balanceActivePill, { backgroundColor: wallet?.actif ? "rgba(255,255,255,0.2)" : "rgba(255,0,0,0.25)" }]}>
                <View style={[styles.balanceActiveDot, { backgroundColor: wallet?.actif ? "#4eff8f" : colors.error }]} />
                <Text style={styles.balanceActiveText}>{wallet?.actif ? "Actif" : "Inactif"}</Text>
              </View>
              <Text style={styles.balanceDevise}>{wallet?.devise ?? "XOF"}</Text>
            </View>
          </View>
        </View>

        {/* ── Actions rapides ── */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/(client)/wallet/recharge" as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.successBg }]}>
              <Ionicons name="arrow-down-circle" size={22} color={colors.success} />
            </View>
            <Text style={styles.actionLabel}>Recharger</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/(client)/wallet/retrait" as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.warningBg }]}>
              <Ionicons name="arrow-up-circle" size={22} color={colors.warningText} />
            </View>
            <Text style={styles.actionLabel}>Retirer</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/(client)/wallet/transfert" as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.infoBg }]}>
              <Ionicons name="swap-horizontal" size={22} color={colors.info} />
            </View>
            <Text style={styles.actionLabel}>Transférer</Text>
          </Pressable>
        </View>

        {/* ── Transactions récentes ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transactions récentes</Text>
        </View>

        {actLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["2xl"] }} />
        ) : !activity?.items.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyTitle}>Aucune transaction</Text>
            <Text style={styles.emptySub}>
              Rechargez votre wallet pour commencer à payer vos trajets et colis.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {activity.items.map((tx) => (
              <TxCard key={tx.id} tx={tx} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PT = Platform.OS === "ios" ? 56 : 40;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  refreshIcon: {
    fontSize: 18, color: colors.primary,
    fontFamily: typography.fontFamily.bold, lineHeight: 20,
  },

  content: { paddingBottom: 48 },

  // Carte solde
  balanceCard: {
    margin: spacing["2xl"],
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.lg,
  },
  balanceCardAccent: {
    position: "absolute",
    inset: 0,
    backgroundColor: colors.primaryDark,
  },
  balanceBody: {
    backgroundColor: colors.primary,
    padding: spacing["2xl"],
    gap: spacing.sm,
  },
  balanceLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  balanceAmount: {
    fontSize: typography.fontSize["5xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  balanceMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  balanceActivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  balanceActiveDot: { width: 7, height: 7, borderRadius: 4 },
  balanceActiveText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  balanceDevise: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: "rgba(255,255,255,0.5)",
  },

  // Actions rapides
  actionsRow: {
    flexDirection: "row",
    marginHorizontal: spacing["2xl"],
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },

  // Transactions
  txList: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  txInfo: { flex: 1, gap: 2 },
  txLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  txSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  txDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
  },
  txStatutPill: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  txStatutText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },

  // Empty
  empty: {
    alignItems: "center",
    paddingTop: spacing["4xl"],
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
