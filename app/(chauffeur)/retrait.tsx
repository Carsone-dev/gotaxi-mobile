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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWithdraw, useWallet } from "@/src/hooks/useWallet";
import { formatFCFA } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { OperateurMM } from "@/src/api/types";

const OPERATEURS: {
  id: OperateurMM;
  label: string;
  logo: string;
  color: string;
  bg: string;
  hint: string;
}[] = [
  {
    id: "MTN_MOMO",
    label: "MTN MoMo",
    logo: "📱",
    color: colors.mtnYellow,
    bg: "#FFFBEA",
    hint: "Virement quasi-instantané via API",
  },
  {
    id: "ORANGE_MONEY",
    label: "Orange Money",
    logo: "🔶",
    color: colors.orangeOrange,
    bg: "#FFF3EB",
    hint: "Traitement manuel — sous 24h",
  },
  {
    id: "MOOV_MONEY",
    label: "Moov Money",
    logo: "💠",
    color: colors.moovBlue,
    bg: "#E8F9FF",
    hint: "Traitement manuel — sous 24h",
  },
  {
    id: "CELTIS",
    label: "Celtis",
    logo: "🔵",
    color: colors.celtisBlue,
    bg: "#E6F6FD",
    hint: "Virement automatique — mode test",
  },
  {
    id: "FEDAPAY",
    label: "FedaPay",
    logo: "💳",
    color: colors.fedapayPurple,
    bg: "#F3EEFF",
    hint: "Agrégateur — MTN, Moov, Orange",
  },
];

const MONTANTS_RAPIDES = [1000, 2000, 5000, 10000, 25000, 50000];

export default function ChauffeurRetraitScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { mutateAsync: withdraw, isPending } = useWithdraw();

  const [operateur, setOperateur] = useState<OperateurMM>("MTN_MOMO");
  const [montant, setMontant] = useState("");
  const [telephone, setTelephone] = useState("");

  const montantNum = parseInt(montant.replace(/\D/g, ""), 10) || 0;
  const solde = wallet?.solde ?? 0;
  const isValid = montantNum >= 500 && montantNum <= solde && telephone.trim().length >= 8;

  const opSelected = OPERATEURS.find((o) => o.id === operateur)!;

  const handleWithdraw = async () => {
    if (!isValid) return;
    try {
      const result = await withdraw({
        montant: montantNum,
        telephone: telephone.trim(),
        operateur,
      });
      showToast(result.message || "Demande de retrait envoyée avec succès.", "success");
      router.back();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 402) {
        showToast("Solde insuffisant ou paiement refusé.", "error");
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
          <Text style={styles.headerTitle}>Retrait de revenus</Text>
          <Text style={styles.headerSub}>Transférez vos gains vers Mobile Money</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Solde wallet */}
        <View style={styles.soldeCard}>
          {walletLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <View style={styles.soldeBadge}>
                <Ionicons name="wallet-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.soldeBadgeTxt}>Revenus disponibles</Text>
              </View>
              <Text style={styles.soldeAmount}>{formatFCFA(solde)}</Text>
              <Text style={styles.soldeNote}>
                Solde accumulé depuis vos voyages et livraisons
              </Text>
            </>
          )}
        </View>

        {/* Opérateur */}
        <Text style={styles.fieldLabel}>Opérateur de réception</Text>
        <View style={styles.opList}>
          {OPERATEURS.map((op) => {
            const active = operateur === op.id;
            return (
              <Pressable
                key={op.id}
                style={[
                  styles.opCard,
                  active && { borderColor: op.color, backgroundColor: op.bg },
                ]}
                onPress={() => setOperateur(op.id)}
              >
                <Text style={styles.opLogo}>{op.logo}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.opLabel,
                    active && { color: op.color, fontFamily: typography.fontFamily.bold },
                  ]}>
                    {op.label}
                  </Text>
                  <Text style={styles.opHint}>{op.hint}</Text>
                </View>
                <View style={[styles.opRadio, active && { borderColor: op.color }]}>
                  {active && <View style={[styles.opRadioDot, { backgroundColor: op.color }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Montants rapides */}
        <Text style={styles.fieldLabel}>Montant à retirer (XOF)</Text>
        <View style={styles.quickAmounts}>
          {MONTANTS_RAPIDES.map((m) => {
            const disabled = m > solde;
            return (
              <Pressable
                key={m}
                style={[
                  styles.quickBtn,
                  montantNum === m && styles.quickBtnActive,
                  disabled && styles.quickBtnDisabled,
                ]}
                onPress={() => !disabled && setMontant(String(m))}
                disabled={disabled}
              >
                <Text style={[
                  styles.quickBtnTxt,
                  montantNum === m && styles.quickBtnTxtActive,
                  disabled && styles.quickBtnTxtDisabled,
                ]}>
                  {m >= 1000 ? `${m / 1000}k` : m}
                </Text>
              </Pressable>
            );
          })}
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
        {montantNum > 0 && montantNum < 500 && (
          <Text style={styles.inputHintError}>Minimum : 500 FCFA</Text>
        )}
        {montantNum > solde && montantNum > 0 && (
          <Text style={styles.inputHintError}>Solde insuffisant</Text>
        )}

        {/* Téléphone */}
        <Text style={styles.fieldLabel}>Numéro Mobile Money de réception</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.amountInput, { fontSize: typography.fontSize.base }]}
            placeholder="+22961000000"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={telephone}
            onChangeText={setTelephone}
          />
        </View>
        <Text style={styles.fieldHint}>Numéro associé à votre compte {opSelected.label}</Text>

        {/* Récap */}
        {isValid && (
          <View style={styles.recap}>
            <Ionicons name="arrow-up-circle" size={16} color={colors.success} />
            <Text style={styles.recapTxt}>
              Retrait de{" "}
              <Text style={styles.recapBold}>{formatFCFA(montantNum)}</Text>
              {" "}vers {opSelected.label} · {telephone}
            </Text>
          </View>
        )}

        {/* Note délai Orange/Moov */}
        {operateur !== "MTN_MOMO" && operateur !== "CELTIS" && operateur !== "FEDAPAY" && (
          <View style={styles.delayNote}>
            <Ionicons name="time-outline" size={16} color={colors.warningText} />
            <Text style={styles.delayNoteTxt}>
              Les retraits {opSelected.label} sont traités manuellement sous 24 heures.
            </Text>
          </View>
        )}

        {/* Info MTN / Celtis / FedaPay */}
        {(operateur === "MTN_MOMO" || operateur === "CELTIS" || operateur === "FEDAPAY") && (
          <View style={styles.instantNote}>
            <Ionicons name="flash" size={16} color={colors.success} />
            <Text style={styles.instantNoteTxt}>
              Les retraits {opSelected.label} sont virés automatiquement — quasi-instantané.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, (!isValid || isPending) && styles.btnDisabled]}
          onPress={handleWithdraw}
          disabled={!isValid || isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="arrow-up-circle" size={20} color={colors.white} />
              <Text style={styles.submitBtnTxt}>Demander le retrait</Text>
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
    backgroundColor: colors.primaryDark,
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.md,
  },
  soldeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  soldeBadgeTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  soldeAmount: {
    fontSize: typography.fontSize["4xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  soldeNote: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 16,
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
    marginTop: -spacing.sm,
  },

  // Opérateurs
  opList: { gap: spacing.sm },
  opCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  opLogo: { fontSize: 28 },
  opLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  opHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  opRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  opRadioDot: { width: 10, height: 10, borderRadius: 5 },

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
    backgroundColor: `${colors.success}12`,
    borderColor: colors.success,
  },
  quickBtnDisabled: { opacity: 0.35 },
  quickBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  quickBtnTxtActive: { color: colors.success },
  quickBtnTxtDisabled: { color: colors.textMuted },

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

  // Recap
  recap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  recapTxt: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.success,
    lineHeight: 18,
  },
  recapBold: { fontFamily: typography.fontFamily.bold },

  // Notes
  delayNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  delayNoteTxt: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.warningText,
    lineHeight: 18,
  },
  instantNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  instantNoteTxt: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.success,
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
    backgroundColor: colors.success,
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
