import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router } from "expo-router";
import { useMyVehicules } from "@/src/hooks/useChauffeur";
import { useCreateVoyage } from "@/src/hooks/useVoyages";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { TypeVehicule } from "@/src/api/types";
import { VILLES, VILLES_LIST } from "@/src/constants/cities";
import Animated, {
  FadeInRight, FadeOutLeft,
  FadeInLeft, FadeOutRight,
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
} from "react-native-reanimated";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<TypeVehicule, string> = {
  BERLINE: "Berline",
  SUV: "SUV",
  MINIBUS: "Minibus",
  BUS: "Bus",
  MOTO: "Moto",
};

const STEP_TITLES = ["Véhicule", "Itinéraire", "Date & Heure", "Tarif & Places", "Options"];
const TOTAL_STEPS = STEP_TITLES.length;

function nextHour(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

// ─── Modal sélecteur de ville ─────────────────────────────────────────────────

function CityModal({
  visible,
  title,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{title}</Text>
          <Pressable onPress={onClose} style={modalStyles.closeBtn}>
            <Text style={modalStyles.closeTxt}>✕</Text>
          </Pressable>
        </View>
        <FlatList
          data={VILLES_LIST}
          keyExtractor={(item) => item}
          style={modalStyles.list}
          renderItem={({ item }) => (
            <Pressable
              style={[modalStyles.item, selected === item && modalStyles.itemActive]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[modalStyles.itemText, selected === item && modalStyles.itemTextActive]}>
                {item}
              </Text>
              {selected === item && <Text style={modalStyles.itemCheck}>✓</Text>}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    maxHeight: SCREEN_H * 0.65,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.semiBold,
  },
  list: { paddingHorizontal: spacing["2xl"] },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemActive: { borderBottomColor: "transparent" },
  itemText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  itemTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  itemCheck: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
});

// ─── Pastille animée ──────────────────────────────────────────────────────────

function StepDot({ index, activeStep }: { index: number; activeStep: number }) {
  const width = useSharedValue(index === 0 ? 24 : 8);

  useEffect(() => {
    width.value = withSpring(index === activeStep ? 24 : 8, {
      damping: 16,
      stiffness: 180,
    });
  }, [activeStep]);

  const animStyle = useAnimatedStyle(() => ({ width: width.value }));

  const bgColor =
    index === activeStep
      ? colors.primary
      : index < activeStep
      ? `${colors.primary}60`
      : colors.border;

  return (
    <Animated.View
      style={[{ height: 8, borderRadius: 4, backgroundColor: bgColor }, animStyle]}
    />
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function PublishVoyageScreen() {
  const { showToast } = useToast();
  const { data: vehicules, isLoading: loadingVehicules } = useMyVehicules();
  const { mutateAsync: createVoyage, isPending } = useCreateVoyage();

  // ── Navigation par étape ──
  const [step, setStep] = useState(0);
  const directionRef = useRef<"forward" | "backward">("forward");

  // ── Progression animée ──
  const progressWidth = useSharedValue(SCREEN_W / TOTAL_STEPS);
  const progressFillStyle = useAnimatedStyle(() => ({ width: progressWidth.value }));

  useEffect(() => {
    progressWidth.value = withTiming(((step + 1) / TOTAL_STEPS) * SCREEN_W, { duration: 350 });
  }, [step]);

  // ── Champs du formulaire ──
  const [vehiculeId, setVehiculeId] = useState("");
  const [villeDepart, setVilleDepart] = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [pointDepart, setPointDepart] = useState("");
  const [pointArrivee, setPointArrivee] = useState("");
  const [departure, setDeparture] = useState<Date>(nextHour);
  const [prix, setPrix] = useState("");
  const [places, setPlaces] = useState(4);
  const [accepteColis, setAccepteColis] = useState(true);
  const [climatise, setClimatise] = useState(false);
  const [nonFumeur, setNonFumeur] = useState(true);

  // ── Date/heure ──
  const [showPicker, setShowPicker] = useState(false);
  const [androidStep, setAndroidStep] = useState<"date" | "time">("date");
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");

  // ── Sélecteur de ville ──
  const [cityTarget, setCityTarget] = useState<"depart" | "arrivee" | null>(null);

  const activeVehicules = vehicules?.filter((v) => v.actif) ?? [];

  useEffect(() => {
    if (activeVehicules.length === 1 && !vehiculeId) {
      setVehiculeId(activeVehicules[0].id);
    }
  }, [activeVehicules.length]);

  // ── Date helpers ──
  const syncManual = (d: Date) => {
    setManualDate(format(d, "dd/MM/yyyy"));
    setManualTime(format(d, "HH:mm"));
  };

  const openDatePicker = () => {
    setAndroidStep("date");
    setShowPicker(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(false);
    if (event.type !== "set" || !selected) return;
    if (androidStep === "date") {
      const merged = new Date(selected);
      merged.setHours(departure.getHours(), departure.getMinutes(), 0, 0);
      setDeparture(merged);
      setAndroidStep("time");
      setShowPicker(true);
    } else {
      const merged = new Date(departure);
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDeparture(merged);
      syncManual(merged);
    }
  };

  const handleIosChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) setDeparture(selected);
  };

  const confirmIos = () => {
    setShowPicker(false);
    syncManual(departure);
  };

  const handleManualDate = (text: string) => {
    setManualDate(text);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      const [d, m, y] = text.split("/");
      const t = format(departure, "HH:mm");
      const parsed = new Date(`${y}-${m}-${d}T${t}:00`);
      if (!isNaN(parsed.getTime())) setDeparture(parsed);
    }
  };

  const handleManualTime = (text: string) => {
    setManualTime(text);
    if (/^\d{2}:\d{2}$/.test(text)) {
      const [h, m] = text.split(":");
      const merged = new Date(departure);
      merged.setHours(Number(h), Number(m), 0, 0);
      if (!isNaN(merged.getTime())) setDeparture(merged);
    }
  };

  // ── Validation par étape ──
  const stepValid = (): boolean => {
    switch (step) {
      case 0: return !!vehiculeId;
      case 1:
        return (
          !!villeDepart &&
          !!villeArrivee &&
          villeDepart !== villeArrivee &&
          pointDepart.trim().length >= 5 &&
          pointArrivee.trim().length >= 5
        );
      case 2: return departure > new Date();
      case 3: return !!prix && !isNaN(Number(prix)) && Number(prix) >= 500;
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!stepValid()) return;
    if (step < TOTAL_STEPS - 1) {
      directionRef.current = "forward";
      setStep((s) => s + 1);
    } else {
      handlePublish();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      directionRef.current = "backward";
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  const handlePublish = async () => {
    const coordDepart = VILLES[villeDepart] ?? { lat: 0, lng: 0 };
    const coordArrivee = VILLES[villeArrivee] ?? { lat: 0, lng: 0 };
    try {
      await createVoyage({
        ville_depart: villeDepart,
        ville_arrivee: villeArrivee,
        point_depart: pointDepart.trim(),
        point_arrivee: pointArrivee.trim(),
        lat_depart: coordDepart.lat,
        lng_depart: coordDepart.lng,
        lat_arrivee: coordArrivee.lat,
        lng_arrivee: coordArrivee.lng,
        date_depart: departure.toISOString(),
        prix_par_place: Number(prix),
        nombre_places_total: places,
        vehicule_id: vehiculeId,
        accepte_colis: accepteColis,
        climatise,
        non_fumeur: nonFumeur,
      });
      showToast("Trajet publié avec succès !", "success");
      router.back();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  // ── Chargement ──
  if (loadingVehicules) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!activeVehicules.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noVehIcon}>🚗</Text>
        <Text style={styles.noVehTitle}>Aucun véhicule enregistré</Text>
        <Text style={styles.noVehText}>
          Ajoutez un véhicule dans votre profil avant de publier un trajet.
        </Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </Pressable>
      </View>
    );
  }

  const valid = stepValid();
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── En-tête ── */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerBackBtn}>
          <Text style={styles.headerBackTxt}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Publier un trajet</Text>
          <Text style={styles.headerStepLabel}>{STEP_TITLES[step]}</Text>
        </View>
        <View style={styles.stepCounter}>
          <Text style={styles.stepCounterCurrent}>{step + 1}</Text>
          <Text style={styles.stepCounterTotal}>/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* ── Barre de progression ── */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressFillStyle]} />
      </View>

      {/* ── Points indicateurs ── */}
      <View style={styles.dotsRow}>
        {STEP_TITLES.map((_, i) => (
          <StepDot key={i} index={i} activeStep={step} />
        ))}
      </View>

      {/* ── Contenu de l'étape ── */}
      <View style={styles.stepContent}>
        <Animated.View
          key={step}
          entering={directionRef.current === "forward" ? FadeInRight.duration(260) : FadeInLeft.duration(260)}
          exiting={directionRef.current === "forward" ? FadeOutLeft.duration(260) : FadeOutRight.duration(260)}
          style={[StyleSheet.absoluteFillObject, { padding: spacing["2xl"] }]}
        >
          {step === 0 && (
            <StepVehicule
              vehicules={activeVehicules}
              selected={vehiculeId}
              onSelect={setVehiculeId}
            />
          )}
          {step === 1 && (
            <StepItineraire
              villeDepart={villeDepart}
              villeArrivee={villeArrivee}
              pointDepart={pointDepart}
              pointArrivee={pointArrivee}
              onOpenCity={(target) => setCityTarget(target)}
              onChangePointDepart={setPointDepart}
              onChangePointArrivee={setPointArrivee}
            />
          )}
          {step === 2 && (
            <StepDateHeure
              departure={departure}
              showPicker={showPicker}
              androidStep={androidStep}
              showManual={showManual}
              manualDate={manualDate}
              manualTime={manualTime}
              onOpenPicker={openDatePicker}
              onAndroidChange={handleAndroidChange}
              onIosChange={handleIosChange}
              onConfirmIos={confirmIos}
              onToggleManual={() => {
                if (!showManual) syncManual(departure);
                setShowManual((v) => !v);
              }}
              onManualDate={handleManualDate}
              onManualTime={handleManualTime}
            />
          )}
          {step === 3 && (
            <StepTarif
              prix={prix}
              places={places}
              onPrix={setPrix}
              onPlaces={setPlaces}
            />
          )}
          {step === 4 && (
            <StepOptions
              accepteColis={accepteColis}
              climatise={climatise}
              nonFumeur={nonFumeur}
              onAccepteColis={setAccepteColis}
              onClimatise={setClimatise}
              onNonFumeur={setNonFumeur}
              summary={{ villeDepart, villeArrivee, departure, prix, places }}
            />
          )}
        </Animated.View>
      </View>

      {/* ── Pied de page navigation ── */}
      <View style={styles.footer}>
        <Pressable style={styles.btnBack} onPress={handleBack}>
          <Text style={styles.btnBackTxt}>{step === 0 ? "Annuler" : "← Retour"}</Text>
        </Pressable>

        <Pressable
          style={[styles.btnNext, !valid && styles.btnNextDisabled]}
          onPress={handleNext}
          disabled={!valid || isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.btnNextTxt}>
              {isLast ? "Publier le trajet" : "Suivant →"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* ── Modal sélecteur de ville ── */}
      <CityModal
        visible={cityTarget !== null}
        title={cityTarget === "depart" ? "Ville de départ" : "Ville d'arrivée"}
        selected={cityTarget === "depart" ? villeDepart : villeArrivee}
        onSelect={(v) => {
          if (cityTarget === "depart") setVilleDepart(v);
          else setVilleArrivee(v);
        }}
        onClose={() => setCityTarget(null)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Étape 1 : Véhicule ───────────────────────────────────────────────────────

function StepVehicule({
  vehicules,
  selected,
  onSelect,
}: {
  vehicules: any[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.hint}>Quel véhicule utilisez-vous pour ce trajet ?</Text>
      <View style={stepStyles.vehiculeList}>
        {vehicules.map((v) => (
          <Pressable
            key={v.id}
            style={[stepStyles.vehiculeCard, selected === v.id && stepStyles.vehiculeCardActive]}
            onPress={() => onSelect(v.id)}
          >
            <View style={stepStyles.vehiculeIconBox}>
              <Text style={stepStyles.vehiculeIcon}>🚗</Text>
            </View>
            <View style={stepStyles.vehiculeInfo}>
              <Text style={stepStyles.vehiculeName}>
                {v.marque} {v.modele}
              </Text>
              <Text style={stepStyles.vehiculeSub}>
                {TYPE_LABEL[v.type_vehicule as TypeVehicule]} · {v.couleur} · {v.annee}
              </Text>
              <Text style={stepStyles.vehiculePlate}>{v.immatriculation}</Text>
            </View>
            <View style={[stepStyles.vehiculeRadio, selected === v.id && stepStyles.vehiculeRadioActive]}>
              {selected === v.id && <View style={stepStyles.vehiculeRadioDot} />}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Étape 2 : Itinéraire ─────────────────────────────────────────────────────

function StepItineraire({
  villeDepart,
  villeArrivee,
  pointDepart,
  pointArrivee,
  onOpenCity,
  onChangePointDepart,
  onChangePointArrivee,
}: {
  villeDepart: string;
  villeArrivee: string;
  pointDepart: string;
  pointArrivee: string;
  onOpenCity: (t: "depart" | "arrivee") => void;
  onChangePointDepart: (v: string) => void;
  onChangePointArrivee: (v: string) => void;
}) {
  const sameCity = !!villeDepart && !!villeArrivee && villeDepart === villeArrivee;

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.hint}>D'où partez-vous et où allez-vous ?</Text>

      {/* Carte itinéraire visuelle */}
      <View style={itinStyles.card}>
        {/* Départ */}
        <View style={itinStyles.row}>
          <View style={itinStyles.dotCol}>
            <View style={[itinStyles.dot, { backgroundColor: colors.primary }]} />
          </View>
          <View style={itinStyles.fields}>
            <Pressable
              style={[itinStyles.cityBtn, villeDepart && itinStyles.cityBtnFilled]}
              onPress={() => onOpenCity("depart")}
            >
              <Text style={[itinStyles.cityBtnTxt, !villeDepart && itinStyles.placeholder]}>
                {villeDepart || "Ville de départ"}
              </Text>
              <Text style={itinStyles.arrow}>▼</Text>
            </Pressable>
            <TextInput
              style={itinStyles.pointInput}
              value={pointDepart}
              onChangeText={onChangePointDepart}
              placeholder="Point de départ précis (min. 5 car.)"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Connecteur */}
        <View style={itinStyles.connector}>
          <View style={itinStyles.connectorLine} />
          <View style={itinStyles.connectorArrow}>
            <Text style={itinStyles.connectorArrowTxt}>↓</Text>
          </View>
          <View style={itinStyles.connectorLine} />
        </View>

        {/* Arrivée */}
        <View style={itinStyles.row}>
          <View style={itinStyles.dotCol}>
            <View style={[itinStyles.dot, { backgroundColor: colors.error }]} />
          </View>
          <View style={itinStyles.fields}>
            <Pressable
              style={[itinStyles.cityBtn, villeArrivee && itinStyles.cityBtnFilled, sameCity && itinStyles.cityBtnError]}
              onPress={() => onOpenCity("arrivee")}
            >
              <Text style={[itinStyles.cityBtnTxt, !villeArrivee && itinStyles.placeholder, sameCity && itinStyles.txtError]}>
                {villeArrivee || "Ville d'arrivée"}
              </Text>
              <Text style={itinStyles.arrow}>▼</Text>
            </Pressable>
            <TextInput
              style={itinStyles.pointInput}
              value={pointArrivee}
              onChangeText={onChangePointArrivee}
              placeholder="Point d'arrivée précis (min. 5 car.)"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />
          </View>
        </View>
      </View>

      {sameCity && (
        <Text style={stepStyles.errorNote}>Les villes de départ et d'arrivée doivent être différentes.</Text>
      )}
    </View>
  );
}

const itinStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: 0,
    ...shadows.sm,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  dotCol: { width: 20, alignItems: "center", paddingTop: 14 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  fields: { flex: 1, gap: spacing.sm },
  cityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  cityBtnFilled: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  cityBtnError: { borderColor: colors.error, backgroundColor: colors.errorBg },
  cityBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  placeholder: { color: colors.textMuted, fontFamily: typography.fontFamily.regular },
  txtError: { color: colors.error },
  arrow: { fontSize: typography.fontSize.xs, color: colors.textMuted },
  pointInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  connector: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 28,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  connectorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  connectorArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectorArrowTxt: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bold,
  },
});

// ─── Étape 3 : Date & Heure ───────────────────────────────────────────────────

function StepDateHeure({
  departure,
  showPicker,
  androidStep,
  showManual,
  manualDate,
  manualTime,
  onOpenPicker,
  onAndroidChange,
  onIosChange,
  onConfirmIos,
  onToggleManual,
  onManualDate,
  onManualTime,
}: {
  departure: Date;
  showPicker: boolean;
  androidStep: "date" | "time";
  showManual: boolean;
  manualDate: string;
  manualTime: string;
  onOpenPicker: () => void;
  onAndroidChange: (e: DateTimePickerEvent, d?: Date) => void;
  onIosChange: (e: DateTimePickerEvent, d?: Date) => void;
  onConfirmIos: () => void;
  onToggleManual: () => void;
  onManualDate: (t: string) => void;
  onManualTime: (t: string) => void;
}) {
  const isPast = departure <= new Date();

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.hint}>Quand démarre votre trajet ?</Text>

      {/* Bouton date principale */}
      <Pressable style={[dtStyles.card, isPast && dtStyles.cardError]} onPress={onOpenPicker}>
        <View style={dtStyles.iconBox}>
          <Text style={dtStyles.icon}>📅</Text>
        </View>
        <View style={dtStyles.textBlock}>
          <Text style={dtStyles.labelTxt}>Date de départ</Text>
          <Text style={dtStyles.dateTxt} numberOfLines={1}>
            {format(departure, "EEEE d MMMM yyyy", { locale: fr })}
          </Text>
          <Text style={[dtStyles.timeTxt, isPast && dtStyles.timeError]}>
            {format(departure, "HH:mm")}
          </Text>
        </View>
        <Text style={dtStyles.editIcon}>✏️</Text>
      </Pressable>

      {isPast && (
        <Text style={stepStyles.errorNote}>La date de départ doit être dans le futur.</Text>
      )}

      {/* Saisie manuelle */}
      <Pressable onPress={onToggleManual} style={dtStyles.manualToggle}>
        <Text style={dtStyles.manualToggleTxt}>
          {showManual ? "− Masquer la saisie manuelle" : "✏ Saisir manuellement"}
        </Text>
      </Pressable>

      {showManual && (
        <View style={dtStyles.manualRow}>
          <View style={{ flex: 3, gap: spacing.xs }}>
            <Text style={stepStyles.inputLabel}>Date (JJ/MM/AAAA)</Text>
            <TextInput
              style={dtStyles.input}
              value={manualDate}
              onChangeText={onManualDate}
              placeholder="15/05/2026"
              placeholderTextColor={colors.textMuted}
              maxLength={10}
              autoCorrect={false}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 2, gap: spacing.xs }}>
            <Text style={stepStyles.inputLabel}>Heure (HH:MM)</Text>
            <TextInput
              style={dtStyles.input}
              value={manualTime}
              onChangeText={onManualTime}
              placeholder="07:00"
              placeholderTextColor={colors.textMuted}
              maxLength={5}
              autoCorrect={false}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      {/* Android picker */}
      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={departure}
          mode={androidStep}
          display="default"
          onChange={onAndroidChange}
          minimumDate={androidStep === "date" ? new Date() : undefined}
        />
      )}

      {/* iOS picker modal */}
      {Platform.OS === "ios" && (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={dtStyles.iosOverlay}>
            <View style={dtStyles.iosSheet}>
              <View style={dtStyles.iosHeader}>
                <Pressable onPress={() => {}}>
                  <Text style={dtStyles.iosCancel}>Annuler</Text>
                </Pressable>
                <Text style={dtStyles.iosTitle}>Date de départ</Text>
                <Pressable onPress={onConfirmIos}>
                  <Text style={dtStyles.iosDone}>Confirmer</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={departure}
                mode="datetime"
                display="spinner"
                onChange={onIosChange}
                minimumDate={new Date()}
                locale="fr-FR"
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const dtStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  cardError: { borderColor: colors.error },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 26 },
  textBlock: { flex: 1, gap: 2 },
  labelTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dateTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    textTransform: "capitalize",
  },
  timeTxt: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  timeError: { color: colors.error },
  editIcon: { fontSize: 18 },
  manualToggle: { alignSelf: "flex-start" },
  manualToggleTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  manualRow: { flexDirection: "row", gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  iosOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  iosSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    paddingBottom: 32,
  },
  iosHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iosTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  iosCancel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  iosDone: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
});

// ─── Étape 4 : Tarif & Places ─────────────────────────────────────────────────

function StepTarif({
  prix,
  places,
  onPrix,
  onPlaces,
}: {
  prix: string;
  places: number;
  onPrix: (v: string) => void;
  onPlaces: (fn: (p: number) => number) => void;
}) {
  const prixNum = Number(prix);
  const prixInvalid = !!prix && (!isNaN(prixNum) ? prixNum < 500 : true);

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.hint}>Combien coûte une place et combien en proposez-vous ?</Text>

      {/* Prix */}
      <View style={tarifStyles.block}>
        <View style={tarifStyles.blockHeader}>
          <Text style={tarifStyles.blockIcon}>💰</Text>
          <Text style={tarifStyles.blockTitle}>Prix par place</Text>
        </View>
        <View style={tarifStyles.prixRow}>
          <TextInput
            style={[tarifStyles.prixInput, prixInvalid && tarifStyles.prixInputError]}
            value={prix}
            onChangeText={onPrix}
            placeholder="5 000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            autoFocus
          />
          <View style={tarifStyles.prixUnit}>
            <Text style={tarifStyles.prixUnitTxt}>FCFA</Text>
          </View>
        </View>
        {prixInvalid && (
          <Text style={stepStyles.errorNote}>
            {isNaN(prixNum) ? "Entrez un nombre valide." : "Le prix minimum est 500 FCFA."}
          </Text>
        )}
        {prix && !prixInvalid && (
          <Text style={tarifStyles.prixOk}>
            Revenu estimé : {(prixNum * places).toLocaleString("fr-FR")} FCFA
          </Text>
        )}
      </View>

      {/* Places */}
      <View style={tarifStyles.block}>
        <View style={tarifStyles.blockHeader}>
          <Text style={tarifStyles.blockIcon}>💺</Text>
          <Text style={tarifStyles.blockTitle}>Nombre de places passager</Text>
        </View>
        <View style={tarifStyles.counter}>
          <Pressable
            style={[tarifStyles.counterBtn, places <= 1 && tarifStyles.counterBtnDisabled]}
            onPress={() => onPlaces((p) => Math.max(1, p - 1))}
            disabled={places <= 1}
          >
            <Text style={tarifStyles.counterBtnTxt}>−</Text>
          </Pressable>
          <View style={tarifStyles.counterDisplay}>
            <Text style={tarifStyles.counterValue}>{places}</Text>
            <Text style={tarifStyles.counterLabel}>place{places > 1 ? "s" : ""}</Text>
          </View>
          <Pressable
            style={[tarifStyles.counterBtn, places >= 8 && tarifStyles.counterBtnDisabled]}
            onPress={() => onPlaces((p) => Math.min(8, p + 1))}
            disabled={places >= 8}
          >
            <Text style={tarifStyles.counterBtnTxt}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const tarifStyles = StyleSheet.create({
  block: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  blockHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  blockIcon: { fontSize: 20 },
  blockTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  prixRow: { flexDirection: "row", alignItems: "stretch", gap: 0 },
  prixInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderTopLeftRadius: radii.lg,
    borderBottomLeftRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    textAlign: "right",
  },
  prixInputError: { borderColor: colors.error },
  prixUnit: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderLeftWidth: 0,
    borderTopRightRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  prixUnitTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
  },
  prixOk: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.success,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing["3xl"],
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
  counterBtnDisabled: { opacity: 0.35 },
  counterBtnTxt: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  counterDisplay: { alignItems: "center", gap: 2 },
  counterValue: {
    fontSize: typography.fontSize["5xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    lineHeight: 42,
  },
  counterLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
});

// ─── Étape 5 : Options & Résumé ───────────────────────────────────────────────

function StepOptions({
  accepteColis,
  climatise,
  nonFumeur,
  onAccepteColis,
  onClimatise,
  onNonFumeur,
  summary,
}: {
  accepteColis: boolean;
  climatise: boolean;
  nonFumeur: boolean;
  onAccepteColis: (v: boolean) => void;
  onClimatise: (v: boolean) => void;
  onNonFumeur: (v: boolean) => void;
  summary: { villeDepart: string; villeArrivee: string; departure: Date; prix: string; places: number };
}) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.hint}>Définissez les options, puis vérifiez le résumé.</Text>

      {/* Toggles */}
      <View style={optStyles.togglesCard}>
        {[
          { label: "📦 Accepte les colis", desc: "Transporter des colis", value: accepteColis, onChange: onAccepteColis },
          { label: "❄ Climatisation", desc: "Véhicule climatisé", value: climatise, onChange: onClimatise },
          { label: "🚭 Non-fumeur", desc: "Pas de cigarette", value: nonFumeur, onChange: onNonFumeur },
        ].map((opt, i, arr) => (
          <React.Fragment key={opt.label}>
            <View style={optStyles.toggleRow}>
              <View style={optStyles.toggleInfo}>
                <Text style={optStyles.toggleLabel}>{opt.label}</Text>
                <Text style={optStyles.toggleDesc}>{opt.desc}</Text>
              </View>
              <Switch
                value={opt.value}
                onValueChange={opt.onChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
            {i < arr.length - 1 && <View style={optStyles.sep} />}
          </React.Fragment>
        ))}
      </View>

      {/* Résumé */}
      <View style={optStyles.summaryCard}>
        <Text style={optStyles.summaryTitle}>Résumé du trajet</Text>
        <View style={optStyles.summaryRow}>
          <Text style={optStyles.summaryIcon}>📍</Text>
          <Text style={optStyles.summaryVal}>
            {summary.villeDepart} → {summary.villeArrivee}
          </Text>
        </View>
        <View style={optStyles.summaryRow}>
          <Text style={optStyles.summaryIcon}>📅</Text>
          <Text style={optStyles.summaryVal}>
            {format(summary.departure, "EEE d MMM yyyy · HH:mm", { locale: fr })}
          </Text>
        </View>
        <View style={optStyles.summaryRow}>
          <Text style={optStyles.summaryIcon}>💰</Text>
          <Text style={optStyles.summaryVal}>
            {Number(summary.prix).toLocaleString("fr-FR")} FCFA × {summary.places} place{summary.places > 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

const optStyles = StyleSheet.create({
  togglesCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.sm,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  toggleInfo: { flex: 1, gap: 1 },
  toggleLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  toggleDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.sm,
  },
  summaryTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  summaryIcon: { fontSize: 16, width: 22 },
  summaryVal: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    textTransform: "capitalize",
  },
});

// ─── Styles partagés des étapes ───────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  container: { flex: 1, gap: spacing.xl },
  hint: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  vehiculeList: { gap: spacing.md },
  vehiculeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  vehiculeCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}06` },
  vehiculeIconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  vehiculeIcon: { fontSize: 24 },
  vehiculeInfo: { flex: 1, gap: 2 },
  vehiculeName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  vehiculeSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  vehiculePlate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  vehiculeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  vehiculeRadioActive: { borderColor: colors.primary },
  vehiculeRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  errorNote: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.error,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
});

// ─── Styles de l'écran principal ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 52,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackTxt: {
    fontSize: typography.fontSize.xl,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  headerCenter: { flex: 1, gap: 1 },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerStepLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  stepCounter: { flexDirection: "row", alignItems: "baseline" },
  stepCounterCurrent: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  stepCounterTotal: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },

  // Progress
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },

  // Dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Content
  stepContent: {
    flex: 1,
    overflow: "hidden",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 36 : spacing["2xl"],
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.sm,
  },
  btnBack: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  btnBackTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  btnNext: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    ...shadows.md,
  },
  btnNextDisabled: { opacity: 0.4 },
  btnNextTxt: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  // No vehicle
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
    gap: spacing.xl,
    backgroundColor: colors.surface,
  },
  noVehIcon: { fontSize: 56 },
  noVehTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  noVehText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  backBtn: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  backBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
});
