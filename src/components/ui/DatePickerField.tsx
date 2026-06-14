import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  ViewStyle,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors, typography, spacing, radii } from "@/src/theme";

function toDate(value: string): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDisplay(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DatePickerFieldProps {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = "Sélectionner une date",
  containerStyle,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  // Temporary date while the iOS picker is open (confirm on "OK")
  const [tempDate, setTempDate] = useState<Date>(toDate(value));

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setOpen(false);
      if (_event.type === "set" && selected) {
        onChange(toISODate(selected));
      }
    } else {
      if (selected) setTempDate(selected);
    }
  };

  const handleIOSConfirm = () => {
    onChange(toISODate(tempDate));
    setOpen(false);
  };

  const handleOpen = () => {
    setTempDate(toDate(value));
    setOpen(true);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        style={styles.field}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={label ?? "Sélectionner une date"}
      >
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </Pressable>

      {/* Android: picker renders as a native dialog, no wrapper needed */}
      {Platform.OS === "android" && open && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* iOS: wrap in a modal for clean presentation */}
      {Platform.OS === "ios" && (
        <Modal visible={open} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.cancelText}>Annuler</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>{label ?? "Sélectionner une date"}</Text>
                <Pressable onPress={handleIOSConfirm}>
                  <Text style={styles.confirmText}>OK</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale="fr-FR"
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  fieldText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  placeholder: { color: colors.textMuted },
  calendarIcon: { fontSize: 18 },

  // iOS modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  cancelText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  confirmText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  iosPicker: { width: "100%" },
});
