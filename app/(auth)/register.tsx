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
import { authApi } from "@/src/api/endpoints/auth";
import { registerSchema, type RegisterForm } from "@/src/utils/validators";
import { getErrorCode, getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { PhoneInput } from "@/src/components/ui/PhoneInput";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing } from "@/src/theme";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { telephone: "", nom: "", prenom: "", password: "", email: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authApi.register({
        telephone: data.telephone,
        nom: data.nom,
        prenom: data.prenom,
        password: data.password,
        email: data.email || undefined,
      });
      showToast(t("auth.register.success"), "success");
      router.replace("/(auth)/login");
    } catch (e) {
      const code = getErrorCode(e);
      if (code === "PHONE_ALREADY_EXISTS") {
        showToast(t("auth.register.phone_exists"), "error");
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t("common.back")}</Text>
          </Pressable>
          <Text style={styles.title}>{t("auth.register.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.register.subtitle")}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <Controller
              name="prenom"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t("auth.register.prenom_label")}
                  placeholder="Marc"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.prenom?.message}
                  containerStyle={styles.halfInput}
                  autoCapitalize="words"
                />
              )}
            />
            <Controller
              name="nom"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t("auth.register.nom_label")}
                  placeholder="Koffi"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.nom?.message}
                  containerStyle={styles.halfInput}
                  autoCapitalize="words"
                />
              )}
            />
          </View>

          <Controller
            name="telephone"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <PhoneInput
                label={t("auth.register.phone_label")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.telephone?.message}
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.register.email_label")}
                placeholder="marc@example.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.register.password_label")}
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                hint="Minimum 8 caractères"
                rightIcon={<Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>}
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
            )}
          />
        </View>

        <View style={styles.actions}>
          <Button size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} style={styles.submitBtn}>
            {t("auth.register.submit")}
          </Button>
          <View style={styles.loginRow}>
            <Text style={styles.loginHint}>{t("auth.register.has_account")} </Text>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.loginLink}>{t("auth.register.sign_in")}</Text>
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
    paddingTop: 56,
    paddingBottom: 40,
    gap: spacing["2xl"],
  },
  header: { gap: spacing.md },
  backBtn: { alignSelf: "flex-start", marginBottom: spacing.sm },
  backText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
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
  row: { flexDirection: "row", gap: spacing.md },
  halfInput: { flex: 1 },
  eyeIcon: { fontSize: 18 },
  actions: { gap: spacing.xl },
  submitBtn: { width: "100%" },
  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  loginHint: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});