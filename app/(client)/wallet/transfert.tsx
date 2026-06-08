import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTransfer, useWallet } from "@/src/hooks/useWallet";
import { formatFCFA } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

const MONTANTS_RAPIDES = [500, 1000, 2000, 5000, 10000, 25000];

export default function TransfertScreen() {
  const { showToast } = useToast();
  const { data: wallet } = useWallet();
  const { mutateAsync: transfer, isPending } = useTransfer();

  const [telephone, setTelephone] = useState("");
  const [montant, setMontant] = useState("");

  const montantNum = parseInt(montant.replace(/\D/g, ""), 10) || 0;
  const solde = wallet?.solde ?? 0;
  const isValid =
    telephone.trim().length >= 8 &&
    montantNum >= 100 &&
    montantNum <= solde;

  const handleTransfer = async () => {
    if (!isValid) return;
    try {
      const result = await transfer({
        destinataire_telephone: telephone.trim(),
        montant: montantNum,
      });
      showToast(result.message || "Transfert effectué avec succès !", "success");
      router.back();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 402) {
        showToast("Solde insuffisant.", "error");
      } else if (status === 404) {
        showToast("Destinataire introuvable — vérifiez le numéro.", "error");
      } else {
        showToast(getErrorMessage(e), "error");
      }
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backBtnArrow}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Transfert wallet</Text>
          <Text style={styles.headerSub}>Vers un autre compte GoTaxi</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Solde dispo */}
        <View style={styles.soldeCard}>
          <View style={styles.soldeLeft}>
            <Text style={styles.soldeLabel}>Solde disponible</Text>
            <Text style={styles.soldeAmount}>{formatFCFA(solde)}</Text>
          </View>
          <View style={styles.soldeIconWrap}>
            <Ionicons name="swap-horizontal" size={28} color={colors.info} />
          </View>
        </View>

        {/* Destinataire */}
        <Text style={styles.fieldLabel}>Numéro GoTaxi du destinataire</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-circle-outline" size={22} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: spacing.sm }]}
            placeholder="+22961000000"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={telephone}
            onChangeText={setTelephone}
            autoComplete="tel"
          />
        </View>
        <Text style={styles.fieldHint}>
          Le destinataire doit avoir un compte GoTaxi actif
        </Text>

        {/* Montants rapides */}
        <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Montant (XOF)</Text>
        <View style={styles.quickAmounts}>
          {MONTANTS_RAPIDES.map((m) => (
            <Pressable
              key={m}
              style={[styles.quickBtn, montantNum === m && styles.quickBtnActive]}
              onPress={() => setMontant(String(m))}
            >
              <Text style={[styles.quickBtnTxt, montantNum === m && styles.quickBtnTxtActive]}>
                {m >= 1000 ? `${m / 1000}k` : m}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Saisie libre */}
        <View style={[styles.inputWrap, montantNum > solde && styles.inputError]}>
          <TextInput
            style={styles.amountInput}
            placeholder="Ou saisir un montant"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={montant}
            onChangeText={(v) => setMontant(v.replace(/\D/g, ""))}
          />
          <Text style={styles.inputSuffix}>FCFA</Text>
        </View>
        {montantNum > 0 && montantNum < 100 && (
          <Text style={styles.inputHintError}>Minimum : 100 FCFA</Text>
        )}
        {montantNum > solde && montantNum > 0 && (
          <Text style={styles.inputHintError}>Solde insuffisant</Text>
        )}

        {/* Récapitulatif */}
        {isValid && (
          <View style={styles.recap}>
            <Ionicons name="checkmark-circle" size={16} color={colors.info} />
            <Text style={styles.recapTxt}>
              Transfert de{" "}
              <Text style={styles.recapBold}>{formatFCFA(montantNum)}</Text>
              {" "}vers{" "}
              <Text style={styles.recapBold}>{telephone}</Text>
            </Text>
          </View>
        )}

        {/* Avertissement */}
        <View style={styles.infoNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.info} />
          <Text style={styles.infoNoteTxt}>
            Le transfert est instantané et irréversible. Vérifiez bien le numéro du destinataire avant de confirmer.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, (!isValid || isPending) && styles.btnDisabled]}
          onPress={handleTransfer}
          disabled={!isValid || isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="swap-horizontal" size={20} color={colors.white} />
              <Text style={styles.submitBtnTxt}>Confirmer le transfert</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PT = Platform.OS === "ios" ? 56 : 40;
const PB = Platform.OS === "ios" ? 36 : 24;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  backBtnArrow: { fontSize: 20, color: colors.primary, lineHeight: 24 },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },

  content: { padding: spacing["2xl"], paddingBottom: 120, gap: spacing.lg },

  // Solde card
  soldeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.infoBg,
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: `${colors.info}25`,
    ...shadows.sm,
  },
  soldeLeft: { flex: 1, gap: spacing.xs },
  soldeLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.info,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  soldeAmount: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
  },
  soldeIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: `${colors.info}18`,
    alignItems: "center", justifyContent: "center",
  },

  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: -spacing.xs,
  },
  fieldHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },

  // Input
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  inputError: { borderColor: colors.error },
  input: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  amountInput: {
    flex: 1,
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  inputSuffix: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
  },
  inputHintError: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.error,
    marginTop: -spacing.sm,
  },

  // Montants rapides
  quickAmounts: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  quickBtnActive: {
    backgroundColor: `${colors.info}12`,
    borderColor: colors.info,
  },
  quickBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  quickBtnTxtActive: { color: colors.info },

  // Recap
  recap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.info}10`,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.info}20`,
  },
  recapTxt: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.info,
    lineHeight: 18,
  },
  recapBold: { fontFamily: typography.fontFamily.bold },

  // Info note
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  infoNoteTxt: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.warningText,
    lineHeight: 18,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: PB,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.info,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
  },
  submitBtnTxt: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  btnDisabled: { opacity: 0.45 },
});
