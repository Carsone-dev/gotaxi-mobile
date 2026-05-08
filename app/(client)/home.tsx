import React, { useRef, useCallback } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { router } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthStore } from "@/src/stores/authStore";
import { usePopularVoyages } from "@/src/hooks/useVoyages";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage } from "@/src/api/types";

const { height: SCREEN_H } = Dimensions.get("window");
const MAP_HEIGHT = SCREEN_H * 0.44;

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

function statusLabel(v: Voyage): string {
  if (v.statut === "COMPLET") return "Complet";
  if (v.nombre_places_restantes < v.nombre_places_total) return "En chargement";
  return "Disponible";
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

// ── Carte voyage ──────────────────────────────────────────────────────────────
function VoyageCard({ voyage, index, onMarkerFocus }: { voyage: Voyage; index: number; onMarkerFocus: (v: Voyage) => void }) {
  const accent = markerColor(voyage);
  const label  = statusLabel(voyage);
  const isFull = voyage.statut === "COMPLET";

  return (
    <Animated.View entering={FadeInDown.duration(260).delay(index * 60)}>
      <Pressable
        style={({ pressed }) => [styles.voyageCard, pressed && styles.voyageCardPressed]}
        onPress={() => {
          onMarkerFocus(voyage);
          router.push(`/(client)/voyages/${voyage.id}` as any);
        }}
      >
        {/* Barre accent top */}
        <View style={[styles.cardAccent, { backgroundColor: accent }]} />

        <View style={styles.cardInner}>
          {/* Ligne 1 : route + statut */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardRoute} numberOfLines={1}>
              {voyage.ville_depart}
              <Text style={styles.cardRouteSep}> → </Text>
              {voyage.ville_arrivee}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: `${accent}18` }]}>
              <View style={[styles.statusDot, { backgroundColor: accent }]} />
              <Text style={[styles.statusText, { color: accent }]}>{label}</Text>
            </View>
          </View>

          {/* Route timeline */}
          <View style={styles.timeline}>
            <View style={styles.timelineLine} />
            <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.timelineCity}>{voyage.ville_depart}</Text>
            <View style={styles.timelineSpacer} />
            <View style={[styles.timelineDot, { backgroundColor: colors.black }]} />
            <Text style={styles.timelineCity}>{voyage.ville_arrivee}</Text>
          </View>

          {/* Point de départ */}
          {voyage.point_depart ? (
            <View style={styles.pointRow}>
              <Text style={styles.pointIcon}>📍</Text>
              <Text style={styles.pointText} numberOfLines={1}>{voyage.point_depart}</Text>
            </View>
          ) : null}

          {/* Bas : heure, date, places, prix */}
          <View style={styles.cardBottom}>
            <View style={styles.cardBottomLeft}>
              <Text style={styles.cardTime}>{formatTime(voyage.date_depart)}</Text>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>
                  {format(new Date(voyage.date_depart), "EEE d MMM", { locale: fr })}
                </Text>
              </View>
            </View>
            <View style={styles.cardBottomRight}>
              <Text style={styles.cardPrice}>{formatFCFA(voyage.prix_par_place)}</Text>
              <Text style={styles.cardPriceSub}>par pers.</Text>
              <View style={[
                styles.placesBadge,
                isFull && styles.placesBadgeFull,
              ]}>
                <Text style={[styles.placesText, isFull && styles.placesTextFull]}>
                  {isFull ? "Complet" : `${voyage.nombre_places_restantes} place${voyage.nombre_places_restantes > 1 ? "s" : ""}`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: voyages, isLoading, refetch, isRefetching } = usePopularVoyages();
  const mapRef = useRef<MapView>(null);

  const mapMarkers =
    voyages?.filter(
      (v) =>
        (v.statut === "PUBLIE" || v.statut === "COMPLET") &&
        v.lat_depart &&
        v.lng_depart,
    ) ?? [];

  const listVoyages =
    voyages?.filter((v) => v.statut === "PUBLIE" || v.statut === "COMPLET") ?? [];

  const focusOnMarker = useCallback((v: Voyage) => {
    mapRef.current?.animateToRegion(
      { latitude: v.lat_depart, longitude: v.lng_depart, latitudeDelta: 0.6, longitudeDelta: 0.6 },
      400,
    );
  }, []);

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : "?";

  return (
    <View style={styles.container}>
      {/* ── CARTE ──────────────────────────────────────────────────── */}
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
              description={`${formatFCFA(v.prix_par_place)} · ${v.nombre_places_restantes} pl.`}
              onPress={() => focusOnMarker(v)}
            />
          ))}
        </MapView>

        {/* En-tête flottant */}
        <View style={styles.mapHeader} pointerEvents="box-none">
          <View style={styles.headerCard} pointerEvents="auto">
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>{greeting()} 👋</Text>
              <Text style={styles.nameText} numberOfLines={1}>
                {user?.prenom} {user?.nom}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(client)/profile" as any)}
              style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          </View>
        </View>

        {/* Légende */}
        <View style={styles.legend} pointerEvents="none">
          {[
            { color: colors.primary,     label: "Disponible" },
            { color: colors.orangeOrange, label: "En chargement" },
            { color: colors.error,       label: "Complet" },
          ].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── PANNEAU BAS ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
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
        {/* ── Actions rapides ───────── */}
        <View style={styles.actions}>
          {/* Voyager */}
          <Pressable
            style={({ pressed }) => [styles.actionCard, styles.actionGreen, pressed && styles.actionPressed]}
            onPress={() => router.push("/(client)/voyages" as any)}
          >
            <Text style={styles.actionBgEmoji}>🚗</Text>
            <View style={styles.actionIconCircle}>
              <Text style={styles.actionIconEmoji}>🚗</Text>
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Voyager</Text>
              <Text style={styles.actionDesc}>Trouver un trajet</Text>
            </View>
            <View style={styles.actionArrow}>
              <Text style={styles.actionArrowTxt}>→</Text>
            </View>
          </Pressable>

          {/* Colis */}
          <Pressable
            style={({ pressed }) => [styles.actionCard, styles.actionDark, pressed && styles.actionPressed]}
            onPress={() => router.push("/(client)/colis" as any)}
          >
            <Text style={styles.actionBgEmoji}>📦</Text>
            <View style={styles.actionIconCircle}>
              <Text style={styles.actionIconEmoji}>📦</Text>
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Colis</Text>
              <Text style={styles.actionDesc}>Envoyer un colis</Text>
            </View>
            <View style={styles.actionArrow}>
              <Text style={styles.actionArrowTxt}>→</Text>
            </View>
          </Pressable>
        </View>

        {/* ── En-tête section ──────── */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Trajets disponibles</Text>
            {!isLoading && listVoyages.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{listVoyages.length}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => refetch()}
            disabled={isRefetching || isLoading}
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          >
            {isLoading || isRefetching ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.refreshIcon}>↻</Text>
            )}
          </Pressable>
        </View>

        {/* ── Liste voyages ─────────── */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
        ) : listVoyages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>Aucun trajet disponible</Text>
            <Text style={styles.emptySub}>Revenez plus tard ou actualisez la page.</Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.emptyBtnTxt}>Actualiser</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {listVoyages.map((v, i) => (
              <VoyageCard key={v.id} voyage={v} index={i} onMarkerFocus={focusOnMarker} />
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
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.md,
  },
  headerLeft: { flex: 1, marginRight: spacing.md },
  greetingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  nameText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  legend: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.92)",
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
  panel: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    marginTop: -18,
    ...shadows.lg,
  },
  panelContent: { paddingTop: spacing.xl, paddingBottom: 40 },

  // Actions
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing["2xl"],
  },
  actionCard: {
    flex: 1,
    borderRadius: radii["2xl"],
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
    ...shadows.md,
  },
  actionGreen: { backgroundColor: colors.primary },
  actionDark:  { backgroundColor: colors.black },
  actionPressed: { opacity: 0.88 },
  actionBgEmoji: {
    position: "absolute",
    fontSize: 72,
    right: -10,
    bottom: -8,
    opacity: 0.1,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconEmoji: { fontSize: 20 },
  actionBody: { flex: 1, gap: 2 },
  actionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  actionDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.65)",
  },
  actionArrow: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.15)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionArrowTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  // Section header
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
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
  countBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
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

  // Liste
  list: {
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
  },

  // Carte voyage
  voyageCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  voyageCardPressed: { opacity: 0.85 },
  cardAccent: { height: 4, width: "100%" },
  cardInner: { padding: spacing.xl, gap: spacing.md },

  cardTopRow: {
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
  cardRouteSep: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
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
  statusText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },

  // Timeline
  timeline: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    gap: spacing.xs,
  },
  timelineLine: {
    position: "absolute",
    left: 6,
    right: 6,
    height: 1.5,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 1,
  },
  timelineCity: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  timelineSpacer: { flex: 1 },

  // Point départ
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  pointIcon: { fontSize: 12 },
  pointText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  // Bas de carte
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  cardBottomLeft: { gap: 4 },
  cardTime: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  dateBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  cardBottomRight: { alignItems: "flex-end", gap: 4 },
  cardPrice: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  cardPriceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: -4,
  },
  placesBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  placesBadgeFull: { backgroundColor: colors.errorBg },
  placesText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
  placesTextFull: { color: colors.error },

  // Vide
  empty: {
    marginHorizontal: spacing["2xl"],
    marginTop: spacing["2xl"],
    backgroundColor: colors.surface,
    borderRadius: radii["2xl"],
    padding: spacing["3xl"],
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyEmoji: { fontSize: 44 },
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
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.md,
  },
  emptyBtnTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});
