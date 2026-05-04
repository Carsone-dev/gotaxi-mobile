import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
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

const TYPE_LABEL: Record<TypeVehicule, string> = {
  BERLINE: "Berline",
  SUV: "SUV",
  MINIBUS: "Minibus",
  BUS: "Bus",
  MOTO: "Moto",
};

function nextHour(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

function CityPicker({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: string;
  onSelect: (ville: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.pickerBtn} onPress={() => setOpen(!open)}>
        <Text style={[styles.pickerBtnText, !value && styles.placeholderText]}>
          {value || "Sélectionner une ville"}
        </Text>
        <Text style={styles.pickerArrow}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          {VILLES_LIST.map((v) => (
            <Pressable
              key={v}
              style={[styles.dropdownItem, value === v && styles.dropdownItemActive]}
              onPress={() => { onSelect(v); setOpen(false); }}
            >
              <Text style={[styles.dropdownText, value === v && styles.dropdownTextActive]}>
                {v}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PublishVoyageScreen() {
  const { showToast } = useToast();
  const { data: vehicules, isLoading: loadingVehicules } = useMyVehicules();
  const { mutateAsync: createVoyage, isPending } = useCreateVoyage();

  const [villeDepart, setVilleDepart] = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [pointDepart, setPointDepart] = useState("");
  const [pointArrivee, setPointArrivee] = useState("");
  const [prix, setPrix] = useState("");
  const [places, setPlaces] = useState(4);
  const [vehiculeId, setVehiculeId] = useState<string>("");
  const [accepteColis, setAccepteColis] = useState(true);
  const [climatise, setClimatise] = useState(false);
  const [nonFumeur, setNonFumeur] = useState(true);

  // ── Date / heure ─────────────────────────────────────────────────────────────
  const [departure, setDeparture] = useState<Date>(nextHour);
  const [showPicker, setShowPicker] = useState(false);
  // Android : on enchaîne date puis heure
  const [androidStep, setAndroidStep] = useState<"date" | "time">("date");
  // Saisie manuelle
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");

  const openPicker = () => {
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
      // ouvre aussitôt le sélecteur d'heure
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

  const syncManual = (d: Date) => {
    setManualDate(format(d, "dd/MM/yyyy"));
    setManualTime(format(d, "HH:mm"));
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
  // ─────────────────────────────────────────────────────────────────────────────

  const activeVehicules = vehicules?.filter((v) => v.actif) ?? [];

  // Auto-sélection si un seul véhicule disponible
  useEffect(() => {
    if (activeVehicules.length === 1 && !vehiculeId) {
      setVehiculeId(activeVehicules[0].id);
    }
  }, [activeVehicules.length]);

  const blockingReason = (): string | null => {
    if (!vehiculeId) return "Sélectionnez un véhicule";
    if (!villeDepart) return "Sélectionnez la ville de départ";
    if (!villeArrivee) return "Sélectionnez la ville d'arrivée";
    if (villeDepart === villeArrivee) return "Les deux villes doivent être différentes";
    if (pointDepart.trim().length < 5) return "Point de départ : minimum 5 caractères";
    if (pointArrivee.trim().length < 5) return "Point d'arrivée : minimum 5 caractères";
    if (departure <= new Date()) return "La date de départ doit être dans le futur";
    if (!prix || isNaN(Number(prix))) return "Entrez un prix valide";
    if (Number(prix) < 500) return "Prix minimum : 500 FCFA";
    return null;
  };

  const isFormValid = blockingReason() === null;

  const handlePublish = async () => {
    const reason = blockingReason();
    if (reason) {
      showToast(reason, "error");
      return;
    }
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
        <Text style={styles.noVehiculeIcon}>🚗</Text>
        <Text style={styles.noVehiculeTitle}>Aucun véhicule enregistré</Text>
        <Text style={styles.noVehiculeText}>
          Ajoutez un véhicule dans votre profil avant de publier un trajet.
        </Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Publier un trajet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Véhicule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Véhicule</Text>
          {activeVehicules.map((v) => (
            <Pressable
              key={v.id}
              style={[styles.vehiculeCard, vehiculeId === v.id && styles.vehiculeCardActive]}
              onPress={() => setVehiculeId(v.id)}
            >
              <View style={styles.vehiculeInfo}>
                <Text style={styles.vehiculeName}>
                  {v.marque} {v.modele} ({v.annee})
                </Text>
                <Text style={styles.vehiculeSub}>
                  {TYPE_LABEL[v.type_vehicule]} · {v.immatriculation} · {v.couleur}
                </Text>
                <Text style={styles.vehiculePlaces}>
                  {v.nombre_places} places · {v.climatise ? "Climatisé" : "Sans clim"}
                </Text>
              </View>
              {vehiculeId === v.id && <Text style={styles.vehiculeCheck}>✓</Text>}
            </Pressable>
          ))}
        </View>

        {/* Itinéraire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itinéraire</Text>
          <CityPicker label="Ville de départ" value={villeDepart} onSelect={setVilleDepart} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Point de départ précis</Text>
            <TextInput
              style={styles.textInput}
              value={pointDepart}
              onChangeText={setPointDepart}
              placeholder="Ex: Gare de Cotonou, Quartier Gbégamey"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.routeArrowRow}>
            <Text style={styles.routeArrow}>↓</Text>
          </View>
          <CityPicker label="Ville d'arrivée" value={villeArrivee} onSelect={setVilleArrivee} />
          {villeDepart && villeArrivee && villeDepart === villeArrivee && (
            <Text style={styles.errorText}>Les villes doivent être différentes.</Text>
          )}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Point d'arrivée précis</Text>
            <TextInput
              style={styles.textInput}
              value={pointArrivee}
              onChangeText={setPointArrivee}
              placeholder="Ex: Gare de Parakou, Rue des Routiers"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* ── Date et heure ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date et heure de départ</Text>

          {/* Bouton principal → ouvre le sélecteur natif */}
          <Pressable style={styles.dtBtn} onPress={openPicker}>
            <View style={styles.dtBtnLeft}>
              <Text style={styles.dtBtnSub}>Départ le</Text>
              <Text style={styles.dtBtnDate}>
                {format(departure, "EEEE d MMMM yyyy", { locale: fr })}
              </Text>
              <Text style={styles.dtBtnTime}>à {format(departure, "HH:mm")}</Text>
            </View>
            <Text style={styles.dtBtnIcon}>📅</Text>
          </Pressable>

          {departure <= new Date() && (
            <Text style={styles.errorText}>La date doit être dans le futur.</Text>
          )}

          {/* Toggle saisie manuelle */}
          <Pressable onPress={() => {
            if (!showManual) syncManual(departure);
            setShowManual(!showManual);
          }}>
            <Text style={styles.manualToggle}>
              {showManual ? "− Masquer la saisie manuelle" : "✏ Saisir manuellement"}
            </Text>
          </Pressable>

          {showManual && (
            <View style={styles.manualRow}>
              <View style={{ flex: 3 }}>
                <Text style={styles.fieldLabel}>Date (JJ/MM/AAAA)</Text>
                <TextInput
                  style={styles.textInput}
                  value={manualDate}
                  onChangeText={handleManualDate}
                  placeholder="15/05/2026"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="default"
                  maxLength={10}
                  autoCorrect={false}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.fieldLabel}>Heure (HH:MM)</Text>
                <TextInput
                  style={styles.textInput}
                  value={manualTime}
                  onChangeText={handleManualTime}
                  placeholder="07:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="default"
                  maxLength={5}
                  autoCorrect={false}
                />
              </View>
            </View>
          )}

          {/* Sélecteur Android — dialogs chaînés (date → heure) */}
          {showPicker && Platform.OS === "android" && (
            <DateTimePicker
              value={departure}
              mode={androidStep}
              display="default"
              onChange={handleAndroidChange}
              minimumDate={androidStep === "date" ? new Date() : undefined}
            />
          )}

          {/* Sélecteur iOS — spinner dans une modale */}
          {Platform.OS === "ios" && (
            <Modal visible={showPicker} transparent animationType="slide">
              <View style={styles.iosOverlay}>
                <View style={styles.iosSheet}>
                  <View style={styles.iosSheetHeader}>
                    <Pressable onPress={() => setShowPicker(false)}>
                      <Text style={styles.iosCancel}>Annuler</Text>
                    </Pressable>
                    <Text style={styles.iosSheetTitle}>Date de départ</Text>
                    <Pressable onPress={confirmIos}>
                      <Text style={styles.iosDone}>Confirmer</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={departure}
                    mode="datetime"
                    display="spinner"
                    onChange={handleIosChange}
                    minimumDate={new Date()}
                    locale="fr-FR"
                    style={{ width: "100%" }}
                  />
                </View>
              </View>
            </Modal>
          )}
        </View>

        {/* Tarif et places */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarif et capacité</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Prix par place (FCFA)</Text>
            <TextInput
              style={styles.textInput}
              value={prix}
              onChangeText={setPrix}
              placeholder="Ex: 5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            {prix && Number(prix) < 500 && (
              <Text style={styles.errorText}>Le prix minimum est 500 FCFA.</Text>
            )}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nombre de places</Text>
            <View style={styles.counter}>
              <Pressable
                style={styles.counterBtn}
                onPress={() => setPlaces((p) => Math.max(1, p - 1))}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </Pressable>
              <Text style={styles.counterValue}>{places}</Text>
              <Pressable
                style={styles.counterBtn}
                onPress={() => setPlaces((p) => Math.min(8, p + 1))}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>📦 Accepte les colis</Text>
              <Text style={styles.toggleDesc}>Transporter des colis en plus des passagers</Text>
            </View>
            <Switch
              value={accepteColis}
              onValueChange={setAccepteColis}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>❄ Climatisation</Text>
              <Text style={styles.toggleDesc}>Véhicule climatisé pendant le trajet</Text>
            </View>
            <Switch
              value={climatise}
              onValueChange={setClimatise}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>🚭 Non-fumeur</Text>
              <Text style={styles.toggleDesc}>Pas de cigarette dans le véhicule</Text>
            </View>
            <Switch
              value={nonFumeur}
              onValueChange={setNonFumeur}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Diagnostic : affiche ce qui bloque le bouton */}
        {!isFormValid && (
          <View style={styles.blockingCard}>
            <Text style={styles.blockingIcon}>⚠</Text>
            <Text style={styles.blockingText}>{blockingReason()}</Text>
          </View>
        )}

        {/* Publier */}
        <Pressable
          style={[styles.publishBtn, (!isFormValid || isPending) && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.publishBtnText}>Publier le trajet</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 48, gap: spacing.xl },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
    gap: spacing.xl,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerBack: { width: 40, alignItems: "flex-start" },
  headerBackText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  section: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  vehiculeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  vehiculeCardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  vehiculeInfo: { flex: 1, gap: 2 },
  vehiculeName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  vehiculeSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  vehiculePlaces: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  vehiculeCheck: {
    fontSize: typography.fontSize.lg,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  textInput: {
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
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  pickerBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  placeholderText: { color: colors.textMuted },
  pickerArrow: { fontSize: typography.fontSize.xs, color: colors.textMuted },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    overflow: "hidden",
    marginTop: spacing.xs,
    ...shadows.md,
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: { backgroundColor: `${colors.primary}10` },
  dropdownText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  dropdownTextActive: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
  routeArrowRow: { alignItems: "center" },
  routeArrow: {
    fontSize: typography.fontSize["2xl"],
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },

  // Date/heure
  dtBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  dtBtnLeft: { gap: 2 },
  dtBtnSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dtBtnDate: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textTransform: "capitalize",
  },
  dtBtnTime: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  dtBtnIcon: { fontSize: 28 },
  manualToggle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  manualRow: { flexDirection: "row", gap: spacing.md },

  // iOS modal
  iosOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    paddingBottom: 32,
  },
  iosSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iosSheetTitle: {
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

  // Tarif / places
  counter: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  counterValue: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  toggleInfo: { flex: 1, gap: 2 },
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
  separator: { height: 1, backgroundColor: colors.border },
  errorText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.error,
  },
  publishBtn: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    ...shadows.md,
  },
  publishBtnDisabled: { opacity: 0.45 },
  blockingCard: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.errorBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  blockingIcon: { fontSize: 16 },
  blockingText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.errorText,
  },
  publishBtnText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  noVehiculeIcon: { fontSize: 56 },
  noVehiculeTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  noVehiculeText: {
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
