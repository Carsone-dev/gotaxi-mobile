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
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useVoyagesAcceptantColis } from "@/src/hooks/useColis";
import { formatFCFA } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage } from "@/src/api/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
const CAT_INFO: Record<string, { label: string; icon: string }> = {
  DOCUMENTS:    { label: "Documents",    icon: "📄" },
  VETEMENTS:    { label: "Vêtements",    icon: "👕" },
  ELECTRONIQUE: { label: "Électronique", icon: "📱" },
  ALIMENTAIRE:  { label: "Alimentaire",  icon: "🍱" },
  FRAGILE:      { label: "Fragile",      icon: "🔮" },
  AUTRE:        { label: "Autre",        icon: "📦" },
};

type StatutVoyage = "PUBLIE" | "COMPLET" | "EN_COURS" | string;

function statusConfig(statut: StatutVoyage) {
  switch (statut) {
    case "EN_COURS":
      return { label: "En route", bg: colors.infoBg,    text: colors.info,        accent: colors.info,    btnBg: colors.info    };
    case "COMPLET":
      return { label: "Complet",  bg: colors.warningBg, text: colors.warningText, accent: colors.warning, btnBg: colors.warning };
    default:
      return { label: "Disponible", bg: colors.successBg, text: colors.success, accent: colors.primary, btnBg: colors.primary };
  }
}

// ── Carte chauffeur ───────────────────────────────────────────────────────────
function VoyageCard({ voyage, onSelect }: { voyage: Voyage; onSelect: () => void }) {
  const sc = statusConfig(voyage.statut);

  return (
    <View style={styles.card}>
      {/* Accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: sc.accent }]} />

      <View style={styles.cardBody}>
        {/* Top : heure + date + statut */}
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardTime}>
              {format(new Date(voyage.date_depart), "HH:mm")}
            </Text>
            <Text style={styles.cardDate}>
              {format(new Date(voyage.date_depart), "EEEE d MMM", { locale: fr })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusBadgeText, { color: sc.text }]}>
              {sc.label}
            </Text>
          </View>
        </View>

        {/* Route timeline */}
        <View style={styles.route}>
          <View style={styles.routeStop}>
            <View style={styles.routeDotDepart} />
            <View style={styles.routeStopInfo}>
              <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
              {voyage.point_depart ? (
                <Text style={styles.routePoint} numberOfLines={1}>{voyage.point_depart}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.routeTimeline}>
            <View style={styles.routeTimelineLine} />
            {voyage.distance_km ? (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{voyage.distance_km} km</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.routeStop}>
            <View style={styles.routeDotArrivee} />
            <View style={styles.routeStopInfo}>
              <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
              {voyage.point_arrivee ? (
                <Text style={styles.routePoint} numberOfLines={1}>{voyage.point_arrivee}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Prix + tags */}
        <View style={styles.cardFooter}>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>📦 Colis accepté</Text>
            </View>
            {voyage.climatise && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>❄ Clim</Text>
              </View>
            )}
            {voyage.non_fumeur && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>🚭</Text>
              </View>
            )}
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{formatFCFA(voyage.prix_par_place)}</Text>
            <Text style={styles.priceLabel}>prix estimé</Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <Pressable style={[styles.ctaBtn, { backgroundColor: sc.btnBg }]} onPress={onSelect}>
        <Text style={styles.ctaBtnText}>
          {voyage.statut === "EN_COURS" ? "Confier le colis à ce chauffeur" : "Choisir ce chauffeur"}
        </Text>
        <Text style={styles.ctaBtnArrow}>→</Text>
      </Pressable>
    </View>
  );
}

// ── Paramètres ────────────────────────────────────────────────────────────────
type Params = {
  ville_depart:            string;
  ville_arrivee:           string;
  description:             string;
  categorie:               string;
  poids_kg:                string;
  fragile:                 string;
  destinataire_nom:        string;
  destinataire_telephone:  string;
  modalite_paiement:       string;
};

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function VoyagesColisScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Params>();
  const { ville_depart, ville_arrivee, categorie, poids_kg, fragile } = params;

  const { data: voyages, isLoading, refetch, isRefetching } = useVoyagesAcceptantColis(
    ville_depart ?? "",
    ville_arrivee ?? "",
  );

  const handleSelect = (voyage: Voyage) => {
    router.push({
      pathname: "/(client)/colis/confirmer" as any,
      params: { ...params, voyage_id: voyage.id },
    });
  };

  const catInfo = CAT_INFO[categorie ?? "AUTRE"] ?? CAT_INFO.AUTRE;
  const count = voyages?.length ?? 0;

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Choisir un chauffeur</Text>
          <Text style={styles.headerRoute}>{ville_depart} → {ville_arrivee}</Text>
        </View>
      </View>

      {/* ── Récap colis ── */}
      <View style={styles.colisBar}>
        <View style={styles.colisBarLeft}>
          <Text style={styles.colisBarIcon}>{catInfo.icon}</Text>
          <View>
            <Text style={styles.colisBarLabel}>{catInfo.label}</Text>
            <View style={styles.colisBarChips}>
              {poids_kg ? (
                <View style={styles.colisChip}>
                  <Text style={styles.colisChipText}>⚖ {poids_kg} kg</Text>
                </View>
              ) : null}
              {fragile === "1" && (
                <View style={[styles.colisChip, styles.colisChipWarn]}>
                  <Text style={[styles.colisChipText, styles.colisChipTextWarn]}>⚠ Fragile</Text>
                </View>
              )}
              <View style={styles.colisChip}>
                <Text style={styles.colisChipText}>📦 Colis</Text>
              </View>
            </View>
          </View>
        </View>
        {!isLoading && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {count} chauffeur{count !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* ── Contenu ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Recherche des chauffeurs…</Text>
          <Text style={styles.loadingHint}>Trajet {ville_depart} → {ville_arrivee}</Text>
        </View>
      ) : count === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🚚</Text>
          <Text style={styles.emptyTitle}>Aucun chauffeur disponible</Text>
          <Text style={styles.emptyText}>
            Il n'y a pas de voyage {ville_depart} → {ville_arrivee} acceptant les colis pour le moment.
          </Text>
          <View style={styles.emptyActions}>
            <Pressable style={styles.emptyBtnPrimary} onPress={() => refetch()}>
              <Text style={styles.emptyBtnPrimaryText}>↻  Actualiser</Text>
            </Pressable>
            <Pressable style={styles.emptyBtnSecondary} onPress={() => router.back()}>
              <Text style={styles.emptyBtnSecondaryText}>Modifier la recherche</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={voyages}
          keyExtractor={(v) => String(v.id)}
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
          renderItem={({ item }) => (
            <VoyageCard voyage={item} onSelect={() => handleSelect(item)} />
          )}
        />
      )}
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
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  backBtnText: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.primary, lineHeight: 24 },
  headerTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  headerRoute: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary, marginTop: 2 },

  // Colis summary bar
  colisBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    backgroundColor: `${colors.primary}08`,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.primary}20`,
  },
  colisBarLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  colisBarIcon: { fontSize: 28 },
  colisBarLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  colisBarChips: { flexDirection: "row", gap: spacing.xs, marginTop: 3, flexWrap: "wrap" },
  colisChip: {
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  colisChipText: { fontSize: 10, fontFamily: typography.fontFamily.medium, color: colors.primary },
  colisChipWarn: { borderColor: `${colors.warning}40`, backgroundColor: colors.warningBg },
  colisChipTextWarn: { color: colors.warningText },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  countBadgeText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, color: colors.white },

  // States
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    gap: spacing.md,
  },
  loadingText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  loadingHint: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textMuted },

  emptyEmoji: { fontSize: 56, marginBottom: spacing.sm },
  emptyTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  emptyBtnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  emptyBtnPrimaryText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.white },
  emptyBtnSecondary: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  emptyBtnSecondaryText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.primary },

  // List
  listContent: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardAccent: { height: 4 },
  cardBody: { padding: spacing.xl, gap: spacing.md },

  // Card top
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTime: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  cardDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
  },

  // Route timeline
  route: { gap: 2 },
  routeStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  routeDotDepart: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.primary, marginTop: 4,
    borderWidth: 2.5, borderColor: `${colors.primary}35`,
  },
  routeDotArrivee: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.black, marginTop: 4,
    borderWidth: 2.5, borderColor: `${colors.black}35`,
  },
  routeStopInfo: { flex: 1 },
  routeTimeline: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 5,
    gap: spacing.sm,
    marginVertical: 2,
  },
  routeTimelineLine: { width: 2, height: 18, backgroundColor: colors.border },
  distanceBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distanceText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.textMuted },
  routeCity: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  routePoint: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, maxWidth: 260, marginTop: 1 },

  // Footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.xs,
  },
  tags: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap", flex: 1 },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  priceBlock: { alignItems: "flex-end" },
  price: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.extraBold, color: colors.primary },
  priceLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted },

  // CTA
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  ctaBtnText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: colors.white },
  ctaBtnArrow: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: `${colors.white}cc` },
});
