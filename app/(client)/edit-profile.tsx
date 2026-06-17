import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/src/stores/authStore";
import { usersApi } from "@/src/api/endpoints/users";
import { useToast } from "@/src/components/common/Toast";
import { resolveMediaUrl } from "@/src/constants/app";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { GenreUser } from "@/src/api/types";

const LANGUES = [
  { code: "fr", label: "🇫🇷  Français" },
  { code: "en", label: "🇬🇧  English" },
];

const GENRES: { value: GenreUser; label: string; icon: string; color: string }[] = [
  { value: "HOMME",     label: "Homme",      icon: "man-outline",    color: "#1B6FE8" },
  { value: "FEMME",     label: "Femme",      icon: "woman-outline",  color: "#D64F8C" },
  { value: "NON_DEFINI",label: "Préfère ne pas préciser", icon: "person-outline", color: colors.textMuted },
];

// ── Champ de formulaire ───────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, keyboardType, autoCapitalize, error, required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  error?: string;
  required?: boolean;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>
        {label}
        {required && <Text style={f.required}> *</Text>}
      </Text>
      <TextInput
        style={[f.input, !!error && f.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "words"}
        autoCorrect={false}
      />
      {!!error && <Text style={f.errorText}>{error}</Text>}
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  required: { color: colors.error },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.error },
  errorText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.error,
  },
});

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const insets      = useSafeAreaInsets();
  const user        = useAuthStore((s) => s.user);
  const setUser     = useAuthStore((s) => s.setUser);
  const { showToast } = useToast();

  const [prenom,        setPrenom]        = useState(user?.prenom ?? "");
  const [nom,           setNom]           = useState(user?.nom ?? "");
  const [email,         setEmail]         = useState(user?.email ?? "");
  const [langue,        setLangue]        = useState(user?.langue ?? "fr");
  const [genre,         setGenre]         = useState<GenreUser>(user?.genre ?? "NON_DEFINI");
  const [saving,        setSaving]        = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhoto,    setLocalPhoto]    = useState<string | null>(null);
  const [errors,        setErrors]        = useState<{ prenom?: string; nom?: string; email?: string }>({});

  const photoUrl = localPhoto ?? resolveMediaUrl(user?.photo_url);
  const initials = `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase() || "?";

  // ── Photo ──────────────────────────────────────────────────────────────────
  const openPhotoPicker = () => {
    Alert.alert(
      "Photo de profil",
      "Comment voulez-vous ajouter votre photo ?",
      [
        {
          text: "📷  Prendre une photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Permission refusée", "Autorisez l'accès à la caméra dans les paramètres.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true, aspect: [1, 1], quality: 0.9,
            });
            if (!result.canceled && result.assets[0]) uploadPhoto(result.assets[0].uri);
          },
        },
        {
          text: "🖼  Choisir depuis la galerie",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9,
            });
            if (!result.canceled && result.assets[0]) uploadPhoto(result.assets[0].uri);
          },
        },
        { text: "Annuler", style: "cancel" },
      ],
    );
  };

  const uploadPhoto = async (uri: string) => {
    setLocalPhoto(uri);
    setUploadingPhoto(true);
    try {
      const updated = await usersApi.uploadPhoto(uri);
      setUser(updated);
      setLocalPhoto(null);
      showToast("Photo mise à jour", "success");
    } catch {
      setLocalPhoto(null);
      Alert.alert("Erreur", "Impossible d'enregistrer la photo. Réessayez.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: typeof errors = {};
    if (!prenom.trim()) errs.prenom = "Le prénom est requis";
    if (!nom.trim())    errs.nom    = "Le nom est requis";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Adresse email invalide";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        prenom: prenom.trim(),
        nom:    nom.trim(),
        langue,
        genre,
      };
      if (email.trim()) payload.email = email.trim();

      const updated = await usersApi.update(payload);
      setUser(updated);
      showToast("Profil mis à jour avec succès", "success");
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder les modifications. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  // ── Détection de changements ────────────────────────────────────────────────
  const hasChanges =
    prenom.trim() !== (user?.prenom ?? "") ||
    nom.trim()    !== (user?.nom    ?? "") ||
    email.trim()  !== (user?.email  ?? "") ||
    langue        !== (user?.langue ?? "fr") ||
    genre         !== (user?.genre  ?? "NON_DEFINI");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Modifier le profil</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving || !hasChanges}
            style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={styles.saveBtnText}>Sauvegarder</Text>
            }
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar ─────────────────────────────────────────────────── */}
          <View style={styles.avatarSection}>
            <Pressable onPress={openPhotoPicker} disabled={uploadingPhoto} style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
              {uploadingPhoto && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={colors.white} size="small" />
                </View>
              )}
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>Appuyez pour changer la photo</Text>
          </View>

          {/* ── Identité ───────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Identité</Text>
            <View style={styles.cardBody}>
              <Field
                label="Prénom"
                value={prenom}
                onChangeText={(v) => { setPrenom(v); setErrors((e) => ({ ...e, prenom: undefined })); }}
                placeholder="Votre prénom"
                required
                error={errors.prenom}
              />
              <View style={styles.sep} />
              <Field
                label="Nom"
                value={nom}
                onChangeText={(v) => { setNom(v); setErrors((e) => ({ ...e, nom: undefined })); }}
                placeholder="Votre nom de famille"
                required
                error={errors.nom}
              />
            </View>
          </View>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Contact</Text>
            <View style={styles.cardBody}>
              <Field
                label="Email"
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
              <View style={styles.sep} />
              {/* Téléphone — lecture seule */}
              <View style={f.wrap}>
                <Text style={f.label}>Téléphone</Text>
                <View style={styles.readonlyField}>
                  <Text style={styles.readonlyText}>{user?.telephone}</Text>
                  <Pressable
                    style={styles.verifyBtn}
                    onPress={() => router.push("/(auth)/otp" as any)}
                  >
                    <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                    <Text style={styles.verifyBtnText}>Modifier</Text>
                  </Pressable>
                </View>
                <Text style={styles.readonlyHint}>
                  Le numéro de téléphone nécessite une vérification OTP pour être modifié.
                </Text>
              </View>
            </View>
          </View>

          {/* ── Langue & Genre ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Préférences</Text>
            <View style={styles.cardBody}>
              <Text style={[f.label, { marginBottom: 2 }]}>Langue de l'application</Text>
              <View style={styles.langRow}>
                {LANGUES.map((l) => (
                  <Pressable
                    key={l.code}
                    style={[styles.langBtn, langue === l.code && styles.langBtnActive]}
                    onPress={() => setLangue(l.code)}
                  >
                    <Text style={[styles.langBtnText, langue === l.code && styles.langBtnTextActive]}>
                      {l.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.sep} />

              <Text style={[f.label, { marginBottom: 6 }]}>Genre</Text>
              <View style={styles.genreRow}>
                {GENRES.map((g) => {
                  const active = genre === g.value;
                  return (
                    <Pressable
                      key={g.value}
                      style={[
                        styles.genreBtn,
                        active && { borderColor: g.color, backgroundColor: `${g.color}12` },
                      ]}
                      onPress={() => setGenre(g.value)}
                    >
                      <Ionicons
                        name={g.icon as any}
                        size={18}
                        color={active ? g.color : colors.textMuted}
                      />
                      <Text style={[styles.genreBtnText, active && { color: g.color, fontFamily: typography.fontFamily.semiBold }]}>
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Bouton sauvegarder (bas de page) ───────────────────────── */}
          <Pressable
            onPress={handleSave}
            disabled={saving || !hasChanges}
            style={({ pressed }) => [
              styles.submitBtn,
              (!hasChanges || saving) && styles.submitBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.submitBtnText}>Sauvegarder les modifications</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: colors.textMuted },
  saveBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  /* Contenu */
  content: {
    padding: spacing["2xl"],
    gap: spacing.xl,
  },

  /* Avatar */
  avatarSection: { alignItems: "center", gap: spacing.sm },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: "hidden",
    ...shadows.md,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 38,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 55,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: colors.white,
    ...shadows.sm,
  },
  avatarHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  /* Cards */
  card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  cardBody: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: -spacing.xs },

  /* Champ lecture seule (téléphone) */
  readonlyField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  readonlyText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: `${colors.primary}12`,
  },
  verifyBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  readonlyHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 16,
  },

  /* Langue */
  langRow: { flexDirection: "row", gap: spacing.sm },
  langBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  langBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  langBtnTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },

  /* Genre */
  genreRow: { flexDirection: "column", gap: spacing.sm },
  genreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  genreBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  /* Bouton submit */
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg + 2,
    ...shadows.md,
  },
  submitBtnDisabled: { backgroundColor: colors.textMuted, shadowOpacity: 0 },
  submitBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});
