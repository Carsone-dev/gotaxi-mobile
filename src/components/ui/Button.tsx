import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, typography, radii, spacing } from "@/src/theme";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  testID?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  onPress,
  children,
  style,
  leftIcon,
  rightIcon,
  testID,
}: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[`variant_${variant}` as keyof typeof styles] as ViewStyle,
        styles[`size_${size}` as keyof typeof styles] as ViewStyle,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}` as keyof typeof styles] as TextStyle,
              styles[`textSize_${size}` as keyof typeof styles] as TextStyle,
            ]}
          >
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },

  variant_primary: { backgroundColor: colors.primary },
  variant_secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  variant_ghost: { backgroundColor: "transparent" },
  variant_danger: { backgroundColor: colors.error },

  size_sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, minHeight: 36 },
  size_md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 48 },
  size_lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing["2xl"], minHeight: 56 },

  text: {
    fontFamily: typography.fontFamily.semiBold,
    textAlign: "center",
  },
  text_primary: { color: colors.white },
  text_secondary: { color: colors.primary },
  text_ghost: { color: colors.primary },
  text_danger: { color: colors.white },

  textSize_sm: { fontSize: typography.fontSize.sm },
  textSize_md: { fontSize: typography.fontSize.base },
  textSize_lg: { fontSize: typography.fontSize.lg },
});