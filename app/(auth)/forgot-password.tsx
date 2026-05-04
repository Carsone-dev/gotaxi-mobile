import React from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { authApi } from "@/src/api/endpoints/auth";
import { phoneSchema } from "@/src/utils/validators";
import { getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing } from "@/src/theme";

const schema = z.object({ telephone: phoneSchema });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await authApi.forgotPassword({ telephone: data.telephone });
      showToast("Code envoyé si ce numéro est enregistré", "info");
      router.push({
        pathname: "/(auth)/reset-password",
        params: { telephone: data.telephone },
      });
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t("common.back")}</Text>
        </Pressable>

        <Text style={styles.title}>{t("auth.forgot_password.title")}</Text>
        <Text style={styles.subtitle}>{t("auth.forgot_password.subtitle")}</Text>

        <Controller
          name="telephone"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t("auth.login.phone_label")}
              placeholder="+22901000000"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.telephone?.message}
              keyboardType="phone-pad"
              autoFocus
            />
          )}
        />

        <Button size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} style={styles.btn}>
          {t("auth.forgot_password.submit")}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
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
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  btn: { width: "100%" },
});