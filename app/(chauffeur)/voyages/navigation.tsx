/**
 * Écran de navigation GPS du chauffeur.
 * Dépendance vocale optionnelle : npx expo install expo-speech
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVoyageDetail, useEndVoyage } from "@/src/hooks/useVoyages";
import { chauffeursApi } from "@/src/api/endpoints/chauffeurs";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Annonce vocale — import dynamique pour ne pas bloquer si expo-speech absent
async function announce(text: string) {
  try {
    // @ts-ignore — optionnel : npx expo install expo-speech
    const Speech = await import("expo-speech");
    if (typeof Speech.isSpeakingAsync === "function") {
      const speaking = await Speech.isSpeakingAsync();
      if (speaking) return;
    }
    Speech.speak(text, { language: "fr-FR", rate: 0.88 });
  } catch {
    /* expo-speech non installé — silencieux */
  }
}

// ─── Marqueur véhicule ────────────────────────────────────────────────────────

function VehicleMarker({ heading }: { heading: number }) {
  return (
    <View
      style={[
        markerS.vehicle,
        { transform: [{ rotate: `${heading}deg` }] },
      ]}
    >
      <Text style={markerS.vehicleIcon}>🚗</Text>
    </View>
  );
}

function DepMarker({ city }: { city: string }) {
  return (
    <View style={markerS.pin}>
      <View style={[markerS.pinDot, { backgroundColor: colors.primary }]} />
      <View style={[markerS.pinLabel, { borderColor: colors.primary }]}>
        <Text style={[markerS.pinText, { color: colors.primary }]}>{city}</Text>
      </View>
    </View>
  );
}

function ArrMarker({ city }: { city: string }) {
  return (
    <View style={markerS.pin}>
      <Text style={{ fontSize: 22, textAlign: "center" }}>🏁</Text>
      <View style={[markerS.pinLabel, { borderColor: colors.error }]}>
        <Text style={[markerS.pinText, { color: colors.error }]}>{city}</Text>
      </View>
    </View>
  );
}

const markerS = StyleSheet.create({
  vehicle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  vehicleIcon: { fontSize: 22 },
  pin: { alignItems: "center", gap: 4 },
  pinDot: { width: 14, height: 14, borderRadius: 7 },
  pinLabel: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pinText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
  },
});

// ─── Écran navigation ─────────────────────────────────────────────────────────

type LatLng = { latitude: number; longitude: number };

export default function NavigationScreen() {
  const { voyage_id } = useLocalSearchParams<{ voyage_id: string }>();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const { data: voyage } = useVoyageDetail(voyage_id ?? "");
  const { mutateAsync: endVoyage, isPending: ending } = useEndVoyage();

  const mapRef = useRef<MapView>(null);

  const [position, setPosition]           = useState<LatLng | null>(null);
  const [heading, setHeading]             = useState(0);
  const [speed, setSpeed]                 = useState(0); // m/s
  const [currentLocality, setLocality]    = useState<string | null>(null);
  const [soundOn, setSoundOn]             = useState(true);
  const [following, setFollowing]         = useState(true);

  const lastLocalityRef       = useRef<string | null>(null);
  const lastBroadcastRef      = useRef(0);
  const lastGeocodeRef        = useRef(0);
  const approachAnnouncedRef  = useRef(false);
  const soundRef              = useRef(true);

  // Sync soundRef avec l'état pour les callbacks asynchrones
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const totalKm = voyage
    ? haversineKm(voyage.lat_depart, voyage.lng_depart, voyage.lat_arrivee, voyage.lng_arrivee)
    : 0;

  const remainingKm = voyage && position
    ? haversineKm(position.latitude, position.longitude, voyage.lat_arrivee, voyage.lng_arrivee)
    : totalKm;

  const progress = totalKm > 0 ? Math.min(1, (totalKm - remainingKm) / totalKm) : 0;
  const progressPct = Math.round(progress * 100);
  const speedKmh = Math.round((speed ?? 0) * 3.6);

  // ── Callback mise à jour GPS ──────────────────────────────────────────────

  const onLocationUpdate = useCallback(
    async (loc: Location.LocationObject) => {
      const { latitude, longitude, speed: spd, heading: hdg } = loc.coords;

      setPosition({ latitude, longitude });
      setSpeed(spd ?? 0);
      setHeading(hdg ?? 0);

      const now = Date.now();

      // Diffusion position backend (max 1x / 10 s)
      if (now - lastBroadcastRef.current > 10_000) {
        lastBroadcastRef.current = now;
        chauffeursApi.updatePosition({
          lat: latitude,
          lng: longitude,
          vitesse: spd ?? 0,
          heading: hdg ?? 0,
        }).catch(() => {});
      }

      // Géocodage inverse + annonce localité (max 1x / 20 s)
      if (now - lastGeocodeRef.current > 20_000) {
        lastGeocodeRef.current = now;
        try {
          const [res] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (res) {
            const locality =
              res.district || res.city || res.subregion || res.region || null;
            if (locality && locality !== lastLocalityRef.current) {
              lastLocalityRef.current = locality;
              setLocality(locality);
              if (soundRef.current) announce(locality);
            }
          }
        } catch {}
      }

      // Annonce approche destination (< 4 km)
      if (voyage && !approachAnnouncedRef.current) {
        const rem = haversineKm(latitude, longitude, voyage.lat_arrivee, voyage.lng_arrivee);
        if (rem < 4) {
          approachAnnouncedRef.current = true;
          if (soundRef.current)
            announce(`Vous approchez de votre destination : ${voyage.ville_arrivee}`);
        }
      }

      // Suivi caméra
      if (following) {
        mapRef.current?.animateCamera(
          {
            center: { latitude, longitude },
            heading: hdg ?? 0,
            zoom: 15,
            pitch: 35,
          },
          { duration: 900 },
        );
      }
    },
    [voyage, following],
  );

  // ── Démarrage GPS ──────────────────────────────────────────────────────────

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast("Permission GPS refusée — activez-la dans les paramètres", "error");
        return;
      }

      // Position initiale immédiate
      try {
        const init = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        onLocationUpdate(init);
      } catch {}

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2_000,
          distanceInterval: 8,
        },
        onLocationUpdate,
      );
    })();

    return () => { sub?.remove(); };
  }, [onLocationUpdate]);

  // ── Fin de voyage ──────────────────────────────────────────────────────────

  const handleEnd = () => {
    Alert.alert(
      "Terminer le voyage",
      `Confirmez l'arrivée à ${voyage?.ville_arrivee} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Terminer ✓",
          onPress: async () => {
            try {
              await endVoyage(voyage_id ?? "");
              if (soundRef.current)
                announce(`Voyage terminé. Bienvenue à ${voyage?.ville_arrivee}`);
              showToast("Voyage terminé !", "success");
              router.replace("/(chauffeur)/voyages" as any);
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ],
    );
  };

  // ── Région initiale ────────────────────────────────────────────────────────

  const initialRegion = voyage
    ? {
        latitude: (voyage.lat_depart + voyage.lat_arrivee) / 2,
        longitude: (voyage.lng_depart + voyage.lng_arrivee) / 2,
        latitudeDelta: Math.max(Math.abs(voyage.lat_depart - voyage.lat_arrivee) * 2, 0.5),
        longitudeDelta: Math.max(Math.abs(voyage.lng_depart - voyage.lng_arrivee) * 2, 0.5),
      }
    : undefined;

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Carte ── */}
      {voyage && initialRegion && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass
          showsScale
          onPanDrag={() => setFollowing(false)}
        >
          {/* Tracé */}
          <Polyline
            coordinates={[
              { latitude: voyage.lat_depart,  longitude: voyage.lng_depart  },
              { latitude: voyage.lat_arrivee, longitude: voyage.lng_arrivee },
            ]}
            strokeColor={colors.primary}
            strokeWidth={5}
            geodesic
            lineDashPattern={undefined}
          />

          {/* Tracé "déjà parcouru" en gris */}
          {position && (
            <Polyline
              coordinates={[
                { latitude: voyage.lat_depart, longitude: voyage.lng_depart },
                position,
              ]}
              strokeColor={colors.primaryDark}
              strokeWidth={5}
              geodesic
            />
          )}

          {/* Marqueur départ */}
          <Marker
            coordinate={{ latitude: voyage.lat_depart, longitude: voyage.lng_depart }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <DepMarker city={voyage.ville_depart} />
          </Marker>

          {/* Marqueur arrivée */}
          <Marker
            coordinate={{ latitude: voyage.lat_arrivee, longitude: voyage.lng_arrivee }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <ArrMarker city={voyage.ville_arrivee} />
          </Marker>

          {/* Véhicule */}
          {position && (
            <Marker
              coordinate={position}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              tracksViewChanges
            >
              <VehicleMarker heading={0} />
            </Marker>
          )}
        </MapView>
      )}

      {/* ── Barre haute ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>

        {/* Vitesse centrale */}
        <View style={styles.speedBubble}>
          <Text style={styles.speedValue}>{speedKmh}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>

        <Pressable style={styles.iconBtn} onPress={() => setSoundOn((v) => !v)}>
          <Text style={styles.iconBtnText}>{soundOn ? "🔊" : "🔇"}</Text>
        </Pressable>
      </View>

      {/* ── Localité courante ── */}
      {currentLocality && (
        <View style={styles.localityBanner}>
          <Text style={styles.localityIcon}>📍</Text>
          <Text style={styles.localityText} numberOfLines={1}>
            {currentLocality}
          </Text>
        </View>
      )}

      {/* ── Bouton recentrer ── */}
      {!following && position && (
        <Pressable
          style={styles.recenterBtn}
          onPress={() => {
            setFollowing(true);
            if (position) {
              mapRef.current?.animateCamera(
                { center: position, zoom: 15, pitch: 35 },
                { duration: 600 },
              );
            }
          }}
        >
          <Text style={styles.recenterText}>🎯 Recentrer</Text>
        </Pressable>
      )}

      {/* ── HUD bas ── */}
      <View style={[styles.hud, { paddingBottom: insets.bottom + spacing.lg }]}>

        {/* Itinéraire */}
        <View style={styles.hudHeader}>
          <Text style={styles.hudRoute} numberOfLines={1}>
            {voyage?.ville_depart} → {voyage?.ville_arrivee}
          </Text>
          <View style={[styles.progressPill, { backgroundColor: progressPct > 80 ? colors.successBg : colors.infoBg }]}>
            <Text style={[styles.progressPillText, { color: progressPct > 80 ? colors.primary : colors.info }]}>
              {progressPct}%
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Parcouru</Text>
            <Text style={styles.statVal}>
              {Math.round(totalKm - remainingKm)} km
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Restant</Text>
            <Text style={[styles.statVal, { color: colors.primary }]}>
              {Math.round(remainingKm)} km
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statVal}>{Math.round(totalKm)} km</Text>
          </View>
        </View>

        {/* Barre de progression */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPct}%` as any },
            ]}
          />
        </View>

        {/* Bouton terminer */}
        <Pressable
          style={[styles.endBtn, ending && { opacity: 0.7 }]}
          onPress={handleEnd}
          disabled={ending}
        >
          <Text style={styles.endBtnText}>
            {ending ? "Enregistrement…" : "■  Terminer le voyage"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Barre haute
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  iconBtnText: {
    fontSize: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 24,
  },
  speedBubble: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    alignItems: "center",
    ...shadows.md,
    minWidth: 80,
  },
  speedValue: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  speedUnit: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },

  // Localité courante
  localityBanner: {
    position: "absolute",
    top: 120,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    ...shadows.md,
    maxWidth: "70%",
  },
  localityIcon: { fontSize: 14 },
  localityText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },

  // Recentrer
  recenterBtn: {
    position: "absolute",
    right: spacing.xl,
    bottom: 280,
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  recenterText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // HUD bas
  hud: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  hudHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  hudRoute: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  progressPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  progressPillText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extraBold,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  statBlock: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  statLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
  },

  // Barre de progression
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minWidth: 8,
  },

  // Bouton terminer
  endBtn: {
    backgroundColor: colors.error,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  endBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.3,
  },
});
