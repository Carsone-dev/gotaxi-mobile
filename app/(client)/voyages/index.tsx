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
  ScrollView,
} from "react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  FadeIn,
  FadeInDown,
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

type Step = 1 | 2 | 3 | 4;

// ── Indicateur d'étapes (4 cercles) ──────────────────────────────────────────
function StepIndicator({ step }: { step: Step }) {
  const steps = [1, 2, 3, 4] as const;
  return (
    <View style={si.row}>
      {steps.map((s, i) => {
        const done   = step > s;
        const active = step === s;
        return (
          <React.Fragment key={s}>
            <View style={[si.circle, done && si.circleDone, active && si.circleActive]}>
              {done
                ? <Text style={si.txt}>✓</Text>
                : <Text style={[si.txt, !active && si.txtIdle]}>{s}</Text>}
            </View>
            {i < steps.length - 1 && (
              <View style={[si.line, done && si.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const si = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  circle: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.border,
  },
  circleActive: { backgroundColor: colors.primary },
  circleDone:   { backgroundColor: colors.primary },
  txt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  txtIdle: { color: colors.textMuted },
  line: {
    flex: 1, height: 2, backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  lineDone: { backgroundColor: colors.primary },
});

// ── Modal sélection de ville ──────────────────────────────────────────────────
function CityPickerModal({
  visible, title, exclude, onSelect, onClose,
}: {
  visible: boolean; title: string; exclude?: string;
  onSelect: (v: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!visible) setQuery(""); }, [visible]);

  const all    = VILLES_LIST.filter((v) => v !== exclude);
  const cities = query.trim()
    ? all.filter((v) => v.toLowerCase().includes(query.toLowerCase()))
    : all;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable style={styles.modalCloseBtn} onPress={onClose} hitSlop={12}>
              <Text style={styles.modalCloseTxt}>✕</Text>
            </Pressable>
          </View>
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
                <Text style={styles.modalClear}>✕</Text>
              </Pressable>
            )}
          </View>
          <FlatList
            data={cities}
            keyExtractor={(v) => v}
            style={{ maxHeight: 340 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyTxt}>Aucune ville trouvée</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.modalItem, pressed && styles.modalItemPressed]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={styles.modalItemPin}>📍</Text>
                <Text style={styles.modalItemTxt}>{item}</Text>
                <Text style={styles.modalItemChevron}>›</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Popup dépassement de capacité ─────────────────────────────────────────────
function OverCapacityModal({
  visible,
  available,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  available: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.ocOverlay}>
        <View style={styles.ocCard}>
          <View style={styles.ocIconWrap}>
            <Text style={styles.ocIcon}>⚠️</Text>
          </View>
          <Text style={styles.ocTitle}>Places limitées</Text>
          <Text style={styles.ocBody}>
            Ce chauffeur ne dispose que de{" "}
            <Text style={styles.ocBold}>
              {available} place{available > 1 ? "s" : ""}
            </Text>{" "}
            disponible{available > 1 ? "s" : ""}.{"\n"}
            Souhaitez-vous réserver{" "}
            <Text style={styles.ocBold}>
              {available} place{available > 1 ? "s" : ""}
            </Text>{" "}
            ?
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ocBtnPrimary, pressed && { opacity: 0.85 }]}
            onPress={onConfirm}
          >
            <Text style={styles.ocBtnPrimaryTxt}>
              Réserver {available} place{available > 1 ? "s" : ""}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ocBtnSecondary, pressed && { opacity: 0.7 }]}
            onPress={onCancel}
          >
            <Text style={styles.ocBtnSecondaryTxt}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Carte voyage (étape 3) ────────────────────────────────────────────────────
function VoyageSelectCard({
  voyage,
  index,
  onSelect,
}: {
  voyage: Voyage;
  index: number;
  onSelect: (v: Voyage) => void;
}) {
  const isFull = voyage.nombre_places_restantes === 0;
  const accent = isFull ? colors.error
    : voyage.nombre_places_restantes <= 2 ? colors.orangeOrange
    : colors.primary;

  return (
    <Animated.View entering={FadeInDown.duration(250).delay(index * 60)}>
      <Pressable
        style={({ pressed }) => [
          styles.vCard,
          isFull && styles.vCardFull,
          pressed && !isFull && styles.vCardPressed,
        ]}
        onPress={() => !isFull && onSelect(voyage)}
        disabled={isFull}
      >
        {/* Accent bar */}
        <View style={[styles.vAccent, { backgroundColor: accent }]} />

        <View style={styles.vBody}>
          {/* Top : heure + prix */}
          <View style={styles.vTop}>
            <View>
              <Text style={styles.vTime}>
                {format(new Date(voyage.date_depart), "HH:mm")}
              </Text>
              <Text style={styles.vDate}>
                {format(new Date(voyage.date_depart), "EEE d MMM", { locale: fr })}
              </Text>
            </View>
            <View style={styles.vTopRight}>
              <Text style={styles.vPrice}>{formatFCFA(voyage.prix_par_place)}</Text>
              <Text style={styles.vPriceSub}>/ personne</Text>
            </View>
          </View>

          {/* Route timeline */}
          <View style={styles.vRoute}>
            <View style={styles.vStop}>
              <View style={styles.vDotStart} />
              <View style={{ flex: 1 }}>
                <Text style={styles.vCity}>{voyage.ville_depart}</Text>
                {voyage.point_depart ? (
                  <Text style={styles.vPoint} numberOfLines={1}>{voyage.point_depart}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.vConnector}>
              <View style={styles.vLine} />
              {voyage.distance_km ? (
                <View style={styles.vDistPill}>
                  <Text style={styles.vDistTxt}>{voyage.distance_km} km</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.vStop}>
              <View style={styles.vDotEnd} />
              <View style={{ flex: 1 }}>
                <Text style={styles.vCity}>{voyage.ville_arrivee}</Text>
                {voyage.point_arrivee ? (
                  <Text style={styles.vPoint} numberOfLines={1}>{voyage.point_arrivee}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Footer : places + tags + CTA */}
          <View style={styles.vFooter}>
            <View style={[
              styles.vPlaceBadge,
              isFull && styles.vPlaceBadgeFull,
              voyage.nombre_places_restantes <= 2 && !isFull && styles.vPlaceBadgeWarn,
            ]}>
              <Text style={[
                styles.vPlaceTxt,
                isFull && styles.vPlaceTxtFull,
                voyage.nombre_places_restantes <= 2 && !isFull && styles.vPlaceTxtWarn,
              ]}>
                {isFull
                  ? "🚫 Complet"
                  : `✓ ${voyage.nombre_places_restantes} place${voyage.nombre_places_restantes > 1 ? "s" : ""}`}
              </Text>
            </View>
            <View style={styles.vTags}>
              {voyage.climatise    && <Text style={styles.vTag}>❄️</Text>}
              {voyage.accepte_colis && <Text style={styles.vTag}>📦</Text>}
              {voyage.non_fumeur   && <Text style={styles.vTag}>🚭</Text>}
            </View>
            {!isFull && (
              <View style={styles.vSelectBtn}>
                <Text style={styles.vSelectTxt}>Choisir →</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function VoyagesScreen() {
  const [step, setStep] = useState<Step>(1);
  const directionRef = useRef<"forward" | "backward">("forward");

  // Étape 1 — Départ
  const [cityDepart,  setCityDepart]  = useState("");
  const [pointDepart, setPointDepart] = useState("");
  const [locStatus,   setLocStatus]   = useState<"idle" | "detecting" | "found" | "denied">("idle");
  const [showDepartPicker, setShowDepartPicker] = useState(false);

  // Étape 2 — Destination
  const [cityArrivee,  setCityArrivee]  = useState("");
  const [pointArrivee, setPointArrivee] = useState("");
  const [showArriveePicker, setShowArriveePicker] = useState(false);

  // Étape 3 — Voyage sélectionné
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);

  // Étape 4 — Places
  const [nombrePlaces,      setNombrePlaces]      = useState(1);
  const [showOverCapacity,  setShowOverCapacity]  = useState(false);

  // Recherche voyages (activée dès l'étape 3)
  const {
    data: voyages,
    isLoading: loadingVoyages,
    refetch: refetchVoyages,
  } = useVoyagesByRoute(
    step >= 3 ? cityDepart  : "",
    step >= 3 ? cityArrivee : "",
  );
  const voyagesDispos = voyages?.filter((v) => v.nombre_places_restantes > 0) ?? [];

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
    }, [locStatus, detectLocation]),
  );

  // Navigation entre étapes
  function goTo(s: Step) {
    directionRef.current = s > step ? "forward" : "backward";
    setStep(s);
  }

  // Sélection d'un voyage (étape 3 → 4)
  function handleSelectVoyage(v: Voyage) {
    setSelectedVoyage(v);
    setNombrePlaces(1);
    goTo(4);
  }

  // Confirmation de réservation (étape 4)
  function handleReserver() {
    if (!selectedVoyage) return;
    const max = selectedVoyage.nombre_places_restantes;
    if (nombrePlaces > max) {
      setShowOverCapacity(true);
      return;
    }
    proceedToConfirm(nombrePlaces);
  }

  // Accepter le max disponible depuis le popup
  function handleAcceptMax() {
    setShowOverCapacity(false);
    if (!selectedVoyage) return;
    const max = selectedVoyage.nombre_places_restantes;
    setNombrePlaces(max);
    proceedToConfirm(max);
  }

  function proceedToConfirm(places: number) {
    if (!selectedVoyage) return;
    router.push({
      pathname: "/(client)/voyages/confirm" as any,
      params: {
        voyage_id: selectedVoyage.id,
        prix:      String(selectedVoyage.prix_par_place),
        places:    String(places),
      },
    });
  }

  // Conditions de progression
  const canStep2   = !!cityDepart && pointDepart.trim().length >= 2;
  const canStep3   = !!cityArrivee && pointArrivee.trim().length >= 2;

  // Animations directionnelles
  const entering = directionRef.current === "forward"
    ? FadeInRight.duration(260)
    : FadeInLeft.duration(260);
  const exiting = directionRef.current === "forward"
    ? FadeOutLeft.duration(260)
    : FadeOutRight.duration(260);

  return (
    <View style={styles.root}>
      <View style={styles.stepContainer}>
        <Animated.View
          key={step}
          entering={entering}
          exiting={exiting}
          style={StyleSheet.absoluteFillObject}
        >
          {/* ════════════ Étape 1 : Départ ════════════ */}
          {step === 1 && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.header}>
                <StepIndicator step={step} />
                <Text style={styles.headerTitle}>D'où partez-vous ?</Text>
                <Text style={styles.headerSub}>Votre ville et point d'embarquement</Text>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* GPS */}
                <Pressable
                  style={[
                    styles.gpsCard,
                    locStatus === "found"  && styles.gpsCardFound,
                    locStatus === "denied" && styles.gpsCardDenied,
                  ]}
                  onPress={detectLocation}
                >
                  <View style={[styles.gpsIconWrap, locStatus === "found" && styles.gpsIconWrapFound]}>
                    {locStatus === "detecting"
                      ? <ActivityIndicator color={colors.primary} size="small" />
                      : <Text style={styles.gpsEmoji}>
                          {locStatus === "found" ? "📍" : "🔍"}
                        </Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gpsLabel, locStatus === "found" && styles.gpsLabelFound]}>
                      {locStatus === "detecting" ? "Localisation en cours…"
                        : locStatus === "found" ? cityDepart
                        : "Détecter ma position"}
                    </Text>
                    <Text style={styles.gpsHint}>
                      {locStatus === "found"
                        ? "Ville détectée · Appuyez pour rafraîchir"
                        : locStatus === "detecting"
                        ? "Recherche du signal GPS…"
                        : "Appuyez pour utiliser le GPS"}
                    </Text>
                  </View>
                  <Text style={styles.gpsRefresh}>↻</Text>
                </Pressable>

                {/* Ville de départ */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.dot}>● </Text>Ville de départ
                  </Text>
                  <Pressable style={styles.cityBtn} onPress={() => setShowDepartPicker(true)}>
                    <Text style={styles.cityIcon}>🏙</Text>
                    <Text style={[styles.cityTxt, !cityDepart && styles.cityPlaceholder]}>
                      {cityDepart || "Sélectionner une ville"}
                    </Text>
                    <View style={styles.chevronWrap}>
                      <Text style={styles.chevron}>▼</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Point d'embarquement */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.dot}>● </Text>Point d'embarquement
                  </Text>
                  <TextInput
                    style={[styles.textInput, pointDepart.length > 0 && styles.textInputFilled]}
                    value={pointDepart}
                    onChangeText={setPointDepart}
                    placeholder="Ex : Gare de Cotonou, Carrefour Godomey…"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldHint}>
                    Précisez l'endroit exact où vous embarquez (min. 2 caractères)
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.ctaArea}>
                <Pressable
                  style={[styles.ctaBtn, !canStep2 && styles.ctaBtnOff]}
                  onPress={() => canStep2 && goTo(2)}
                  disabled={!canStep2}
                >
                  <Text style={styles.ctaTxt}>Choisir ma destination</Text>
                  <Text style={styles.ctaArrow}>→</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* ════════════ Étape 2 : Destination ════════════ */}
          {step === 2 && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.header}>
                <Pressable onPress={() => goTo(1)} style={styles.backBtn} hitSlop={8}>
                  <Text style={styles.backBtnTxt}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <StepIndicator step={step} />
                  <Text style={styles.headerTitle}>Où allez-vous ?</Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    Depuis {cityDepart} · {pointDepart}
                  </Text>
                </View>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Ville destination */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.dot}>● </Text>Ville de destination
                  </Text>
                  <Pressable style={styles.cityBtn} onPress={() => setShowArriveePicker(true)}>
                    <Text style={styles.cityIcon}>🎯</Text>
                    <Text style={[styles.cityTxt, !cityArrivee && styles.cityPlaceholder]}>
                      {cityArrivee || "Sélectionner une ville"}
                    </Text>
                    <View style={styles.chevronWrap}>
                      <Text style={styles.chevron}>▼</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Point de destination */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.dot}>● </Text>Point de destination
                  </Text>
                  <TextInput
                    style={[styles.textInput, pointArrivee.length > 0 && styles.textInputFilled]}
                    value={pointArrivee}
                    onChangeText={setPointArrivee}
                    placeholder="Ex : Gare de Parakou, Marché Central…"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldHint}>
                    Précisez l'endroit exact où vous descendez (min. 2 caractères)
                  </Text>
                </View>

                {/* Aperçu du trajet */}
                {cityArrivee ? (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.routePreview}>
                    <View style={styles.rpDotStart} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.rpCity}>{cityDepart}</Text>
                      <Text style={styles.rpPoint} numberOfLines={1}>{pointDepart}</Text>
                    </View>
                    <Text style={styles.rpArrow}>→</Text>
                    <View style={{ flex: 1, gap: 2, alignItems: "flex-end" }}>
                      <Text style={styles.rpCity}>{cityArrivee}</Text>
                      {pointArrivee ? (
                        <Text style={styles.rpPoint} numberOfLines={1}>{pointArrivee}</Text>
                      ) : null}
                    </View>
                    <View style={styles.rpDotEnd} />
                  </Animated.View>
                ) : null}
              </ScrollView>

              <View style={styles.ctaArea}>
                <Pressable
                  style={[styles.ctaBtn, !canStep3 && styles.ctaBtnOff]}
                  onPress={() => canStep3 && goTo(3)}
                  disabled={!canStep3}
                >
                  <Text style={styles.ctaTxt}>Voir les trajets disponibles</Text>
                  <Text style={styles.ctaArrow}>→</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* ════════════ Étape 3 : Trajets disponibles ════════════ */}
          {step === 3 && (
            <View style={{ flex: 1 }}>
              <View style={styles.resultsHeader}>
                <Pressable onPress={() => goTo(2)} style={styles.backBtn} hitSlop={8}>
                  <Text style={styles.backBtnTxt}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <StepIndicator step={step} />
                  <Text style={styles.resultsTitle}>
                    {cityDepart} → {cityArrivee}
                  </Text>
                  <Text style={styles.resultsSub} numberOfLines={1}>
                    {pointDepart} · {pointArrivee}
                  </Text>
                </View>
                <Pressable style={styles.modifyBtn} onPress={() => goTo(1)}>
                  <Text style={styles.modifyBtnTxt}>Modifier</Text>
                </Pressable>
              </View>

              {loadingVoyages ? (
                <View style={styles.stateBox}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.stateTxt}>Recherche en cours…</Text>
                </View>
              ) : voyagesDispos.length === 0 ? (
                <View style={styles.stateBox}>
                  <Text style={styles.stateEmoji}>🛣️</Text>
                  <Text style={styles.stateTitle}>Aucun trajet disponible</Text>
                  <Text style={styles.stateTxt}>
                    {voyages && voyages.length > 0
                      ? "Tous les trajets sur ce trajet sont complets."
                      : "Aucun voyage prévu sur ce trajet pour l'instant."}
                  </Text>
                  <Pressable style={styles.refreshBtn} onPress={() => refetchVoyages()}>
                    <Text style={styles.refreshBtnTxt}>↻  Actualiser</Text>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  data={voyagesDispos}
                  keyExtractor={(v) => String(v.id)}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <Text style={styles.listHint}>
                      {voyagesDispos.length} trajet{voyagesDispos.length > 1 ? "s" : ""} disponible{voyagesDispos.length > 1 ? "s" : ""} — appuyez pour sélectionner
                    </Text>
                  }
                  renderItem={({ item, index }) => (
                    <VoyageSelectCard
                      voyage={item}
                      index={index}
                      onSelect={handleSelectVoyage}
                    />
                  )}
                />
              )}
            </View>
          )}

          {/* ════════════ Étape 4 : Nombre de places ════════════ */}
          {step === 4 && selectedVoyage && (
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                <Pressable onPress={() => goTo(3)} style={styles.backBtn} hitSlop={8}>
                  <Text style={styles.backBtnTxt}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <StepIndicator step={step} />
                  <Text style={styles.headerTitle}>Combien de places ?</Text>
                  <Text style={styles.headerSub}>
                    {selectedVoyage.nombre_places_restantes} place{selectedVoyage.nombre_places_restantes > 1 ? "s" : ""} disponible{selectedVoyage.nombre_places_restantes > 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
              >
                {/* Recap voyage sélectionné */}
                <Animated.View entering={FadeInDown.duration(280)} style={styles.recapCard}>
                  <View style={[styles.recapAccent, { backgroundColor: colors.primary }]} />
                  <View style={styles.recapBody}>
                    <View style={styles.recapRoute}>
                      <View style={styles.recapDotStart} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recapCity}>{selectedVoyage.ville_depart}</Text>
                        <Text style={styles.recapPoint} numberOfLines={1}>{selectedVoyage.point_depart || pointDepart}</Text>
                      </View>
                      <Text style={styles.recapArrow}>→</Text>
                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        <Text style={styles.recapCity}>{selectedVoyage.ville_arrivee}</Text>
                        <Text style={styles.recapPoint} numberOfLines={1}>{selectedVoyage.point_arrivee || pointArrivee}</Text>
                      </View>
                      <View style={styles.recapDotEnd} />
                    </View>
                    <View style={styles.recapMeta}>
                      <View style={styles.recapTimeBadge}>
                        <Text style={styles.recapTime}>
                          {format(new Date(selectedVoyage.date_depart), "HH:mm · EEE d MMM", { locale: fr })}
                        </Text>
                      </View>
                      <Text style={styles.recapPrice}>
                        {formatFCFA(selectedVoyage.prix_par_place)} / pers.
                      </Text>
                    </View>
                  </View>
                </Animated.View>

                {/* Compteur de places */}
                <Animated.View entering={FadeInDown.duration(280).delay(80)} style={styles.counterCard}>
                  <Pressable
                    style={[styles.counterBtn, nombrePlaces <= 1 && styles.counterBtnOff]}
                    onPress={() => setNombrePlaces((p) => Math.max(1, p - 1))}
                    disabled={nombrePlaces <= 1}
                  >
                    <Text style={styles.counterBtnTxt}>−</Text>
                  </Pressable>
                  <View style={styles.counterCenter}>
                    <Text style={styles.counterNum}>{nombrePlaces}</Text>
                    <Text style={styles.counterLabel}>place{nombrePlaces > 1 ? "s" : ""}</Text>
                  </View>
                  <Pressable
                    style={[styles.counterBtn, nombrePlaces >= 8 && styles.counterBtnOff]}
                    onPress={() => setNombrePlaces((p) => Math.min(8, p + 1))}
                    disabled={nombrePlaces >= 8}
                  >
                    <Text style={styles.counterBtnTxt}>+</Text>
                  </Pressable>
                </Animated.View>

                {/* Prix total estimé */}
                <Animated.View entering={FadeInDown.duration(280).delay(160)} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total estimé</Text>
                  <Text style={styles.totalAmt}>
                    {formatFCFA(selectedVoyage.prix_par_place * nombrePlaces)}
                  </Text>
                </Animated.View>
              </ScrollView>

              <View style={styles.ctaArea}>
                <Pressable
                  style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleReserver}
                >
                  <Text style={styles.ctaTxt}>
                    Réserver · {nombrePlaces} place{nombrePlaces > 1 ? "s" : ""}
                  </Text>
                  <Text style={styles.ctaPrice}>
                    {formatFCFA(selectedVoyage.prix_par_place * nombrePlaces)}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      {/* ── Modals ─────────────────────────────────────────────── */}
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
      <OverCapacityModal
        visible={showOverCapacity}
        available={selectedVoyage?.nombre_places_restantes ?? 0}
        onConfirm={handleAcceptMax}
        onCancel={() => setShowOverCapacity(false)}
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

  // Header
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
  backBtnTxt: {
    fontSize: 22,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },

  // Body
  body: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: 16,
    gap: spacing.xl,
  },

  // GPS card
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
  gpsCardFound:  { borderColor: `${colors.primary}50`, backgroundColor: `${colors.primary}08` },
  gpsCardDenied: { borderColor: colors.border },
  gpsIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center", justifyContent: "center",
  },
  gpsIconWrapFound: { backgroundColor: colors.primary },
  gpsEmoji: { fontSize: 20 },
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
  gpsRefresh: { fontSize: 20, color: colors.textMuted, fontFamily: typography.fontFamily.bold },

  // Fields
  field: { gap: spacing.sm },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  dot: { color: colors.primary },
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
  cityIcon: { fontSize: 20 },
  cityTxt: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  cityPlaceholder: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
  },
  chevronWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  chevron: { fontSize: 10, color: colors.textMuted },
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
  textInputFilled: { borderColor: `${colors.primary}50` },

  // Route preview (étape 2)
  routePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}08`,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  rpDotStart: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary, flexShrink: 0,
  },
  rpDotEnd: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.black, flexShrink: 0,
  },
  rpCity: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  rpPoint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  rpArrow: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },

  // CTA
  ctaArea: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: PB,
    paddingTop: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  ctaTxt: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  ctaArrow: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: `${colors.white}cc`,
  },
  ctaPrice: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: `${colors.white}cc`,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  // Results header
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
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  resultsSub: {
    fontSize: typography.fontSize.xs,
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
  modifyBtnTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // List
  listContent: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 40 },
  listHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // State boxes
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
  stateTxt: {
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
  refreshBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // Voyage select card
  vCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  vCardFull:    { opacity: 0.5 },
  vCardPressed: { opacity: 0.88 },
  vAccent: { height: 4 },
  vBody:   { padding: spacing.xl, gap: spacing.md },
  vTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  vTime: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  vDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
    marginTop: 2,
  },
  vTopRight: { alignItems: "flex-end" },
  vPrice: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  vPriceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  vRoute: { gap: 2 },
  vStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  vDotStart: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.primary, marginTop: 4,
    borderWidth: 2, borderColor: `${colors.primary}40`,
  },
  vDotEnd: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.black, marginTop: 4,
    borderWidth: 2, borderColor: `${colors.black}40`,
  },
  vConnector: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 5,
    gap: spacing.sm,
    marginVertical: 2,
  },
  vLine: { width: 2, height: 20, backgroundColor: colors.border },
  vDistPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vDistTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  vCity: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  vPoint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  vFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vPlaceBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  vPlaceBadgeFull: { backgroundColor: colors.errorBg },
  vPlaceBadgeWarn: { backgroundColor: `${colors.orangeOrange}18` },
  vPlaceTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
  vPlaceTxtFull: { color: colors.error },
  vPlaceTxtWarn: { color: colors.orangeOrange },
  vTags: { flexDirection: "row", gap: spacing.xs, flex: 1 },
  vTag: { fontSize: 15 },
  vSelectBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  vSelectTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  // Recap card (étape 4)
  recapCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  recapAccent: { height: 4 },
  recapBody: { padding: spacing.xl, gap: spacing.md },
  recapRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recapDotStart: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary, flexShrink: 0,
  },
  recapDotEnd: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.black, flexShrink: 0,
  },
  recapCity: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  recapPoint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  recapArrow: {
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bold,
  },
  recapMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recapTimeBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recapTime: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  recapPrice: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },

  // Counter (étape 4)
  counterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadows.sm,
  },
  counterBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1.5, borderColor: `${colors.primary}30`,
    alignItems: "center", justifyContent: "center",
  },
  counterBtnOff: { backgroundColor: colors.surface, borderColor: colors.border },
  counterBtnTxt: {
    fontSize: 22,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    lineHeight: 28,
  },
  counterCenter: { alignItems: "center" },
  counterNum: {
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

  // Total (étape 4)
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  totalAmt: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },

  // ── Modal city picker ──────────────────────────────────────────
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
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center", marginTop: 12, marginBottom: 8,
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
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  modalCloseTxt: {
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
    borderWidth: 1, borderColor: colors.border,
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
  modalClear: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bold,
    paddingHorizontal: spacing.xs,
  },
  modalEmpty: { padding: spacing["2xl"], alignItems: "center" },
  modalEmptyTxt: {
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
  modalItemPin:  { fontSize: 16 },
  modalItemTxt: {
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

  // ── Modal over capacity ────────────────────────────────────────
  ocOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
  },
  ocCard: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing["3xl"],
    width: "100%",
    alignItems: "center",
    gap: spacing.lg,
    ...shadows.lg,
  },
  ocIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.warningBg,
    alignItems: "center", justifyContent: "center",
  },
  ocIcon: { fontSize: 30 },
  ocTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  ocBody: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  ocBold: {
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  ocBtnPrimary: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  ocBtnPrimaryTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  ocBtnSecondary: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ocBtnSecondaryTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});
