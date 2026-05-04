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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMesColis } from "@/src/hooks/useColis";
import { formatFCFA } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Colis, ColisStatut } from "@/src/api/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<ColisStatut, { label: string; color: string; bg: string }> = {
  EN_ATTENTE:  { label: "En attente",  color: colors.warningText, bg: colors.warningBg },
  CONFIRME:    { label: "Confirmé",    color: colors.info,        bg: colors.infoBg    },
  EN_TRANSIT:  { label: "En transit",  color: colors.primary,     bg: colors.successBg },
  LIVRE:       { label: "Livré",       color: colors.success,     bg: colors.successBg },
  ANNULE:      { label: "Annulé",      color: colors.error,       bg: colors.errorBg   },
};

const CATEGORIE_ICON: Record<string, string> = {
  DOCUMENTS:   "📄",
  VETEMENTS:   "👕",
  ELECTRONIQUE:"📱",
  ALIMENTAIRE: "🍱",
  FRAGILE:     "🔮",
  AUTRE:       "📦",
};

// ─── Carte colis ──────────────────────────────────────────────────────────────

function ColisCard({ colis }: { colis: Colis }) {
  const cfg = STATUT_CONFIG[colis.statut] ?? { label: colis.statut, color: colors.textMuted, bg: colors.surface };
  const icon = CATEGORIE_ICON[colis.categorie] ?? "📦";

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(client)/colis/${colis.id}` as any)}
    >
      <View style={styles.cardLeft}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardRoute} numberOfLines={1}>
            {colis.ville_depart} → {colis.ville_arrivee}
          </Text>
          <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={styles.cardDesc} numberOfLines={1}>
          {colis.description}
        </Text>

        <View style={styles.cardPrix}>
          <Text style={styles.cardPrixValue}>{formatFCFA(colis.prix)}</Text>
          <View style={styles.modalitePill}>
            <Text style={styles.modalitePillText}>
              {colis.modalite_paiement === "A_LA_CONFIRMATION" ? "À la confirmation" : "À la livraison"}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardCode}>#{colis.code_suivi}</Text>
          <Text style={styles.cardDate}>
            {format(new Date(colis.created_at), "d MMM", { locale: fr })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ColisScreen() {
  const { data: colis, isLoading, refetch, isRefetching } = useMesColis();

  const actifs  = colis?.filter((c) => c.statut !== "LIVRE" && c.statut !== "ANNULE") ?? [];
  const archives = colis?.filter((c) => c.statut === "LIVRE" || c.statut === "ANNULE") ?? [];

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mes Colis</Text>
          <Text style={styles.subtitle}>Envoi et suivi de colis</Text>
        </View>
        <Pressable onPress={() => refetch()} disabled={isRefetching}>
          {isRefetching
            ? <ActivityIndicator color={colors.primary} size="small" />
            : <Text style={styles.refreshBtn}>↻</Text>}
        </Pressable>
      </View>

      {/* CTA Envoyer */}
      <Pressable
        style={styles.sendBtn}
        onPress={() => router.push("/(client)/colis/nouveau" as any)}
      >
        <View style={styles.sendBtnLeft}>
          <Text style={styles.sendIcon}>📦</Text>
          <View>
            <Text style={styles.sendLabel}>Envoyer un colis</Text>
            <Text style={styles.sendSub}>Choisissez un chauffeur sur votre trajet</Text>
          </View>
        </View>
        <View style={styles.sendArrow}>
          <Text style={styles.sendArrowText}>›</Text>
        </View>
      </Pressable>

      {/* Liste */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Colis actifs */}
          {actifs.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>En cours ({actifs.length})</Text>
              {actifs.map((c) => <ColisCard key={c.id} colis={c} />)}
            </>
          )}

          {/* Archivés */}
          {archives.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
                Historique ({archives.length})
              </Text>
              {archives.map((c) => <ColisCard key={c.id} colis={c} />)}
            </>
          )}

          {/* Vide */}
          {!isLoading && (colis?.length ?? 0) === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Aucun colis envoyé</Text>
              <Text style={styles.emptySub}>
                Envoyez votre premier colis avec un chauffeur GoTaxi
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    fontSize: 22,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
    paddingTop: 4,
  },

  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    marginHorizontal: spacing["2xl"],
    marginTop: spacing.xl,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  sendBtnLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  sendIcon: { fontSize: 28 },
  sendLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  sendSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  sendArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  sendArrowText: {
    fontSize: 20, color: colors.white,
    fontFamily: typography.fontFamily.bold, lineHeight: 24,
  },

  list: { flex: 1 },
  listContent: { padding: spacing["2xl"], paddingBottom: 40 },

  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },

  card: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardLeft: { justifyContent: "center" },
  iconBox: {
    width: 48, height: 48, borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  iconText: { fontSize: 24 },
  cardBody: { flex: 1, gap: 6 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardRoute: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  pillText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  cardDesc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  cardPrix: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardPrixValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  modalitePill: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalitePillText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardCode: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  cardDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  empty: {
    alignItems: "center",
    paddingTop: spacing["4xl"],
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing["2xl"],
    lineHeight: 20,
  },
});
