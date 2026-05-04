import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSearchVoyages } from "@/src/hooks/useVoyages";
import { formatFCFA, formatDate, formatTime } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

type SortOption = "depart_asc" | "prix_asc" | "prix_desc";

export default function ResultsScreen() {
  const { ville_depart, ville_arrivee, date_depart, nombre_places } = useLocalSearchParams<{
    ville_depart: string;
    ville_arrivee: string;
    date_depart: string;
    nombre_places: string;
  }>();

  const [sortBy, setSortBy] = useState<SortOption>("depart_asc");
  const [climatise, setClimatise] = useState<boolean | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useSearchVoyages({
    ville_depart: ville_depart ?? "",
    ville_arrivee: ville_arrivee ?? "",
    date_depart: date_depart ?? "",
    nombre_places: nombre_places ? Number(nombre_places) : 1,
    climatise,
    sort_by: sortBy,
  });

  const filters: { label: string; onPress: () => void; active: boolean }[] = [
    {
      label: "Départ ↑",
      onPress: () => setSortBy("depart_asc"),
      active: sortBy === "depart_asc",
    },
    {
      label: "Prix ↑",
      onPress: () => setSortBy("prix_asc"),
      active: sortBy === "prix_asc",
    },
    {
      label: "Prix ↓",
      onPress: () => setSortBy("prix_desc"),
      active: sortBy === "prix_desc",
    },
    {
      label: "❄ Clim",
      onPress: () => setClimatise((c) => (c === true ? undefined : true)),
      active: climatise === true,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerRoute}>
            {ville_depart} → {ville_arrivee}
          </Text>
          <Text style={styles.headerSub}>
            {formatDate(date_depart ?? "")} · {nombre_places ?? 1} pers.
          </Text>
        </View>
      </View>

      <View style={styles.filtersRow}>
        {filters.map((f) => (
          <Pressable
            key={f.label}
            onPress={f.onPress}
            style={[styles.filterChip, f.active && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, f.active && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Impossible de charger les trajets.</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : !data?.items.length ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>Aucun trajet trouvé</Text>
          <Text style={styles.emptyText}>
            Essayez une autre date ou modifiez votre recherche.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Modifier la recherche</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: v }) => (
            <Pressable
              style={styles.voyageCard}
              onPress={() => router.push(`/(client)/voyages/${v.id}` as any)}
            >
              <View style={styles.cardTop}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeText}>{formatTime(v.date_depart)}</Text>
                  {v.date_arrivee_estimee && (
                    <Text style={styles.timeTextSub}>{formatTime(v.date_arrivee_estimee)}</Text>
                  )}
                </View>
                <View style={styles.routeLine}>
                  <View style={styles.dot} />
                  <View style={styles.line} />
                  <View style={[styles.dot, styles.dotEnd]} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.cityText}>{v.ville_depart}</Text>
                  <Text style={styles.distanceText}>
                    {v.distance_km ? `${v.distance_km} km` : ""}
                  </Text>
                  <Text style={styles.cityText}>{v.ville_arrivee}</Text>
                </View>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceText}>{formatFCFA(v.prix_par_place)}</Text>
                  <Text style={styles.priceSub}>/ pers.</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.tags}>
                  {v.climatise && <View style={styles.tag}><Text style={styles.tagText}>❄ Clim</Text></View>}
                  {v.non_fumeur && <View style={styles.tag}><Text style={styles.tagText}>🚭</Text></View>}
                  {v.accepte_colis && <View style={styles.tag}><Text style={styles.tagText}>📦 Colis</Text></View>}
                </View>
                <View style={[styles.tag, styles.tagPlaces]}>
                  <Text style={[styles.tagText, { color: v.nombre_places_restantes <= 2 ? colors.error : colors.success }]}>
                    {v.nombre_places_restantes} place{v.nombre_places_restantes > 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
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
  backBtn: { padding: spacing.xs },
  backText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  headerInfo: { flex: 1 },
  headerRoute: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  filterTextActive: { color: colors.white },
  list: { padding: spacing["2xl"], gap: spacing.md },
  voyageCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  timeBlock: { width: 48, alignItems: "flex-end" },
  timeText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  timeTextSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 16,
  },
  routeLine: { alignItems: "center", gap: 2, paddingVertical: 2 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  dotEnd: { backgroundColor: colors.black },
  line: { width: 2, height: 24, backgroundColor: colors.border },
  routeInfo: { flex: 1, justifyContent: "space-between", height: 52 },
  cityText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  distanceText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  priceBlock: { alignItems: "flex-end" },
  priceText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  priceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tags: { flexDirection: "row", gap: spacing.xs },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  tagPlaces: { backgroundColor: colors.successBg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["3xl"] },
  emptyIcon: { fontSize: 56, marginBottom: spacing.xl },
  emptyTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing["2xl"],
  },
  errorText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  retryBtn: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});