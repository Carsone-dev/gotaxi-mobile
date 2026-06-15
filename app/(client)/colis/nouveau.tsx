import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { router } from "expo-router";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import { useVilles } from "@/src/hooks/useGares";
import type { ColisCategorie } from "@/src/api/types";

// ── Données ───────────────────────────────────────────────────────────────────
const CATEGORIES: { key: ColisCategorie; label: string; icon: string }[] = [
  { key: "DOCUMENTS",    label: "Documents",    icon: "📄" },
  { key: "VETEMENTS",    label: "Vêtements",    icon: "👕" },
  { key: "ELECTRONIQUE", label: "Électronique", icon: "📱" },
  { key: "ALIMENTAIRE",  label: "Alimentaire",  icon: "🍱" },
  { key: "FRAGILE",      label: "Fragile",      icon: "🔮" },
  { key: "AUTRE",        label: "Autre",        icon: "📦" },
];

const STEP_LABELS = ["Trajet", "Contenu", "Destinataire"];

const CAT_COLORS: Record<string, string> = {
  DOCUMENTS:    "#3B82F6",
  VETEMENTS:    "#8B5CF6",
  ELECTRONIQUE: "#0EA5E9",
  ALIMENTAIRE:  "#22C55E",
  FRAGILE:      "#F59E0B",
  AUTRE:        "#6B7280",
};

// ── Indicateur d'étapes ───────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <View style={si.row}>
      {STEP_LABELS.map((label, idx) => {
        const id = idx + 1;
        const done   = id < current;
        const active = id === current;
        return (
          <React.Fragment key={id}>
            <View style={si.step}>
              <View style={[si.circle, done && si.circleDone, active && si.circleActive]}>
                {done
                  ? <Text style={si.circleText}>✓</Text>
                  : <Text style={[si.circleText, !active && si.circleTextIdle]}>{id}</Text>}
              </View>
              <Text style={[si.label, active && si.labelActive, done && si.labelDone]}>
                {label}
              </Text>
            </View>
            {idx < STEP_LABELS.length - 1 && (
              <View style={[si.line, done && si.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const si = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg },
  step: { alignItems: "center", gap: 4, width: 72 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  circleDone:   { backgroundColor: colors.primary, borderColor: colors.primary },
  circleActive: { borderColor: colors.primary, backgroundColor: colors.white },
  circleText:   { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: colors.white },
  circleTextIdle: { color: colors.textMuted },
  line:     { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 15, marginHorizontal: 4 },
  lineDone: { backgroundColor: colors.primary },
  label:      { fontSize: 10, fontFamily: typography.fontFamily.medium, color: colors.textMuted, textAlign: "center" },
  labelActive:{ color: colors.primary, fontFamily: typography.fontFamily.bold },
  labelDone:  { color: `${colors.primary}99` },
});

// ── Modal sélecteur de ville ───────────────────────────────────────────────────
function CityPickerModal({
  visible,
  title,
  selected,
  exclude,
  cities: citiesProp,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  selected: string;
  exclude?: string;
  cities: string[];
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!visible) setQuery(""); }, [visible]);

  const all = citiesProp.filter((v) => v !== exclude);
  const cities = query.trim()
    ? all.filter((v) => v.toLowerCase().includes(query.toLowerCase()))
    : all;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={ms.sheet}>
          <View style={ms.handle} />
          <View style={ms.header}>
            <Text style={ms.title}>{title}</Text>
            <Pressable style={ms.closeBtn} onPress={onClose} hitSlop={12}>
              <Text style={ms.closeBtnText}>✕</Text>
            </Pressable>
          </View>
          <View style={ms.searchRow}>
            <Text style={ms.searchIcon}>🔍</Text>
            <TextInput
              style={ms.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une ville…"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Text style={ms.searchClear}>✕</Text>
              </Pressable>
            )}
          </View>
          <FlatList
            data={cities}
            keyExtractor={(v) => v}
            style={{ maxHeight: 340 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={ms.empty}><Text style={ms.emptyText}>Aucune ville trouvée</Text></View>
            }
            renderItem={({ item }) => {
              const isSelected = item === selected;
              return (
                <Pressable
                  style={({ pressed }) => [ms.item, isSelected && ms.itemSelected, pressed && ms.itemPressed]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={ms.itemPin}>{isSelected ? "✓" : "📍"}</Text>
                  <Text style={[ms.itemText, isSelected && ms.itemTextSelected]}>{item}</Text>
                  <Text style={ms.itemChevron}>›</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
const PB = Platform.OS === "ios" ? 36 : 24;
const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: PB,
    ...shadows.md,
  },
  handle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center", marginTop: 12, marginBottom: 8,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  closeBtnText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: colors.textSecondary },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginHorizontal: spacing["2xl"], marginVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular, color: colors.textPrimary, paddingVertical: spacing.xs },
  searchClear: { fontSize: typography.fontSize.sm, color: colors.textMuted, fontFamily: typography.fontFamily.bold, paddingHorizontal: spacing.xs },
  empty: { padding: spacing["2xl"], alignItems: "center" },
  emptyText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular, color: colors.textMuted },
  item: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: `${colors.border}60`,
  },
  itemSelected: { backgroundColor: `${colors.primary}08` },
  itemPressed: { backgroundColor: `${colors.primary}08` },
  itemPin: { fontSize: 16, width: 22, textAlign: "center" },
  itemText: { flex: 1, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium, color: colors.textPrimary },
  itemTextSelected: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
  itemChevron: { fontSize: 22, color: colors.textMuted },
});

// ── Bouton ville ──────────────────────────────────────────────────────────────
function CityBtn({
  icon,
  value,
  placeholder,
  error,
  onPress,
}: {
  icon: string;
  value: string;
  placeholder: string;
  error?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.cityBtn, value && styles.cityBtnFilled, !!error && styles.cityBtnError]}
      onPress={onPress}
    >
      <Text style={styles.cityBtnIcon}>{icon}</Text>
      <Text style={[styles.cityBtnText, !value && styles.cityBtnPlaceholder]}>
        {value || placeholder}
      </Text>
      <View style={styles.cityBtnChevronWrap}>
        <Text style={styles.cityBtnChevron}>▼</Text>
      </View>
    </Pressable>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function NouveauColisScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const directionRef = useRef<"forward" | "backward">("forward");

  const { data: villesData, isLoading: villesLoading } = useVilles();
  const villesList = villesData?.filter((v) => v.actif).map((v) => v.nom) ?? [];

  // Step 1
  const [villeDepart,  setVilleDepart]  = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"depart" | "arrivee" | null>(null);

  // Step 2
  const [description, setDescription] = useState("");
  const [categorie,   setCategorie]   = useState<ColisCategorie>("AUTRE");
  const [poids,       setPoids]       = useState("");
  const [fragile,     setFragile]     = useState(false);
  const [photo,       setPhoto]       = useState<string | null>(null);

  // Step 3
  const [destNom,   setDestNom]   = useState("");
  const [destTel,   setDestTel]   = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePickPhoto = () => {
    Alert.alert("Photo du colis", "Comment souhaitez-vous ajouter la photo ?", [
      {
        text: "Prendre une photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission refusée", "Autorisez l'accès à la caméra dans les paramètres.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
        },
      },
      {
        text: "Choisir depuis la galerie",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
        },
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!villeDepart)  e.villeDepart  = "Choisissez la ville de départ";
      if (!villeArrivee) e.villeArrivee = "Choisissez la ville d'arrivée";
      if (villeDepart && villeArrivee && villeDepart === villeArrivee)
        e.villeArrivee = "Les villes doivent être différentes";
    }
    if (s === 2) {
      if (!description.trim()) e.description = "Décrivez le contenu du colis";
    }
    if (s === 3) {
      if (!destNom.trim()) e.destNom = "Nom du destinataire requis";
      if (!destTel.trim()) e.destTel = "Téléphone du destinataire requis";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  function goTo(s: number) {
    directionRef.current = s > step ? "forward" : "backward";
    setErrors({});
    setStep(s);
  }

  const next = () => {
    if (!validate(step)) return;
    if (step < 3) {
      goTo(step + 1);
    } else {
      router.push({
        pathname: "/(client)/colis/voyages" as any,
        params: {
          ville_depart:           villeDepart,
          ville_arrivee:          villeArrivee,
          description:            description.trim(),
          categorie,
          poids_kg:               poids || "",
          fragile:                fragile ? "1" : "0",
          destinataire_nom:       destNom.trim(),
          destinataire_telephone: destTel.trim(),
          photo_uri:              photo || "",
        },
      });
    }
  };

  const catInfo = CATEGORIES.find((c) => c.key === categorie);

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
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

            {/* ── Header ── */}
            <View style={styles.header}>
              <Pressable
                onPress={() => step > 1 ? goTo(step - 1) : router.back()}
                style={styles.backBtn}
                hitSlop={8}
              >
                <Text style={styles.backBtnText}>←</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Envoyer un colis</Text>
              </View>
            </View>

            {/* ── Stepper ── */}
            <View style={styles.stepperWrap}>
              <StepIndicator current={step} />
            </View>

            {/* ════ Étape 1 : Trajet ════ */}
            {step === 1 && (
              <>
                <View style={styles.body}>
                  <View style={styles.stepTitleBlock}>
                    <Text style={styles.stepTitle}>De quelle ville à quelle ville ?</Text>
                    <Text style={styles.stepSub}>Choisissez le trajet de votre colis</Text>
                  </View>

                  {/* Route card */}
                  <View style={styles.routeCard}>
                    {/* Départ */}
                    <View style={styles.routeRow}>
                      <View style={styles.routeDotDepart} />
                      <View style={styles.routeField}>
                        <Text style={styles.routeFieldLabel}>Départ</Text>
                        <CityBtn
                          icon="🏙"
                          value={villeDepart}
                          placeholder={villesLoading ? "Chargement…" : "Choisir la ville de départ"}
                          error={errors.villeDepart}
                          onPress={() => !villesLoading && setPickerTarget("depart")}
                        />
                        {errors.villeDepart ? (
                          <Text style={styles.fieldError}>{errors.villeDepart}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Arrow */}
                    <View style={styles.routeDivider}>
                      <View style={styles.routeDividerLine} />
                      <View style={styles.routeDividerCircle}>
                        <Text style={styles.routeDividerArrow}>↓</Text>
                      </View>
                      <View style={styles.routeDividerLine} />
                    </View>

                    {/* Arrivée */}
                    <View style={styles.routeRow}>
                      <View style={styles.routeDotArrivee} />
                      <View style={styles.routeField}>
                        <Text style={styles.routeFieldLabel}>Arrivée</Text>
                        <CityBtn
                          icon="🎯"
                          value={villeArrivee}
                          placeholder={villesLoading ? "Chargement…" : "Choisir la ville d'arrivée"}
                          error={errors.villeArrivee}
                          onPress={() => !villesLoading && setPickerTarget("arrivee")}
                        />
                        {errors.villeArrivee ? (
                          <Text style={styles.fieldError}>{errors.villeArrivee}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Route preview */}
                  {villeDepart && villeArrivee && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.routePreview}>
                      <Text style={styles.routePreviewIcon}>📦</Text>
                      <Text style={styles.routePreviewText}>
                        {villeDepart} → {villeArrivee}
                      </Text>
                    </Animated.View>
                  )}

                  <View style={styles.infoChip}>
                    <Text style={styles.infoChipIcon}>ℹ️</Text>
                    <Text style={styles.infoChipText}>
                      Nous chercherons les chauffeurs sur ce trajet qui acceptent les colis.
                    </Text>
                  </View>
                </View>

                <View style={styles.ctaArea}>
                  <Pressable
                    style={[styles.ctaBtn, (!villeDepart || !villeArrivee) && styles.ctaBtnOff]}
                    onPress={next}
                    disabled={!villeDepart || !villeArrivee}
                  >
                    <Text style={styles.ctaBtnText}>Décrire le colis</Text>
                    <Text style={styles.ctaBtnArrow}>→</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* ════ Étape 2 : Contenu ════ */}
            {step === 2 && (
              <>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.step2Scroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* ── Titre ── */}
                  <View style={styles.step2Header}>
                    <Text style={styles.step2Title}>Contenu du colis</Text>
                    <Text style={styles.step2Sub}>Aidez le chauffeur à identifier et préparer votre envoi</Text>
                  </View>

                  {/* ── 01 · Description ── */}
                  <View style={styles.s2Card}>
                    <View style={styles.s2CardHead}>
                      <View style={styles.s2Num}><Text style={styles.s2NumText}>01</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.s2CardTitle}>Description du contenu</Text>
                        <Text style={styles.s2CardSub}>Que contient exactement ce colis ?</Text>
                      </View>
                      <View style={styles.requiredBadge}><Text style={styles.requiredBadgeText}>Requis</Text></View>
                    </View>
                    <TextInput
                      style={[styles.descInput, !!errors.description && styles.textInputError]}
                      value={description}
                      onChangeText={(t) => { setDescription(t); if (errors.description) setErrors((e) => ({ ...e, description: "" })); }}
                      placeholder="Ex : Vêtements pour ma sœur, médicaments, documents officiels…"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      maxLength={200}
                    />
                    <View style={styles.descFooter}>
                      {errors.description
                        ? <Text style={styles.fieldError}>{errors.description}</Text>
                        : <Text style={styles.fieldHint}>Soyez précis pour faciliter la livraison</Text>}
                      <Text style={[styles.fieldHint, description.length >= 180 && { color: colors.warning }]}>
                        {description.length}/200
                      </Text>
                    </View>
                  </View>

                  {/* ── 02 · Catégorie ── */}
                  <View style={styles.s2Card}>
                    <View style={styles.s2CardHead}>
                      <View style={styles.s2Num}><Text style={styles.s2NumText}>02</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.s2CardTitle}>Catégorie</Text>
                        <Text style={styles.s2CardSub}>Sélectionnez le type de votre colis</Text>
                      </View>
                    </View>
                    <View style={styles.catGrid}>
                      {CATEGORIES.map((cat) => {
                        const active = categorie === cat.key;
                        const catColor = CAT_COLORS[cat.key] ?? colors.primary;
                        return (
                          <Pressable
                            key={cat.key}
                            style={[styles.catCard, active && { borderColor: catColor, backgroundColor: `${catColor}12` }]}
                            onPress={() => setCategorie(cat.key)}
                          >
                            {active && (
                              <View style={[styles.catCheck, { backgroundColor: catColor }]}>
                                <Text style={styles.catCheckText}>✓</Text>
                              </View>
                            )}
                            <View style={[styles.catIconWrap, active && { backgroundColor: `${catColor}20` }]}>
                              <Text style={styles.catIcon}>{cat.icon}</Text>
                            </View>
                            <Text style={[styles.catLabel, active && { color: catColor, fontFamily: typography.fontFamily.bold }]}>
                              {cat.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* ── 03 · Photo ── */}
                  <Animated.View entering={FadeInDown.duration(350).springify()} style={styles.s2Card}>
                    <View style={styles.s2CardHead}>
                      <View style={[styles.s2Num, styles.s2NumPhoto]}><Text style={styles.s2NumText}>03</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.s2CardTitle}>Photo du colis</Text>
                        <Text style={styles.s2CardSub}>Facilite l'identification à la récupération</Text>
                      </View>
                      <View style={styles.optionalBadge}><Text style={styles.optionalBadgeText}>Optionnel</Text></View>
                    </View>

                    {photo ? (
                      <Animated.View entering={FadeInDown.duration(250)} style={styles.photoPreviewWrap}>
                        <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
                        <View style={styles.photoPreviewBadge}>
                          <Text style={styles.photoPreviewBadgeText}>
                            {CATEGORIES.find(c => c.key === categorie)?.icon} {CATEGORIES.find(c => c.key === categorie)?.label}
                          </Text>
                        </View>
                        <View style={styles.photoActionRow}>
                          <Pressable style={styles.photoActionBtn} onPress={handlePickPhoto}>
                            <Text style={styles.photoActionIcon}>🔄</Text>
                            <Text style={styles.photoActionText}>Changer la photo</Text>
                          </Pressable>
                          <Pressable style={[styles.photoActionBtn, styles.photoActionBtnDel]} onPress={() => setPhoto(null)}>
                            <Text style={styles.photoActionIcon}>🗑</Text>
                            <Text style={[styles.photoActionText, { color: colors.error }]}>Supprimer</Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                    ) : (
                      <Pressable style={styles.photoZone} onPress={handlePickPhoto} android_ripple={{ color: `${colors.primary}20` }}>
                        <View style={styles.photoZoneIconCircle}>
                          <Text style={styles.photoZoneIconText}>📷</Text>
                        </View>
                        <Text style={styles.photoZoneTitle}>Photographier le colis</Text>
                        <Text style={styles.photoZoneSub}>Appareil photo ou galerie</Text>
                        <View style={styles.photoZoneCatChip}>
                          <Text style={styles.photoZoneCatText}>
                            {CATEGORIES.find(c => c.key === categorie)?.icon}{" "}
                            {CATEGORIES.find(c => c.key === categorie)?.label}
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </Animated.View>

                  {/* ── 04 · Détails ── */}
                  <View style={styles.s2Card}>
                    <View style={styles.s2CardHead}>
                      <View style={styles.s2Num}><Text style={styles.s2NumText}>04</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.s2CardTitle}>Détails supplémentaires</Text>
                        <Text style={styles.s2CardSub}>Poids et fragilité du colis</Text>
                      </View>
                    </View>
                    <View style={styles.detailsRow}>
                      {/* Poids */}
                      <View style={styles.detailsPoidsWrap}>
                        <Text style={styles.detailsLabel}>⚖️  Poids estimé</Text>
                        <View style={styles.detailsPoidsRow}>
                          <TextInput
                            style={styles.poidsInput}
                            value={poids}
                            onChangeText={setPoids}
                            placeholder="0.0"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                          />
                          <View style={styles.poidsUnit}>
                            <Text style={styles.poidsUnitText}>kg</Text>
                          </View>
                        </View>
                        <Text style={styles.fieldHint}>Optionnel</Text>
                      </View>

                      {/* Fragile */}
                      <Pressable
                        style={[styles.fragileBtn, fragile && styles.fragileBtnActive]}
                        onPress={() => setFragile((f) => !f)}
                      >
                        <Text style={styles.fragileBtnIcon}>{fragile ? "⚠️" : "🔮"}</Text>
                        <Text style={[styles.fragileBtnLabel, fragile && styles.fragileBtnLabelActive]}>
                          {fragile ? "Fragile" : "Fragile ?"}
                        </Text>
                        <Text style={[styles.fragileBtnStatus, fragile && styles.fragileBtnStatusActive]}>
                          {fragile ? "OUI" : "NON"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.ctaArea}>
                  <Pressable
                    style={[styles.ctaBtn, !description.trim() && styles.ctaBtnOff]}
                    onPress={next}
                    disabled={!description.trim()}
                  >
                    <Text style={styles.ctaBtnText}>Infos du destinataire</Text>
                    <Text style={styles.ctaBtnArrow}>→</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* ════ Étape 3 : Destinataire ════ */}
            {step === 3 && (
              <>
                <View style={styles.body}>
                  <View style={styles.stepTitleBlock}>
                    <Text style={styles.stepTitle}>Qui reçoit le colis ?</Text>
                    <Text style={styles.stepSub}>Le chauffeur contactera le destinataire à la livraison</Text>
                  </View>

                  {/* Nom */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>
                      <Text style={styles.fieldLabelDot}>● </Text>Nom du destinataire
                    </Text>
                    <TextInput
                      style={[styles.textInput, !!errors.destNom && styles.textInputError]}
                      value={destNom}
                      onChangeText={(t) => { setDestNom(t); if (errors.destNom) setErrors((e) => ({ ...e, destNom: "" })); }}
                      placeholder="Prénom et nom"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                    {errors.destNom ? <Text style={styles.fieldError}>{errors.destNom}</Text> : null}
                  </View>

                  {/* Téléphone */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>
                      <Text style={styles.fieldLabelDot}>● </Text>Numéro de téléphone
                    </Text>
                    <TextInput
                      style={[styles.textInput, !!errors.destTel && styles.textInputError]}
                      value={destTel}
                      onChangeText={(t) => { setDestTel(t); if (errors.destTel) setErrors((e) => ({ ...e, destTel: "" })); }}
                      placeholder="+229 97 00 00 00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                    />
                    {errors.destTel ? <Text style={styles.fieldError}>{errors.destTel}</Text> : null}
                  </View>

                  {/* Mini recap */}
                  <View style={styles.recap}>
                    <Text style={styles.recapIcon}>📋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recapRoute}>{villeDepart} → {villeArrivee}</Text>
                      <Text style={styles.recapDetail} numberOfLines={1}>
                        {catInfo?.icon} {catInfo?.label}
                        {poids ? `  ·  ${poids} kg` : ""}
                        {fragile ? "  ·  ⚠️ Fragile" : ""}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.ctaArea}>
                  <Pressable
                    style={[styles.ctaBtn, (!destNom.trim() || !destTel.trim()) && styles.ctaBtnOff]}
                    onPress={next}
                    disabled={!destNom.trim() || !destTel.trim()}
                  >
                    <Text style={styles.ctaBtnText}>Trouver un chauffeur</Text>
                    <Text style={styles.ctaBtnArrow}>→</Text>
                  </Pressable>
                </View>
              </>
            )}

          </KeyboardAvoidingView>
        </Animated.View>
      </View>

      {/* City picker modals */}
      <CityPickerModal
        visible={pickerTarget !== null}
        title={pickerTarget === "depart" ? "Ville de départ" : "Ville d'arrivée"}
        selected={pickerTarget === "depart" ? villeDepart : villeArrivee}
        exclude={pickerTarget === "depart" ? villeArrivee : villeDepart}
        cities={villesList}
        onClose={() => setPickerTarget(null)}
        onSelect={(v) => {
          if (pickerTarget === "depart") setVilleDepart(v);
          else setVilleArrivee(v);
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PT = Platform.OS === "ios" ? 56 : 40;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  stepContainer: { flex: 1, overflow: "hidden" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  backBtnText: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.primary, lineHeight: 24 },
  headerTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },

  // Stepper
  stepperWrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  stepTitleBlock: { gap: 3 },
  stepTitle: { fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  stepSub: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textMuted, lineHeight: 18 },

  // Route card (step 1)
  routeCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  routeDotDepart: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.primary,
    marginTop: 32,
    borderWidth: 3, borderColor: `${colors.primary}35`,
  },
  routeDotArrivee: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.black,
    marginTop: 32,
    borderWidth: 3, borderColor: `${colors.black}35`,
  },
  routeField: { flex: 1, gap: spacing.xs },
  routeFieldLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  routeDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 5,
    gap: spacing.sm,
    marginVertical: 2,
  },
  routeDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  routeDividerCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center", justifyContent: "center",
  },
  routeDividerArrow: { fontSize: 14, color: colors.primary, fontFamily: typography.fontFamily.bold },

  // City button
  cityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cityBtnFilled: { borderColor: colors.primary, backgroundColor: `${colors.primary}06` },
  cityBtnError: { borderColor: colors.error },
  cityBtnIcon: { fontSize: 18 },
  cityBtnText: { flex: 1, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  cityBtnPlaceholder: { color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm },
  cityBtnChevronWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  cityBtnChevron: { fontSize: 9, color: colors.textMuted },

  // Route preview chip
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
  routePreviewText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, color: colors.primary },

  // Info chip
  infoChip: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.infoBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "flex-start",
  },
  infoChipIcon: { fontSize: 14 },
  infoChipText: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.info, lineHeight: 18 },

  // Fields
  fieldBlock: { gap: spacing.xs },
  fieldLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary },
  fieldLabelDot: { color: colors.primary },
  fieldHint: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted },
  fieldError: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.error },
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
  textArea: { minHeight: 64, textAlignVertical: "top", paddingTop: spacing.md },
  textInputError: { borderColor: colors.error },

  // Category grid
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catCard: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  catCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  catCheck: {
    position: "absolute",
    top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  catCheckText: { fontSize: 9, fontFamily: typography.fontFamily.bold, color: colors.white },
  catIcon: { fontSize: 22 },
  catLabel: { fontSize: 10, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary, textAlign: "center" },
  catLabelActive: { color: colors.primary },

  // Poids + Fragile row
  poidsFragileRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  poidsBlock: { flex: 1, gap: spacing.xs },
  poidsInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  fragileCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
    ...shadows.sm,
  },
  fragileCardActive: { borderColor: colors.warning, backgroundColor: colors.warningBg },
  fragileCardIcon: { fontSize: 22 },
  fragileCardLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary },
  fragileCardLabelActive: { color: colors.warningText },

  // Payment cards
  payRow: { flexDirection: "row", gap: spacing.sm },
  payCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
    overflow: "hidden",
    ...shadows.sm,
  },
  payCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  payCheck: {
    position: "absolute",
    top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  payCheckText: { fontSize: 10, fontFamily: typography.fontFamily.bold, color: colors.white },
  payCardIcon: { fontSize: 22 },
  payCardLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary, textAlign: "center" },
  payCardLabelActive: { color: colors.primary },
  payCardHint: { fontSize: 9, fontFamily: typography.fontFamily.regular, color: colors.textMuted, textAlign: "center" },

  // Recap (step 3)
  recap: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  recapIcon: { fontSize: 22 },
  recapRoute: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  recapDetail: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 2 },

  // CTA
  ctaArea: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
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
  ctaBtnText: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.white },
  ctaBtnArrow: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: `${colors.white}cc` },

  // ── Step 2 layout ────────────────────────────────────────────────────────────
  step2Scroll: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: 32,
    gap: spacing.lg,
  },
  step2Header: { gap: 4, marginBottom: spacing.xs },
  step2Title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  step2Sub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 20,
  },

  // Section card
  s2Card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  s2CardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  s2Num: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  s2NumPhoto: { backgroundColor: "#0EA5E9" },
  s2NumText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  s2CardTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  s2CardSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 1,
  },

  // Badges
  requiredBadge: {
    backgroundColor: `${colors.error}15`,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: 2,
  },
  requiredBadgeText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  optionalBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  optionalBadgeText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Description input
  descInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    minHeight: 88,
    textAlignVertical: "top",
  },
  descFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -spacing.xs,
  },

  // Category grid — icons with background
  catIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },

  // Photo zone (empty state)
  photoZone: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}07`,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: `${colors.primary}35`,
    borderStyle: "dashed",
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    overflow: "hidden",
  },
  photoZoneIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: `${colors.primary}25`,
  },
  photoZoneIconText: { fontSize: 32 },
  photoZoneTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  photoZoneSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  photoZoneCatChip: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  photoZoneCatText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // Photo preview (filled state)
  photoPreviewWrap: { gap: spacing.md },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  photoPreviewBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  photoPreviewBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  photoActionRow: { flexDirection: "row", gap: spacing.md },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  photoActionBtnDel: {
    borderColor: `${colors.error}40`,
    backgroundColor: `${colors.error}07`,
  },
  photoActionIcon: { fontSize: 15 },
  photoActionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },

  // Details (poids + fragile)
  detailsRow: { flexDirection: "row", gap: spacing.md, alignItems: "stretch" },
  detailsPoidsWrap: { flex: 1, gap: spacing.sm },
  detailsLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  detailsPoidsRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  poidsUnit: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  poidsUnitText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
  },
  fragileBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  },
  fragileBtnActive: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  fragileBtnIcon: { fontSize: 26 },
  fragileBtnLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
  },
  fragileBtnLabelActive: { color: colors.warningText },
  fragileBtnStatus: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: 999,
  },
  fragileBtnStatusActive: {
    color: colors.warningText,
    backgroundColor: `${colors.warning}40`,
  },

  // Keep old aliases to avoid breaking step 3 references
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionCardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionCardTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  detailsCardFlex: { flex: 1 },
  fragileToggleCard: { alignItems: "center", justifyContent: "center" },
  fragileToggleCardActive: { borderColor: colors.warning, backgroundColor: colors.warningBg },
  fragileToggleIcon: { fontSize: 24 },
  fragileToggleLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary, textAlign: "center" },
  fragileToggleLabelActive: { color: colors.warningText },
});
