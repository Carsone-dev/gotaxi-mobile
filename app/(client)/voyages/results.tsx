import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSearchVoyages } from "@/src/hooks/useVoyages";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage } from "@/src/api/types";

// ── Tri / filtres ─────────────────────────────────────────────────────────────
type SortOption = "depart_asc" | "prix_asc" | "prix_desc";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "depart_asc", label: "Départ ↑" },
  { key: "prix_asc",   label: "Prix ↑"   },
  { key: "prix_desc",  label: "Prix ↓"   },
];

// ── Couleur accent selon places ───────────────────────────────────────────────
function accentColor(v: Voyage): string {
  if (v.statut === "COMPLET" || v.nombre_places_restantes === 0) return colors.error;
  if (v.nombre_places_restantes <= 2)  return colors.orangeOrange;
  return colors.primary;
}

// ── Carte voyage ──────────────────────────────────────────────────────────────
function VoyageCard({ voyage, index }: { voyage: Voyage; index: number }) {
  const accent    = accentColor(voyage);
  const isFull    = voyage.statut === "COMPLET" || voyage.nombre_places_restantes === 0;
  const fewPlaces = !isFull && voyage.nombre_places_restantes <= 2;

  return (
    <Animated.View entering={FadeInDown.duration(260).delay(index * 55)}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/(client)/voyages/${voyage.id}` as any)}
      >
        {/* Accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: accent }]} />

        <View style={styles.cardInner}>
          {/* Ligne principale : timeline + villes + prix */}
          <View style={styles.mainRow}>
            {/* Timeline verticale */}
            <View style={styles.vtWrap}>
              <View style={[styles.vtDot, styles.vtDotStart]} />
              <View style={styles.vtLine} />
              <View style={[styles.vtDot, styles.vtDotEnd]} />
            </View>

            {/* Villes + distance */}
            <View style={styles.citiesCol}>
              <Text style={styles.cityTxt}>{voyage.ville_depart}</Text>
              {voyage.distance_km ? (
                <View style={styles.distPill}>
                  <Text style={styles.distTxt}>{voyage.distance_km} km</Text>
                </View>
              ) : <View style={{ height: 20 }} />}
              <Text style={styles.cityTxt}>{voyage.ville_arrivee}</Text>
            </View>

            {/* Séparateur */}
            <View style={styles.vDivider} />

            {/* Horaires */}
            <View style={styles.timesCol}>
              <Text style={styles.timeLarge}>{formatTime(voyage.date_depart)}</Text>
              {voyage.date_arrivee_estimee ? (
                <Text style={styles.timeSub}>{formatTime(voyage.date_arrivee_estimee)}</Text>
              ) : null}
            </View>

            {/* Prix */}
            <View style={styles.priceCol}>
              <Text style={styles.priceAmt}>{formatFCFA(voyage.prix_par_place)}</Text>
              <Text style={styles.priceSub}>/ pers.</Text>
            </View>
          </View>

          {/* Ligne bas : tags + badge places */}
          <View style={styles.bottomRow}>
            <View style={styles.tagsWrap}>
              {voyage.climatise && (
                <View style={styles.tag}>
                  <Text style={styles.tagTxt}>❄️ Clim</Text>
                </View>
              )}
              {voyage.non_fumeur && (
                <View style={styles.tag}>
                  <Text style={styles.tagTxt}>🚭</Text>
                </View>
              )}
              {voyage.accepte_colis && (
                <View style={styles.tag}>
                  <Text style={styles.tagTxt}>📦 Colis</Text>
                </View>
              )}
            </View>

            <View style={[
              styles.placesBadge,
              fewPlaces && styles.placesBadgeWarn,
              isFull    && styles.placesBadgeFull,
            ]}>
              <Text style={[
                styles.placesTxt,
                fewPlaces && styles.placesTxtWarn,
                isFull    && styles.placesTxtFull,
              ]}>
                {isFull
                  ? "Complet"
                  : `${voyage.nombre_places_restantes} pl.`}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function ResultsScreen() {
  const { ville_depart, ville_arrivee, date_depart, nombre_places } =
    useLocalSearchParams<{
      ville_depart: string;
      ville_arrivee: string;
      date_depart: string;
      nombre_places: string;
    }>();

  const [sortBy,    setSortBy]   = useState<SortOption>("depart_asc");
  const [climatise, setClimatise] = useState<boolean | undefined>(undefined);

  const { data, isLoading, isError, refetch, isRefetching } = useSearchVoyages({
    ville_depart:   ville_depart  ?? "",
    ville_arrivee:  ville_arrivee ?? "",
    date_depart:    date_depart   ?? "",
    nombre_places:  nombre_places ? Number(nombre_places) : 1,
    climatise,
    sort_by: sortBy,
  });

  const resultCount = data?.items.length ?? 0;

  // Date formatée pour le sous-titre
  const dateLabel = date_depart
    ? format(new Date(date_depart), "EEE d MMM", { locale: fr })
    : "";

  return (
    <View style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerRouteRow}>
            <Text style={styles.headerRoute} numberOfLines={1}>
              {ville_depart}
              <Text style={styles.headerArrow}> → </Text>
              {ville_arrivee}
            </Text>
            {!isLoading && resultCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeTxt}>{resultCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSub}>
            {dateLabel}
            {dateLabel ? " · " : ""}
            {nombre_places ?? 1} pers.
          </Text>
        </View>

        <Pressable
          onPress={() => refetch()}
          disabled={isLoading || isRefetching}
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
        >
          {isLoading || isRefetching
            ? <ActivityIndicator color={colors.primary} size="small" />
            : <Text style={styles.refreshIcon}>↻</Text>
          }
        </Pressable>
      </View>

      {/* ── Filtres ─────────────────────────────────────────────── */}
      <View style={styles.filtersBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              style={[styles.filterChip, sortBy === opt.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterTxt, sortBy === opt.key && styles.filterTxtActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}

          <View style={styles.filterSep} />

          <Pressable
            onPress={() => setClimatise((c) => (c === true ? undefined : true))}
            style={[styles.filterChip, climatise === true && styles.filterChipActive]}
          >
            <Text style={[styles.filterTxt, climatise === true && styles.filterTxtActive]}>
              ❄️ Climatisé
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* ── Contenu ─────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingTxt}>Recherche en cours…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={styles.stateTitle}>Impossible de charger les trajets</Text>
          <Text style={styles.stateSub}>Vérifiez votre connexion et réessayez.</Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.ctaBtnTxt}>Réessayer</Text>
          </Pressable>
        </View>
      ) : resultCount === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.stateEmoji}>🔍</Text>
          <Text style={styles.stateTitle}>Aucun trajet trouvé</Text>
          <Text style={styles.stateSub}>
            Essayez une autre date, supprimez les filtres ou modifiez votre trajet.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.ctaBtnTxt}>Modifier la recherche</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<Voyage>
          data={data!.items}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <VoyageCard voyage={item} index={index} />
          )}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing["2xl"],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 22,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 26,
    marginTop: -1,
  },
  headerCenter: { flex: 1 },
  headerRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerRoute: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  headerArrow: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  countBadgeTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  headerSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
    marginTop: 1,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIcon: {
    fontSize: 18,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 20,
  },

  // Filtres
  filtersBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersContent: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  filterTxtActive: { color: colors.white },
  filterSep: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },

  // Liste
  listContent: {
    padding: spacing["2xl"],
    paddingBottom: 40,
    gap: spacing.md,
  },

  // Carte voyage
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardPressed: { opacity: 0.85 },
  cardAccent: { height: 4 },
  cardInner: {
    padding: spacing.xl,
    gap: spacing.md,
  },

  // Ligne principale
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  // Timeline verticale
  vtWrap: {
    alignItems: "center",
    gap: 3,
    width: 14,
  },
  vtDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  vtDotStart: { backgroundColor: colors.primary },
  vtDotEnd:   { backgroundColor: colors.black },
  vtLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: colors.border,
    borderRadius: 1,
  },

  // Villes
  citiesCol: {
    flex: 1,
    gap: 4,
    justifyContent: "space-between",
    minHeight: 52,
  },
  cityTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  distPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },

  // Séparateur vertical
  vDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
  },

  // Horaires
  timesCol: {
    alignItems: "flex-end",
    gap: 4,
    justifyContent: "space-between",
    minHeight: 52,
  },
  timeLarge: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  timeSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // Prix
  priceCol: { alignItems: "flex-end", minWidth: 72 },
  priceAmt: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  priceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: -2,
  },

  // Ligne bas
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tagsWrap: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  placesBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  placesBadgeWarn: { backgroundColor: `${colors.orangeOrange}18` },
  placesBadgeFull: { backgroundColor: colors.errorBg },
  placesTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.success,
  },
  placesTxtWarn: { color: colors.orangeOrange },
  placesTxtFull: { color: colors.error },

  // États centraux
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
    gap: spacing.md,
  },
  loadingTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  stateEmoji: { fontSize: 52 },
  stateTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  stateSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  ctaBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.md,
  },
  ctaBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});
