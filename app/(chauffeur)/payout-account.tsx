import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  usePayoutAccount,
  useUpsertPayoutAccount,
  useDeletePayoutAccount,
} from "@/src/hooks/usePayoutAccount";
import { useToast } from "@/src/components/common/Toast";
import { getErrorMessage } from "@/src/utils/error-handler";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { PayoutOperateur } from "@/src/api/types";

// ─── Config opérateurs ────────────────────────────────────────────────────────

interface OperateurCfg {
  label: string;
  logo: string;
  color: string;
  bg: string;
  hint: string;
}

const OPERATEURS: Record<PayoutOperateur, OperateurCfg> = {
  FEDAPAY: {
    label: "FedaPay",
    logo: "💜",
    color: colors.fedapayPurple,
    bg: "#F3EBF9",
    hint: "Ex: +22961234567",
  },
  MTN_MOMO: {
    label: "MTN MoMo",
    logo: "💛",
    color: colors.mtnYellow,
    bg: "#FEFAEC",
    hint: "Ex: 22961234567",
  },
  MOOV_MONEY: {
    label: "Moov Money",
    logo: "🔵",
    color: colors.moovBlue,
    bg: "#EAF6FB",
    hint: "Ex: 22996123456",
  },
  ORANGE_MONEY: {
    label: "Orange Money",
    logo: "🟠",
    color: colors.orangeOrange,
    bg: "#FFF3EA",
    hint: "Ex: 22997123456",
  },
  CELTIS: {
    label: "Celtiis",
    logo: "🔷",
    color: colors.celtisBlue,
    bg: "#EAF5FB",
    hint: "Ex: 22990123456",
  },
};

const OP_LIST = Object.keys(OPERATEURS) as PayoutOperateur[];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PayoutAccountScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const { data: compte, isLoading, error } = usePayoutAccount();
  const { mutateAsync: upsert, isPending: saving } = useUpsertPayoutAccount();
  const { mutateAsync: remove, isPending: deleting } = useDeletePayoutAccount();

  const [selectedOp, setSelectedOp] = useState<PayoutOperateur>("FEDAPAY");
  const [telephone, setTelephone] = useState("");
  const [editing, setEditing] = useState(false);

  const hasAccount = !!compte;

  useEffect(() => {
    if (compte) {
      setSelectedOp(compte.operateur);
      setTelephone(compte.telephone);
    }
  }, [compte]);

  const handleSave = async () => {
    if (!telephone.trim() || telephone.trim().length < 8) {
      showToast("Numéro de téléphone invalide", "error");
      return;
    }
    try {
      await upsert({ operateur: selectedOp, telephone: telephone.trim() });
      showToast("Compte payout enregistré", "success");
      setEditing(false);
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer le compte payout",
      "Les prochains paiements seront crédités sur votre wallet GoTaxi. Confirmer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await remove();
              showToast("Compte payout supprimé", "info");
              setEditing(false);
              setTelephone("");
              setSelectedOp("FEDAPAY");
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ]
    );
  };

  const cfg = OPERATEURS[selectedOp];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Compte de paiement</Text>
          <Text style={styles.headerSub}>Recevez vos revenus directement</Text>
        </View>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerTitle}>Comment ça marche ?</Text>
        <Text style={styles.infoBannerText}>
          Configurez votre numéro Mobile Money ou FedaPay. À la fin de chaque voyage
          ou livraison de colis, les frais sont automatiquement envoyés sur ce compte.
          Sans configuration, les revenus sont crédités sur votre wallet GoTaxi.
        </Text>
      </View>

      {/* État chargement */}
      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}

      {/* Compte actif (lecture seule) */}
      {!isLoading && hasAccount && !editing && (
        <View style={styles.accountCard}>
          <View style={[styles.accountCardHeader, { backgroundColor: OPERATEURS[compte.operateur].bg }]}>
            <Text style={styles.accountLogo}>{OPERATEURS[compte.operateur].logo}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountOpName, { color: OPERATEURS[compte.operateur].color }]}>
                {OPERATEURS[compte.operateur].label}
              </Text>
              <Text style={styles.accountPhone}>{compte.telephone}</Text>
            </View>
            <View style={[styles.activeBadge, compte.actif ? styles.activeBadgeOn : styles.activeBadgeOff]}>
              <Text style={[styles.activeBadgeText, compte.actif ? styles.activeBadgeTextOn : styles.activeBadgeTextOff]}>
                {compte.actif ? "Actif" : "Inactif"}
              </Text>
            </View>
          </View>

          <View style={styles.accountActions}>
            <Pressable style={styles.editAccountBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editAccountBtnText}>Modifier</Text>
            </Pressable>
            <Pressable
              style={[styles.deleteAccountBtn, deleting && styles.btnDisabled]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={colors.error} size="small" />
              ) : (
                <Text style={styles.deleteAccountBtnText}>Supprimer</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Formulaire (nouveau compte ou édition) */}
      {!isLoading && (!hasAccount || editing) && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {hasAccount ? "Modifier le compte" : "Configurer un compte"}
          </Text>

          {/* Sélection opérateur */}
          <Text style={styles.fieldLabel}>Opérateur</Text>
          <View style={styles.opGrid}>
            {OP_LIST.map((op) => {
              const c = OPERATEURS[op];
              const active = selectedOp === op;
              return (
                <Pressable
                  key={op}
                  style={[
                    styles.opOption,
                    active && { borderColor: c.color, backgroundColor: c.bg },
                  ]}
                  onPress={() => setSelectedOp(op)}
                >
                  <Text style={styles.opLogo}>{c.logo}</Text>
                  <Text
                    style={[styles.opLabel, active && { color: c.color, fontFamily: typography.fontFamily.semiBold }]}
                    numberOfLines={1}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Numéro de téléphone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
            <TextInput
              style={[styles.input, { borderColor: cfg.color }]}
              value={telephone}
              onChangeText={setTelephone}
              placeholder={cfg.hint}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={20}
            />
            <Text style={styles.fieldHint}>
              Ce numéro doit être associé à votre compte {cfg.label}.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.formActions}>
            {editing && (
              <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.saveBtn, { backgroundColor: cfg.color }, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {hasAccount ? "Mettre à jour" : "Enregistrer"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Note de sécurité */}
      <View style={styles.securityNote}>
        <Text style={styles.securityNoteText}>
          Votre numéro de téléphone est unique sur la plateforme. Les paiements
          sont envoyés directement sans intermédiaire GoTaxi.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 60, gap: spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  backBtnText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.textPrimary,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoBanner: {
    backgroundColor: colors.infoBg,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing["2xl"],
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "#C7DCF5",
  },
  infoBannerTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.info,
  },
  infoBannerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.info,
    lineHeight: 20,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing["3xl"],
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  // Compte actif
  accountCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    marginHorizontal: spacing["2xl"],
    overflow: "hidden",
    ...shadows.sm,
  },
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  accountLogo: { fontSize: 36 },
  accountOpName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
  },
  accountPhone: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  activeBadgeOn: { backgroundColor: colors.successBg, borderColor: colors.success },
  activeBadgeOff: { backgroundColor: colors.errorBg, borderColor: colors.error },
  activeBadgeText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold },
  activeBadgeTextOn: { color: colors.success },
  activeBadgeTextOff: { color: colors.error },
  accountActions: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.xl,
    paddingTop: 0,
  },
  editAccountBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
  },
  editAccountBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  deleteAccountBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  deleteAccountBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.error,
  },
  // Formulaire
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    marginHorizontal: spacing["2xl"],
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.sm,
  },
  formTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  opGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  opOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: "45%",
    flexGrow: 1,
  },
  opLogo: { fontSize: 18 },
  opLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  fieldGroup: { gap: spacing.xs },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  fieldHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  formActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  saveBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  btnDisabled: { opacity: 0.4 },
  securityNote: {
    marginHorizontal: spacing["2xl"],
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityNoteText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
