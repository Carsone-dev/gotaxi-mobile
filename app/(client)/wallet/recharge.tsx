import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRechargeInitiate, useWalletActivity, useWallet } from "@/src/hooks/useWallet";
import { useRechargeConfirm } from "@/src/hooks/useWallet";
import { formatFCFA } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { OperateurMM } from "@/src/api/types";

// ── Config opérateurs ─────────────────────────────────────────────────────────
const OPERATEURS: { id: OperateurMM; label: string; sublabel?: string; logo: string; color: string; bg: string }[] = [
  { id: "FEDAPAY",      label: "FedaPay",      sublabel: "MTN · Moov · Orange", logo: "💳", color: colors.fedapayPurple, bg: "#F3EEFF" },
  { id: "MTN_MOMO",     label: "MTN MoMo",     logo: "📱", color: colors.mtnYellow,    bg: "#FFFBEA" },
  { id: "ORANGE_MONEY", label: "Orange Money", logo: "🔶", color: colors.orangeOrange, bg: "#FFF3EB" },
  { id: "MOOV_MONEY",   label: "Moov Money",   logo: "💠", color: colors.moovBlue,     bg: "#E8F9FF" },
  { id: "CELTIS",       label: "Celtis",       logo: "🔵", color: colors.celtisBlue,   bg: "#E6F6FD" },
];

const MONTANTS_RAPIDES = [1000, 2000, 5000, 10000, 25000, 50000];

// ── Phase 2 — confirmation ────────────────────────────────────────────────────
function ConfirmationStep({
  operateur,
  message,
  paymentUrl,
  onBack,
}: {
  operateur: OperateurMM;
  message: string;
  paymentUrl?: string;
  onBack: () => void;
}) {
  const { showToast } = useToast();
  const { mutateAsync: confirm, isPending } = useRechargeConfirm();
  const { data: activity } = useWalletActivity(1);

  const handleConfirm = async () => {
    const pending = activity?.items.find((t) => t.statut === "EN_ATTENTE");
    if (!pending) {
      showToast("Aucune transaction en attente trouvée. Attendez quelques secondes.", "info");
      return;
    }
    try {
      const wallet = await confirm(pending.id);
      showToast(`Recharge confirmée ! Nouveau solde : ${formatFCFA(wallet.solde)}`, "success");
      router.back();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 202) {
        showToast("Paiement encore en cours — réessayez dans 10–15 secondes.", "info");
      } else if (status === 402) {
        showToast("Paiement refusé ou échoué côté opérateur.", "error");
      } else {
        showToast(getErrorMessage(e), "error");
      }
    }
  };

  const isFedaPay = operateur === "FEDAPAY";
  const opCfg = OPERATEURS.find((o) => o.id === operateur)!;

  return (
    <View style={styles.confirmContainer}>
      {/* Badge opérateur */}
      <View style={[styles.confirmOpBadge, { backgroundColor: opCfg.bg }]}>
        <Text style={styles.confirmOpLogo}>{opCfg.logo}</Text>
        <View>
          <Text style={[styles.confirmOpLabel, { color: opCfg.color }]}>{opCfg.label}</Text>
          {opCfg.sublabel && (
            <Text style={[styles.confirmOpSublabel, { color: opCfg.color }]}>{opCfg.sublabel}</Text>
          )}
        </View>
      </View>

      {/* Message backend */}
      <View style={styles.confirmMsgCard}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={styles.confirmMsg}>{message}</Text>
      </View>

      {/* Bouton FedaPay — ouvrir le lien de paiement */}
      {isFedaPay && paymentUrl ? (
        <Pressable
          style={({ pressed }) => [styles.fedapayBtn, pressed && { opacity: 0.85 }]}
          onPress={() => Linking.openURL(paymentUrl)}
        >
          <Ionicons name="open-outline" size={20} color={colors.white} />
          <Text style={styles.fedapayBtnTxt}>Ouvrir la page de paiement FedaPay</Text>
        </Pressable>
      ) : null}

      {/* Instructions */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>Que faire maintenant ?</Text>
        {isFedaPay ? (
          <>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumTxt}>1</Text></View>
              <Text style={styles.stepTxt}>Appuyez sur « Ouvrir la page de paiement FedaPay » ci-dessus</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumTxt}>2</Text></View>
              <Text style={styles.stepTxt}>Choisissez votre opérateur (MTN, Moov, Orange…) et confirmez</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumTxt}>3</Text></View>
              <Text style={styles.stepTxt}>Revenez ici et appuyez sur « Vérifier le paiement »</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumTxt}>1</Text></View>
              <Text style={styles.stepTxt}>Confirmez le paiement sur votre téléphone Mobile Money</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumTxt}>2</Text></View>
              <Text style={styles.stepTxt}>Revenez ici et appuyez sur « Vérifier le paiement »</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumTxt}>3</Text></View>
              <Text style={styles.stepTxt}>Votre solde est mis à jour instantanément</Text>
            </View>
          </>
        )}
      </View>

      {/* Vérifier */}
      <Pressable
        style={({ pressed }) => [styles.confirmBtn, isPending && styles.btnDisabled, pressed && { opacity: 0.85 }]}
        onPress={handleConfirm}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            <Text style={styles.confirmBtnTxt}>Vérifier le paiement</Text>
          </>
        )}
      </Pressable>

      <Pressable style={styles.backLink} onPress={onBack}>
        <Text style={styles.backLinkTxt}>← Recommencer</Text>
      </Pressable>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function RechargeScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { mutateAsync: initiate, isPending } = useRechargeInitiate();

  const [operateur, setOperateur] = useState<OperateurMM>("MTN_MOMO");
  const [montant, setMontant] = useState("");
  const [telephone, setTelephone] = useState("");

  // Phase 2 après initiation
  const [phase, setPhase] = useState<"form" | "confirm">("form");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmPaymentUrl, setConfirmPaymentUrl] = useState<string | undefined>();

  const montantNum = parseInt(montant.replace(/\D/g, ""), 10) || 0;
  // FedaPay ne demande pas de numéro de téléphone dans le formulaire (géré côté checkout)
  const phoneRequired = operateur !== "FEDAPAY";
  const isValid = montantNum >= 500 && montantNum <= 1_000_000 &&
    (!phoneRequired || telephone.trim().length >= 8);

  const handleInitiate = async () => {
    if (!isValid) return;
    try {
      const result = await initiate({
        montant: montantNum,
        operateur,
        telephone: telephone.trim(),
      });
      setConfirmMsg(result.message);
      setConfirmPaymentUrl(result.payment_url);
      setPhase("confirm");
    } catch (e) {
      showToast(getErrorMessage(e), "error");
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
          <Text style={styles.headerTitle}>Recharger le wallet</Text>
          <Text style={styles.headerSub}>Via Mobile Money</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {phase === "confirm" ? (
          <ConfirmationStep
            operateur={operateur}
            message={confirmMsg}
            paymentUrl={confirmPaymentUrl}
            onBack={() => setPhase("form")}
          />
        ) : (
          <>
            {/* Opérateur */}
            <Text style={styles.fieldLabel}>Opérateur Mobile Money</Text>
            <View style={styles.opRow}>
              {OPERATEURS.map((op) => {
                const active = operateur === op.id;
                return (
                  <Pressable
                    key={op.id}
                    style={[
                      styles.opCard,
                      { borderColor: active ? op.color : colors.border },
                      active && { backgroundColor: op.bg },
                    ]}
                    onPress={() => setOperateur(op.id)}
                  >
                    <Text style={styles.opLogo}>{op.logo}</Text>
                    <Text style={[styles.opLabel, active && { color: op.color, fontFamily: typography.fontFamily.bold }]}>
                      {op.label}
                    </Text>
                    {active && (
                      <View style={[styles.opCheck, { backgroundColor: op.color }]}>
                        <Ionicons name="checkmark" size={10} color={colors.white} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Montants rapides */}
            <Text style={styles.fieldLabel}>Montant (XOF)</Text>
            <View style={styles.quickAmounts}>
              {MONTANTS_RAPIDES.map((m) => (
                <Pressable
                  key={m}
                  style={[
                    styles.quickBtn,
                    montantNum === m && styles.quickBtnActive,
                  ]}
                  onPress={() => setMontant(String(m))}
                >
                  <Text style={[styles.quickBtnTxt, montantNum === m && styles.quickBtnTxtActive]}>
                    {m >= 1000 ? `${m / 1000}k` : m}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Saisie manuelle */}
            <View style={styles.inputWrap}>
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
              <Text style={styles.inputHint}>Minimum : 500 FCFA</Text>
            )}
            {montantNum > 1_000_000 && (
              <Text style={styles.inputHint}>Maximum : 1 000 000 FCFA</Text>
            )}

            {/* Téléphone Mobile Money — masqué pour FedaPay */}
            {operateur !== "FEDAPAY" ? (
              <>
                <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                  Numéro Mobile Money
                </Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.amountInput, { flex: 1 }]}
                    placeholder="+22961000000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={telephone}
                    onChangeText={setTelephone}
                  />
                </View>
                <Text style={styles.fieldHint}>Numéro associé à votre compte Mobile Money</Text>
              </>
            ) : (
              <View style={styles.fedapayNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.fedapayPurple} />
                <Text style={styles.fedapayNoteTxt}>
                  Vous choisirez votre opérateur (MTN, Moov, Orange…) directement sur la page FedaPay après avoir validé le montant.
                </Text>
              </View>
            )}

            {/* Récapitulatif */}
            {isValid && (
              <View style={styles.recap}>
                <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                <Text style={styles.recapTxt}>
                  Recharge de <Text style={styles.recapBold}>{formatFCFA(montantNum)}</Text> via {OPERATEURS.find((o) => o.id === operateur)?.label}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      {phase === "form" && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.submitBtn, (!isValid || isPending) && styles.btnDisabled]}
            onPress={handleInitiate}
            disabled={!isValid || isPending}
          >
            {isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="arrow-down-circle" size={20} color={colors.white} />
                <Text style={styles.submitBtnTxt}>Initier la recharge</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
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
  headerTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  headerSub: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted, marginTop: 2 },

  content: { padding: spacing["2xl"], paddingBottom: 120, gap: spacing.md },

  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Opérateurs
  opRow: { flexDirection: "row", gap: spacing.sm },
  opCard: {
    flex: 1, borderRadius: radii.xl,
    borderWidth: 2, borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: "center", gap: 6,
    backgroundColor: colors.white,
    position: "relative",
  },
  opLogo: { fontSize: 24 },
  opLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, textAlign: "center" },
  opCheck: {
    position: "absolute", top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
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
  quickBtnActive: { backgroundColor: `${colors.primary}12`, borderColor: colors.primary },
  quickBtnTxt: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary },
  quickBtnTxtActive: { color: colors.primary },

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
  inputHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.error,
    marginTop: -spacing.xs,
  },
  fieldHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },

  // Recap
  recap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  recapTxt: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.primary, lineHeight: 18 },
  recapBold: { fontFamily: typography.fontFamily.bold },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
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
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
  },
  submitBtnTxt: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.white },
  btnDisabled: { opacity: 0.45 },

  // Note FedaPay dans le formulaire
  fedapayNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "#F3EEFF",
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  fedapayNoteTxt: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.fedapayPurple,
    lineHeight: 18,
  },

  // Phase 2 confirm
  confirmContainer: { gap: spacing.lg },
  confirmOpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignSelf: "flex-start",
  },
  confirmOpLogo: { fontSize: 32 },
  confirmOpLabel: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold },
  confirmOpSublabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, opacity: 0.75 },

  // Bouton ouvrir FedaPay
  fedapayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.fedapayPurple,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    ...shadows.md,
  },
  fedapayBtnTxt: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.white },
  confirmMsgCard: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: colors.infoBg,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  confirmMsg: { flex: 1, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular, color: colors.info, lineHeight: 22 },

  stepsCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.sm,
  },
  stepsTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  stepNumTxt: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: colors.white },
  stepTxt: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, lineHeight: 20 },

  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    ...shadows.md,
  },
  confirmBtnTxt: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.white },

  backLink: { alignItems: "center", paddingVertical: spacing.md },
  backLinkTxt: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium, color: colors.textMuted },
});
