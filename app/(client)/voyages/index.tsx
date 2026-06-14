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
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { nearestCity } from "@/src/constants/cities";
import { useSearchVoyages } from "@/src/hooks/useVoyages";
import { useVilles, useGaresByVille } from "@/src/hooks/useGares";
import { formatFCFA } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage } from "@/src/api/types";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Départ", "Arrivée", "Trajets", "Places"] as const;

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }

const DATE_OPTS = [
  { label: "Aujourd'hui", delta: 0 },
  { label: "Demain",      delta: 1 },
  { label: "+ 2 jours",   delta: 2 },
] as const;

// ── Indicateur d'étapes ────────────────────────────────────────────────────────
function StepIndicator({ step, light = false }: { step: Step; light?: boolean }) {
  const steps = [1, 2, 3, 4] as const;
  return (
    <View style={si.container}>
      {steps.map((s, i) => {
        const done   = step > s;
        const active = step === s;
        const filled = done || active;
        return (
          <React.Fragment key={s}>
            <View style={si.stepCol}>
              <View
                style={[
                  si.circle,
                  filled && (light ? si.circleFilledLight : si.circleFilled),
                  !filled && light && si.circleIdleLight,
                ]}
              >
                <Text
                  style={[
                    si.circleText,
                    !filled && (light ? si.circleTextIdleLight : si.circleTextIdle),
                    filled && light && si.circleTextFilledLight,
                  ]}
                >
                  {done ? "✓" : String(s)}
                </Text>
              </View>
              <Text
                style={[
                  si.label,
                  active && (light ? si.labelActiveLt : si.labelActive),
                  !active && light && si.labelLt,
                ]}
              >
                {STEP_LABELS[i]}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                style={[
                  si.line,
                  done && (light ? si.lineDoneLt : si.lineDone),
                  !done && light && si.lineLt,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const si = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
  stepCol:   { alignItems: "center", gap: 3 },
  circle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  circleFilled:      { backgroundColor: colors.primary },
  circleIdleLight:   { backgroundColor: "rgba(255,255,255,0.2)" },
  circleFilledLight: { backgroundColor: colors.white },
  circleText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    lineHeight: 14,
  },
  circleTextIdle:        { color: colors.textMuted },
  circleTextIdleLight:   { color: "rgba(255,255,255,0.5)" },
  circleTextFilledLight: { color: colors.primary },
  label: {
    fontSize: 9,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  labelActive:   { color: colors.primary,  fontFamily: typography.fontFamily.bold },
  labelLt:       { color: "rgba(255,255,255,0.65)" },
  labelActiveLt: { color: colors.white,    fontFamily: typography.fontFamily.bold },
  line: {
    flex: 1, height: 2, backgroundColor: colors.border,
    marginHorizontal: 4, marginTop: 13, borderRadius: 1, alignSelf: "flex-start",
  },
  lineDone:   { backgroundColor: colors.primary },
  lineLt:     { backgroundColor: "rgba(255,255,255,0.25)" },
  lineDoneLt: { backgroundColor: "rgba(255,255,255,0.85)" },
});

// ── Modal sélection de ville (données depuis l'API backoffice) ─────────────────
function CityPickerModal({
  visible, title, exclude, onSelect, onClose,
}: {
  visible: boolean; title: string; exclude?: string;
  onSelect: (v: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!visible) setQuery(""); }, [visible]);

  const { data: villes, isLoading: villesLoading } = useVilles();
  const allActive = (villes ?? []).filter((v) => v.actif && v.nom !== exclude).map((v) => v.nom);
  const cities = query.trim()
    ? allActive.filter((v) => v.toLowerCase().includes(query.toLowerCase()))
    : allActive;

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
          {villesLoading && allActive.length === 0 ? (
            <View style={styles.modalEmpty}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.modalEmptyTxt, { marginTop: spacing.sm }]}>
                Chargement des villes…
              </Text>
            </View>
          ) : (
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
                  onPress={() => { Haptics.selectionAsync(); onSelect(item); onClose(); }}
                >
                  <Text style={styles.modalItemPin}>📍</Text>
                  <Text style={styles.modalItemTxt}>{item}</Text>
                  <Text style={styles.modalItemChevron}>›</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Popup dépassement de capacité ──────────────────────────────────────────────
function OverCapacityModal({
  visible, available, onConfirm, onCancel,
}: {
  visible: boolean; available: number; onConfirm: () => void; onCancel: () => void;
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
            <Text style={styles.ocBold}>{available} place{available > 1 ? "s" : ""}</Text>{" "}
            disponible{available > 1 ? "s" : ""}.{"\n"}
            Souhaitez-vous réserver{" "}
            <Text style={styles.ocBold}>{available} place{available > 1 ? "s" : ""}</Text> ?
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

// ── Grille visuelle des sièges ─────────────────────────────────────────────────
function SeatGrid({ total, selected }: { total: number; selected: number }) {
  const display = Math.min(total, 8);
  return (
    <View style={sg.row}>
      {Array.from({ length: display }).map((_, i) => (
        <Animated.View
          key={i}
          entering={FadeIn.duration(120).delay(i * 35)}
          style={[sg.seat, i < selected && sg.seatSelected]}
        >
          <Text style={[sg.icon, i < selected && sg.iconSelected]}>
            {i < selected ? "●" : "○"}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}
const sg = StyleSheet.create({
  row: {
    flexDirection: "row", gap: spacing.sm, flexWrap: "wrap",
    justifyContent: "center", paddingVertical: spacing.sm,
  },
  seat: {
    width: 36, height: 36, borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  seatSelected: { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
  icon:         { fontSize: 14, color: colors.border },
  iconSelected: { color: colors.primary },
});

// ── Suggestions de gares (dynamiques depuis l'API) ─────────────────────────────
function GareSuggestions({
  villeNom, currentValue, onSelect,
}: {
  villeNom: string;
  currentValue: string;
  onSelect: (nom: string) => void;
}) {
  const { data: villes } = useVilles();
  const villeId = villes?.find((v) => v.nom === villeNom)?.id ?? null;
  const { data: gares, isLoading } = useGaresByVille(villeId);

  const activeGares = (gares ?? []).filter((g) => g.actif);

  if (!villeNom || (!isLoading && !activeGares.length)) return null;

  return (
    <Animated.View entering={FadeInDown.duration(220)} style={gs.wrap}>
      <Text style={gs.label}>
        {isLoading ? "Chargement des gares…" : "Gares & points de départ"}
      </Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="small" style={{ marginTop: 6 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={gs.row}
        >
          {activeGares.map((g) => {
            const active = currentValue === g.nom;
            return (
              <Pressable
                key={g.id}
                style={({ pressed }) => [
                  gs.chip,
                  active && gs.chipActive,
                  pressed && !active && gs.chipPressed,
                ]}
                onPress={() => { Haptics.selectionAsync(); onSelect(g.nom); }}
              >
                <Text style={[gs.chipTxt, active && gs.chipTxtActive]}>
                  {active ? "✓ " : "📍 "}{g.nom}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const gs = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", gap: spacing.sm, paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive:  { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}50` },
  chipPressed: { backgroundColor: colors.surface },
  chipTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  chipTxtActive: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
});

// ── Feuille d'édition du point d'embarquement ─────────────────────────────────
function EmbarkEditSheet({
  visible, title, value, villeNom, onConfirm, onClose,
}: {
  visible: boolean;
  title: string;
  value: string;
  villeNom: string;
  onConfirm: (v: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => { if (visible) setText(value); }, [visible]);

  function confirm() {
    if (text.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onConfirm(text.trim());
      onClose();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={ees.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={ees.sheet}>
          <View style={ees.handle} />
          <View style={ees.header}>
            <Text style={ees.title}>{title}</Text>
            <Pressable style={ees.closeBtn} onPress={onClose} hitSlop={12}>
              <Text style={ees.closeTxt}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: 340 }}
            contentContainerStyle={ees.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={[ees.input, text.length > 0 && ees.inputFilled]}
              value={text}
              onChangeText={setText}
              placeholder="Ex: Gare de Cotonou, Carrefour Godomey…"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirm}
            />
            <GareSuggestions villeNom={villeNom} currentValue={text} onSelect={setText} />
          </ScrollView>
          <View style={ees.footer}>
            <Pressable
              style={[ees.confirmBtn, !text.trim() && ees.confirmBtnOff]}
              onPress={confirm}
              disabled={!text.trim()}
            >
              <Text style={ees.confirmTxt}>Confirmer le point</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ees = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...shadows.lg,
  },
  handle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center", marginTop: 12, marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  closeTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
  },
  body: {
    padding: spacing["2xl"],
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    minHeight: 48,
  },
  inputFilled: { borderColor: `${colors.primary}50`, backgroundColor: colors.white },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  confirmBtnOff: { opacity: 0.35 },
  confirmTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});

// ── Carte voyage (étape 3) ─────────────────────────────────────────────────────
function VoyageSelectCard({
  voyage, index, onSelect,
}: {
  voyage: Voyage; index: number; onSelect: (v: Voyage) => void;
}) {
  const isFull = voyage.nombre_places_restantes === 0;
  const isLow  = !isFull && voyage.nombre_places_restantes <= 2;
  const accent = isFull ? colors.error : isLow ? colors.orangeOrange : colors.primary;

  return (
    <Animated.View entering={FadeInDown.duration(250).delay(index * 60)}>
      <Pressable
        style={({ pressed }) => [
          styles.vCard,
          isFull && styles.vCardFull,
          pressed && !isFull && styles.vCardPressed,
        ]}
        onPress={() => {
          if (!isFull) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(voyage);
          }
        }}
        disabled={isFull}
      >
        <View style={[styles.vLeftAccent, { backgroundColor: accent }]} />

        <View style={styles.vBody}>
          {/* Top: heure + prix */}
          <View style={styles.vTopRow}>
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

          {/* Footer: places + tags + CTA */}
          <View style={styles.vFooter}>
            <View style={[
              styles.vPlaceBadge,
              isFull && styles.vPlaceBadgeFull,
              isLow  && styles.vPlaceBadgeWarn,
            ]}>
              <Text style={[
                styles.vPlaceTxt,
                isFull && styles.vPlaceTxtFull,
                isLow  && styles.vPlaceTxtWarn,
              ]}>
                {isFull
                  ? "🚫 Complet"
                  : `✓ ${voyage.nombre_places_restantes} place${voyage.nombre_places_restantes > 1 ? "s" : ""}`}
              </Text>
            </View>
            <View style={styles.vTags}>
              {voyage.climatise     && <Text style={styles.vTag}>❄️</Text>}
              {voyage.accepte_colis && <Text style={styles.vTag}>📦</Text>}
              {voyage.non_fumeur    && <Text style={styles.vTag}>🚭</Text>}
            </View>
            {!isFull && (
              <View style={[styles.vSelectBtn, { backgroundColor: accent }]}>
                <Text style={styles.vSelectTxt}>Choisir →</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Écran principal ────────────────────────────────────────────────────────────
export default function VoyagesScreen() {
  const [step, setStep] = useState<Step>(1);
  const directionRef = useRef<"forward" | "backward">("forward");

  // Étape 1
  const [cityDepart,  setCityDepart]  = useState("");
  const [pointDepart, setPointDepart] = useState("");
  const [locStatus,   setLocStatus]   = useState<"idle" | "detecting" | "found" | "denied">("idle");
  const [showDepartPicker, setShowDepartPicker] = useState(false);

  // Étape 2
  const [cityArrivee,   setCityArrivee]   = useState("");
  const [pointArrivee,  setPointArrivee]  = useState("");
  const [searchDate,    setSearchDate]    = useState(() => toDateStr(new Date()));
  const [showArriveePicker, setShowArriveePicker] = useState(false);

  // Étape 3
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);

  // Étape 4
  const [nombrePlaces,     setNombrePlaces]     = useState(1);
  const [showOverCapacity, setShowOverCapacity] = useState(false);

  // Points d'embarquement dynamiques (pré-remplis depuis le voyage sélectionné)
  const [embarkDepart,  setEmbarkDepart]  = useState("");
  const [embarkArrivee, setEmbarkArrivee] = useState("");
  const [editingEmbark, setEditingEmbark] = useState<"depart" | "arrivee" | null>(null);

  // Réinitialisation automatique du point quand la ville change
  useEffect(() => { setPointDepart(""); }, [cityDepart]);
  useEffect(() => { setPointArrivee(""); }, [cityArrivee]);

  // Animation pulse GPS
  const pulseAnim = useSharedValue(0);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value * 0.45,
    transform: [{ scale: 1 + pulseAnim.value * 0.4 }],
  }));

  useEffect(() => {
    if (locStatus === "detecting") {
      pulseAnim.value = withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })),
        -1, false,
      );
    } else {
      pulseAnim.value = withTiming(0, { duration: 300 });
    }
  }, [locStatus]);

  // Recherche voyages
  const {
    data: voyagesResult,
    isLoading: loadingVoyages,
    refetch: refetchVoyages,
  } = useSearchVoyages(
    {
      ville_depart:  cityDepart,
      ville_arrivee: cityArrivee,
      date_depart:   searchDate,
      sort_by:       "depart_asc",
    },
    step >= 3,
  );
  const voyagesDispos = (voyagesResult?.items ?? []).filter(
    (v) => v.statut === "PUBLIE" && v.nombre_places_restantes > 0,
  );

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

  function goTo(s: Step) {
    directionRef.current = s > step ? "forward" : "backward";
    setStep(s);
  }

  function handleSelectVoyage(v: Voyage) {
    setSelectedVoyage(v);
    setNombrePlaces(1);
    // Pré-remplir les points depuis le trajet du chauffeur
    setEmbarkDepart(v.point_depart ?? pointDepart);
    setEmbarkArrivee(v.point_arrivee ?? pointArrivee);
    goTo(4);
  }

  function handleReserver() {
    if (!selectedVoyage) return;
    const max = selectedVoyage.nombre_places_restantes;
    if (nombrePlaces > max) { setShowOverCapacity(true); return; }
    proceedToConfirm(nombrePlaces);
  }

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

  function handleSwapCities() {
    if (!cityArrivee) return;
    const tmp = cityDepart;
    setCityDepart(cityArrivee);
    setCityArrivee(tmp);
    setLocStatus("found");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const canStep2 = !!cityDepart && pointDepart.trim().length >= 2;
  const canStep3 = !!cityArrivee && pointArrivee.trim().length >= 2;

  const entering = directionRef.current === "forward" ? FadeInRight.duration(260) : FadeInLeft.duration(260);
  const exiting  = directionRef.current === "forward" ? FadeOutLeft.duration(260) : FadeOutRight.duration(260);

  const dateLabel = format(new Date(searchDate), "EEE d MMM", { locale: fr });

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
              <View style={styles.heroHeader}>
                <StepIndicator step={step} light />
                <Text style={styles.heroTitle}>D'où partez-vous ?</Text>
                <Text style={styles.heroSub}>Ville et point d'embarquement</Text>
              </View>

              <ScrollView
                style={styles.contentArea}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* GPS Card */}
                <Pressable
                  style={[
                    styles.gpsCard,
                    locStatus === "found"  && styles.gpsCardFound,
                    locStatus === "denied" && styles.gpsCardDenied,
                  ]}
                  onPress={detectLocation}
                >
                  <View style={styles.gpsIconOuter}>
                    {locStatus === "detecting" && (
                      <Animated.View style={[styles.gpsPulseRing, pulseStyle]} />
                    )}
                    <View style={[styles.gpsIconWrap, locStatus === "found" && styles.gpsIconWrapFound]}>
                      {locStatus === "detecting"
                        ? <ActivityIndicator color={colors.primary} size="small" />
                        : <Text style={styles.gpsEmoji}>{locStatus === "found" ? "📍" : "🔍"}</Text>}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gpsLabel, locStatus === "found" && styles.gpsLabelFound]}>
                      {locStatus === "detecting" ? "Localisation en cours…"
                        : locStatus === "found"  ? cityDepart
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

                {/* Ville départ */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.dot}>● </Text>Ville de départ
                  </Text>
                  <Pressable
                    style={[styles.cityBtn, cityDepart && styles.cityBtnFilled]}
                    onPress={() => setShowDepartPicker(true)}
                  >
                    <Text style={styles.cityIcon}>🏙</Text>
                    <Text style={[styles.cityTxt, !cityDepart && styles.cityPlaceholder]}>
                      {cityDepart || "Sélectionner une ville"}
                    </Text>
                    {cityDepart
                      ? <View style={styles.cityCheckWrap}><Text style={styles.cityCheck}>✓</Text></View>
                      : <View style={styles.chevronWrap}><Text style={styles.chevron}>▼</Text></View>}
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
                  <Text style={styles.fieldHint}>Précisez l'endroit exact (min. 2 caractères)</Text>
                  {/* Suggestions de gares depuis l'API */}
                  {cityDepart ? (
                    <GareSuggestions
                      villeNom={cityDepart}
                      currentValue={pointDepart}
                      onSelect={setPointDepart}
                    />
                  ) : null}
                </View>
              </ScrollView>

              <View style={styles.ctaArea}>
                <Pressable
                  style={({ pressed }) => [styles.ctaBtn, !canStep2 && styles.ctaBtnOff, pressed && canStep2 && { opacity: 0.88 }]}
                  onPress={() => { if (canStep2) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); goTo(2); } }}
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
              <View style={styles.heroHeader}>
                <Pressable onPress={() => goTo(1)} style={styles.heroBackBtn} hitSlop={8}>
                  <Text style={styles.heroBackTxt}>←</Text>
                </Pressable>
                <StepIndicator step={step} light />
                <Text style={styles.heroTitle}>Où allez-vous ?</Text>
                <Text style={styles.heroSub} numberOfLines={1}>Depuis {cityDepart}</Text>
              </View>

              <ScrollView
                style={styles.contentArea}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Résumé départ + swap */}
                <Animated.View entering={FadeIn.duration(200)} style={styles.departSummary}>
                  <View style={styles.dsDot} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.dsCityTxt}>{cityDepart}</Text>
                    <Text style={styles.dsPointTxt} numberOfLines={1}>{pointDepart}</Text>
                  </View>
                  {cityArrivee ? (
                    <Pressable
                      style={({ pressed }) => [styles.swapBtn, pressed && { opacity: 0.7 }]}
                      onPress={handleSwapCities}
                      hitSlop={8}
                    >
                      <Text style={styles.swapTxt}>⇅</Text>
                    </Pressable>
                  ) : null}
                </Animated.View>

                {/* Ville destination */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.dot}>● </Text>Ville de destination
                  </Text>
                  <Pressable
                    style={[styles.cityBtn, cityArrivee && styles.cityBtnFilled]}
                    onPress={() => setShowArriveePicker(true)}
                  >
                    <Text style={styles.cityIcon}>🎯</Text>
                    <Text style={[styles.cityTxt, !cityArrivee && styles.cityPlaceholder]}>
                      {cityArrivee || "Sélectionner une ville"}
                    </Text>
                    {cityArrivee
                      ? <View style={styles.cityCheckWrap}><Text style={styles.cityCheck}>✓</Text></View>
                      : <View style={styles.chevronWrap}><Text style={styles.chevron}>▼</Text></View>}
                  </Pressable>
                </View>

                {/* Point destination */}
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
                  <Text style={styles.fieldHint}>Précisez l'endroit exact (min. 2 caractères)</Text>
                  {cityArrivee ? (
                    <GareSuggestions
                      villeNom={cityArrivee}
                      currentValue={pointArrivee}
                      onSelect={setPointArrivee}
                    />
                  ) : null}
                </View>

                {/* Date du voyage */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    <Text style={styles.dot}>● </Text>Date du voyage
                  </Text>
                  <View style={styles.dateChipsRow}>
                    {DATE_OPTS.map((opt) => {
                      const d   = toDateStr(addDays(new Date(), opt.delta));
                      const sel = searchDate === d;
                      return (
                        <Pressable
                          key={opt.delta}
                          style={[styles.dateChip, sel && styles.dateChipActive]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSearchDate(d);
                          }}
                        >
                          <Text style={[styles.dateChipTxt, sel && styles.dateChipTxtActive]}>
                            {opt.label}
                          </Text>
                          {sel && (
                            <Text style={styles.dateChipSub}>
                              {format(new Date(d), "d MMM", { locale: fr })}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Aperçu trajet */}
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
                  style={({ pressed }) => [styles.ctaBtn, !canStep3 && styles.ctaBtnOff, pressed && canStep3 && { opacity: 0.88 }]}
                  onPress={() => { if (canStep3) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); goTo(3); } }}
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
                  <Text style={styles.resultsTitle}>{cityDepart} → {cityArrivee}</Text>
                  <Text style={styles.resultsSub} numberOfLines={1}>
                    {dateLabel} · {pointDepart}
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
                    {(voyagesResult?.items ?? []).length > 0
                      ? "Tous les trajets sur ce trajet sont complets."
                      : `Aucun voyage prévu le ${dateLabel} sur ce trajet.`}
                  </Text>
                  <Pressable style={styles.refreshBtn} onPress={() => refetchVoyages()}>
                    <Text style={styles.refreshBtnTxt}>↻  Actualiser</Text>
                  </Pressable>
                  <Pressable style={styles.changeDateBtn} onPress={() => goTo(2)}>
                    <Text style={styles.changeDateBtnTxt}>Changer la date</Text>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  data={voyagesDispos}
                  keyExtractor={(v) => String(v.id)}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <View style={styles.listHeaderRow}>
                      <Text style={styles.listHint}>
                        {voyagesDispos.length} trajet{voyagesDispos.length > 1 ? "s" : ""} · {dateLabel}
                      </Text>
                      <View style={styles.listDateBadge}>
                        <Text style={styles.listDateBadgeTxt}>📅 {dateLabel}</Text>
                      </View>
                    </View>
                  }
                  renderItem={({ item, index }) => (
                    <VoyageSelectCard voyage={item} index={index} onSelect={handleSelectVoyage} />
                  )}
                />
              )}
            </View>
          )}

          {/* ════════════ Étape 4 : Nombre de places ════════════ */}
          {step === 4 && selectedVoyage && (
            <View style={{ flex: 1 }}>
              <View style={styles.heroHeader}>
                <Pressable onPress={() => goTo(3)} style={styles.heroBackBtn} hitSlop={8}>
                  <Text style={styles.heroBackTxt}>←</Text>
                </Pressable>
                <StepIndicator step={step} light />
                <Text style={styles.heroTitle}>Combien de places ?</Text>
                <Text style={styles.heroSub}>
                  {selectedVoyage.nombre_places_restantes} place{selectedVoyage.nombre_places_restantes > 1 ? "s" : ""} disponible{selectedVoyage.nombre_places_restantes > 1 ? "s" : ""}
                </Text>
              </View>

              <ScrollView
                style={styles.contentArea}
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
              >
                {/* Recap voyage */}
                <Animated.View entering={FadeInDown.duration(280)} style={styles.recapCard}>
                  <View style={[styles.recapAccent, { backgroundColor: colors.primary }]} />
                  <View style={styles.recapBody}>
                    <View style={styles.recapRoute}>
                      <View style={styles.recapDotStart} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recapCity}>{selectedVoyage.ville_depart}</Text>
                      </View>
                      <Text style={styles.recapArrow}>→</Text>
                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        <Text style={styles.recapCity}>{selectedVoyage.ville_arrivee}</Text>
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

                {/* Points d'embarquement dynamiques + modifiables */}
                <Animated.View entering={FadeInDown.duration(280).delay(40)} style={styles.embarkCard}>
                  <Text style={styles.embarkCardTitle}>Points de trajet</Text>

                  <Pressable
                    style={({ pressed }) => [styles.embarkRow, pressed && styles.embarkRowPressed]}
                    onPress={() => setEditingEmbark("depart")}
                  >
                    <View style={styles.embarkDotStart} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={styles.embarkLabel}>Départ</Text>
                      <Text style={styles.embarkValue} numberOfLines={2}>{embarkDepart}</Text>
                    </View>
                    <View style={styles.embarkEditBtn}>
                      <Text style={styles.embarkEditTxt}>✏️</Text>
                    </View>
                  </Pressable>

                  <View style={styles.embarkDivider} />

                  <Pressable
                    style={({ pressed }) => [styles.embarkRow, pressed && styles.embarkRowPressed]}
                    onPress={() => setEditingEmbark("arrivee")}
                  >
                    <View style={styles.embarkDotEnd} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={styles.embarkLabel}>Arrivée</Text>
                      <Text style={styles.embarkValue} numberOfLines={2}>{embarkArrivee}</Text>
                    </View>
                    <View style={styles.embarkEditBtn}>
                      <Text style={styles.embarkEditTxt}>✏️</Text>
                    </View>
                  </Pressable>

                  <View style={styles.embarkNote}>
                    <Text style={styles.embarkNoteTxt}>
                      ℹ️ Points officiels du chauffeur · Appuyez pour personnaliser
                    </Text>
                  </View>
                </Animated.View>

                {/* Grille sièges */}
                <Animated.View entering={FadeInDown.duration(280).delay(100)} style={styles.seatCard}>
                  <Text style={styles.seatCardTitle}>
                    Sièges sélectionnés ({nombrePlaces}/{selectedVoyage.nombre_places_restantes})
                  </Text>
                  <SeatGrid total={selectedVoyage.nombre_places_restantes} selected={nombrePlaces} />
                </Animated.View>

                {/* Compteur */}
                <Animated.View entering={FadeInDown.duration(280).delay(160)} style={styles.counterCard}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.counterBtn,
                      nombrePlaces <= 1 && styles.counterBtnOff,
                      pressed && nombrePlaces > 1 && { opacity: 0.75 },
                    ]}
                    onPress={() => {
                      if (nombrePlaces > 1) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNombrePlaces((p) => p - 1);
                      }
                    }}
                    disabled={nombrePlaces <= 1}
                  >
                    <Text style={[styles.counterBtnTxt, nombrePlaces <= 1 && styles.counterBtnTxtOff]}>−</Text>
                  </Pressable>
                  <View style={styles.counterCenter}>
                    <Text style={styles.counterNum}>{nombrePlaces}</Text>
                    <Text style={styles.counterLabel}>place{nombrePlaces > 1 ? "s" : ""}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.counterBtn,
                      nombrePlaces >= 8 && styles.counterBtnOff,
                      pressed && nombrePlaces < 8 && { opacity: 0.75 },
                    ]}
                    onPress={() => {
                      if (nombrePlaces < 8) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNombrePlaces((p) => Math.min(8, p + 1));
                      }
                    }}
                    disabled={nombrePlaces >= 8}
                  >
                    <Text style={[styles.counterBtnTxt, nombrePlaces >= 8 && styles.counterBtnTxtOff]}>+</Text>
                  </Pressable>
                </Animated.View>

                {/* Total */}
                <Animated.View entering={FadeInDown.duration(280).delay(220)} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total estimé</Text>
                  <Text style={styles.totalAmt}>
                    {formatFCFA(selectedVoyage.prix_par_place * nombrePlaces)}
                  </Text>
                </Animated.View>
              </ScrollView>

              <View style={styles.ctaArea}>
                <Pressable
                  style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    handleReserver();
                  }}
                >
                  <Text style={styles.ctaTxt}>
                    Réserver · {nombrePlaces} place{nombrePlaces > 1 ? "s" : ""}
                  </Text>
                  <Text style={styles.ctaPrice}>
                    {formatFCFA(selectedVoyage.prix_par_place * nombrePlaces)}
                  </Text>
                </Pressable>
              </View>

              {/* Sheets d'édition des points */}
              <EmbarkEditSheet
                visible={editingEmbark === "depart"}
                title={`Point de départ · ${selectedVoyage.ville_depart}`}
                value={embarkDepart}
                villeNom={selectedVoyage.ville_depart}
                onConfirm={setEmbarkDepart}
                onClose={() => setEditingEmbark(null)}
              />
              <EmbarkEditSheet
                visible={editingEmbark === "arrivee"}
                title={`Point d'arrivée · ${selectedVoyage.ville_arrivee}`}
                value={embarkArrivee}
                villeNom={selectedVoyage.ville_arrivee}
                onConfirm={setEmbarkArrivee}
                onClose={() => setEditingEmbark(null)}
              />
            </View>
          )}

        </Animated.View>
      </View>

      {/* Modals globaux */}
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

// ── Styles ─────────────────────────────────────────────────────────────────────
const PT = Platform.OS === "ios" ? 56 : 40;
const PB = Platform.OS === "ios" ? 36 : 24;

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.surface },
  stepContainer: { flex: 1, overflow: "hidden" },

  // ── Hero header
  heroHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing["2xl"],
  },
  heroBackBtn:  { marginBottom: spacing.xs, alignSelf: "flex-start" },
  heroBackTxt: {
    fontSize: 22, fontFamily: typography.fontFamily.bold, color: colors.white,
  },
  heroTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    marginTop: spacing.xs,
  },
  heroSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.8)",
    marginTop: 3,
  },

  // ── Content
  contentArea: { flex: 1, backgroundColor: colors.surface },
  body: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: 16,
    gap: spacing.xl,
  },

  // ── GPS card
  gpsCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl, padding: spacing.lg,
    borderWidth: 1.5, borderColor: colors.border,
    ...shadows.sm,
  },
  gpsCardFound:  { borderColor: `${colors.primary}50`, backgroundColor: `${colors.primary}08` },
  gpsCardDenied: { borderColor: colors.border },
  gpsIconOuter: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  gpsPulseRing: {
    position: "absolute", width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: colors.primary,
  },
  gpsIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center", justifyContent: "center",
  },
  gpsIconWrapFound: { backgroundColor: colors.primary },
  gpsEmoji:  { fontSize: 20 },
  gpsLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  gpsLabelFound: { color: colors.primary },
  gpsHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted, marginTop: 2,
  },
  gpsRefresh: { fontSize: 20, color: colors.textMuted, fontFamily: typography.fontFamily.bold },

  // ── Fields
  field:      { gap: spacing.sm },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  dot:       { color: colors.primary },
  fieldHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  cityBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radii.xl,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    ...shadows.sm,
  },
  cityBtnFilled:   { borderColor: `${colors.primary}50` },
  cityIcon:        { fontSize: 20 },
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
  cityCheckWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1, borderColor: `${colors.primary}40`,
    alignItems: "center", justifyContent: "center",
  },
  cityCheck: {
    fontSize: 12, color: colors.primary, fontFamily: typography.fontFamily.bold,
  },
  textInput: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  textInputFilled: { borderColor: `${colors.primary}50` },

  // ── Date chips
  dateChipsRow: { flexDirection: "row", gap: spacing.sm },
  dateChip: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.xl, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white, gap: 2,
  },
  dateChipActive:  { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  dateChipTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  dateChipTxtActive: { color: colors.primary, fontFamily: typography.fontFamily.bold },
  dateChipSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.primary,
    textTransform: "capitalize",
  },

  // ── Step 2: résumé départ
  departSummary: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: radii.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  dsDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary, flexShrink: 0,
  },
  dsCityTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  dsPointTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  swapBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1, borderColor: `${colors.primary}30`,
    alignItems: "center", justifyContent: "center",
  },
  swapTxt: { fontSize: 16, color: colors.primary, fontFamily: typography.fontFamily.bold },

  // ── Route preview (step 2)
  routePreview: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: `${colors.primary}08`, borderRadius: radii.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: `${colors.primary}20`,
  },
  rpDotStart: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, flexShrink: 0 },
  rpDotEnd:   { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.black, flexShrink: 0 },
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
    fontSize: typography.fontSize.base, color: colors.primary, fontFamily: typography.fontFamily.bold,
  },

  // ── CTA
  ctaArea: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: PB, paddingTop: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.xl,
    paddingVertical: spacing.xl, ...shadows.md,
  },
  ctaBtnOff: { opacity: 0.35 },
  ctaTxt: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  ctaArrow: {
    fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold,
    color: `${colors.white}cc`,
  },
  ctaPrice: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold,
    color: `${colors.white}cc`,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2,
  },

  // ── Results header (step 3)
  resultsHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing["2xl"], paddingTop: PT, paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: { marginBottom: spacing.xs, alignSelf: "flex-start" },
  backBtnTxt: {
    fontSize: 22, fontFamily: typography.fontFamily.bold, color: colors.primary,
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
    marginTop: 2, textTransform: "capitalize",
  },
  modifyBtn: {
    backgroundColor: `${colors.primary}12`, borderRadius: radii.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: `${colors.primary}30`,
  },
  modifyBtnTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // ── List
  listContent:   { padding: spacing.xl, gap: spacing.lg, paddingBottom: 40 },
  listHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  listHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  listDateBadge: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  listDateBadgeTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
    textTransform: "capitalize",
  },

  // ── State boxes
  stateBox: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: spacing["2xl"], gap: spacing.md,
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
    color: colors.textMuted, textAlign: "center", lineHeight: 20,
  },
  refreshBtn: {
    marginTop: spacing.sm,
    backgroundColor: `${colors.primary}12`, borderRadius: radii.full,
    paddingHorizontal: spacing["2xl"], paddingVertical: spacing.md,
    borderWidth: 1, borderColor: `${colors.primary}30`,
  },
  refreshBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  changeDateBtn: {
    backgroundColor: colors.white, borderRadius: radii.full,
    paddingHorizontal: spacing["2xl"], paddingVertical: spacing.md,
    borderWidth: 1.5, borderColor: colors.border,
  },
  changeDateBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // ── VoyageSelectCard
  vCard: {
    backgroundColor: colors.white, borderRadius: radii.xl, overflow: "hidden",
    flexDirection: "row", borderWidth: 1, borderColor: colors.border, ...shadows.md,
  },
  vCardFull:    { opacity: 0.5 },
  vCardPressed: { opacity: 0.88 },
  vLeftAccent:  { width: 4 },
  vBody:        { flex: 1, padding: spacing.xl, gap: spacing.md },
  vTopRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  vTopRight: { alignItems: "flex-end" },
  vTime: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary, lineHeight: 36,
  },
  vDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary, textTransform: "capitalize", marginTop: 2,
  },
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
  vStop:  { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
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
    flexDirection: "row", alignItems: "center",
    paddingLeft: 5, gap: spacing.sm, marginVertical: 2,
  },
  vLine: { width: 2, height: 20, backgroundColor: colors.border },
  vDistPill: {
    backgroundColor: colors.surface, borderRadius: radii.full,
    paddingHorizontal: spacing.sm, paddingVertical: 1,
    borderWidth: 1, borderColor: colors.border,
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
    color: colors.textSecondary, marginTop: 1,
  },
  vFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  vPlaceBadge: {
    backgroundColor: colors.successBg, borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: 4,
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
  vTags:        { flexDirection: "row", gap: spacing.xs, flex: 1 },
  vTag:         { fontSize: 15 },
  vSelectBtn: {
    borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 5,
  },
  vSelectTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  // ── Recap card (step 4)
  recapCard: {
    backgroundColor: colors.white, borderRadius: radii.xl, overflow: "hidden",
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  recapAccent: { height: 4 },
  recapBody:   { padding: spacing.xl, gap: spacing.md },
  recapRoute: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
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
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  recapArrow: {
    fontSize: typography.fontSize.base, color: colors.textMuted, fontFamily: typography.fontFamily.bold,
  },
  recapMeta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  recapTimeBadge: {
    backgroundColor: colors.surface, borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  recapTime: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary, textTransform: "capitalize",
  },
  recapPrice: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },

  // ── Embark card (step 4 — nouveau)
  embarkCard: {
    backgroundColor: colors.white, borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    ...shadows.sm,
  },
  embarkCardTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  embarkRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },
  embarkRowPressed: { backgroundColor: `${colors.primary}06` },
  embarkDotStart: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.primary, flexShrink: 0,
    borderWidth: 2, borderColor: `${colors.primary}35`,
  },
  embarkDotEnd: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.black, flexShrink: 0,
    borderWidth: 2, borderColor: `${colors.black}35`,
  },
  embarkLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  embarkValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  embarkEditBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1, borderColor: `${colors.primary}25`,
    alignItems: "center", justifyContent: "center",
  },
  embarkEditTxt: { fontSize: 14 },
  embarkDivider: {
    height: 1, backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
  embarkNote: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md,
    backgroundColor: `${colors.primary}04`,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  embarkNoteTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // ── Seat card
  seatCard: {
    backgroundColor: colors.white, borderRadius: radii.xl, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", ...shadows.sm,
  },
  seatCardTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary, marginBottom: spacing.xs,
  },

  // ── Counter (step 4)
  counterCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.white, borderRadius: radii.xl,
    borderWidth: 1.5, borderColor: colors.border, padding: spacing.xl, ...shadows.sm,
  },
  counterBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1.5, borderColor: `${colors.primary}30`,
    alignItems: "center", justifyContent: "center",
  },
  counterBtnOff:    { backgroundColor: colors.surface, borderColor: colors.border },
  counterBtnTxt: {
    fontSize: 22, fontFamily: typography.fontFamily.bold, color: colors.primary, lineHeight: 28,
  },
  counterBtnTxtOff: { color: colors.textMuted },
  counterCenter:    { alignItems: "center" },
  counterNum: {
    fontSize: typography.fontSize["4xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary, lineHeight: 48,
  },
  counterLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // ── Total (step 4)
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.white, borderRadius: radii.xl, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
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

  // ── Modal city picker
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: PB, ...shadows.md,
  },
  modalHandle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: "center", marginTop: 12, marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
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
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginHorizontal: spacing["2xl"], marginVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  modalSearchIcon: { fontSize: 16 },
  modalSearchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary, paddingVertical: spacing.xs,
  },
  modalClear: {
    fontSize: typography.fontSize.sm, color: colors.textMuted,
    fontFamily: typography.fontFamily.bold, paddingHorizontal: spacing.xs,
  },
  modalEmpty:    { padding: spacing["2xl"], alignItems: "center" },
  modalEmptyTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  modalItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: `${colors.border}60`,
  },
  modalItemPressed:  { backgroundColor: `${colors.primary}08` },
  modalItemPin:      { fontSize: 16 },
  modalItemTxt: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  modalItemChevron: {
    fontSize: 22, color: colors.textMuted, fontFamily: typography.fontFamily.regular,
  },

  // ── Modal over capacity
  ocOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center", padding: spacing["2xl"],
  },
  ocCard: {
    backgroundColor: colors.white, borderRadius: radii["2xl"],
    padding: spacing["3xl"], width: "100%", alignItems: "center",
    gap: spacing.lg, ...shadows.lg,
  },
  ocIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.warningBg,
    alignItems: "center", justifyContent: "center",
  },
  ocIcon:  { fontSize: 30 },
  ocTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  ocBody: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary, textAlign: "center", lineHeight: 22,
  },
  ocBold: { fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  ocBtnPrimary: {
    width: "100%", backgroundColor: colors.primary, borderRadius: radii.full,
    paddingVertical: spacing.lg, alignItems: "center",
  },
  ocBtnPrimaryTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  ocBtnSecondary: {
    width: "100%", backgroundColor: colors.surface, borderRadius: radii.full,
    paddingVertical: spacing.md, alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  ocBtnSecondaryTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});
