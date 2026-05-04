import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import { VILLES_LIST } from "@/src/constants/cities";
import type { ColisCategorie, ColisModalitePaiement } from "@/src/api/types";

// ─── Données ──────────────────────────────────────────────────────────────────

const CATEGORIES: { key: ColisCategorie; label: string; icon: string; desc: string }[] = [
  { key: "DOCUMENTS",    label: "Documents",    icon: "📄", desc: "Papiers, courriers" },
  { key: "VETEMENTS",    label: "Vêtements",    icon: "👕", desc: "Habits, textiles" },
  { key: "ELECTRONIQUE", label: "Électronique", icon: "📱", desc: "Appareils, câbles" },
  { key: "ALIMENTAIRE",  label: "Alimentaire",  icon: "🍱", desc: "Produits alimentaires" },
  { key: "FRAGILE",      label: "Fragile",      icon: "🔮", desc: "Manipulation délicate" },
  { key: "AUTRE",        label: "Autre",        icon: "📦", desc: "Divers" },
];

const STEPS = [
  { id: 1, title: "Trajet",       icon: "🗺️" },
  { id: 2, title: "Contenu",      icon: "📦" },
  { id: 3, title: "Destinataire", icon: "👤" },
];

// ─── Modal picker de ville ────────────────────────────────────────────────────

function CityPickerModal({
  visible,
  onClose,
  onSelect,
  exclude,
  selected,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (v: string) => void;
  exclude?: string;
  selected: string;
}) {
  const [search, setSearch] = useState("");
  const villes = VILLES_LIST.filter(
    (v) => v !== exclude && v.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.title}>Choisir une ville</Text>

        <View style={modalStyles.searchBox}>
          <Text style={modalStyles.searchIcon}>🔍</Text>
          <TextInput
            style={modalStyles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        <FlatList
          data={villes}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item === selected;
            return (
              <Pressable
                style={[modalStyles.item, isSelected && modalStyles.itemSelected]}
                onPress={() => { onSelect(item); setSearch(""); onClose(); }}
              >
                <Text style={modalStyles.itemDot}>
                  {isSelected ? "✓" : "📍"}
                </Text>
                <Text style={[modalStyles.itemText, isSelected && modalStyles.itemTextSelected]}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={modalStyles.empty}>Aucune ville trouvée</Text>
          }
        />
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    paddingBottom: 40,
    maxHeight: "75%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginVertical: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemSelected: { backgroundColor: `${colors.primary}08` },
  itemDot: { fontSize: 16, width: 22, textAlign: "center" },
  itemText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  itemTextSelected: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  empty: {
    textAlign: "center",
    padding: spacing["2xl"],
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
});

// ─── Bouton de ville ──────────────────────────────────────────────────────────

function CityButton({
  label,
  value,
  onPress,
  error,
}: {
  label: string;
  value: string;
  onPress: () => void;
  error?: string;
}) {
  return (
    <View style={cityBtnStyles.wrapper}>
      <Text style={cityBtnStyles.label}>{label}</Text>
      <Pressable
        style={[cityBtnStyles.btn, error ? cityBtnStyles.btnError : value && cityBtnStyles.btnFilled]}
        onPress={onPress}
      >
        {value ? (
          <View style={cityBtnStyles.valueRow}>
            <Text style={cityBtnStyles.dot}>📍</Text>
            <Text style={cityBtnStyles.value}>{value}</Text>
          </View>
        ) : (
          <Text style={cityBtnStyles.placeholder}>Appuyer pour choisir</Text>
        )}
        <Text style={cityBtnStyles.chevron}>▼</Text>
      </Pressable>
      {error ? <Text style={cityBtnStyles.error}>{error}</Text> : null}
    </View>
  );
}

const cityBtnStyles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  btnFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}06`,
  },
  btnError: { borderColor: colors.error },
  valueRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  dot: { fontSize: 18 },
  value: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  placeholder: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    flex: 1,
  },
  chevron: { fontSize: 11, color: colors.textMuted },
  error: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.error,
  },
});

// ─── Indicateur de progression ────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <View style={stepStyles.row}>
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <View style={stepStyles.step}>
              <View style={[
                stepStyles.circle,
                done && stepStyles.circleDone,
                active && stepStyles.circleActive,
              ]}>
                {done
                  ? <Text style={stepStyles.checkText}>✓</Text>
                  : <Text style={[stepStyles.circleText, active && stepStyles.circleTextActive]}>
                      {step.id}
                    </Text>
                }
              </View>
              <Text style={[
                stepStyles.label,
                active && stepStyles.labelActive,
                done && stepStyles.labelDone,
              ]}>
                {step.title}
              </Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[stepStyles.line, done && stepStyles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.xl,
  },
  step: { alignItems: "center", gap: spacing.xs, width: 64 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  circleActive: { borderColor: colors.primary, backgroundColor: colors.white },
  circleText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
  },
  circleTextActive: { color: colors.primary },
  checkText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 15, marginHorizontal: 4 },
  lineDone: { backgroundColor: colors.primary },
  label: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textAlign: "center",
  },
  labelActive: { color: colors.primary, fontFamily: typography.fontFamily.bold },
  labelDone: { color: colors.primary },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function NouveauColisScreen() {
  const [step, setStep] = useState(1);

  // Step 1 — Trajet
  const [villeDepart, setVilleDepart]   = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"depart" | "arrivee" | null>(null);

  // Step 2 — Contenu
  const [description, setDescription]   = useState("");
  const [categorie, setCategorie]       = useState<ColisCategorie>("AUTRE");
  const [poids, setPoids]               = useState("");
  const [fragile, setFragile]           = useState(false);

  // Step 3 — Destinataire + paiement
  const [destNom, setDestNom]     = useState("");
  const [destTel, setDestTel]     = useState("");
  const [modalite, setModalite]   = useState<ColisModalitePaiement>("A_LA_LIVRAISON");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);

  const goTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  const validateStep = (s: number): boolean => {
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

  const next = () => {
    if (!validateStep(step)) return;
    if (step < 3) {
      setStep((s) => s + 1);
      goTop();
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

  const prev = () => {
    setErrors({});
    setStep((s) => s - 1);
    goTop();
  };

  // ── Step 1 ──────────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>De quelle ville à quelle ville ?</Text>
      <Text style={styles.stepSubtitle}>
        Indiquez le trajet pour trouver un chauffeur disponible
      </Text>

      <View style={styles.routeVisual}>
        <CityButton
          label="Ville de départ"
          value={villeDepart}
          onPress={() => setPickerTarget("depart")}
          error={errors.villeDepart}
        />

        <View style={styles.routeArrowRow}>
          <View style={styles.routeArrowLine} />
          <View style={styles.routeArrowCircle}>
            <Text style={styles.routeArrowText}>↓</Text>
          </View>
          <View style={styles.routeArrowLine} />
        </View>

        <CityButton
          label="Ville d'arrivée"
          value={villeArrivee}
          onPress={() => setPickerTarget("arrivee")}
          error={errors.villeArrivee}
        />
      </View>

      {villeDepart && villeArrivee && (
        <View style={styles.routeSummary}>
          <Text style={styles.routeSummaryText}>
            📦 {villeDepart} → {villeArrivee}
          </Text>
        </View>
      )}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          ℹ️ Nous chercherons les chauffeurs disponibles sur ce trajet qui acceptent les colis.
        </Text>
      </View>
    </View>
  );

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Que contient votre colis ?</Text>
      <Text style={styles.stepSubtitle}>Ces informations aident le chauffeur à préparer le transport</Text>

      <Input
        label="Description du contenu"
        placeholder="Ex : Vêtements pour ma sœur, médicaments…"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        multiline
        numberOfLines={3}
        style={{ minHeight: 72, textAlignVertical: "top" }}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Catégorie</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => {
            const active = categorie === cat.key;
            return (
              <Pressable
                key={cat.key}
                style={[styles.catCard, active && styles.catCardActive]}
                onPress={() => setCategorie(cat.key)}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                  {cat.label}
                </Text>
                <Text style={styles.catDesc}>{cat.desc}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label="Poids estimé (kg) — optionnel"
        placeholder="Ex : 2.5"
        value={poids}
        onChangeText={setPoids}
        keyboardType="decimal-pad"
      />

      <Pressable
        style={[styles.fragileToggle, fragile && styles.fragileToggleActive]}
        onPress={() => setFragile((f) => !f)}
      >
        <View style={styles.fragileLeft}>
          <Text style={styles.fragileIcon}>🔮</Text>
          <View>
            <Text style={[styles.fragileTitle, fragile && styles.fragileTitleActive]}>
              Colis fragile
            </Text>
            <Text style={styles.fragileHint}>Manipulation avec précaution requise</Text>
          </View>
        </View>
        <Switch
          value={fragile}
          onValueChange={setFragile}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
        />
      </Pressable>
    </View>
  );

  // ── Step 3 ──────────────────────────────────────────────────────────────────

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Qui reçoit le colis ?</Text>
      <Text style={styles.stepSubtitle}>
        Le chauffeur contactera le destinataire à la livraison
      </Text>

      <Input
        label="Nom complet du destinataire"
        placeholder="Prénom et nom"
        value={destNom}
        onChangeText={setDestNom}
        error={errors.destNom}
        autoCapitalize="words"
      />

      <Input
        label="Numéro de téléphone"
        placeholder="+229 97 00 00 00"
        value={destTel}
        onChangeText={setDestTel}
        error={errors.destTel}
        keyboardType="phone-pad"
      />

      {/* Modalité de paiement */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Quand souhaitez-vous payer ?</Text>
        <View style={styles.modaliteRow}>
          <Pressable
            style={[styles.modaliteBtn, modalite === "A_LA_LIVRAISON" && styles.modaliteBtnActive]}
            onPress={() => setModalite("A_LA_LIVRAISON")}
          >
            <Text style={styles.modaliteBtnIcon}>📦</Text>
            <Text style={[styles.modaliteBtnLabel, modalite === "A_LA_LIVRAISON" && styles.modaliteBtnLabelActive]}>
              À la livraison
            </Text>
            <Text style={[styles.modaliteBtnHint, modalite === "A_LA_LIVRAISON" && styles.modaliteBtnHintActive]}>
              Payer quand le colis arrive
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modaliteBtn, modalite === "A_LA_CONFIRMATION" && styles.modaliteBtnActive]}
            onPress={() => setModalite("A_LA_CONFIRMATION")}
          >
            <Text style={styles.modaliteBtnIcon}>✅</Text>
            <Text style={[styles.modaliteBtnLabel, modalite === "A_LA_CONFIRMATION" && styles.modaliteBtnLabelActive]}>
              À la confirmation
            </Text>
            <Text style={[styles.modaliteBtnHint, modalite === "A_LA_CONFIRMATION" && styles.modaliteBtnHintActive]}>
              Payer quand le chauffeur accepte
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Résumé complet */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Récapitulatif</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>🗺️</Text>
          <Text style={styles.summaryText}>{villeDepart} → {villeArrivee}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>
            {CATEGORIES.find((c) => c.key === categorie)?.icon}
          </Text>
          <Text style={styles.summaryText}>
            {CATEGORIES.find((c) => c.key === categorie)?.label} · {description.substring(0, 40)}{description.length > 40 ? "…" : ""}
          </Text>
        </View>
        {poids ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>⚖️</Text>
            <Text style={styles.summaryText}>{poids} kg</Text>
          </View>
        ) : null}
        {fragile && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>⚠️</Text>
            <Text style={[styles.summaryText, { color: colors.warningText }]}>Fragile</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>💳</Text>
          <Text style={styles.summaryText}>
            {modalite === "A_LA_LIVRAISON" ? "Paiement à la livraison" : "Paiement à la confirmation"}
          </Text>
        </View>
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💰 Le prix est calculé automatiquement par le serveur selon le trajet, la catégorie et le poids. Vous le verrez après confirmation.
        </Text>
      </View>
    </View>
  );

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* Header fixe */}
        <View style={styles.header}>
          {step > 1 ? (
            <Pressable onPress={prev} style={styles.headerBack}>
              <Text style={styles.headerBackText}>←</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.back()} style={styles.headerBack}>
              <Text style={styles.headerBackText}>←</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Envoyer un colis</Text>
          </View>
        </View>

        {/* Indicateur étapes */}
        <View style={styles.stepperWrapper}>
          <StepIndicator current={step} />
        </View>

        {/* Contenu scrollable */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        {/* Footer fixe */}
        <View style={styles.footer}>
          <Button size="lg" onPress={next} style={styles.nextBtn}>
            {step === 3 ? "Trouver un chauffeur →" : `Continuer · Étape ${step}/3`}
          </Button>
        </View>

        {/* Modal picker ville */}
        <CityPickerModal
          visible={pickerTarget !== null}
          selected={pickerTarget === "depart" ? villeDepart : villeArrivee}
          exclude={pickerTarget === "depart" ? villeArrivee : villeDepart}
          onClose={() => setPickerTarget(null)}
          onSelect={(v) => {
            if (pickerTarget === "depart") setVilleDepart(v);
            else setVilleArrivee(v);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },

  stepperWrapper: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing["2xl"], paddingBottom: 40, gap: spacing.xl },

  stepContent: { gap: spacing.xl },

  stepTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  stepSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: -spacing.md,
  },

  // Route visual (step 1)
  routeVisual: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.md,
    ...shadows.sm,
  },
  routeArrowRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  routeArrowLine: { flex: 1, height: 1, backgroundColor: colors.border },
  routeArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  routeArrowText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  routeSummary: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
  },
  routeSummaryText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  // Categories (step 2)
  fieldGroup: { gap: spacing.sm },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  catCard: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  catCardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  catIcon: { fontSize: 24 },
  catLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textAlign: "center",
  },
  catLabelActive: { color: colors.primary },
  catDesc: {
    fontSize: 9,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Fragile toggle
  fragileToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  fragileToggleActive: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  fragileLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  fragileIcon: { fontSize: 24 },
  fragileTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  fragileTitleActive: { color: colors.warningText },
  fragileHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Modalite selector (step 3)
  modaliteRow: { flexDirection: "row", gap: spacing.sm },
  modaliteBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    ...shadows.sm,
  },
  modaliteBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  modaliteBtnIcon: { fontSize: 22 },
  modaliteBtnLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textAlign: "center",
  },
  modaliteBtnLabelActive: { color: colors.primary },
  modaliteBtnHint: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },
  modaliteBtnHintActive: { color: `${colors.primary}99` },

  // Summary (step 3)
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  summaryRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  summaryIcon: { fontSize: 16, width: 22, marginTop: 1 },
  summaryText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  noteBox: {
    backgroundColor: colors.infoBg,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  noteText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.info,
    lineHeight: 20,
  },

  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 32 : spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  nextBtn: { width: "100%" },
});
