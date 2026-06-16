import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useVoyageDetail } from "@/src/hooks/useVoyages";
import { useCreateColis } from "@/src/hooks/useColis";
import { useInitierPaiementColis } from "@/src/hooks/useColis";
import { colisApi } from "@/src/api/endpoints/colis";
import { useAuthStore } from "@/src/stores/authStore";
import { getErrorMessage } from "@/src/utils/error-handler";
import { formatFCFA } from "@/src/utils/formatters";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { ColisCategorie } from "@/src/api/types";

type PayStep = "phone" | "waiting" | "success" | "error";

const CAT: Record<ColisCategorie, { label: string; icon: string }> = {
  DOCUMENTS:    { label: "Documents",    icon: "📄" },
  VETEMENTS:    { label: "Vêtements",    icon: "👕" },
  ELECTRONIQUE: { label: "Électronique", icon: "📱" },
  ALIMENTAIRE:  { label: "Alimentaire",  icon: "🍱" },
  FRAGILE:      { label: "Fragile",      icon: "🔮" },
  AUTRE:        { label: "Autre",        icon: "📦" },
};

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}><Text style={styles.rowIcon}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderIcon}>{icon}</Text>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
  );
}

type Params = {
  voyage_id:               string;
  description:             string;
  categorie:               string;
  poids_kg:                string;
  fragile:                 string;
  destinataire_nom:        string;
  destinataire_telephone:  string;
  ville_depart:            string;
  ville_arrivee:           string;
  photo_uri:               string;
};

export default function ConfirmerColisScreen() {
  const params  = useLocalSearchParams<Params>();
  const { showToast } = useToast();
  const user = useAuthStore((s) => s.user);

  const { voyage_id, description, categorie, poids_kg, fragile, destinataire_nom, destinataire_telephone, photo_uri } = params;

  const [colisId, setColisId] = useState<string | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>("phone");
  const [telephone, setTelephone] = useState(user?.telephone ?? "");
  const [payError, setPayError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: voyage, isLoading: voyageLoading } = useVoyageDetail(voyage_id ?? "");
  const { mutateAsync: createColis, isPending: creating } = useCreateColis();
  const { mutateAsync: initierPaiement, isPending: initiating } = useInitierPaiementColis();

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const cat = (categorie as ColisCategorie) ?? "AUTRE";
  const catInfo = CAT[cat] ?? CAT.AUTRE;
  const isFragile = fragile === "1";
  const fraisColis = 100;

  const handleEnvoyer = async () => {
    try {
      const newColis = await createColis({
        voyage_id: voyage!.id,
        description,
        categorie: cat,
        poids_kg: poids_kg ? parseFloat(poids_kg) : undefined,
        fragile: isFragile,
        destinataire_nom,
        destinataire_telephone,
      });

      if (photo_uri) {
        try { await colisApi.uploadPhoto(newColis.id, photo_uri); } catch {}
      }

      setColisId(newColis.id);
      setTelephone(user?.telephone ?? "");
      setPayStep("phone");
      setPayError("");
      setPayModal(true);
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const result = await colisApi.statutPaiement(id);
        if (result.statut === "confirme") {
          clearInterval(pollRef.current!);
          setPayStep("success");
          setTimeout(() => {
            setPayModal(false);
            router.replace(`/(client)/colis/${id}` as any);
          }, 1800);
        } else if (result.statut === "echec" || result.statut === "expire") {
          clearInterval(pollRef.current!);
          setPayError(result.statut === "expire" ? "Le délai de paiement a expiré." : "Le paiement a échoué.");
          setPayStep("error");
        }
      } catch {}
    }, 5_000);
  };

  const handlePayer = async () => {
    if (!colisId) return;
    if (!telephone.trim()) { setPayError("Entrez votre numéro Mobile Money."); return; }
    setPayError("");
    try {
      const result = await initierPaiement({ id: colisId, telephone: telephone.trim() });
      setPaymentUrl(result.payment_url ?? null);
      if (result.payment_url) {
        await Linking.openURL(result.payment_url);
      }
      setPayStep("waiting");
      startPolling(colisId);
    } catch (e) {
      setPayError(getErrorMessage(e));
    }
  };

  const handleAnnuler = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPayModal(false);
    showToast("Demande annulée.", "info");
  };

  if (voyageLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Chargement du trajet…</Text>
      </View>
    );
  }

  if (!voyage) return null;

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Confirmer l'envoi</Text>
          <Text style={styles.headerSub}>Vérifiez les informations avant d'envoyer</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Carte voyage ── */}
        <View style={styles.voyageCard}>
          <View style={styles.voyageCardAccent} />
          <View style={styles.voyageCardBody}>
            <SectionHeader icon="🚗" title="Trajet du chauffeur" />
            <View style={styles.voyageTimeRow}>
              <Text style={styles.voyageTime}>{format(new Date(voyage.date_depart), "HH:mm")}</Text>
              <View style={styles.voyageDateBadge}>
                <Text style={styles.voyageDateBadgeText}>
                  {format(new Date(voyage.date_depart), "EEEE d MMMM yyyy", { locale: fr })}
                </Text>
              </View>
            </View>
            <View style={styles.timeline}>
              <View style={styles.timelineStop}>
                <View style={styles.timelineDotDepart} />
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineCity}>{voyage.ville_depart}</Text>
                  {voyage.point_depart ? <Text style={styles.timelinePoint}>{voyage.point_depart}</Text> : null}
                </View>
              </View>
              <View style={styles.timelineSpacer}>
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineStop}>
                <View style={styles.timelineDotArrivee} />
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineCity}>{voyage.ville_arrivee}</Text>
                  {voyage.point_arrivee ? <Text style={styles.timelinePoint}>{voyage.point_arrivee}</Text> : null}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Colis ── */}
        <View style={styles.card}>
          <SectionHeader icon={catInfo.icon} title="Votre colis" />
          <View style={styles.divider} />
          <Row icon={catInfo.icon} label="Catégorie" value={catInfo.label} />
          <Row icon="📝" label="Description" value={description} />
          {poids_kg ? <Row icon="⚖️" label="Poids estimé" value={`${poids_kg} kg`} /> : null}
          {isFragile && (
            <View style={styles.fragilePill}>
              <Text style={styles.fragilePillIcon}>⚠️</Text>
              <Text style={styles.fragilePillText}>Fragile — manipulation avec précaution requise</Text>
            </View>
          )}
        </View>

        {/* ── Destinataire ── */}
        <View style={styles.card}>
          <SectionHeader icon="👤" title="Destinataire" />
          <View style={styles.divider} />
          <View style={styles.recipientRow}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientAvatarText}>{destinataire_nom?.charAt(0)?.toUpperCase() ?? "?"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{destinataire_nom}</Text>
              <Text style={styles.recipientPhone}>{destinataire_telephone}</Text>
            </View>
          </View>
        </View>

        {/* ── Frais GoTaxi ── */}
        <View style={styles.card}>
          <SectionHeader icon="💳" title="Frais GoTaxi" />
          <View style={styles.divider} />
          <View style={styles.fraisRow}>
            <Text style={styles.fraisLabel}>Frais de mise en relation</Text>
            <Text style={styles.fraisAmt}>{formatFCFA(fraisColis)}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipIcon}>ℹ️</Text>
            <Text style={styles.infoChipText}>
              Ces frais sont payés par Mobile Money maintenant. Le transport est réglé directement avec le chauffeur.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.confirmBtn, creating && styles.confirmBtnPending]}
          onPress={handleEnvoyer}
          disabled={creating}
        >
          {creating ? (
            <><ActivityIndicator color={colors.white} size="small" /><Text style={styles.confirmBtnText}>Envoi en cours…</Text></>
          ) : (
            <><Text style={styles.confirmBtnText}>Envoyer · Payer {formatFCFA(fraisColis)}</Text><Text style={styles.confirmBtnArrow}>→</Text></>
          )}
        </Pressable>
        <Text style={styles.footerHint}>En confirmant, vous acceptez les conditions d'envoi GoTaxi</Text>
      </View>

      {/* ── Modal paiement ── */}
      <Modal visible={payModal} transparent animationType="fade" onRequestClose={handleAnnuler}>
        <KeyboardAvoidingView style={ms.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={ms.overlay}>
            <View style={ms.card}>

              {payStep === "phone" && (
                <>
                  <View style={ms.iconWrap}><Text style={ms.iconEmoji}>📱</Text></View>
                  <Text style={ms.title}>Payer les frais GoTaxi</Text>
                  <Text style={ms.body}>
                    Entrez votre numéro Mobile Money (MTN ou Moov).{"\n"}
                    Vous recevrez une demande de confirmation USSD.
                  </Text>
                  <View style={ms.amtRow}>
                    <Text style={ms.amtLabel}>Frais d'envoi colis</Text>
                    <Text style={ms.amtVal}>{formatFCFA(fraisColis)}</Text>
                  </View>
                  <TextInput
                    style={ms.phoneInput}
                    value={telephone}
                    onChangeText={(t) => { setTelephone(t); setPayError(""); }}
                    placeholder="+229 97 00 00 00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    autoFocus
                  />
                  {payError ? <Text style={ms.errorTxt}>{payError}</Text> : null}
                  <View style={ms.btnGroup}>
                    <Pressable
                      style={[ms.btnPrimary, initiating && { opacity: 0.7 }]}
                      onPress={handlePayer}
                      disabled={initiating}
                    >
                      {initiating
                        ? <ActivityIndicator color={colors.white} size="small" />
                        : <Text style={ms.btnPrimaryTxt}>Payer {formatFCFA(fraisColis)}</Text>}
                    </Pressable>
                    <Pressable onPress={handleAnnuler} hitSlop={8}>
                      <Text style={ms.cancelTxt}>Annuler la demande</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {payStep === "waiting" && (
                <>
                  <View style={[ms.iconWrap, ms.iconWrapWaiting]}>
                    <ActivityIndicator color={colors.primary} size="large" />
                  </View>
                  <Text style={ms.title}>En attente de paiement</Text>
                  <Text style={ms.body}>
                    Choisissez votre opérateur Mobile Money sur la page FedaPay puis confirmez la
                    demande envoyée sur{" "}
                    <Text style={{ fontFamily: typography.fontFamily.bold }}>{telephone}</Text>
                  </Text>
                  {paymentUrl ? (
                    <Pressable
                      style={ms.btnPrimary}
                      onPress={() => Linking.openURL(paymentUrl)}
                    >
                      <Text style={ms.btnPrimaryTxt}>Rouvrir la page de paiement</Text>
                    </Pressable>
                  ) : (
                    <View style={ms.waitingHint}>
                      <Text style={ms.waitingHintIcon}>💡</Text>
                      <Text style={ms.waitingHintText}>
                        Composez *126*1# si vous ne recevez pas la demande de confirmation.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {payStep === "success" && (
                <Animated.View entering={FadeIn.duration(300)} style={ms.successWrap}>
                  <View style={[ms.iconWrap, ms.iconWrapSuccess]}><Text style={ms.iconEmoji}>✅</Text></View>
                  <Text style={ms.title}>Paiement confirmé !</Text>
                  <Text style={ms.body}>Votre colis est enregistré.{"\n"}En attente de confirmation du chauffeur.</Text>
                </Animated.View>
              )}

              {payStep === "error" && (
                <>
                  <View style={[ms.iconWrap, ms.iconWrapError]}><Text style={ms.iconEmoji}>❌</Text></View>
                  <Text style={ms.title}>Paiement échoué</Text>
                  <Text style={ms.body}>{payError}</Text>
                  <View style={ms.btnGroup}>
                    <Pressable style={ms.btnPrimary} onPress={() => { setPayStep("phone"); setPayError(""); }}>
                      <Text style={ms.btnPrimaryTxt}>Réessayer</Text>
                    </Pressable>
                    <Pressable onPress={handleAnnuler} hitSlop={8}>
                      <Text style={ms.cancelTxt}>Annuler</Text>
                    </Pressable>
                  </View>
                </>
              )}

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const PT = Platform.OS === "ios" ? 56 : 40;
const PB = Platform.OS === "ios" ? 36 : 24;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, gap: spacing.md },
  loadingText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },

  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing["2xl"], paddingTop: PT, paddingBottom: spacing.lg,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, ...shadows.sm,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.primary, lineHeight: 24 },
  headerTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  headerSub: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted, marginTop: 2 },

  content: { padding: spacing["2xl"], gap: spacing.lg, paddingBottom: 130 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionHeaderIcon: { fontSize: 18 },
  sectionHeaderTitle: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: colors.textPrimary, textTransform: "uppercase", letterSpacing: 0.6 },

  divider: { height: 1, backgroundColor: colors.border },

  voyageCard: { backgroundColor: colors.white, borderRadius: radii.xl, overflow: "hidden", ...shadows.md, borderWidth: 1, borderColor: colors.border },
  voyageCardAccent: { height: 4, backgroundColor: colors.primary },
  voyageCardBody: { padding: spacing.xl, gap: spacing.lg },
  voyageTimeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  voyageTime: { fontSize: typography.fontSize["4xl"], fontFamily: typography.fontFamily.extraBold, color: colors.textPrimary, lineHeight: 48 },
  voyageDateBadge: { backgroundColor: `${colors.primary}12`, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: `${colors.primary}25` },
  voyageDateBadgeText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, color: colors.primary, textTransform: "capitalize" },

  timeline: { gap: 2 },
  timelineStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  timelineDotDepart: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, marginTop: 4, borderWidth: 3, borderColor: `${colors.primary}30` },
  timelineDotArrivee: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.black, marginTop: 4, borderWidth: 3, borderColor: `${colors.black}25` },
  timelineInfo: { flex: 1 },
  timelineCity: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  timelinePoint: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 2 },
  timelineSpacer: { flexDirection: "row", alignItems: "center", paddingLeft: 6, gap: spacing.sm, marginVertical: 3 },
  timelineLine: { width: 2, height: 22, backgroundColor: colors.border },

  card: { backgroundColor: colors.white, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md, ...shadows.sm, borderWidth: 1, borderColor: colors.border },

  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  rowIcon: { fontSize: 16 },
  rowLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.textMuted },
  rowValue: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary, marginTop: 2, lineHeight: 22 },

  fragilePill: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.warningBg, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: `${colors.warning}40` },
  fragilePillIcon: { fontSize: 18 },
  fragilePillText: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.warningText },

  recipientRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  recipientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${colors.primary}18`, borderWidth: 2, borderColor: `${colors.primary}30`, alignItems: "center", justifyContent: "center" },
  recipientAvatarText: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.primary },
  recipientName: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  recipientPhone: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 3 },

  fraisRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fraisLabel: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  fraisAmt: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.extraBold, color: colors.primary },
  infoChip: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.infoBg, borderRadius: radii.lg, padding: spacing.md, alignItems: "flex-start" },
  infoChipIcon: { fontSize: 14 },
  infoChipText: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.info, lineHeight: 18 },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.white, paddingHorizontal: spacing["2xl"], paddingTop: spacing.lg, paddingBottom: PB, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm, ...shadows.lg },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.xl, paddingVertical: spacing.xl, ...shadows.md },
  confirmBtnPending: { opacity: 0.7 },
  confirmBtnText: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.white },
  confirmBtnArrow: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: `${colors.white}cc` },
  footerHint: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted, textAlign: "center" },
});

const ms = StyleSheet.create({
  kav: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: spacing["2xl"] },
  card: { backgroundColor: colors.white, borderRadius: radii["2xl"], padding: spacing["3xl"], width: "100%", alignItems: "center", gap: spacing.lg, ...shadows.lg },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" },
  iconWrapWaiting: { backgroundColor: `${colors.primary}10` },
  iconWrapSuccess: { backgroundColor: colors.successBg },
  iconWrapError:   { backgroundColor: colors.errorBg },
  iconEmoji: { fontSize: 34 },
  successWrap: { alignItems: "center", gap: spacing.lg, width: "100%" },
  title: { fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bold, color: colors.textPrimary, textAlign: "center" },
  body: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  amtRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  amtLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  amtVal: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.extraBold, color: colors.primary },
  phoneInput: { width: "100%", backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.regular, color: colors.textPrimary, textAlign: "center" },
  errorTxt: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.error, textAlign: "center" },
  waitingHint: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: `${colors.primary}10`, borderRadius: radii.lg, padding: spacing.md, width: "100%" },
  waitingHintIcon: { fontSize: 14 },
  waitingHintText: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.primary, lineHeight: 18 },
  btnGroup: { width: "100%", gap: spacing.md, alignItems: "center" },
  btnPrimary: { width: "100%", backgroundColor: colors.primary, borderRadius: radii.full, paddingVertical: spacing.lg, alignItems: "center", justifyContent: "center", minHeight: 52 },
  btnPrimaryTxt: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.white },
  cancelTxt: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textMuted, paddingVertical: spacing.xs },
});
