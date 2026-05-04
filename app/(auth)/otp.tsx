import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { authApi } from "@/src/api/endpoints/auth";
import { getErrorCode, getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii } from "@/src/theme";

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

export default function OtpScreen() {
  const { t } = useTranslation();
  const { telephone, context } = useLocalSearchParams<{ telephone: string; context?: string }>();
  const { showToast } = useToast();

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    if (val && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (next.every(Boolean)) {
      verify(next.join(""));
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const verify = async (fullCode: string) => {
    if (!telephone) return;
    setLoading(true);
    try {
      await authApi.verifyOtp({ telephone, code: fullCode });
      showToast("Téléphone vérifié ✓", "success");
      router.replace("/(auth)/login");
    } catch (e) {
      shake();
      setCode(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      const code = getErrorCode(e);
      if (code === "OTP_MAX_ATTEMPTS") {
        showToast(t("auth.otp.max_attempts"), "error");
      } else {
        showToast(t("auth.otp.invalid"), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!telephone) return;
    try {
      await authApi.sendOtp({ telephone });
      setCountdown(RESEND_COUNTDOWN);
      showToast("Code renvoyé", "info");
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← {t("common.back")}</Text>
      </Pressable>

      <Text style={styles.title}>{t("auth.otp.title")}</Text>
      <Text style={styles.subtitle}>
        {t("auth.otp.subtitle", { phone: telephone })}
      </Text>

      <Animated.View style={[styles.inputs, { transform: [{ translateX: shakeAnim }] }]}>
        {code.map((digit, i) => (
          <TextInput
            key={i}
            ref={(r) => { if (r) inputRefs.current[i] = r; }}
            style={[styles.input, digit ? styles.inputFilled : null]}
            value={digit}
            onChangeText={(v) => handleChange(v, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={i === 0}
          />
        ))}
      </Animated.View>

      {loading && (
        <Text style={styles.verifying}>Vérification...</Text>
      )}

      <Pressable onPress={countdown > 0 ? undefined : resend} disabled={countdown > 0}>
        <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
          {countdown > 0
            ? t("auth.otp.resend_in", { seconds: countdown })
            : t("auth.otp.resend")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
  inputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    textAlign: "center",
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputFilled: { borderColor: colors.primary, backgroundColor: colors.successBg },
  verifying: {
    textAlign: "center",
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  resendText: {
    textAlign: "center",
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  resendDisabled: { color: colors.textMuted },
});