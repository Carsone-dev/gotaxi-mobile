import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  FlatList,
  Pressable,
  StyleSheet,
  ViewStyle,
  SafeAreaView,
} from "react-native";
import { colors, typography, spacing, radii } from "@/src/theme";

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "BJ", name: "Bénin", dialCode: "+229", flag: "🇧🇯" },
  { code: "TG", name: "Togo", dialCode: "+228", flag: "🇹🇬" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "CM", name: "Cameroun", dialCode: "+237", flag: "🇨🇲" },
  { code: "SN", name: "Sénégal", dialCode: "+221", flag: "🇸🇳" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
  { code: "NE", name: "Niger", dialCode: "+227", flag: "🇳🇪" },
  { code: "GN", name: "Guinée", dialCode: "+224", flag: "🇬🇳" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", dialCode: "+32", flag: "🇧🇪" },
  { code: "US", name: "États-Unis", dialCode: "+1", flag: "🇺🇸" },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Bénin

function parsePhone(value: string): { country: Country; localNumber: string } {
  if (!value) return { country: DEFAULT_COUNTRY, localNumber: "" };
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (value.startsWith(c.dialCode)) {
      return { country: c, localNumber: value.slice(c.dialCode.length) };
    }
  }
  return { country: DEFAULT_COUNTRY, localNumber: "" };
}

interface PhoneInputProps {
  label?: string;
  value?: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  containerStyle?: ViewStyle;
}

export function PhoneInput({
  label,
  value = "",
  onChangeText,
  onBlur,
  error,
  containerStyle,
}: PhoneInputProps) {
  const initialParsed = useMemo(() => parsePhone(value), []);
  const [selectedCountry, setSelectedCountry] = useState<Country>(initialParsed.country);
  const [localNumber, setLocalNumber] = useState(initialParsed.localNumber);
  const [focused, setFocused] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const internalValueRef = useRef(initialParsed.country.dialCode + initialParsed.localNumber);

  // Sync if form resets the value externally (e.g., reset())
  if (value !== internalValueRef.current) {
    const p = parsePhone(value);
    setSelectedCountry(p.country);
    setLocalNumber(p.localNumber);
    internalValueRef.current = value;
  }

  const handleCountrySelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country);
      setModalVisible(false);
      setSearch("");
      const assembled = country.dialCode + localNumber;
      internalValueRef.current = assembled;
      onChangeText(assembled);
    },
    [localNumber, onChangeText],
  );

  const handleLocalNumberChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, "");
      setLocalNumber(digits);
      const assembled = selectedCountry.dialCode + digits;
      internalValueRef.current = assembled;
      onChangeText(assembled);
    },
    [selectedCountry, onChangeText],
  );

  const filtered = useMemo(
    () =>
      search.trim()
        ? COUNTRIES.filter(
            (c) =>
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.dialCode.includes(search),
          )
        : COUNTRIES,
    [search],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        <Pressable
          style={styles.countryPicker}
          onPress={() => setModalVisible(true)}
          accessibilityLabel="Sélectionner le pays"
          accessibilityRole="button"
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          style={styles.input}
          value={localNumber}
          onChangeText={handleLocalNumberChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          keyboardType="number-pad"
          placeholder="01 00 00 00 00"
          placeholderTextColor={colors.textMuted}
          autoComplete="tel"
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setSearch("");
        }}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sélectionner un pays</Text>
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  setSearch("");
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.searchWrapper}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un pays..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                clearButtonMode="while-editing"
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.countryRow,
                    item.code === selectedCountry.code && styles.countryRowSelected,
                  ]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={styles.rowFlag}>{item.flag}</Text>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowDialCode}>{item.dialCode}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </SafeAreaView>
        </View>
      </Modal>
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
    letterSpacing: typography.letterSpacing.wide,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
    overflow: "hidden",
  },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.error },
  countryPicker: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    minWidth: 90,
  },
  flag: { fontSize: 20 },
  dialCode: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.error,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    maxHeight: "80%",
    paddingBottom: spacing["2xl"],
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    fontSize: 16,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.medium,
  },
  searchWrapper: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  countryRowSelected: {
    backgroundColor: colors.successBg,
  },
  rowFlag: { fontSize: 22, width: 30, textAlign: "center" },
  rowName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  rowDialCode: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.surface,
    marginHorizontal: spacing["2xl"],
  },
});
