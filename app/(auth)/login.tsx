import React, { useState } from "react";
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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/src/stores/authStore";
import { loginSchema, type LoginForm } from "@/src/utils/validators";
import { getErrorCode, getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing } from "@/src/theme";

export default function LoginScreen() {
  const { t } = useTranslation();
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
      router.replace(isChauffeurMode ? "/(chauffeur)/dashboard" : "/(client)/home");
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoLetter}>G</Text>
          </View>
          <Text style={styles.title}>{t("auth.login.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.login.subtitle")}</Text>
        </View>

        <View style={styles.form}>
          <Controller
            name="telephone"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.login.phone_label")}
                placeholder={t("auth.login.phone_placeholder")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.telephone?.message}
                keyboardType="phone-pad"
                autoComplete="tel"
                testID="phone-input"
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
                  <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
            )}
          />

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>{t("auth.login.forgot")}</Text>
          </Pressable>
        </View>

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

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>{t("common.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerHint}>{t("auth.login.no_account")} </Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.registerLink}>{t("auth.login.sign_up")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: 72,
    paddingBottom: 40,
    gap: spacing["3xl"],
  },
  header: { alignItems: "center", gap: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 40,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    lineHeight: 48,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  form: { gap: spacing.xl },
  forgotLink: { alignSelf: "flex-end" },
  forgotText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  eyeIcon: { fontSize: 18 },
  actions: { gap: spacing.xl },
  submitBtn: { width: "100%" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  registerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
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