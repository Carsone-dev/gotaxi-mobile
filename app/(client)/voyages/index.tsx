import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
} from "react-native-reanimated";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { VILLES_LIST, nearestCity } from "@/src/constants/cities";
import { useVoyagesByRoute } from "@/src/hooks/useVoyages";
import { formatFCFA } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage } from "@/src/api/types";

// ── City picker modal ─────────────────────────────────────────────────────────
function CityPickerModal({
  visible,
  title,
  exclude,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  exclude?: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const cities = VILLES_LIST.filter((v) => v !== exclude);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={cities}
            keyExtractor={(v) => v}
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.modalItem}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
                <Text style={styles.modalItemChevron}>›</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Voyage card (résultats) ───────────────────────────────────────────────────
function VoyageCard({ voyage, nombrePlaces }: { voyage: Voyage; nombrePlaces: number }) {
  const full = voyage.nombre_places_restantes < nombrePlaces;
  return (
    <View style={[styles.voyageCard, full && styles.voyageCardFull]}>
      <Pressable onPress={() => router.push(`/(client)/voyages/${voyage.id}` as any)}>
        {/* En-tête : heure + prix */}
        <View style={styles.vcHeader}>
          <View>
            <Text style={styles.vcTime}>
              {format(new Date(voyage.date_depart), "HH:mm")}
            </Text>
            <Text style={styles.vcDate}>
              {format(new Date(voyage.date_depart), "EEEE d MMM", { locale: fr })}
            </Text>
          </View>
          <View style={styles.vcHeaderRight}>
            <Text style={styles.vcPrice}>{formatFCFA(voyage.prix_par_place)}</Text>
            <Text style={styles.vcPriceSub}>par pers.</Text>
            <View style={[styles.vcBadge, full && styles.vcBadgeFull]}>
              <Text style={[styles.vcBadgeText, full && styles.vcBadgeTextFull]}>
                {full ? "Complet" : `${voyage.nombre_places_restantes} place${voyage.nombre_places_restantes > 1 ? "s" : ""}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Trajet */}
        <View style={styles.vcRoute}>
          <View style={styles.vcRouteStop}>
            <View style={styles.vcDot} />
            <View>
              <Text style={styles.vcCity}>{voyage.ville_depart}</Text>
              {voyage.point_depart ? (
                <Text style={styles.vcPoint} numberOfLines={1}>{voyage.point_depart}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.vcRouteLineRow}>
            <View style={styles.vcRouteLine} />
            {voyage.distance_km ? (
              <Text style={styles.vcDistance}>{voyage.distance_km} km</Text>
            ) : null}
          </View>
          <View style={styles.vcRouteStop}>
            <View style={[styles.vcDot, styles.vcDotEnd]} />
            <View>
              <Text style={styles.vcCity}>{voyage.ville_arrivee}</Text>
              {voyage.point_arrivee ? (
                <Text style={styles.vcPoint} numberOfLines={1}>{voyage.point_arrivee}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Tags */}
        {(voyage.climatise || voyage.accepte_colis || voyage.non_fumeur) ? (
          <View style={styles.vcTags}>
            {voyage.climatise && <Text style={styles.vcTag}>❄ Clim</Text>}
            {voyage.accepte_colis && <Text style={styles.vcTag}>📦 Colis ok</Text>}
            {voyage.non_fumeur && <Text style={styles.vcTag}>🚭 Non-fumeur</Text>}
          </View>
        ) : null}
      </Pressable>

      {!full && (
        <Pressable
          style={styles.reserveBtn}
          onPress={() =>
            router.push({
              pathname: "/(client)/voyages/confirm" as any,
              params: {
                voyage_id: voyage.id,
                prix: String(voyage.prix_par_place),
                places: String(nombrePlaces),
              },
            })
          }
        >
          <Text style={styles.reserveBtnText}>
            Réserver · {nombrePlaces} place{nombrePlaces > 1 ? "s" : ""}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function VoyagesScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const directionRef = useRef<"forward" | "backward">("forward");

  // Step 1
  const [cityDepart, setCityDepart] = useState("");
  const [pointDepart, setPointDepart] = useState("");
  const [locStatus, setLocStatus] = useState<"idle" | "detecting" | "found" | "denied">("idle");
  const [showDepartPicker, setShowDepartPicker] = useState(false);

  // Step 2
  const [cityArrivee, setCityArrivee] = useState("");
  const [nombrePlaces, setNombrePlaces] = useState(1);
  const [showArriveePicker, setShowArriveePicker] = useState(false);

  // Step 3: résultats (n'appelle l'API qu'à l'étape 3)
  const {
    data: voyages,
    isLoading: loadingRoute,
    refetch: refetchRoute,
  } = useVoyagesByRoute(
    step === 3 ? cityDepart : "",
    step === 3 ? cityArrivee : "",
  );
  const voyagesFiltres = voyages?.filter((v) => v.nombre_places_restantes >= nombrePlaces);

  // GPS
  const detectLocation = useCallback(async () => {
    setLocStatus("detecting");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocStatus("denied"); return; }
      const cached = await Location.getLastKnownPositionAsync({ maxAge: 300_000 });
      if (cached) {
        setCityDepart(nearestCity(cached.coords.latitude, cached.coords.longitude));
        setLocStatus("found");
        return;
      }
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8_000)),
      ]);
      setCityDepart(nearestCity(pos.coords.latitude, pos.coords.longitude));
      setLocStatus("found");
    } catch {
      setLocStatus("denied");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (locStatus === "idle") detectLocation();
    }, [locStatus, detectLocation])
  );

  function goTo(s: 1 | 2 | 3) {
    directionRef.current = s > step ? "forward" : "backward";
    setStep(s);
  }

  const canStep2 = !!cityDepart && pointDepart.trim().length >= 3;
  const canSearch = !!cityArrivee;

  const entering = directionRef.current === "forward"
    ? FadeInRight.duration(240)
    : FadeInLeft.duration(240);
  const exiting = directionRef.current === "forward"
    ? FadeOutLeft.duration(240)
    : FadeOutRight.duration(240);

  return (
    <View style={styles.root}>
      {/* Zone animée des étapes */}
      <View style={styles.stepContainer}>
        <Animated.View key={step} entering={entering} exiting={exiting} style={StyleSheet.absoluteFillObject}>

          {/* ───── Étape 1 : Départ ───── */}
          {step === 1 && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.header}>
                <View style={styles.stepProgress}>
                  <View style={[styles.stepDot, styles.stepDotActive]} />
                  <View style={styles.stepDot} />
                </View>
                <Text style={styles.headerTitle}>D'où partez-vous ?</Text>
                <Text style={styles.headerSub}>Ville et point d'embarquement</Text>
              </View>

              <View style={styles.stepBody}>
                {/* Chip GPS */}
                <Pressable style={styles.gpsChip} onPress={detectLocation}>
                  {locStatus === "detecting" ? (
                    <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: spacing.sm }} />
                  ) : (
                    <Text style={styles.gpsChipIcon}>
                      {locStatus === "found" ? "📍" : "🔍"}
                    </Text>
                  )}
                  <Text style={[styles.gpsChipText, locStatus === "found" && styles.gpsChipTextFound]} numberOfLines={1}>
                    {locStatus === "detecting"
                      ? "Localisation en cours…"
                      : locStatus === "found"
                      ? `Détecté · ${cityDepart}`
                      : "Détecter ma position automatiquement"}
                  </Text>
                  {locStatus !== "detecting" && (
                    <Text style={styles.gpsRefresh}>↻</Text>
                  )}
                </Pressable>

                {/* Ville de départ */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Ville de départ</Text>
                  <Pressable style={styles.cityBtn} onPress={() => setShowDepartPicker(true)}>
                    <Text style={[styles.cityBtnText, !cityDepart && styles.cityBtnPlaceholder]}>
                      {cityDepart || "Sélectionner une ville"}
                    </Text>
                    <Text style={styles.cityBtnChevron}>▼</Text>
                  </Pressable>
                </View>

                {/* Point d'embarquement */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Point d'embarquement précis</Text>
                  <TextInput
                    style={styles.input}
                    value={pointDepart}
                    onChangeText={setPointDepart}
                    placeholder="Ex : Gare de Cotonou, Carrefour Godomey…"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldHint}>Indiquez l'endroit exact où vous embarquez</Text>
                </View>
              </View>

              <View style={styles.ctaArea}>
                <Pressable
                  style={[styles.ctaBtn, !canStep2 && styles.ctaBtnOff]}
                  onPress={() => canStep2 && goTo(2)}
                  disabled={!canStep2}
                >
                  <Text style={styles.ctaBtnText}>Choisir ma destination →</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* ───── Étape 2 : Destination ───── */}
          {step === 2 && (
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                <Pressable onPress={() => goTo(1)} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <View style={styles.stepProgress}>
                    <View style={[styles.stepDot, styles.stepDotDone]} />
                    <View style={[styles.stepDot, styles.stepDotActive]} />
                  </View>
                  <Text style={styles.headerTitle}>Où allez-vous ?</Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    Depuis {cityDepart} · {pointDepart}
                  </Text>
                </View>
              </View>

              <View style={styles.stepBody}>
                {/* Ville d'arrivée */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Ville de destination</Text>
                  <Pressable style={styles.cityBtn} onPress={() => setShowArriveePicker(true)}>
                    <Text style={[styles.cityBtnText, !cityArrivee && styles.cityBtnPlaceholder]}>
                      {cityArrivee || "Sélectionner une ville"}
                    </Text>
                    <Text style={styles.cityBtnChevron}>▼</Text>
                  </Pressable>
                </View>

                {/* Nombre de places */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Nombre de places</Text>
                  <View style={styles.counterRow}>
                    <Pressable
                      style={styles.counterBtn}
                      onPress={() => setNombrePlaces((p) => Math.max(1, p - 1))}
                    >
                      <Text style={styles.counterBtnText}>−</Text>
                    </Pressable>
                    <View style={styles.counterCenter}>
                      <Text style={styles.counterValue}>{nombrePlaces}</Text>
                      <Text style={styles.counterLabel}>place{nombrePlaces > 1 ? "s" : ""}</Text>
                    </View>
                    <Pressable
                      style={styles.counterBtn}
                      onPress={() => setNombrePlaces((p) => Math.min(8, p + 1))}
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.ctaArea}>
                <Pressable
                  style={[styles.ctaBtn, !canSearch && styles.ctaBtnOff]}
                  onPress={() => canSearch && goTo(3)}
                  disabled={!canSearch}
                >
                  <Text style={styles.ctaBtnText}>Rechercher des trajets →</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ───── Étape 3 : Résultats ───── */}
          {step === 3 && (
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                <Pressable onPress={() => goTo(2)} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>
                    {cityDepart} → {cityArrivee}
                  </Text>
                  <Text style={styles.headerSub}>
                    {nombrePlaces} place{nombrePlaces > 1 ? "s" : ""}
                    {voyagesFiltres != null
                      ? ` · ${voyagesFiltres.length} trajet${voyagesFiltres.length !== 1 ? "s" : ""}`
                      : ""}
                  </Text>
                </View>
                <Pressable onPress={() => goTo(1)} style={styles.modifyBtn}>
                  <Text style={styles.modifyBtnText}>Modifier</Text>
                </Pressable>
              </View>

              {loadingRoute ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.loadingText}>Recherche en cours…</Text>
                </View>
              ) : !voyagesFiltres?.length ? (
                <View style={styles.centerBox}>
                  <Text style={styles.emptyIcon}>🚗</Text>
                  <Text style={styles.emptyTitle}>Aucun trajet disponible</Text>
                  <Text style={styles.emptyText}>
                    {voyages?.length
                      ? `Pas assez de places disponibles (${nombrePlaces} demandées).`
                      : "Aucun voyage pour ce trajet aujourd'hui."}
                  </Text>
                  <Pressable style={styles.retryBtn} onPress={() => refetchRoute()}>
                    <Text style={styles.retryBtnText}>Actualiser</Text>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  data={voyagesFiltres}
                  keyExtractor={(v) => String(v.id)}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <VoyageCard voyage={item} nombrePlaces={nombrePlaces} />
                  )}
                />
              )}
            </View>
          )}

        </Animated.View>
      </View>

      {/* City pickers */}
      <CityPickerModal
        visible={showDepartPicker}
        title="Ville de départ"
        onSelect={(v) => { setCityDepart(v); setLocStatus("found"); }}
        onClose={() => setShowDepartPicker(false)}
      />
      <CityPickerModal
        visible={showArriveePicker}
        title="Ville de destination"
        exclude={cityDepart}
        onSelect={setCityArrivee}
        onClose={() => setShowArriveePicker(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const HEADER_PT = Platform.OS === "ios" ? 56 : 40;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  stepContainer: { flex: 1, overflow: "hidden" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: HEADER_PT,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  stepProgress: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.primary, width: 20 },
  stepDotDone: { backgroundColor: `${colors.primary}60` },
  headerTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  backBtn: { paddingTop: 2, paddingRight: spacing.sm },
  backBtnText: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  modifyBtn: {
    paddingTop: 6,
    paddingLeft: spacing.sm,
  },
  modifyBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // Step body
  stepBody: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    gap: spacing.xl,
  },

  // GPS chip
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  gpsChipIcon: { fontSize: 16 },
  gpsChipText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  gpsChipTextFound: { color: colors.primary },
  gpsRefresh: {
    fontSize: 18,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bold,
  },

  // Fields
  field: { gap: spacing.xs },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  fieldHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  cityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    ...shadows.sm,
  },
  cityBtnText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  cityBtnPlaceholder: { color: colors.textMuted, fontFamily: typography.fontFamily.regular },
  cityBtnChevron: { fontSize: 11, color: colors.textMuted },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },

  // Counter
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing["3xl"] ?? 32,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  counterCenter: { alignItems: "center", minWidth: 64 },
  counterValue: {
    fontSize: typography.fontSize["4xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    lineHeight: 48,
  },
  counterLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // CTA
  ctaArea: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: spacing.lg,
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    alignItems: "center",
    ...shadows.md,
  },
  ctaBtnOff: { opacity: 0.38 },
  ctaBtnText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  // Résultats
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: `${colors.primary}15`,
    borderRadius: radii.xl,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
  },
  retryBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  listContent: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: 32,
  },

  // Voyage card
  voyageCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voyageCardFull: { opacity: 0.55 },
  vcHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  vcTime: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  vcDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
    marginTop: 2,
  },
  vcHeaderRight: { alignItems: "flex-end", gap: 4 },
  vcPrice: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  vcPriceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  vcBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  vcBadgeFull: { backgroundColor: colors.errorBg },
  vcBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
  vcBadgeTextFull: { color: colors.error },

  // Route timeline
  vcRoute: { gap: spacing.xs },
  vcRouteStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  vcDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  vcDotEnd: { backgroundColor: colors.black },
  vcRouteLineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 5,
    gap: spacing.sm,
  },
  vcRouteLine: { width: 2, height: 18, backgroundColor: colors.border },
  vcDistance: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  vcCity: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  vcPoint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    maxWidth: 260,
  },

  // Tags
  vcTags: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  vcTag: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Reserve
  reserveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  reserveBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  // Modal city picker
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}80`,
  },
  modalItemText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  modalItemChevron: {
    fontSize: 20,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
  },
});
