import React, { useState, useCallback, useRef, useEffect } from "react";
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
  FadeIn,
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

// ── Indicateur d'étapes ───────────────────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  if (step === 3) return null;
  const done1 = step > 1;
  const active2 = step === 2;
  return (
    <View style={si.row}>
      <View style={[si.circle, si.circleActive]}>
        {done1
          ? <Text style={si.circleText}>✓</Text>
          : <Text style={si.circleText}>1</Text>}
      </View>
      <View style={[si.line, done1 && si.lineDone]} />
      <View style={[si.circle, active2 && si.circleActive, !active2 && si.circleIdle]}>
        <Text style={[si.circleText, !active2 && si.circleTextIdle]}>2</Text>
      </View>
    </View>
  );
}
const si = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: { backgroundColor: colors.primary },
  circleIdle: { backgroundColor: colors.border },
  circleText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  circleTextIdle: { color: colors.textMuted },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  lineDone: { backgroundColor: colors.primary },
});

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
  const [query, setQuery] = useState("");
  useEffect(() => { if (!visible) setQuery(""); }, [visible]);

  const all = VILLES_LIST.filter((v) => v !== exclude);
  const cities = query.trim()
    ? all.filter((v) => v.toLowerCase().includes(query.toLowerCase()))
    : all;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable style={styles.modalCloseBtn} onPress={onClose} hitSlop={12}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.modalSearchRow}>
            <Text style={styles.modalSearchIcon}>🔍</Text>
            <TextInput
              style={styles.modalSearchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une ville…"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Text style={styles.modalSearchClear}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* List */}
          <FlatList
            data={cities}
            keyExtractor={(v) => v}
            style={{ maxHeight: 340 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Aucune ville trouvée</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.modalItem, pressed && styles.modalItemPressed]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={styles.modalItemPin}>📍</Text>
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

// ── Voyage card ───────────────────────────────────────────────────────────────
function VoyageCard({ voyage, nombrePlaces }: { voyage: Voyage; nombrePlaces: number }) {
  const full = voyage.nombre_places_restantes < nombrePlaces;
  return (
    <View style={[styles.voyageCard, full && styles.voyageCardFull]}>
      {/* Accent bar */}
      <View style={[styles.vcAccent, full && styles.vcAccentFull]} />

      <Pressable
        style={styles.vcBody}
        onPress={() => router.push(`/(client)/voyages/${voyage.id}` as any)}
      >
        {/* Top row */}
        <View style={styles.vcTop}>
          <View>
            <Text style={styles.vcTime}>
              {format(new Date(voyage.date_depart), "HH:mm")}
            </Text>
            <Text style={styles.vcDate}>
              {format(new Date(voyage.date_depart), "EEE d MMM", { locale: fr })}
            </Text>
          </View>
          <View style={styles.vcTopRight}>
            <Text style={styles.vcPrice}>{formatFCFA(voyage.prix_par_place)}</Text>
            <Text style={styles.vcPriceSub}>/ personne</Text>
          </View>
        </View>

        {/* Route timeline */}
        <View style={styles.vcRoute}>
          <View style={styles.vcStop}>
            <View style={styles.vcDotDepart} />
            <View style={styles.vcStopInfo}>
              <Text style={styles.vcCity}>{voyage.ville_depart}</Text>
              {voyage.point_depart ? (
                <Text style={styles.vcPoint} numberOfLines={1}>{voyage.point_depart}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.vcTimeline}>
            <View style={styles.vcTimelineLine} />
            {voyage.distance_km ? (
              <View style={styles.vcDistanceBadge}>
                <Text style={styles.vcDistanceText}>{voyage.distance_km} km</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.vcStop}>
            <View style={styles.vcDotArrivee} />
            <View style={styles.vcStopInfo}>
              <Text style={styles.vcCity}>{voyage.ville_arrivee}</Text>
              {voyage.point_arrivee ? (
                <Text style={styles.vcPoint} numberOfLines={1}>{voyage.point_arrivee}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Footer : places + tags */}
        <View style={styles.vcFooter}>
          <View style={[styles.vcPlaceBadge, full && styles.vcPlaceBadgeFull]}>
            <Text style={[styles.vcPlaceText, full && styles.vcPlaceTextFull]}>
              {full
                ? "🚫 Complet"
                : `✓  ${voyage.nombre_places_restantes} place${voyage.nombre_places_restantes > 1 ? "s" : ""} dispo`}
            </Text>
          </View>
          <View style={styles.vcTags}>
            {voyage.climatise && <Text style={styles.vcTag}>❄</Text>}
            {voyage.accepte_colis && <Text style={styles.vcTag}>📦</Text>}
            {voyage.non_fumeur && <Text style={styles.vcTag}>🚭</Text>}
          </View>
        </View>
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
          <Text style={styles.reserveBtnPrice}>
            {formatFCFA(voyage.prix_par_place * nombrePlaces)}
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

  const [cityDepart, setCityDepart] = useState("");
  const [pointDepart, setPointDepart] = useState("");
  const [locStatus, setLocStatus] = useState<"idle" | "detecting" | "found" | "denied">("idle");
  const [showDepartPicker, setShowDepartPicker] = useState(false);

  const [cityArrivee, setCityArrivee] = useState("");
  const [nombrePlaces, setNombrePlaces] = useState(1);
  const [showArriveePicker, setShowArriveePicker] = useState(false);

  const {
    data: voyages,
    isLoading: loadingRoute,
    refetch: refetchRoute,
  } = useVoyagesByRoute(
    step === 3 ? cityDepart : "",
    step === 3 ? cityArrivee : "",
  );
  const voyagesFiltres = voyages?.filter((v) => v.nombre_places_restantes >= nombrePlaces);

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
    ? FadeInRight.duration(260)
    : FadeInLeft.duration(260);
  const exiting = directionRef.current === "forward"
    ? FadeOutLeft.duration(260)
    : FadeOutRight.duration(260);

  return (
    <View style={styles.root}>
      <View style={styles.stepContainer}>
        <Animated.View key={step} entering={entering} exiting={exiting} style={StyleSheet.absoluteFillObject}>

          {/* ══════════ Étape 1 : Départ ══════════ */}
          {step === 1 && (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.header}>
                <StepIndicator step={step} />
                <Text style={styles.headerTitle}>D'où partez-vous ?</Text>
                <Text style={styles.headerSub}>Votre ville et point d'embarquement</Text>
              </View>

              <View style={styles.body}>
                {/* GPS status card */}
                <Pressable
                  style={[
                    styles.gpsCard,
                    locStatus === "found" && styles.gpsCardFound,
                    locStatus === "denied" && styles.gpsCardDenied,
                  ]}
                  onPress={detectLocation}
                >
                  <View style={[
                    styles.gpsIconWrap,
                    locStatus === "found" && styles.gpsIconWrapFound,
                  ]}>
                    {locStatus === "detecting"
                      ? <ActivityIndicator color={locStatus === "detecting" ? colors.primary : colors.white} size="small" />
                      : <Text style={styles.gpsIconEmoji}>
                          {locStatus === "found" ? "📍" : "🔍"}
                        </Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gpsLabel, locStatus === "found" && styles.gpsLabelFound]}>
                      {locStatus === "detecting"
                        ? "Localisation en cours…"
                        : locStatus === "found"
                        ? cityDepart
                        : "Détecter ma position"}
                    </Text>
                    <Text style={styles.gpsHint}>
                      {locStatus === "found"
                        ? "Ville détectée automatiquement · Appuyez pour rafraîchir"
                        : locStatus === "detecting"
                        ? "Recherche du signal GPS…"
                        : "Appuyez pour utiliser le GPS"}
                    </Text>
                  </View>
                  <Text style={styles.gpsRefreshIcon}>↻</Text>
                </Pressable>

                {/* Ville de départ */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.fieldLabelDot}>● </Text>Ville de départ
                  </Text>
                  <Pressable style={styles.cityBtn} onPress={() => setShowDepartPicker(true)}>
                    <Text style={styles.cityBtnIcon}>🏙</Text>
                    <Text style={[styles.cityBtnText, !cityDepart && styles.cityBtnPlaceholder]}>
                      {cityDepart || "Sélectionner une ville"}
                    </Text>
                    <View style={styles.cityBtnChevronWrap}>
                      <Text style={styles.cityBtnChevron}>▼</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Point d'embarquement */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.fieldLabelDot}>● </Text>Point d'embarquement
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={pointDepart}
                    onChangeText={setPointDepart}
                    placeholder="Ex : Gare de Cotonou, Carrefour Godomey…"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldHint}>Précisez l'endroit exact où vous embarquez</Text>
                </View>
              </View>

              <View style={styles.ctaArea}>
                <Pressable
                  style={[styles.ctaBtn, !canStep2 && styles.ctaBtnOff]}
                  onPress={() => canStep2 && goTo(2)}
                  disabled={!canStep2}
                >
                  <Text style={styles.ctaBtnText}>Choisir ma destination</Text>
                  <Text style={styles.ctaBtnArrow}>→</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* ══════════ Étape 2 : Destination ══════════ */}
          {step === 2 && (
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                <Pressable onPress={() => goTo(1)} style={styles.backBtn} hitSlop={8}>
                  <Text style={styles.backBtnText}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <StepIndicator step={step} />
                  <Text style={styles.headerTitle}>Où allez-vous ?</Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    Depuis {cityDepart} · {pointDepart}
                  </Text>
                </View>
              </View>

              <View style={styles.body}>
                {/* Destination */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.fieldLabelDot}>● </Text>Ville de destination
                  </Text>
                  <Pressable style={styles.cityBtn} onPress={() => setShowArriveePicker(true)}>
                    <Text style={styles.cityBtnIcon}>🎯</Text>
                    <Text style={[styles.cityBtnText, !cityArrivee && styles.cityBtnPlaceholder]}>
                      {cityArrivee || "Sélectionner une ville"}
                    </Text>
                    <View style={styles.cityBtnChevronWrap}>
                      <Text style={styles.cityBtnChevron}>▼</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Nombre de places */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.fieldLabelDot}>● </Text>Nombre de places
                  </Text>
                  <View style={styles.counterCard}>
                    <Pressable
                      style={[styles.counterBtn, nombrePlaces <= 1 && styles.counterBtnOff]}
                      onPress={() => setNombrePlaces((p) => Math.max(1, p - 1))}
                    >
                      <Text style={styles.counterBtnText}>−</Text>
                    </Pressable>
                    <View style={styles.counterCenter}>
                      <Text style={styles.counterValue}>{nombrePlaces}</Text>
                      <Text style={styles.counterLabel}>place{nombrePlaces > 1 ? "s" : ""}</Text>
                    </View>
                    <Pressable
                      style={[styles.counterBtn, nombrePlaces >= 8 && styles.counterBtnOff]}
                      onPress={() => setNombrePlaces((p) => Math.min(8, p + 1))}
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Route preview */}
                {cityArrivee ? (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.routePreview}>
                    <Text style={styles.routePreviewIcon}>🚗</Text>
                    <Text style={styles.routePreviewText}>
                      {cityDepart} → {cityArrivee}
                    </Text>
                    <Text style={styles.routePreviewPlaces}>
                      · {nombrePlaces} pl.
                    </Text>
                  </Animated.View>
                ) : null}
              </View>

              <View style={styles.ctaArea}>
                <Pressable
                  style={[styles.ctaBtn, !canSearch && styles.ctaBtnOff]}
                  onPress={() => canSearch && goTo(3)}
                  disabled={!canSearch}
                >
                  <Text style={styles.ctaBtnText}>Rechercher des trajets</Text>
                  <Text style={styles.ctaBtnArrow}>→</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ══════════ Étape 3 : Résultats ══════════ */}
          {step === 3 && (
            <View style={{ flex: 1 }}>
              <View style={styles.resultsHeader}>
                <Pressable onPress={() => goTo(2)} style={styles.backBtn} hitSlop={8}>
                  <Text style={styles.backBtnText}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultsTitle}>
                    {cityDepart} → {cityArrivee}
                  </Text>
                  <Text style={styles.resultsSubtitle}>
                    {nombrePlaces} place{nombrePlaces > 1 ? "s" : ""}
                    {voyagesFiltres != null
                      ? `  ·  ${voyagesFiltres.length} trajet${voyagesFiltres.length !== 1 ? "s" : ""} trouvé${voyagesFiltres.length !== 1 ? "s" : ""}`
                      : ""}
                  </Text>
                </View>
                <Pressable style={styles.modifyBtn} onPress={() => goTo(1)}>
                  <Text style={styles.modifyBtnText}>Modifier</Text>
                </Pressable>
              </View>

              {loadingRoute ? (
                <View style={styles.stateBox}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.stateTitle}>Recherche en cours…</Text>
                  <Text style={styles.stateText}>Nous cherchons les meilleurs trajets pour vous</Text>
                </View>
              ) : !voyagesFiltres?.length ? (
                <View style={styles.stateBox}>
                  <Text style={styles.stateEmoji}>🛣️</Text>
                  <Text style={styles.stateTitle}>Aucun trajet disponible</Text>
                  <Text style={styles.stateText}>
                    {voyages?.length
                      ? `Il n'y a pas assez de places disponibles pour ${nombrePlaces} passager${nombrePlaces > 1 ? "s" : ""}. Réduisez le nombre de places.`
                      : `Aucun voyage prévu sur ce trajet aujourd'hui.`}
                  </Text>
                  <Pressable style={styles.refreshBtn} onPress={() => refetchRoute()}>
                    <Text style={styles.refreshBtnText}>↻  Actualiser</Text>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  data={voyagesFiltres}
                  keyExtractor={(v) => String(v.id)}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <VoyageCard voyage={item} nombrePlaces={nombrePlaces} />
                  )}
                />
              )}
            </View>
          )}

        </Animated.View>
      </View>

      {/* Modals */}
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
const PT = Platform.OS === "ios" ? 56 : 40;
const PB = Platform.OS === "ios" ? 36 : 24;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  stepContainer: { flex: 1, overflow: "hidden" },

  // ── Header ──
  header: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  headerSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 3,
  },
  backBtn: { marginBottom: spacing.xs, alignSelf: "flex-start" },
  backBtnText: {
    fontSize: 22,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },

  // ── Body ──
  body: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    gap: spacing.xl,
  },

  // ── GPS card ──
  gpsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  gpsCardFound: {
    borderColor: `${colors.primary}50`,
    backgroundColor: `${colors.primary}08`,
  },
  gpsCardDenied: { borderColor: colors.border },
  gpsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  gpsIconWrapFound: { backgroundColor: colors.primary },
  gpsIconEmoji: { fontSize: 20 },
  gpsLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  gpsLabelFound: { color: colors.primary },
  gpsHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  gpsRefreshIcon: {
    fontSize: 20,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bold,
  },

  // ── Fields ──
  fieldBlock: { gap: spacing.sm },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  fieldLabelDot: { color: colors.primary },
  fieldHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  cityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    ...shadows.sm,
  },
  cityBtnIcon: { fontSize: 20 },
  cityBtnText: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  cityBtnPlaceholder: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
  },
  cityBtnChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cityBtnChevron: { fontSize: 10, color: colors.textMuted },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },

  // ── Counter ──
  counterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  counterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnOff: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  counterBtnText: {
    fontSize: 22,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    lineHeight: 28,
  },
  counterCenter: { alignItems: "center" },
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

  // ── Route preview ──
  routePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}10`,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  routePreviewIcon: { fontSize: 16 },
  routePreviewText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  routePreviewPlaces: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.primary,
    opacity: 0.7,
  },

  // ── CTA ──
  ctaArea: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: PB,
    paddingTop: spacing.lg,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    ...shadows.md,
  },
  ctaBtnOff: { opacity: 0.35 },
  ctaBtnText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  ctaBtnArrow: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: `${colors.white}cc`,
  },

  // ── Results header ──
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  resultsTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  resultsSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modifyBtn: {
    backgroundColor: `${colors.primary}12`,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  modifyBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // ── State boxes ──
  stateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    gap: spacing.md,
  },
  stateEmoji: { fontSize: 52, marginBottom: spacing.sm },
  stateTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  stateText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  refreshBtn: {
    marginTop: spacing.sm,
    backgroundColor: `${colors.primary}12`,
    borderRadius: radii.full,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  refreshBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // ── List ──
  listContent: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: 40,
  },

  // ── Voyage card ──
  voyageCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voyageCardFull: { opacity: 0.5 },
  vcAccent: {
    height: 4,
    backgroundColor: colors.primary,
  },
  vcAccentFull: { backgroundColor: colors.error },
  vcBody: { padding: spacing.xl, gap: spacing.md },

  // Top row
  vcTop: {
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
  vcTopRight: { alignItems: "flex-end" },
  vcPrice: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  vcPriceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Route timeline
  vcRoute: { gap: 2 },
  vcStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  vcDotDepart: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 4,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
  },
  vcDotArrivee: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.black,
    marginTop: 4,
    borderWidth: 2,
    borderColor: `${colors.black}40`,
  },
  vcStopInfo: { flex: 1 },
  vcTimeline: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 5,
    gap: spacing.sm,
    marginVertical: 2,
  },
  vcTimelineLine: { width: 2, height: 20, backgroundColor: colors.border },
  vcDistanceBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vcDistanceText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
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
    marginTop: 1,
  },

  // Footer
  vcFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  vcPlaceBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  vcPlaceBadgeFull: { backgroundColor: colors.errorBg },
  vcPlaceText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
  vcPlaceTextFull: { color: colors.error },
  vcTags: { flexDirection: "row", gap: spacing.xs },
  vcTag: { fontSize: 16 },

  // Reserve button
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  reserveBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  reserveBtnPrice: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: `${colors.white}cc`,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: PB,
    ...shadows.md,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
  },
  modalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing["2xl"],
    marginVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  modalSearchIcon: { fontSize: 16 },
  modalSearchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  modalSearchClear: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bold,
    paddingHorizontal: spacing.xs,
  },
  modalEmpty: {
    padding: spacing["2xl"],
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}60`,
  },
  modalItemPressed: { backgroundColor: `${colors.primary}08` },
  modalItemPin: { fontSize: 16 },
  modalItemText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  modalItemChevron: {
    fontSize: 22,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
  },
});
