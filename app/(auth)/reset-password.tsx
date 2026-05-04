import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { authApi } from "@/src/api/endpoints/auth";
import { resetPasswordSchema, type ResetPasswordForm } from "@/src/utils/validators";
import { getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing } from "@/src/theme";

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { telephone } = useLocalSearchParams<{ telephone: string }>();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!telephone) return;
    try {
      await authApi.resetPassword({ telephone, code: data.code, new_password: data.new_password });
      showToast(t("auth.reset_password.success"), "success");
      router.replace("/(auth)/login");
    } catch (e) {
      showToast(getErrorMessage(e), "error");
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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t("common.back")}</Text>
        </Pressable>

        <Text style={styles.title}>{t("auth.reset_password.title")}</Text>

        <Controller
          name="code"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t("auth.reset_password.code_label")}
              placeholder="123456"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.code?.message}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          )}
        />

        <Controller
          name="new_password"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t("auth.reset_password.new_password_label")}
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.new_password?.message}
              secureTextEntry={!showPassword}
              hint="Minimum 8 caractères"
              rightIcon={<Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
          )}
        />

        <Button size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} style={styles.btn}>
          {t("auth.reset_password.submit")}
        </Button>
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
  backBtn: { alignSelf: "flex-start" },
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
  eyeIcon: { fontSize: 18 },
  btn: { width: "100%" },
});