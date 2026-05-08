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
  Platform,
} from "react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  FadeIn,
} from "react-native-reanimated";
import { router } from "expo-router";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import { VILLES_LIST } from "@/src/constants/cities";
import type { ColisCategorie, ColisModalitePaiement } from "@/src/api/types";

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
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  selected: string;
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
  const [step, setStep] = useState(1);
  const directionRef = useRef<"forward" | "backward">("forward");

  // Step 1
  const [villeDepart,  setVilleDepart]  = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"depart" | "arrivee" | null>(null);

  // Step 2
  const [description, setDescription] = useState("");
  const [categorie,   setCategorie]   = useState<ColisCategorie>("AUTRE");
  const [poids,       setPoids]       = useState("");
  const [fragile,     setFragile]     = useState(false);

  // Step 3
  const [destNom,   setDestNom]   = useState("");
  const [destTel,   setDestTel]   = useState("");
  const [modalite,  setModalite]  = useState<ColisModalitePaiement>("A_LA_LIVRAISON");

  const [errors, setErrors] = useState<Record<string, string>>({});

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
          modalite_paiement:      modalite,
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
                          placeholder="Choisir la ville de départ"
                          error={errors.villeDepart}
                          onPress={() => setPickerTarget("depart")}
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
                          placeholder="Choisir la ville d'arrivée"
                          error={errors.villeArrivee}
                          onPress={() => setPickerTarget("arrivee")}
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
                <View style={styles.body}>
                  <View style={styles.stepTitleBlock}>
                    <Text style={styles.stepTitle}>Que contient votre colis ?</Text>
                    <Text style={styles.stepSub}>Ces infos aident le chauffeur à préparer le transport</Text>
                  </View>

                  {/* Description */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>
                      <Text style={styles.fieldLabelDot}>● </Text>Description du contenu
                    </Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea, !!errors.description && styles.textInputError]}
                      value={description}
                      onChangeText={(t) => { setDescription(t); if (errors.description) setErrors((e) => ({ ...e, description: "" })); }}
                      placeholder="Ex : Vêtements pour ma sœur, médicaments, documents…"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                    {errors.description ? (
                      <Text style={styles.fieldError}>{errors.description}</Text>
                    ) : null}
                  </View>

                  {/* Catégorie */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>
                      <Text style={styles.fieldLabelDot}>● </Text>Catégorie
                    </Text>
                    <View style={styles.catGrid}>
                      {CATEGORIES.map((cat) => {
                        const active = categorie === cat.key;
                        return (
                          <Pressable
                            key={cat.key}
                            style={[styles.catCard, active && styles.catCardActive]}
                            onPress={() => setCategorie(cat.key)}
                          >
                            {active && <View style={styles.catCheck}><Text style={styles.catCheckText}>✓</Text></View>}
                            <Text style={styles.catIcon}>{cat.icon}</Text>
                            <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                              {cat.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Poids + Fragile */}
                  <View style={styles.poidsFragileRow}>
                    <View style={styles.poidsBlock}>
                      <Text style={styles.fieldLabel}>
                        <Text style={styles.fieldLabelDot}>● </Text>Poids (kg)
                      </Text>
                      <TextInput
                        style={[styles.textInput, styles.poidsInput]}
                        value={poids}
                        onChangeText={setPoids}
                        placeholder="Ex : 2.5"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                      />
                      <Text style={styles.fieldHint}>Optionnel</Text>
                    </View>

                    <Pressable
                      style={[styles.fragileCard, fragile && styles.fragileCardActive]}
                      onPress={() => setFragile((f) => !f)}
                    >
                      <Text style={styles.fragileCardIcon}>🔮</Text>
                      <Text style={[styles.fragileCardLabel, fragile && styles.fragileCardLabelActive]}>
                        Fragile
                      </Text>
                      <Switch
                        value={fragile}
                        onValueChange={setFragile}
                        trackColor={{ true: colors.warning, false: colors.border }}
                        thumbColor={colors.white}
                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                      />
                    </Pressable>
                  </View>
                </View>

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

                  {/* Paiement */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>
                      <Text style={styles.fieldLabelDot}>● </Text>Quand souhaitez-vous payer ?
                    </Text>
                    <View style={styles.payRow}>
                      <Pressable
                        style={[styles.payCard, modalite === "A_LA_LIVRAISON" && styles.payCardActive]}
                        onPress={() => setModalite("A_LA_LIVRAISON")}
                      >
                        {modalite === "A_LA_LIVRAISON" && <View style={styles.payCheck}><Text style={styles.payCheckText}>✓</Text></View>}
                        <Text style={styles.payCardIcon}>📦</Text>
                        <Text style={[styles.payCardLabel, modalite === "A_LA_LIVRAISON" && styles.payCardLabelActive]}>
                          À la livraison
                        </Text>
                        <Text style={styles.payCardHint}>Payer quand le colis arrive</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.payCard, modalite === "A_LA_CONFIRMATION" && styles.payCardActive]}
                        onPress={() => setModalite("A_LA_CONFIRMATION")}
                      >
                        {modalite === "A_LA_CONFIRMATION" && <View style={styles.payCheck}><Text style={styles.payCheckText}>✓</Text></View>}
                        <Text style={styles.payCardIcon}>✅</Text>
                        <Text style={[styles.payCardLabel, modalite === "A_LA_CONFIRMATION" && styles.payCardLabelActive]}>
                          À la confirmation
                        </Text>
                        <Text style={styles.payCardHint}>Payer quand le chauffeur accepte</Text>
                      </Pressable>
                    </View>
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
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 4,
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
  poidsInput: { paddingVertical: spacing.sm },
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
});
