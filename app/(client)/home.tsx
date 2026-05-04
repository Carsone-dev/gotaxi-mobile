import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { router } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthStore } from "@/src/stores/authStore";
import { usePopularVoyages } from "@/src/hooks/useVoyages";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage } from "@/src/api/types";

const MAP_HEIGHT = Dimensions.get("window").height * 0.48;

const BENIN_REGION = {
  latitude: 9.3077,
  longitude: 2.3158,
  latitudeDelta: 6,
  longitudeDelta: 4,
};

function markerColor(v: Voyage): string {
  if (v.statut === "COMPLET") return colors.error;
  if (v.nombre_places_restantes < v.nombre_places_total) return colors.orangeOrange;
  return colors.primary;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

// ── Carte voyage verticale ────────────────────────────────────────────────────
function VoyageCard({ voyage, onMarkerFocus }: { voyage: Voyage; onMarkerFocus: (v: Voyage) => void }) {
  const statusColor = markerColor(voyage);
  const statusLabel =
    voyage.statut === "COMPLET"
      ? "Complet"
      : voyage.nombre_places_restantes < voyage.nombre_places_total
      ? "En chargement"
      : "Disponible";

  return (
    <Pressable
      style={styles.voyageCard}
      onPress={() => {
        onMarkerFocus(voyage);
        router.push(`/(client)/voyages/${voyage.id}` as any);
      }}
    >
      {/* Ligne 1 : route + statut */}
      <View style={styles.cardTop}>
        <Text style={styles.cardRoute} numberOfLines={1}>
          {voyage.ville_depart} → {voyage.ville_arrivee}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Ligne 2 : point de départ */}
      <View style={styles.cardPointRow}>
        <Text style={styles.cardPointIcon}>📍</Text>
        <Text style={styles.cardPoint} numberOfLines={1}>
          {voyage.point_depart}
        </Text>
      </View>

      {/* Ligne 3 : heure, date, prix, places */}
      <View style={styles.cardBottom}>
        <View style={styles.cardTimeBlock}>
          <Text style={styles.cardTime}>{formatTime(voyage.date_depart)}</Text>
          <Text style={styles.cardDate}>
            {format(new Date(voyage.date_depart), "EEE d MMM", { locale: fr })}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardPrice}>{formatFCFA(voyage.prix_par_place)}</Text>
          <Text style={styles.cardPriceSub}>/ pers.</Text>
          <View style={styles.cardPlaceBadge}>
            <Text style={styles.cardPlaceText}>{voyage.nombre_places_restantes} pl.</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: voyages, isLoading, refetch, isRefetching } = usePopularVoyages();
  const mapRef = useRef<MapView>(null);

  // Marqueurs sur la carte : uniquement les trajets avec coordonnées GPS valides
  const mapMarkers =
    voyages?.filter(
      (v) =>
        (v.statut === "PUBLIE" || v.statut === "COMPLET") &&
        v.lat_depart &&
        v.lng_depart,
    ) ?? [];

  // Liste sous les boutons : tous les trajets disponibles, avec ou sans GPS
  const listVoyages =
    voyages?.filter((v) => v.statut === "PUBLIE" || v.statut === "COMPLET") ?? [];

  const focusOnMarker = useCallback((v: Voyage) => {
    mapRef.current?.animateToRegion(
      {
        latitude: v.lat_depart,
        longitude: v.lng_depart,
        latitudeDelta: 0.6,
        longitudeDelta: 0.6,
      },
      400,
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* ── CARTE ─────────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={BENIN_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {mapMarkers.map((v) => (
            <Marker
              key={v.id}
              coordinate={{ latitude: v.lat_depart, longitude: v.lng_depart }}
              pinColor={markerColor(v)}
              title={`${v.ville_depart} → ${v.ville_arrivee}`}
              description={`${formatFCFA(v.prix_par_place)} · ${v.nombre_places_restantes} place${v.nombre_places_restantes > 1 ? "s" : ""}`}
              onPress={() => focusOnMarker(v)}
            />
          ))}
        </MapView>

        {/* En-tête flottant */}
        <View style={styles.mapHeader} pointerEvents="box-none">
          <View style={styles.headerCard} pointerEvents="auto">
            <View>
              <Text style={styles.greetingText}>{greeting()},</Text>
              <Text style={styles.nameText}>
                {user?.prenom} {user?.nom}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(client)/profile" as any)}
              style={styles.avatarBtn}
            >
              <Text style={styles.avatarText}>
                {user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : "?"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Légende */}
        <View style={styles.legend} pointerEvents="none">
          {[
            { color: colors.primary, label: "Disponible" },
            { color: colors.orangeOrange, label: "En chargement" },
            { color: colors.error, label: "Complet" },
          ].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── PANNEAU BAS (scrollable) ───────────────────────────── */}
      <ScrollView
        style={styles.bottomPanel}
        contentContainerStyle={styles.bottomContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Boutons d'action */}
        <View style={styles.actions}>
          {/* Voyager — déclenche le flow complet */}
          <Pressable
            style={styles.voyagerBtn}
            onPress={() => router.push("/(client)/voyages" as any)}
          >
            <View style={styles.voyagerBtnLeft}>
              <Text style={styles.voyagerIcon}>🚗</Text>
              <View>
                <Text style={styles.voyagerLabel}>Voyager</Text>
                <Text style={styles.voyagerSub}>Détection auto · destination · places</Text>
              </View>
            </View>
            <View style={styles.voyagerArrow}>
              <Text style={styles.voyagerArrowText}>›</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.colisBtn}
            onPress={() => router.push("/(client)/colis" as any)}
          >
            <Text style={styles.colisIcon}>📦</Text>
            <Text style={styles.colisLabel}>Envoyer{"\n"}un colis</Text>
          </Pressable>
        </View>

        {/* En-tête section voyages */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Trajets disponibles
            {listVoyages.length > 0 ? ` (${listVoyages.length})` : ""}
          </Text>
          <Pressable onPress={() => refetch()} disabled={isRefetching || isLoading}>
            {isLoading || isRefetching ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.refreshIcon}>↻</Text>
            )}
          </Pressable>
        </View>

        {/* Liste verticale des voyages */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["2xl"] }} />
        ) : listVoyages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun trajet disponible pour l'instant</Text>
          </View>
        ) : (
          <View style={styles.voyageList}>
            {listVoyages.map((v) => (
              <VoyageCard key={v.id} voyage={v} onMarkerFocus={focusOnMarker} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Carte
  mapContainer: { height: MAP_HEIGHT },
  mapHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: spacing["2xl"],
  },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: radii.xl,
    padding: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.md,
  },
  greetingText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  nameText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  legend: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },

  // Panneau bas
  bottomPanel: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    marginTop: -16,
    ...shadows.lg,
  },
  bottomContent: { paddingBottom: 32, paddingTop: spacing.xl },

  // Actions
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.xl,
    alignItems: "stretch",
  },
  voyagerBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.md,
  },
  voyagerBtnLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  voyagerIcon: { fontSize: 28 },
  voyagerLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  voyagerSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  voyagerArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  voyagerArrowText: {
    fontSize: 20,
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 24,
  },
  colisBtn: {
    width: 80,
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    ...shadows.md,
  },
  colisIcon: { fontSize: 24 },
  colisLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
    textAlign: "center",
  },

  // En-tête section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  refreshIcon: {
    fontSize: 20,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },

  // Vide
  emptyCard: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Liste voyages
  voyageList: {
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
  },
  voyageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  cardPointRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  cardPointIcon: { fontSize: 13 },
  cardPoint: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardTimeBlock: { gap: 2 },
  cardTime: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  cardPrice: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  cardPriceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  cardPlaceBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cardPlaceText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
});
