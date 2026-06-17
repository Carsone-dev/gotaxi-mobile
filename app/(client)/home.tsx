import React, { useRef, useCallback, useState, useMemo } from "react";
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
  TextInput,
  Image,
  Modal,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthStore } from "@/src/stores/authStore";
import { usePopularVoyages, useActiveVoyages } from "@/src/hooks/useVoyages";
import { useVilles } from "@/src/hooks/useGares";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import { resolveMediaUrl } from "@/src/constants/app";
import {
  LeafletMapView,
  BENIN_REGION,
  COUNTRY_REGIONS,
} from "@/src/components/map/LeafletMapView";
import type { LeafletMapHandle, LeafletMarker } from "@/src/components/map/LeafletMapView";
import { ProfileAvatar } from "@/src/components/common/ProfileAvatar";
import type { Voyage } from "@/src/api/types";

const { height: SCREEN_H } = Dimensions.get("window");
const MAP_HEIGHT = SCREEN_H * 0.50;

// Couleur par statut voyage
const MARKER_COLOR: Record<string, string> = {
  PUBLIE_FULL: colors.primary,
  PUBLIE_PARTIAL: colors.orangeOrange,
  EN_COURS: "#0066FF",
  COMPLET: colors.error,
};

function markerColor(v: Voyage): string {
  if (v.statut === "EN_COURS") return MARKER_COLOR.EN_COURS;
  if (v.statut === "COMPLET") return MARKER_COLOR.COMPLET;
  if (v.nombre_places_restantes < v.nombre_places_total) return MARKER_COLOR.PUBLIE_PARTIAL;
  return MARKER_COLOR.PUBLIE_FULL;
}

function statusLabel(v: Voyage): string {
  if (v.statut === "EN_COURS") return "En cours";
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

const TYPE_LABELS: Record<string, string> = {
  BERLINE: "Berline", SUV: "SUV", MINIBUS: "Minibus", BUS: "Bus", MOTO: "Moto",
};

// ── Galerie photos véhicule ────────────────────────────────────────────────────
function VehicleGalleryModal({
  photos,
  visible,
  onClose,
}: {
  photos: { uri: string; label: string }[];
  visible: boolean;
  onClose: () => void;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const [page, setPage] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={gl.overlay}>
        {/* Fermer */}
        <Pressable style={gl.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={gl.closeIcon}>✕</Text>
        </Pressable>

        {/* Label page courante */}
        <View style={gl.labelWrap}>
          <Text style={gl.labelText}>{photos[page]?.label ?? ""}</Text>
        </View>

        {/* ScrollView horizontal */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const newPage = Math.round(e.nativeEvent.contentOffset.x / W);
            setPage(newPage);
          }}
          style={{ width: W }}
        >
          {photos.map((p, i) => (
            <Image
              key={i}
              source={{ uri: p.uri }}
              style={{ width: W, height: H * 0.7 }}
              resizeMode="contain"
            />
          ))}
        </ScrollView>

        {/* Indicateurs dots */}
        {photos.length > 1 && (
          <View style={gl.dots}>
            {photos.map((_, i) => (
              <View key={i} style={[gl.dot, i === page && gl.dotActive]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Carte voyage ───────────────────────────────────────────────────────────────
function VoyageCard({
  voyage,
  index,
  onMarkerFocus,
}: {
  voyage: Voyage;
  index: number;
  onMarkerFocus: (v: Voyage) => void;
}) {
  const accent = markerColor(voyage);
  const label = statusLabel(voyage);
  const isFull = voyage.statut === "COMPLET";
  const [showGallery, setShowGallery] = useState(false);

  const exteriorUrl = resolveMediaUrl(voyage.vehicule?.photo_url ?? null);
  const interiorUrls = (voyage.vehicule?.photos_interieures ?? [])
    .map((u) => resolveMediaUrl(u))
    .filter(Boolean) as string[];

  const allPhotos = [
    ...(exteriorUrl ? [{ uri: exteriorUrl, label: "Extérieur" }] : []),
    ...interiorUrls.map((uri, i) => ({ uri, label: `Intérieur ${i + 1}` })),
  ];

  const hasGallery = allPhotos.length > 0;

  return (
    <Animated.View entering={FadeInDown.duration(260).delay(index * 60)}>
      {hasGallery && (
        <VehicleGalleryModal
          photos={allPhotos}
          visible={showGallery}
          onClose={() => setShowGallery(false)}
        />
      )}
      <Pressable
        style={({ pressed }) => [styles.voyageCard, pressed && styles.voyageCardPressed]}
        onPress={() => {
          onMarkerFocus(voyage);
          router.push(`/(client)/voyages/${voyage.id}` as any);
        }}
      >
        <View style={[styles.cardAccent, { backgroundColor: accent }]} />
        <View style={styles.cardInner}>
          {/* Route + statut */}
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

          {/* Timeline */}
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
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.pointText} numberOfLines={1}>
                {voyage.point_depart}
              </Text>
            </View>
          ) : null}

          {/* Véhicule : photo + nom + galerie intérieure */}
          {voyage.vehicule && (
            <View style={styles.vehicleRow}>
              <Pressable
                onPress={() => hasGallery && setShowGallery(true)}
                style={styles.vehicleThumbWrap}
                disabled={!hasGallery}
              >
                {exteriorUrl ? (
                  <Image
                    source={{ uri: exteriorUrl }}
                    style={styles.vehicleThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.vehicleThumb, styles.vehicleThumbPlaceholder]}>
                    <Ionicons name="car-outline" size={20} color={colors.textMuted} />
                  </View>
                )}
                {interiorUrls.length > 0 && (
                  <View style={styles.interiorBadge}>
                    <Text style={styles.interiorBadgeText}>
                      📷 {interiorUrls.length}
                    </Text>
                  </View>
                )}
              </Pressable>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {voyage.vehicule.marque} {voyage.vehicule.modele}
                </Text>
                <Text style={styles.vehicleType}>
                  {TYPE_LABELS[voyage.vehicule.type_vehicule] ?? voyage.vehicule.type_vehicule}
                </Text>
              </View>
              {hasGallery && (
                <Pressable
                  style={styles.viewPhotosBtn}
                  onPress={() => setShowGallery(true)}
                >
                  <Text style={styles.viewPhotosBtnText}>Voir photos</Text>
                </Pressable>
              )}
            </View>
          )}

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
              <View style={[styles.placesBadge, isFull && styles.placesBadgeFull]}>
                <Text style={[styles.placesText, isFull && styles.placesTextFull]}>
                  {isFull
                    ? "Complet"
                    : `${voyage.nombre_places_restantes} place${voyage.nombre_places_restantes > 1 ? "s" : ""}`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Écran principal ────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: voyages, isLoading, refetch, isRefetching } = usePopularVoyages();
  const { data: activeVoyages } = useActiveVoyages();
  const { data: villes } = useVilles();
  const mapRef = useRef<LeafletMapHandle>(null);

  const [searchDepart, setSearchDepart] = useState("");
  const [searchArrivee, setSearchArrivee] = useState("");
  const [departFocused, setDepartFocused] = useState(false);
  const [arriveeFocused, setArriveeFocused] = useState(false);

  // Marqueurs : PUBLIE + COMPLET (depuis popular) + EN_COURS (depuis active)
  const publishedMarkers =
    voyages?.filter(
      (v) =>
        (v.statut === "PUBLIE" || v.statut === "COMPLET") &&
        v.lat_depart != null &&
        v.lng_depart != null,
    ) ?? [];

  const enCoursVoyages =
    (activeVoyages ?? []).filter(
      (v) =>
        v.statut === "EN_COURS" &&
        v.lat_depart != null &&
        v.lng_depart != null,
    );

  const listVoyages =
    voyages?.filter((v) => v.statut === "PUBLIE" || v.statut === "COMPLET") ?? [];

  const markers: LeafletMarker[] = useMemo(() => {
    const list: LeafletMarker[] = [];
    publishedMarkers.forEach((v) => {
      list.push({
        id: v.id,
        lat: v.lat_depart,
        lng: v.lng_depart,
        color: markerColor(v),
        type:
          v.statut === "COMPLET"
            ? "full"
            : v.nombre_places_restantes < v.nombre_places_total
            ? "partial"
            : "available",
        title: `${v.ville_depart} → ${v.ville_arrivee}`,
        desc: `${formatFCFA(v.prix_par_place)} · ${v.nombre_places_restantes} pl.`,
      });
    });
    enCoursVoyages.forEach((v) => {
      list.push({
        id: v.id,
        lat: v.lat_depart,
        lng: v.lng_depart,
        color: MARKER_COLOR.EN_COURS,
        type: "active",
        title: `En cours · ${v.ville_depart} → ${v.ville_arrivee}`,
        desc: `Départ: ${formatTime(v.date_depart)}`,
        toLat: v.lat_arrivee,
        toLng: v.lng_arrivee,
      });
    });
    return list;
  }, [publishedMarkers, enCoursVoyages]);

  const filteredVoyages = listVoyages.filter((v) => {
    const depOk =
      !searchDepart ||
      v.ville_depart.toLowerCase().includes(searchDepart.toLowerCase());
    const arrOk =
      !searchArrivee ||
      v.ville_arrivee.toLowerCase().includes(searchArrivee.toLowerCase());
    return depOk && arrOk;
  });

  const hasSearch = searchDepart.length > 0 || searchArrivee.length > 0;

  const departSuggestions =
    villes && searchDepart.length > 0
      ? villes
          .filter(
            (v) =>
              v.actif &&
              v.nom.toLowerCase().includes(searchDepart.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const arriveeSuggestions =
    villes && searchArrivee.length > 0
      ? villes
          .filter(
            (v) =>
              v.actif &&
              v.nom.toLowerCase().includes(searchArrivee.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const focusOnMarker = useCallback((v: Voyage) => {
    mapRef.current?.focusOn(v.lat_depart, v.lng_depart);
  }, []);

  const photoUrl = resolveMediaUrl(user?.photo_url ?? null) ?? null;

  return (
    <View style={styles.container}>
      {/* ── CARTE ──────────────────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        <LeafletMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          markers={markers}
          region={BENIN_REGION}
          onMarkerPress={(id) => {
            const all = [...(voyages ?? []), ...(activeVoyages ?? [])];
            const v = all.find((x) => x.id === id);
            if (v) {
              focusOnMarker(v);
              router.push(`/(client)/voyages/${v.id}` as any);
            }
          }}
        />

        {/* En-tête flottant */}
        <View style={styles.mapHeader} pointerEvents="box-none">
          <View style={styles.headerCard} pointerEvents="auto">
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>{greeting()} 👋</Text>
              <Text style={styles.nameText} numberOfLines={1}>
                {user?.prenom} {user?.nom}
              </Text>
            </View>
            <ProfileAvatar
              photoUrl={photoUrl}
              genre={user?.genre}
              size={42}
              onPressNoPhoto={() => router.push("/(client)/profile" as any)}
            />
          </View>
        </View>

        {/* Légende */}
        <View style={styles.legend} pointerEvents="none">
          {[
            { color: MARKER_COLOR.PUBLIE_FULL, label: "Disponible" },
            { color: MARKER_COLOR.PUBLIE_PARTIAL, label: "En chargement" },
            { color: MARKER_COLOR.EN_COURS, label: "En cours", dashed: true },
            { color: MARKER_COLOR.COMPLET, label: "Complet" },
          ].map(({ color, label, dashed }) => (
            <View key={label} style={styles.legendItem}>
              {dashed ? (
                <View style={styles.legendLine}>
                  <View style={[styles.legendDash, { backgroundColor: color }]} />
                  <View style={[styles.legendDash, { backgroundColor: color }]} />
                </View>
              ) : (
                <View style={[styles.legendDot, { backgroundColor: color }]} />
              )}
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── PANNEAU BAS ────────────────────────────────────────────────── */}
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
        {/* ── Actions rapides (compactes) ─────── */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary },
              pressed && styles.actionPressed,
            ]}
            onPress={() => router.push("/(client)/voyages" as any)}
          >
            <Ionicons name="car-sport-outline" size={17} color={colors.white} />
            <Text style={styles.actionBtnText}>Voyager</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.black },
              pressed && styles.actionPressed,
            ]}
            onPress={() => router.push("/(client)/colis" as any)}
          >
            <Ionicons name="cube-outline" size={17} color={colors.white} />
            <Text style={styles.actionBtnText}>Colis</Text>
          </Pressable>
        </View>

        {/* ── Recherche de trajet ──────────────── */}
        <View style={styles.searchCard}>
          {/* Champ départ */}
          <View style={styles.searchField}>
            <Ionicons name="navigate-circle-outline" size={18} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ville de départ"
              placeholderTextColor={colors.textMuted}
              value={searchDepart}
              onChangeText={setSearchDepart}
              onFocus={() => setDepartFocused(true)}
              onBlur={() => setTimeout(() => setDepartFocused(false), 200)}
              returnKeyType="next"
            />
            {searchDepart.length > 0 && (
              <Pressable onPress={() => setSearchDepart("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Suggestions départ */}
          {departFocused && departSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              {departSuggestions.map((v) => (
                <Pressable
                  key={v.id}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setSearchDepart(v.nom);
                    setDepartFocused(false);
                  }}
                >
                  <Ionicons name="location-sharp" size={13} color={colors.primary} />
                  <Text style={styles.suggestionText}>{v.nom}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.searchDivider} />

          {/* Champ arrivée */}
          <View style={styles.searchField}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ville d'arrivée"
              placeholderTextColor={colors.textMuted}
              value={searchArrivee}
              onChangeText={setSearchArrivee}
              onFocus={() => setArriveeFocused(true)}
              onBlur={() => setTimeout(() => setArriveeFocused(false), 200)}
              returnKeyType="search"
            />
            {searchArrivee.length > 0 && (
              <Pressable onPress={() => setSearchArrivee("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Suggestions arrivée */}
          {arriveeFocused && arriveeSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              {arriveeSuggestions.map((v) => (
                <Pressable
                  key={v.id}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setSearchArrivee(v.nom);
                    setArriveeFocused(false);
                  }}
                >
                  <Ionicons name="location-sharp" size={13} color={colors.textMuted} />
                  <Text style={styles.suggestionText}>{v.nom}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── En-tête section ─────────────────── */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Trajets disponibles</Text>
            {!isLoading && filteredVoyages.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredVoyages.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.sectionActions}>
            {hasSearch && (
              <Pressable
                onPress={() => { setSearchDepart(""); setSearchArrivee(""); }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>Effacer</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => refetch()}
              disabled={isRefetching || isLoading}
              style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
            >
              {isLoading || isRefetching ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Liste voyages ───────────────────── */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
        ) : filteredVoyages.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="map-outline" size={36} color={colors.textMuted} />
            </View>
            {hasSearch ? (
              <>
                <Text style={styles.emptyTitle}>Aucun trajet trouvé</Text>
                <Text style={styles.emptySub}>
                  Aucun trajet disponible pour{" "}
                  {[searchDepart, searchArrivee].filter(Boolean).join(" → ")}.
                </Text>
                <Pressable
                  onPress={() => { setSearchDepart(""); setSearchArrivee(""); }}
                  style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="close-outline" size={15} color={colors.white} />
                  <Text style={styles.emptyBtnTxt}>Effacer la recherche</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Aucun trajet disponible</Text>
                <Text style={styles.emptySub}>Revenez plus tard ou actualisez la page.</Text>
                <Pressable
                  onPress={() => refetch()}
                  style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="refresh-outline" size={15} color={colors.white} />
                  <Text style={styles.emptyBtnTxt}>Actualiser</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredVoyages.map((v, i) => (
              <VoyageCard key={v.id} voyage={v} index={i} onMarkerFocus={focusOnMarker} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  /* Carte */
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
  legendLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    width: 14,
  },
  legendDash: { width: 5, height: 3, borderRadius: 1.5 },
  legendText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },

  /* Panneau bas */
  panel: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    marginTop: -20,
    ...shadows.lg,
  },
  panelContent: { paddingTop: spacing.lg, paddingBottom: 40 },

  /* Actions compactes */
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.full,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  actionPressed: { opacity: 0.85 },
  actionBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  /* Recherche */
  searchCard: {
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  searchDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  suggestions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },

  /* Section header */
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
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  clearBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  clearBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.error,
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

  /* Liste */
  list: {
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
  },

  /* Carte voyage */
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
  statusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },

  /* Timeline */
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

  /* Point départ */
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  pointText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  /* Bas de carte */
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

  /* Véhicule dans la carte */
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  vehicleThumbWrap: { position: "relative" },
  vehicleThumb: {
    width: 52,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  vehicleThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  interiorBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: colors.black,
    borderRadius: radii.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  interiorBadgeText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  vehicleInfo: { flex: 1 },
  vehicleName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  vehicleType: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
  viewPhotosBtn: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  viewPhotosBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  /* État vide */
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
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyBtnTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});

// ── Styles galerie modale ──────────────────────────────────────────────────────
const gl = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { fontSize: 16, color: colors.white, fontFamily: typography.fontFamily.bold },
  labelWrap: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  labelText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.lg,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: { backgroundColor: colors.white },
});
