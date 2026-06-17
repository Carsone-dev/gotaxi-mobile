import React, { useState } from "react";
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
import { useAuthStore } from "@/src/stores/authStore";
import { loginSchema, type LoginForm } from "@/src/utils/validators";
import { getErrorCode, getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { PhoneInput } from "@/src/components/ui/PhoneInput";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

// ── Logo GoTaxi ───────────────────────────────────────────────────────────────
function GoTaxiLogo() {
  return (
    <View style={logo.wrap}>
      {/* Icône */}
      <View style={logo.iconRing}>
        <View style={logo.iconInner}>
          <Ionicons name="car-sport" size={32} color={colors.primary} />
        </View>
        {/* Petit badge jaune */}
        <View style={logo.badge}>
          <Ionicons name="location-sharp" size={9} color={colors.primary} />
        </View>
      </View>

      {/* Texte */}
      <View style={logo.textRow}>
        <Text style={logo.go}>Go</Text>
        <Text style={logo.taxi}>Taxi</Text>
      </View>

      {/* Tagline */}
      <Text style={logo.tagline}>Votre taxi interurbain au Bénin</Text>
    </View>
  );
}

const logo = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10 },
  iconRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  textRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
  },
  go: {
    fontSize: 38,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  taxi: {
    fontSize: 38,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.yellow,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.3,
  },
});

// ── Écran connexion ───────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { telephone: "", password: "" },
  });

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
        <GoTaxiLogo />
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
          <Controller
            name="telephone"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <PhoneInput
                label={t("auth.login.phone_label")}
                value={value}
                onChangeText={onChange}
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
