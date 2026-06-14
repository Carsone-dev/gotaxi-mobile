import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMesColis } from "@/src/hooks/useColis";
import { formatFCFA } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Colis, ColisStatut } from "@/src/api/types";

// ── Constantes ────────────────────────────────────────────────────────────────
const STATUT_CFG: Record<ColisStatut, { label: string; color: string; bg: string; icon: string }> = {
  EN_ATTENTE: { label: "En attente",  color: colors.warningText, bg: colors.warningBg, icon: "⏳" },
  CONFIRME:   { label: "Confirmé",    color: colors.info,        bg: colors.infoBg,    icon: "✅" },
  EN_TRANSIT: { label: "En transit",  color: colors.primary,     bg: colors.successBg, icon: "🚗" },
  LIVRE:      { label: "Livré",       color: colors.success,     bg: colors.successBg, icon: "🎉" },
  ANNULE:     { label: "Annulé",      color: colors.error,       bg: colors.errorBg,   icon: "❌" },
};

const CAT_ICON: Record<string, string> = {
  DOCUMENTS: "📄", VETEMENTS: "👕", ELECTRONIQUE: "📱",
  ALIMENTAIRE: "🍱", FRAGILE: "🔮", AUTRE: "📦",
};

// ── Types de nœud FlatList ────────────────────────────────────────────────────
type NodeHeader = { kind: "header"; title: string; count: number };
type NodeColis  = { kind: "colis";  data: Colis };
type Node = NodeHeader | NodeColis;

// ── Carte colis ───────────────────────────────────────────────────────────────
function ColisCard({ colis }: { colis: Colis }) {
  const cfg  = STATUT_CFG[colis.statut] ?? { label: colis.statut, color: colors.textMuted, bg: colors.surface, icon: "📦" };
  const icon = CAT_ICON[colis.categorie] ?? "📦";
  const isArchived = colis.statut === "LIVRE" || colis.statut === "ANNULE";

  return (
    <Pressable
      style={[styles.card, isArchived && styles.cardArchived]}
      onPress={() => router.push(`/(client)/colis/${colis.id}` as any)}
    >
      {/* Accent gauche */}
      <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />

      {/* Icône catégorie */}
      <View style={[styles.catWrap, { backgroundColor: cfg.bg }]}>
        <Text style={styles.catIcon}>{icon}</Text>
      </View>

      {/* Corps */}
      <View style={styles.cardBody}>
        {/* Ligne 1 : route + statut */}
        <View style={styles.cardRow}>
          <Text style={styles.cardRoute} numberOfLines={1}>
            {colis.ville_depart} → {colis.ville_arrivee}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusPillText, { color: cfg.color }]}>
              {cfg.icon}  {cfg.label}
            </Text>
          </View>
        </View>

        {/* Ligne 2 : description */}
        <Text style={styles.cardDesc} numberOfLines={1}>{colis.description}</Text>

        {/* Ligne 3 : prix + code + date */}
        <View style={styles.cardMeta}>
          <Text style={styles.cardPrice}>{formatFCFA(colis.prix)}</Text>
          <Text style={styles.cardMetaSep}>·</Text>
          <Text style={styles.cardCode}>#{colis.code_suivi}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.cardDate}>
            {format(new Date(colis.created_at), "d MMM", { locale: fr })}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function ColisScreen() {
  const insets = useSafeAreaInsets();
  const { data: colis, isLoading, refetch, isRefetching } = useMesColis();

  const actifs   = colis?.filter((c) => c.statut !== "LIVRE" && c.statut !== "ANNULE") ?? [];
  const archives = colis?.filter((c) => c.statut === "LIVRE" || c.statut === "ANNULE") ?? [];
  const total    = colis?.length ?? 0;

  // Construction du tableau plat pour FlatList
  const nodes: Node[] = [
    ...(actifs.length > 0
      ? [
          { kind: "header" as const, title: "En cours", count: actifs.length },
          ...actifs.map((c) => ({ kind: "colis" as const, data: c })),
        ]
      : []),
    ...(archives.length > 0
      ? [
          { kind: "header" as const, title: "Historique", count: archives.length },
          ...archives.map((c) => ({ kind: "colis" as const, data: c })),
        ]
      : []),
  ];

  const ListHeader = (
    <>
      {/* Stats chips */}
      {total > 0 && (
        <View style={styles.statsRow}>
          {actifs.length > 0 && (
            <View style={styles.statChip}>
              <Text style={styles.statChipDot}>●</Text>
              <Text style={styles.statChipText}>{actifs.length} en cours</Text>
            </View>
          )}
          {archives.length > 0 && (
            <View style={[styles.statChip, styles.statChipGray]}>
              <Text style={styles.statChipText}>{archives.length} archivé{archives.length > 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>
      )}

      {/* CTA Envoyer */}
      <Pressable
        style={styles.sendCard}
        onPress={() => router.push("/(client)/colis/nouveau" as any)}
      >
        <View style={styles.sendCardBg}>
          <Text style={styles.sendCardBgEmoji}>📦</Text>
        </View>
        <View style={styles.sendCardLeft}>
          <View style={styles.sendIconWrap}>
            <Text style={styles.sendIcon}>📦</Text>
          </View>
          <View>
            <Text style={styles.sendTitle}>Envoyer un colis</Text>
            <Text style={styles.sendSub}>Trouvez un chauffeur sur votre trajet</Text>
          </View>
        </View>
        <View style={styles.sendArrow}>
          <Text style={styles.sendArrowText}>→</Text>
        </View>
      </Pressable>

      {/* Chargement inline */}
      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.loadingText}>Chargement de vos colis…</Text>
        </View>
      )}
    </>
  );

  const ListEmpty = !isLoading ? (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={styles.emptyTitle}>Aucun colis envoyé</Text>
      <Text style={styles.emptySub}>
        Envoyez votre premier colis avec un chauffeur GoTaxi en quelques étapes.
      </Text>
      <Pressable style={styles.emptyBtn} onPress={() => router.push("/(client)/colis/nouveau" as any)}>
        <Text style={styles.emptyBtnText}>📦  Envoyer un colis</Text>
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mes Colis</Text>
          <Text style={styles.headerSub}>Envoi et suivi</Text>
        </View>
        <Pressable
          style={styles.refreshBtn}
          onPress={() => refetch()}
          disabled={isRefetching}
          hitSlop={8}
        >
          {isRefetching
            ? <ActivityIndicator color={colors.primary} size="small" />
            : <Text style={styles.refreshIcon}>↻</Text>}
        </Pressable>
      </View>

      {/* ── Liste ── */}
      <FlatList<Node>
        data={nodes}
        keyExtractor={(n, i) => n.kind === "colis" ? String(n.data.id) : `h-${i}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => {
          if (item.kind === "header") {
            return (
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>{item.title}</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{item.count}</Text>
                </View>
              </View>
            );
          }
          return <ColisCard colis={item.data} />;
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PT = Platform.OS === "ios" ? 56 : 40;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  refreshIcon: { fontSize: 18, color: colors.primary, fontFamily: typography.fontFamily.bold },

  // List
  listContent: { padding: spacing.xl, gap: spacing.md, paddingBottom: 48 },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.primary}12`,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  statChipGray: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  statChipDot: { fontSize: 8, color: colors.primary },
  statChipText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, color: colors.primary },

  // Send card
  sendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: "hidden",
    ...shadows.md,
  },
  sendCardBg: {
    position: "absolute",
    right: -10, bottom: -10,
    opacity: 0.12,
  },
  sendCardBgEmoji: { fontSize: 72 },
  sendCardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  sendIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  sendIcon: { fontSize: 22 },
  sendTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.white },
  sendSub:   { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  sendArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  sendArrowText: { fontSize: 18, color: colors.white, fontFamily: typography.fontFamily.bold },

  // Loading
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing["2xl"],
  },
  loadingText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textMuted },

  // Section headers
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
  },

  // Colis card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardArchived: { opacity: 0.7 },
  cardAccent: { width: 4, alignSelf: "stretch" },
  catWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    marginLeft: spacing.md,
  },
  catIcon: { fontSize: 22 },
  cardBody: { flex: 1, padding: spacing.md, gap: 4 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardRoute: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  statusPill: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
  },
  cardDesc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardPrice: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  cardMetaSep: { fontSize: typography.fontSize.xs, color: colors.border },
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
  chevron: {
    fontSize: 24,
    color: colors.border,
    fontFamily: typography.fontFamily.regular,
    paddingRight: spacing.md,
  },

  // Empty state
  empty: {
    alignItems: "center",
    paddingTop: spacing["3xl"],
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
  },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.sm },
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
  emptyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    ...shadows.sm,
  },
  emptyBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});
