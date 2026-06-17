import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useAuthStore, LAST_PHONE_KEY } from "@/src/stores/authStore";
import { loginSchema, type LoginForm } from "@/src/utils/validators";
import { getErrorCode, getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { PhoneInput } from "@/src/components/ui/PhoneInput";
import { useToast } from "@/src/components/common/Toast";
import { GoTaxiLogo } from "@/src/components/common/GoTaxiLogo";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

// ── Écran connexion ───────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { telephone: "", password: "" },
  });

  // Pré-remplir le téléphone sauvegardé au montage
  useEffect(() => {
    AsyncStorage.getItem(LAST_PHONE_KEY).then((phone) => {
      if (phone) {
        setSavedPhone(phone);
        setValue("telephone", phone);
      }
    });
  }, [setValue]);

  const clearSavedPhone = async () => {
    await AsyncStorage.removeItem(LAST_PHONE_KEY);
    setSavedPhone(null);
    setValue("telephone", "");
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.telephone, data.password);
      const { isChauffeurMode } = useAuthStore.getState();
      if (isChauffeurMode) {
        router.replace("/(chauffeur)/dashboard");
      } else {
        const pendingVoyageId = await AsyncStorage.getItem("@pending_voyage_id");
        if (pendingVoyageId) {
          await AsyncStorage.removeItem("@pending_voyage_id");
          router.replace(`/(client)/voyages/${pendingVoyageId}` as any);
        } else {
          router.replace("/(client)/home");
        }
      }
    } catch (e) {
      const code = getErrorCode(e);
      if (code === "INVALID_CREDENTIALS") {
        showToast(t("auth.login.invalid_credentials"), "error");
      } else if (code === "ACCOUNT_SUSPENDED") {
        showToast(t("auth.login.account_suspended"), "error");
      } else {
        showToast(getErrorMessage(e), "error");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Hero vert ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 36 }]}>
        {/* Cercles décoratifs */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />
        <View style={styles.deco3} />
        <GoTaxiLogo size="md" showTagline />
      </View>

      {/* ── Card blanche ── */}
      <ScrollView
        style={styles.card}
        contentContainerStyle={[styles.cardContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête card */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Bon retour ! 👋</Text>
          <Text style={styles.cardSub}>Connectez-vous à votre compte</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Bannière compte mémorisé */}
          {savedPhone ? (
            <View style={styles.savedBanner}>
              <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.savedText} numberOfLines={1}>
                Compte mémorisé
              </Text>
              <Pressable onPress={clearSavedPhone} hitSlop={8} style={styles.savedClear}>
                <Text style={styles.savedClearText}>Changer de compte</Text>
              </Pressable>
            </View>
          ) : null}

          <Controller
            name="telephone"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <PhoneInput
                label={t("auth.login.phone_label")}
                value={value}
                onChangeText={(v) => { onChange(v); if (savedPhone) setSavedPhone(null); }}
                onBlur={onBlur}
                error={errors.telephone?.message}
              />
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.login.password_label")}
                placeholder={t("auth.login.password_placeholder")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                autoComplete="password"
                testID="password-input"
                rightIcon={
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                }
                onRightIconPress={() => setShowPassword((v) => !v)}
              />
            )}
          />

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            style={styles.forgotLink}
            hitSlop={8}
          >
            <Text style={styles.forgotText}>{t("auth.login.forgot")}</Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            testID="login-button"
            size="lg"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitBtn}
          >
            {t("auth.login.submit")}
          </Button>

          {/* Séparateur */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>{t("common.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Inscription */}
          <View style={styles.registerRow}>
            <Text style={styles.registerHint}>{t("auth.login.no_account")} </Text>
            <Pressable onPress={() => router.push("/(auth)/register")} hitSlop={8}>
              <Text style={styles.registerLink}>{t("auth.login.sign_up")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },

  /* Hero */
  hero: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: 48,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  deco1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -80,
    right: -80,
  },
  deco2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -20,
    left: -50,
  },
  deco3: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(0,0,0,0.08)",
    top: 30,
    left: 20,
  },

  /* Card blanche */
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    ...shadows.lg,
  },
  cardContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    gap: spacing["2xl"],
  },

  /* En-tête card */
  cardHeader: { gap: spacing.xs },
  cardTitle: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  /* Formulaire */
  form: { gap: spacing.lg },

  /* Bannière compte mémorisé */
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  savedText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
  savedClear: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: `${colors.primary}18`,
  },
  savedClearText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  forgotLink: { alignSelf: "flex-end" },
  forgotText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  /* Actions */
  actions: { gap: spacing.xl },
  submitBtn: { width: "100%" },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerHint: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});
