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
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router } from "expo-router";
import { useMyVehicules } from "@/src/hooks/useChauffeur";
import { useCreateVoyage } from "@/src/hooks/useVoyages";
import { useTarifTrajet } from "@/src/hooks/useTarifs";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import { resolveMediaUrl } from "@/src/constants/app";
import type { TypeVehicule } from "@/src/api/types";
import { useVilles, useGaresByVille } from "@/src/hooks/useGares";
import type { GareRead } from "@/src/api/endpoints/gares";
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

function ListModal<T>({
  visible, title, items, keyFn, labelFn, selectedKey, onSelect, onClose,
}: {
  visible: boolean; title: string;
  items: T[]; keyFn: (item: T) => string; labelFn: (item: T) => string;
  selectedKey: string;
  onSelect: (item: T) => void; onClose: () => void;
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
        {items.length === 0 ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={modalStyles.itemText}>Aucun élément disponible</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={keyFn}
            style={modalStyles.list}
            renderItem={({ item }) => {
              const k = keyFn(item);
              const isSelected = selectedKey === k;
              return (
                <Pressable
                  style={[modalStyles.item, isSelected && modalStyles.itemActive]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[modalStyles.itemText, isSelected && modalStyles.itemTextActive]}>
                    {labelFn(item)}
                  </Text>
                  {isSelected && <Text style={modalStyles.itemCheck}>✓</Text>}
                </Pressable>
              );
            }}
          />
        )}
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

type VoyageActifData = {
  message: string;
  detail: string;
  voyage: {
    id: string;
    statut: string;
    statut_label: string;
    ville_depart: string;
    ville_arrivee: string;
    point_depart: string;
    date_depart: string;
    nombre_places_restantes: number;
    nombre_places_total: number;
    prix_par_place: number;
  };
};

export default function PublishVoyageScreen() {
  const { showToast } = useToast();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const { data: vehicules, isLoading: loadingVehicules } = useMyVehicules();
  const { mutateAsync: createVoyage, isPending } = useCreateVoyage();
  const { data: villes = [] } = useVilles();

  // ── Navigation par étape ──
  const [step, setStep] = useState(0);
  const directionRef = useRef<"forward" | "backward">("forward");
  const [trajetErrorModal, setTrajetErrorModal] = useState<string | null>(null);
  const [voyageActifModal, setVoyageActifModal] = useState<VoyageActifData | null>(null);

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
  const [villeIdDepart, setVilleIdDepart] = useState("");
  const [villeIdArrivee, setVilleIdArrivee] = useState("");
  const [gareDepart, setGareDepart] = useState<GareRead | null>(null);
  const [gareArrivee, setGareArrivee] = useState<GareRead | null>(null);
  const { data: garesDepart = [] } = useGaresByVille(villeIdDepart || null);
  const { data: garesArrivee = [] } = useGaresByVille(villeIdArrivee || null);
  const [departure, setDeparture] = useState<Date>(nextHour);
  const [prix, setPrix] = useState("");
  const [places, setPlaces] = useState(4);
  const [accepteColis, setAccepteColis] = useState(true);
  const [climatise, setClimatise] = useState(false);
  const [nonFumeur, setNonFumeur] = useState(true);

  // ── Date/heure ──
  const [showPicker, setShowPicker] = useState(false);
  const [androidStep, setAndroidStep] = useState<"date" | "time">("date");

  // ── Sélecteurs modaux ──
  const [cityTarget, setCityTarget] = useState<"depart" | "arrivee" | null>(null);
  const [gareTarget, setGareTarget] = useState<"depart" | "arrivee" | null>(null);

  const handleSwapItineraire = () => {
    setVilleDepart(villeArrivee);
    setVilleArrivee(villeDepart);
    setVilleIdDepart(villeIdArrivee);
    setVilleIdArrivee(villeIdDepart);
    setGareDepart(gareArrivee);
    setGareArrivee(gareDepart);
  };

  const activeVehicules = vehicules?.filter((v) => v.actif) ?? [];
  const selectedVehicule = activeVehicules.find((v) => v.id === vehiculeId);
  const vehiculeCapacity: number = selectedVehicule?.nombre_places ?? 4;

  const { data: tarif, isLoading: tarifLoading } = useTarifTrajet(
    gareDepart?.ville_id ?? "",
    gareArrivee?.ville_id ?? ""
  );
  const prixReco = tarif?.prix_recommande ?? null;
  // prix_max peut être null en base — on tombe sur prix_recommande comme plafond minimal
  const prixMax = tarif ? (tarif.prix_max ?? tarif.prix_recommande ?? null) : null;

  useEffect(() => {
    if (activeVehicules.length === 1 && !vehiculeId) {
      setVehiculeId(activeVehicules[0].id);
    }
  }, [activeVehicules.length]);

  useEffect(() => {
    if (selectedVehicule) setPlaces(Math.min(selectedVehicule.nombre_places, 8));
  }, [vehiculeId]);

  // ── Date helpers ──
  const openDatePicker = () => {
    setAndroidStep("date");
    setShowPicker(true);
  };

  const openTimePicker = () => {
    setAndroidStep("time");
    setShowPicker(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(false);
    if (event.type !== "set" || !selected) return;
    if (androidStep === "date") {
      const merged = new Date(selected);
      merged.setHours(departure.getHours(), departure.getMinutes(), 0, 0);
      setDeparture(merged);
    } else {
      const merged = new Date(departure);
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDeparture(merged);
    }
  };

  const handleIosChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) setDeparture(selected);
  };

  const confirmIos = () => setShowPicker(false);

  // ── Validation par étape ──
  const stepValid = (): boolean => {
    switch (step) {
      case 0: return !!vehiculeId;
      case 1:
        return !!(gareDepart && gareArrivee);
      case 2: return departure > new Date();
      case 3: {
        const n = Number(prix);
        return !!prix && !isNaN(n) && n >= 500;
      }
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!stepValid()) return;

    // Validation itinéraire : même ville ou même gare
    if (step === 1) {
      if (villeIdDepart === villeIdArrivee) {
        setTrajetErrorModal(
          "La ville de départ et la ville d'arrivée sont identiques.\n\nVeuillez sélectionner deux villes différentes pour votre trajet."
        );
        return;
      }
      if (gareDepart && gareArrivee && gareDepart.id === gareArrivee.id) {
        setTrajetErrorModal(
          "La gare de départ et la gare d'arrivée sont identiques.\n\nVeuillez sélectionner deux gares différentes pour votre trajet."
        );
        return;
      }
    }

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
    if (!gareDepart || !gareArrivee) return;
    const payload = {
      ville_depart: gareDepart.ville.nom,
      ville_arrivee: gareArrivee.ville.nom,
      point_depart: gareDepart.nom,
      point_arrivee: gareArrivee.nom,
      lat_depart: gareDepart.lat ?? 0,
      lng_depart: gareDepart.lng ?? 0,
      lat_arrivee: gareArrivee.lat ?? 0,
      lng_arrivee: gareArrivee.lng ?? 0,
      date_depart: departure.toISOString(),
      prix_par_place: Number(prix),
      nombre_places_total: Math.min(places, 8),
      vehicule_id: vehiculeId,
      accepte_colis: accepteColis,
      climatise,
      non_fumeur: nonFumeur,
    };
    try {
      await createVoyage(payload);
      showToast("Trajet publié avec succès !", "success");
      router.back();
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.code === "VOYAGE_ACTIF_EXISTANT") {
        setVoyageActifModal({
          message: data.message,
          detail: data.detail,
          voyage: data.voyage_actif,
        });
        return;
      }
      const detail = data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join("\n")
        : detail ?? getErrorMessage(e);
      showToast(msg, "error");
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
              gareDepart={gareDepart}
              gareArrivee={gareArrivee}
              onOpenCity={(target) => setCityTarget(target)}
              onOpenGare={(target) => setGareTarget(target)}
              onSwap={handleSwapItineraire}
            />
          )}
          {step === 2 && (
            <StepDateHeure
              departure={departure}
              showPicker={showPicker}
              androidStep={androidStep}
              onOpenDatePicker={openDatePicker}
              onOpenTimePicker={openTimePicker}
              onAndroidChange={handleAndroidChange}
              onIosChange={handleIosChange}
              onConfirmIos={confirmIos}
            />
          )}
          {step === 3 && (
            <StepTarif
              prix={prix}
              places={places}
              onPrix={setPrix}
              onPlaces={setPlaces}
              vehiculeCapacity={vehiculeCapacity}
              villeDepart={gareDepart?.ville.nom ?? ""}
              villeArrivee={gareArrivee?.ville.nom ?? ""}
              prixMax={prixMax}
              prixReco={prixReco}
              tarifLoading={tarifLoading}
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
      <View style={[styles.footer, { paddingBottom: Math.max(safeBottom, spacing["2xl"]) }]}>
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

      {/* ── Modal erreur trajet ── */}
      <Modal
        visible={trajetErrorModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTrajetErrorModal(null)}
      >
        <View style={alertStyles.overlay}>
          <View style={alertStyles.card}>
            <Text style={alertStyles.alertIcon}>🚫</Text>
            <Text style={alertStyles.alertTitle}>Trajet erroné</Text>
            <Text style={alertStyles.alertMessage}>{trajetErrorModal}</Text>
            <View style={alertStyles.btnRow}>
              <Pressable
                style={alertStyles.btnPrimary}
                onPress={() => setTrajetErrorModal(null)}
              >
                <Text style={alertStyles.btnPrimaryTxt}>Corriger le trajet</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal sélecteur de ville ── */}
      <ListModal
        visible={cityTarget !== null}
        title={cityTarget === "depart" ? "Ville de départ" : "Ville d'arrivée"}
        items={villes}
        keyFn={(v) => v.id}
        labelFn={(v) => v.nom}
        selectedKey={cityTarget === "depart" ? villeIdDepart : villeIdArrivee}
        onSelect={(v) => {
          if (cityTarget === "depart") {
            setVilleDepart(v.nom);
            setVilleIdDepart(v.id);
            setGareDepart(null);
          } else {
            setVilleArrivee(v.nom);
            setVilleIdArrivee(v.id);
            setGareArrivee(null);
          }
        }}
        onClose={() => setCityTarget(null)}
      />

      {/* ── Modal sélecteur de gare ── */}
      <ListModal
        visible={gareTarget !== null}
        title={gareTarget === "depart" ? "Gare de départ" : "Gare d'arrivée"}
        items={gareTarget === "depart" ? garesDepart : garesArrivee}
        keyFn={(g) => g.id}
        labelFn={(g) => g.nom}
        selectedKey={gareTarget === "depart" ? (gareDepart?.id ?? "") : (gareArrivee?.id ?? "")}
        onSelect={(g) => {
          if (gareTarget === "depart") setGareDepart(g);
          else setGareArrivee(g);
        }}
        onClose={() => setGareTarget(null)}
      />

      {/* ── Modal : voyage actif existant ── */}
      <Modal
        visible={voyageActifModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVoyageActifModal(null)}
      >
        <View style={alertStyles.overlay}>
          <View style={vaStyles.card}>
            {/* En-tête */}
            <View style={vaStyles.header}>
              <Text style={vaStyles.icon}>🚦</Text>
              <Text style={vaStyles.title}>{voyageActifModal?.message}</Text>
              <Text style={vaStyles.subtitle}>{voyageActifModal?.detail}</Text>
            </View>

            {/* Carte du voyage existant */}
            {voyageActifModal && (
              <View style={vaStyles.voyageCard}>
                {/* Badge statut */}
                <View style={[
                  vaStyles.statutBadge,
                  voyageActifModal.voyage.statut === "EN_COURS" && vaStyles.statutBadgeEnCours,
                  voyageActifModal.voyage.statut === "COMPLET"  && vaStyles.statutBadgeComplet,
                ]}>
                  <Text style={[
                    vaStyles.statutTxt,
                    voyageActifModal.voyage.statut === "EN_COURS" && vaStyles.statutTxtEnCours,
                    voyageActifModal.voyage.statut === "COMPLET"  && vaStyles.statutTxtComplet,
                  ]}>
                    {voyageActifModal.voyage.statut_label}
                  </Text>
                </View>

                {/* Trajet */}
                <View style={vaStyles.routeRow}>
                  <View style={vaStyles.routeCol}>
                    <View style={vaStyles.routeDot} />
                    <View style={vaStyles.routeLine} />
                    <View style={[vaStyles.routeDot, vaStyles.routeDotEnd]} />
                  </View>
                  <View style={vaStyles.routeLabels}>
                    <View style={vaStyles.routeStop}>
                      <Text style={vaStyles.routeCity}>{voyageActifModal.voyage.ville_depart}</Text>
                      <Text style={vaStyles.routePoint} numberOfLines={1}>
                        {voyageActifModal.voyage.point_depart}
                      </Text>
                    </View>
                    <View style={vaStyles.routeStop}>
                      <Text style={vaStyles.routeCity}>{voyageActifModal.voyage.ville_arrivee}</Text>
                    </View>
                  </View>
                </View>

                {/* Méta */}
                <View style={vaStyles.metaRow}>
                  <View style={vaStyles.metaItem}>
                    <Text style={vaStyles.metaIcon}>📅</Text>
                    <Text style={vaStyles.metaVal}>
                      {format(new Date(voyageActifModal.voyage.date_depart), "EEE d MMM · HH:mm", { locale: fr })}
                    </Text>
                  </View>
                  <View style={vaStyles.metaSep} />
                  <View style={vaStyles.metaItem}>
                    <Text style={vaStyles.metaIcon}>💺</Text>
                    <Text style={vaStyles.metaVal}>
                      {voyageActifModal.voyage.nombre_places_restantes}/{voyageActifModal.voyage.nombre_places_total} places
                    </Text>
                  </View>
                  <View style={vaStyles.metaSep} />
                  <View style={vaStyles.metaItem}>
                    <Text style={vaStyles.metaIcon}>💰</Text>
                    <Text style={vaStyles.metaVal}>
                      {voyageActifModal.voyage.prix_par_place.toLocaleString("fr-FR")} F
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Boutons */}
            <View style={alertStyles.btnRow}>
              <Pressable
                style={alertStyles.btnSecondary}
                onPress={() => setVoyageActifModal(null)}
              >
                <Text style={alertStyles.btnSecondaryTxt}>Fermer</Text>
              </Pressable>
              <Pressable
                style={alertStyles.btnPrimary}
                onPress={() => {
                  setVoyageActifModal(null);
                  router.push(`/(chauffeur)/voyages/${voyageActifModal!.voyage.id}` as any);
                }}
              >
                <Text style={alertStyles.btnPrimaryTxt}>Voir le voyage</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Étape 1 : Véhicule ───────────────────────────────────────────────────────

const TYPE_ICON: Record<TypeVehicule, string> = {
  BERLINE: "🚗",
  SUV: "🚙",
  MINIBUS: "🚐",
  BUS: "🚌",
  MOTO: "🏍️",
};

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
        {vehicules.map((v) => {
          const isSelected = selected === v.id;
          const photoUri = resolveMediaUrl(v.photo_url);
          return (
            <Pressable
              key={v.id}
              style={[vehStyles.card, isSelected && vehStyles.cardActive]}
              onPress={() => onSelect(v.id)}
            >
              {/* Bannière photo */}
              <View style={vehStyles.banner}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={vehStyles.bannerImg} resizeMode="cover" />
                ) : (
                  <View style={vehStyles.bannerFallback}>
                    <Text style={vehStyles.bannerEmoji}>
                      {TYPE_ICON[v.type_vehicule as TypeVehicule]}
                    </Text>
                  </View>
                )}
                {/* Badge sélectionné */}
                {isSelected && (
                  <View style={vehStyles.selectedBadge}>
                    <Text style={vehStyles.selectedBadgeText}>✓</Text>
                  </View>
                )}
                {/* Plaque en overlay */}
                <View style={vehStyles.plateOverlay}>
                  <Text style={vehStyles.plateOverlayText}>{v.immatriculation}</Text>
                </View>
              </View>

              {/* Infos */}
              <View style={vehStyles.body}>
                <View style={vehStyles.titleRow}>
                  <Text style={[vehStyles.name, isSelected && vehStyles.nameActive]}>
                    {v.marque} {v.modele}
                  </Text>
                  <Text style={vehStyles.year}>{v.annee}</Text>
                </View>
                <View style={vehStyles.tagsRow}>
                  <View style={[vehStyles.tag, isSelected && vehStyles.tagActive]}>
                    <Text style={[vehStyles.tagText, isSelected && vehStyles.tagTextActive]}>
                      {TYPE_LABEL[v.type_vehicule as TypeVehicule]}
                    </Text>
                  </View>
                  <View style={[vehStyles.tag, isSelected && vehStyles.tagActive]}>
                    <Text style={[vehStyles.tagText, isSelected && vehStyles.tagTextActive]}>
                      💺 {v.nombre_places} places
                    </Text>
                  </View>
                  {v.climatise && (
                    <View style={[vehStyles.tag, isSelected && vehStyles.tagActive]}>
                      <Text style={[vehStyles.tagText, isSelected && vehStyles.tagTextActive]}>❄ Clim</Text>
                    </View>
                  )}
                  <View style={[vehStyles.tag, isSelected && vehStyles.tagActive]}>
                    <Text style={[vehStyles.tagText, isSelected && vehStyles.tagTextActive]}>{v.couleur}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const vehStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  cardActive: {
    borderColor: colors.primary,
    ...shadows.md,
  },
  banner: {
    height: 140,
    backgroundColor: colors.surface,
    position: "relative",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
  },
  bannerFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary}10`,
  },
  bannerEmoji: {
    fontSize: 56,
  },
  selectedBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  selectedBadgeText: {
    fontSize: 16,
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
  },
  plateOverlay: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.md,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  plateOverlayText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 1.5,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  nameActive: { color: colors.primary },
  year: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: {
    backgroundColor: `${colors.primary}12`,
    borderColor: `${colors.primary}40`,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  tagTextActive: { color: colors.primary },
});

// ─── Étape 2 : Itinéraire ─────────────────────────────────────────────────────

function StepItineraire({
  villeDepart, villeArrivee, gareDepart, gareArrivee, onOpenCity, onOpenGare, onSwap,
}: {
  villeDepart: string; villeArrivee: string;
  gareDepart: GareRead | null; gareArrivee: GareRead | null;
  onOpenCity: (t: "depart" | "arrivee") => void;
  onOpenGare: (t: "depart" | "arrivee") => void;
  onSwap: () => void;
}) {
  const sameGare = !!(gareDepart && gareArrivee && gareDepart.id === gareArrivee.id);
  const canSwap = !!(villeDepart || villeArrivee || gareDepart || gareArrivee);

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.hint}>D'où partez-vous et où allez-vous ?</Text>

      <View style={itinStyles.card}>

        {/* ── Départ ── */}
        <View style={itinStyles.leg}>
          <View style={itinStyles.railCol}>
            <View style={[itinStyles.badge, itinStyles.badgeDepart]}>
              <Ionicons name="location" size={14} color={colors.white} />
            </View>
            <View style={itinStyles.connector} />
          </View>
          <View style={itinStyles.legFields}>
            <Text style={itinStyles.legLabel}>POINT DE DÉPART</Text>
            <Pressable
              style={[itinStyles.cityBtn, !!villeDepart && itinStyles.cityBtnFilled]}
              onPress={() => onOpenCity("depart")}
            >
              <Text style={[itinStyles.cityName, !villeDepart && itinStyles.cityPlaceholder]} numberOfLines={1}>
                {villeDepart || "Choisir la ville"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={villeDepart ? colors.primary : colors.textMuted} />
            </Pressable>
            <Pressable
              style={[itinStyles.gareBtn, !!gareDepart && itinStyles.gareBtnFilled, !villeDepart && itinStyles.gareBtnDisabled]}
              onPress={() => villeDepart && onOpenGare("depart")}
              disabled={!villeDepart}
            >
              <Ionicons name="business" size={14} color={gareDepart ? colors.primary : colors.textMuted} />
              <Text style={[itinStyles.gareName, !gareDepart && itinStyles.garePlaceholder]} numberOfLines={1}>
                {gareDepart ? gareDepart.nom : "Choisir la gare de départ"}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* ── Bouton inverser ── */}
        <View style={itinStyles.swapRow}>
          <View style={itinStyles.railCol}>
            <View style={itinStyles.connector} />
          </View>
          <Pressable
            style={[itinStyles.swapBtn, !canSwap && itinStyles.swapBtnDisabled]}
            onPress={onSwap}
            disabled={!canSwap}
          >
            <Ionicons name="swap-vertical" size={15} color={colors.primary} />
            <Text style={itinStyles.swapTxt}>Inverser</Text>
          </Pressable>
        </View>

        {/* ── Arrivée ── */}
        <View style={itinStyles.leg}>
          <View style={itinStyles.railCol}>
            <View style={[itinStyles.badge, itinStyles.badgeArrivee, sameGare && itinStyles.badgeError]}>
              <Ionicons name="flag" size={13} color={colors.white} />
            </View>
          </View>
          <View style={itinStyles.legFields}>
            <Text style={itinStyles.legLabel}>POINT D'ARRIVÉE</Text>
            <Pressable
              style={[itinStyles.cityBtn, !!villeArrivee && itinStyles.cityBtnFilled]}
              onPress={() => onOpenCity("arrivee")}
            >
              <Text style={[itinStyles.cityName, !villeArrivee && itinStyles.cityPlaceholder]} numberOfLines={1}>
                {villeArrivee || "Choisir la ville"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={villeArrivee ? colors.primary : colors.textMuted} />
            </Pressable>
            <Pressable
              style={[itinStyles.gareBtn, !!gareArrivee && itinStyles.gareBtnFilled, !villeArrivee && itinStyles.gareBtnDisabled]}
              onPress={() => villeArrivee && onOpenGare("arrivee")}
              disabled={!villeArrivee}
            >
              <Ionicons name="business" size={14} color={gareArrivee ? colors.primary : colors.textMuted} />
              <Text style={[itinStyles.gareName, !gareArrivee && itinStyles.garePlaceholder]} numberOfLines={1}>
                {gareArrivee ? gareArrivee.nom : "Choisir la gare d'arrivée"}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

      </View>

      {sameGare && (
        <Text style={stepStyles.errorNote}>
          La gare de départ et la gare d'arrivée sont identiques.
        </Text>
      )}

    </View>
  );
}

const RAIL_W = 36;

const itinStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingRight: spacing.xl,
    ...shadows.sm,
  },
  leg: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  // ── Rail vertical (badge + connecteur) ──
  railCol: {
    width: RAIL_W,
    alignItems: "center",
    paddingTop: 2,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    ...shadows.sm,
  },
  badgeDepart: { backgroundColor: colors.primary },
  badgeArrivee: { backgroundColor: colors.error },
  badgeError: { backgroundColor: colors.error },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  // ── Champs ──
  legFields: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  legLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: 4,
    marginBottom: -2,
  },
  cityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  cityBtnFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  cityName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  cityPlaceholder: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  gareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  gareBtnFilled: {
    borderColor: `${colors.primary}60`,
    backgroundColor: `${colors.primary}06`,
  },
  gareBtnDisabled: {
    opacity: 0.4,
  },
  gareName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    flex: 1,
  },
  garePlaceholder: {
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  // ── Inverser ──
  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: -spacing.sm,
  },
  swapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${colors.primary}10`,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  swapBtnDisabled: { opacity: 0.4 },
  swapTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});

// ─── Étape 3 : Date & Heure ───────────────────────────────────────────────────

function StepDateHeure({
  departure,
  showPicker,
  androidStep,
  onOpenDatePicker,
  onOpenTimePicker,
  onAndroidChange,
  onIosChange,
  onConfirmIos,
}: {
  departure: Date;
  showPicker: boolean;
  androidStep: "date" | "time";
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  onAndroidChange: (e: DateTimePickerEvent, d?: Date) => void;
  onIosChange: (e: DateTimePickerEvent, d?: Date) => void;
  onConfirmIos: () => void;
}) {
  const isPast = departure <= new Date();

  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.hint}>Quand démarre votre trajet ?</Text>

      {/* ── Deux cards : Date | Heure ── */}
      <View style={dtStyles.pickerRow}>

        {/* Card Date */}
        <Pressable style={dtStyles.dateCard} onPress={onOpenDatePicker}>
          <Text style={dtStyles.cardLabel}>DATE</Text>
          <Text style={dtStyles.dayName}>
            {format(departure, "EEE", { locale: fr })}
          </Text>
          <Text style={dtStyles.dayValue}>
            {format(departure, "d")}
          </Text>
          <Text style={dtStyles.monthYear}>
            {format(departure, "MMM yyyy", { locale: fr })}
          </Text>
          <View style={dtStyles.editPill}>
            <Text style={dtStyles.editPillTxt}>Changer ▼</Text>
          </View>
        </Pressable>

        {/* Card Heure */}
        <Pressable
          style={[dtStyles.timeCard, isPast && dtStyles.timeCardError]}
          onPress={onOpenTimePicker}
        >
          <Text style={[dtStyles.cardLabel, isPast && dtStyles.cardLabelError]}>HEURE</Text>
          <Text style={[dtStyles.timeValue, isPast && dtStyles.timeValueError]}>
            {format(departure, "HH")}
          </Text>
          <Text style={[dtStyles.timeSep, isPast && dtStyles.timeValueError]}>:</Text>
          <Text style={[dtStyles.timeValue, isPast && dtStyles.timeValueError]}>
            {format(departure, "mm")}
          </Text>
          <View style={[dtStyles.editPill, isPast && dtStyles.editPillError]}>
            <Text style={[dtStyles.editPillTxt, isPast && dtStyles.editPillTxtError]}>Changer ▼</Text>
          </View>
        </Pressable>

      </View>

      {isPast && (
        <Text style={stepStyles.errorNote}>La date de départ doit être dans le futur.</Text>
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

      {/* iOS picker — bottom sheet */}
      {Platform.OS === "ios" && (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={dtStyles.iosOverlay}>
            <View style={dtStyles.iosSheet}>
              <View style={dtStyles.iosHeader}>
                <Pressable onPress={onConfirmIos}>
                  <Text style={dtStyles.iosCancel}>Annuler</Text>
                </Pressable>
                <Text style={dtStyles.iosTitle}>
                  {androidStep === "date" ? "Date de départ" : "Heure de départ"}
                </Text>
                <Pressable onPress={onConfirmIos}>
                  <Text style={dtStyles.iosDone}>Confirmer</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={departure}
                mode={androidStep}
                display="spinner"
                onChange={onIosChange}
                minimumDate={androidStep === "date" ? new Date() : undefined}
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
  pickerRow: { flexDirection: "row", gap: spacing.md },

  // Card Date (plus large)
  dateCard: {
    flex: 3,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  // Card Heure
  timeCard: {
    flex: 2,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  timeCardError: { borderColor: colors.error },

  // Textes communs
  cardLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  cardLabelError: { color: colors.error },

  // Date card textes
  dayName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
    marginTop: spacing.sm,
  },
  dayValue: {
    fontSize: typography.fontSize["5xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 48,
  },
  monthYear: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },

  // Heure card textes
  timeValue: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    lineHeight: 34,
  },
  timeSep: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    lineHeight: 20,
  },
  timeValueError: { color: colors.error },

  // Pill "Changer"
  editPill: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: `${colors.primary}15`,
    borderRadius: radii.full ?? 999,
  },
  editPillError: { backgroundColor: `${colors.error}15` },
  editPillTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  editPillTxtError: { color: colors.error },
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
  villeDepart,
  villeArrivee,
  prixMax,
  prixReco,
  tarifLoading,
  vehiculeCapacity,
}: {
  prix: string;
  places: number;
  onPrix: (v: string) => void;
  onPlaces: (v: number) => void;
  villeDepart: string;
  villeArrivee: string;
  prixMax: number | null;
  prixReco: number | null;
  tarifLoading: boolean;
  vehiculeCapacity: number;
}) {
  const [overCapacityModal, setOverCapacityModal] = useState(false);

  const selectedPlan: "reco" | "max" | null =
    prixReco !== null && Number(prix) === prixReco
      ? "reco"
      : prixMax !== null && Number(prix) === prixMax
      ? "max"
      : null;

  const handlePlacesIncrement = () => {
    if (places >= vehiculeCapacity) {
      setOverCapacityModal(true);
    } else {
      onPlaces(places + 1);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing["2xl"] }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={stepStyles.hint}>
        Sélectionnez le tarif pour ce trajet.
      </Text>

      {/* ── Sélection du tarif ── */}
      {tarifLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : prixReco !== null ? (
        <View style={tarifStyles.adminCard}>
          <View style={tarifStyles.adminCardHeader}>
            <Text style={tarifStyles.adminCardIcon}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={tarifStyles.adminCardTitle}>Tarifs officiels GoTaxi</Text>
              <Text style={tarifStyles.adminCardRoute}>{villeDepart} → {villeArrivee}</Text>
            </View>
          </View>

          {/* Prix de base */}
          <Pressable
            style={[tarifStyles.planRow, selectedPlan === "reco" && tarifStyles.planRowSelected]}
            onPress={() => onPrix(String(prixReco))}
          >
            <View style={[tarifStyles.planRadio, selectedPlan === "reco" && tarifStyles.planRadioSelected]}>
              {selectedPlan === "reco" && <View style={tarifStyles.planRadioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[tarifStyles.planName, selectedPlan === "reco" && tarifStyles.planNameSelected]}>
                Prix de base
              </Text>
              <Text style={tarifStyles.planDesc}>Tarif recommandé par GoTaxi</Text>
            </View>
            <Text style={[tarifStyles.planPrice, selectedPlan === "reco" && tarifStyles.planPriceSelected]}>
              {prixReco.toLocaleString("fr-FR")} FCFA
            </Text>
          </Pressable>

          {/* Plafond maximum — seulement si différent du prix de base */}
          {prixMax !== null && prixMax !== prixReco && (
            <Pressable
              style={[tarifStyles.planRow, tarifStyles.planRowMax, selectedPlan === "max" && tarifStyles.planRowMaxSelected]}
              onPress={() => onPrix(String(prixMax))}
            >
              <View style={[tarifStyles.planRadio, tarifStyles.planRadioMax, selectedPlan === "max" && tarifStyles.planRadioMaxSelected]}>
                {selectedPlan === "max" && <View style={[tarifStyles.planRadioDot, tarifStyles.planRadioDotMax]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[tarifStyles.planName, selectedPlan === "max" && tarifStyles.planNameMax]}>
                  Plafond maximum
                </Text>
                <Text style={tarifStyles.planDesc}>Prix réglementaire le plus élevé autorisé</Text>
              </View>
              <Text style={[tarifStyles.planPrice, selectedPlan === "max" && tarifStyles.planPriceMax]}>
                {prixMax.toLocaleString("fr-FR")} FCFA
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={tarifStyles.noTarifCard}>
          <Text style={tarifStyles.noTarifIcon}>ℹ️</Text>
          <Text style={tarifStyles.noTarifText}>
            Aucun tarif officiel défini pour ce trajet.{"\n"}Contactez l'administration GoTaxi.
          </Text>
        </View>
      )}

      {/* ── Prix sélectionné (résumé) ── */}
      {prix ? (
        <View style={tarifStyles.prixSelectedCard}>
          <Text style={tarifStyles.prixSelectedLabel}>Prix par place sélectionné</Text>
          <Text style={tarifStyles.prixSelectedValue}>{Number(prix).toLocaleString("fr-FR")} FCFA</Text>
          <Text style={tarifStyles.prixEstimate}>
            Revenu estimé : {(Number(prix) * places).toLocaleString("fr-FR")} FCFA
          </Text>
        </View>
      ) : null}

      {/* ── Nombre de places ── */}
      <View style={tarifStyles.block}>
        <View style={tarifStyles.blockHeader}>
          <Text style={tarifStyles.blockIcon}>💺</Text>
          <Text style={tarifStyles.blockTitle}>Nombre de places passager</Text>
        </View>
        <Text style={tarifStyles.capacityHint}>
          Capacité de votre véhicule : {vehiculeCapacity} place{vehiculeCapacity > 1 ? "s" : ""}
        </Text>
        <View style={tarifStyles.counter}>
          <Pressable
            style={[tarifStyles.counterBtn, places <= 1 && tarifStyles.counterBtnDisabled]}
            onPress={() => onPlaces(Math.max(1, places - 1))}
            disabled={places <= 1}
          >
            <Text style={tarifStyles.counterBtnTxt}>−</Text>
          </Pressable>
          <View style={tarifStyles.counterDisplay}>
            <Text style={tarifStyles.counterValue}>{places}</Text>
            <Text style={tarifStyles.counterLabel}>place{places > 1 ? "s" : ""}</Text>
          </View>
          <Pressable style={tarifStyles.counterBtn} onPress={handlePlacesIncrement}>
            <Text style={tarifStyles.counterBtnTxt}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Modal : capacité véhicule dépassée ── */}
      <Modal visible={overCapacityModal} transparent animationType="fade" onRequestClose={() => setOverCapacityModal(false)}>
        <View style={alertStyles.overlay}>
          <View style={alertStyles.card}>
            <Text style={alertStyles.alertIcon}>💺</Text>
            <Text style={alertStyles.alertTitle}>Capacité du véhicule</Text>
            <Text style={alertStyles.alertMessage}>
              Votre véhicule dispose de{" "}
              <Text style={alertStyles.alertHighlight}>{vehiculeCapacity} place{vehiculeCapacity > 1 ? "s" : ""}</Text>{" "}
              au maximum. Vous ne pouvez pas proposer plus de places que votre véhicule n'en contient.
            </Text>
            <View style={alertStyles.btnRow}>
              <Pressable style={alertStyles.btnPrimary} onPress={() => setOverCapacityModal(false)}>
                <Text style={alertStyles.btnPrimaryTxt}>Compris</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  // Admin tarif card
  adminCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    ...shadows.sm,
  },
  adminCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  adminCardIcon: { fontSize: 22, marginTop: 2 },
  adminCardTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  adminCardRoute: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    marginTop: 2,
  },
  adminPriceRow: { flexDirection: "row", gap: spacing.md },
  adminPricePill: {
    flex: 1,
    backgroundColor: `${colors.primary}0E`,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  adminPricePillMax: {
    backgroundColor: colors.warningBg,
    borderColor: `${colors.warning}50`,
  },
  adminPricePillLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  adminPricePillValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  adminPricePillValueMax: { color: colors.warningText },
  // Plan rows (liste radio)
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planRowSelected: {
    backgroundColor: `${colors.primary}0D`,
    borderColor: colors.primary,
  },
  planRowMax: {
    borderColor: colors.border,
  },
  planRowMaxSelected: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warning,
  },
  // Radio button
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioSelected: { borderColor: colors.primary },
  planRadioMax: { borderColor: colors.border },
  planRadioMaxSelected: { borderColor: colors.warning },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  planRadioDotMax: { backgroundColor: colors.warning },
  // Textes plan
  planName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  planNameSelected: { color: colors.primary },
  planNameMax: { color: colors.warningText },
  planDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
  planPrice: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
  },
  planPriceSelected: { color: colors.primary },
  planPriceMax: { color: colors.warningText },
  // Résumé prix sélectionné
  prixSelectedCard: {
    backgroundColor: `${colors.primary}0D`,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: `${colors.primary}30`,
  },
  prixSelectedLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  prixSelectedValue: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  prixEstimate: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  // Aucun tarif
  noTarifCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  noTarifIcon: { fontSize: 28 },
  noTarifText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  // Compteur places
  capacityHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
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

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing["2xl"],
    width: "100%",
    alignItems: "center",
    gap: spacing.lg,
    ...shadows.lg,
  },
  alertIcon: { fontSize: 40 },
  alertTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  alertHighlight: {
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
  },
  btnRow: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  },
  btnSecondaryTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  btnPrimaryTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textAlign: "center",
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

// ─── Styles modal voyage actif ────────────────────────────────────────────────

const vaStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing["2xl"],
    width: "100%",
    gap: spacing.xl,
    ...shadows.lg,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: { fontSize: 44 },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  // Carte voyage
  voyageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Badge statut
  statutBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  statutBadgeEnCours: {
    backgroundColor: colors.infoBg,
    borderColor: `${colors.info}40`,
  },
  statutBadgeComplet: {
    backgroundColor: colors.warningBg,
    borderColor: `${colors.warning}60`,
  },
  statutTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statutTxtEnCours: { color: colors.info },
  statutTxtComplet: { color: colors.warningText },
  // Itinéraire
  routeRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "stretch",
  },
  routeCol: {
    width: 16,
    alignItems: "center",
    paddingTop: 4,
    gap: 0,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  routeDotEnd: { backgroundColor: colors.error },
  routeLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
    minHeight: 20,
  },
  routeLabels: { flex: 1, gap: spacing.lg },
  routeStop: { gap: 2 },
  routeCity: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  routePoint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  // Méta
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaIcon: { fontSize: 13 },
  metaVal: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});

// ─── Styles partagés des étapes ───────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  container: { flex: 1, gap: spacing.xl },
  scrollContent: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  hint: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  vehiculeList: { gap: spacing.lg },
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
