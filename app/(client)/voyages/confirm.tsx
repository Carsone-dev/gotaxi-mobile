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
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useVoyageDetail } from "@/src/hooks/useVoyages";
import { useCreateReservation, useInitierPaiementReservation } from "@/src/hooks/useReservations";
import { reservationsApi } from "@/src/api/endpoints/reservations";
import { useAuthStore } from "@/src/stores/authStore";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

type PayStep = "phone" | "waiting" | "success" | "error";

export default function ConfirmScreen() {
  const { voyage_id, places: placesParam } = useLocalSearchParams<{ voyage_id: string; places?: string }>();
  const { showToast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [places, setPlaces] = useState(() => Math.max(1, Number(placesParam) || 1));
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>("phone");
  const [telephone, setTelephone] = useState(user?.telephone ?? "");
  const [payError, setPayError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: voyage } = useVoyageDetail(voyage_id ?? "");
  const { mutateAsync: createReservation, isPending: creating } = useCreateReservation();
  const { mutateAsync: initierPaiement, isPending: initiating } = useInitierPaiementReservation();

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!voyage) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const prixTotal = voyage.prix_par_place * places;
  const fraisPlateforme = 200 * places;
  const maxPlaces = voyage.nombre_places_restantes;

  const handleReserver = async () => {
    try {
      const resa = await createReservation({ voyage_id: voyage.id, nombre_places: places });
      setReservationId(resa.id);
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
        const result = await reservationsApi.statutPaiement(id);
        if (result.statut === "confirme") {
          clearInterval(pollRef.current!);
          setPayStep("success");
          setTimeout(() => {
            setPayModal(false);
            router.replace("/(client)/reservations" as any);
          }, 1800);
        } else if (result.statut === "echec" || result.statut === "expire") {
          clearInterval(pollRef.current!);
          setPayError(result.statut === "expire" ? "Le délai de paiement a expiré." : "Le paiement a échoué.");
          setPayStep("error");
        }
      } catch {
        // ignore network errors during polling
      }
    }, 5_000);
  };

  const handlePayer = async () => {
    if (!reservationId) return;
    if (!telephone.trim()) {
      setPayError("Entrez votre numéro Mobile Money.");
      return;
    }
    setPayError("");
    try {
      const result = await initierPaiement({ id: reservationId, telephone: telephone.trim() });
      setPaymentUrl(result.payment_url ?? null);
      if (result.payment_url) {
        await Linking.openURL(result.payment_url);
      }
      setPayStep("waiting");
      startPolling(reservationId);
    } catch (e) {
      setPayError(getErrorMessage(e));
    }
  };

  const handleAnnulerPaiement = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPayModal(false);
    showToast("Réservation annulée.", "info");
  };

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Confirmer la réservation</Text>
          <Text style={styles.headerSub}>Vérifiez les informations</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Carte trajet ── */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.routeCard}>
          <View style={styles.routeAccent} />
          <View style={styles.routeBody}>
            <View style={styles.routeTimeline}>
              <View style={[styles.rtDot, styles.rtDotStart]} />
              <View style={styles.rtLine} />
              <View style={[styles.rtDot, styles.rtDotEnd]} />
            </View>
            <View style={styles.routeCities}>
              <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
            </View>
            <View style={styles.routeMeta}>
              <Text style={styles.departTime}>{formatTime(voyage.date_depart)}</Text>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeTxt}>
                  {format(new Date(voyage.date_depart), "EEE d MMM yyyy", { locale: fr })}
                </Text>
              </View>
            </View>
            {voyage.point_depart ? (
              <View style={styles.pointRow}>
                <Text style={styles.pointIconTxt}>📍</Text>
                <Text style={styles.pointTxt} numberOfLines={2}>{voyage.point_depart}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* ── Nombre de places ── */}
        <Animated.View entering={FadeInDown.duration(280).delay(80)} style={styles.card}>
          <Text style={styles.cardLabel}>Nombre de places</Text>
          <View style={styles.counter}>
            <Pressable
              onPress={() => setPlaces((p) => Math.max(1, p - 1))}
              style={[styles.counterBtn, places <= 1 && styles.counterBtnDisabled]}
              disabled={places <= 1}
            >
              <Text style={[styles.counterBtnTxt, places <= 1 && styles.counterBtnTxtDisabled]}>−</Text>
            </Pressable>
            <View style={styles.counterValue}>
              <Text style={styles.counterNum}>{places}</Text>
              <Text style={styles.counterSub}>place{places > 1 ? "s" : ""}</Text>
            </View>
            <Pressable
              onPress={() => setPlaces((p) => Math.min(maxPlaces, p + 1))}
              style={[styles.counterBtn, places >= maxPlaces && styles.counterBtnDisabled]}
              disabled={places >= maxPlaces}
            >
              <Text style={[styles.counterBtnTxt, places >= maxPlaces && styles.counterBtnTxtDisabled]}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.placesAvail}>
            {maxPlaces} place{maxPlaces > 1 ? "s" : ""} disponible{maxPlaces > 1 ? "s" : ""}
          </Text>
        </Animated.View>

        {/* ── Détail du prix ── */}
        <Animated.View entering={FadeInDown.duration(280).delay(160)} style={styles.card}>
          <Text style={styles.cardLabel}>Détail du prix</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Transport ({formatFCFA(voyage.prix_par_place)} × {places})</Text>
            <Text style={styles.priceAmt}>{formatFCFA(prixTotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Frais GoTaxi (200 FCFA × {places})</Text>
            <Text style={[styles.priceAmt, { color: colors.primary }]}>{formatFCFA(fraisPlateforme)}</Text>
          </View>
          <View style={styles.priceDiv} />
          <View style={styles.priceTotalRow}>
            <Text style={styles.priceTotalLabel}>Frais à payer maintenant</Text>
            <Text style={styles.priceTotalAmt}>{formatFCFA(fraisPlateforme)}</Text>
          </View>
        </Animated.View>

        {/* ── Info ── */}
        <Animated.View entering={FadeInDown.duration(280).delay(240)} style={styles.infoNote}>
          <Text style={styles.infoNoteIcon}>ℹ️</Text>
          <Text style={styles.infoNoteTxt}>
            Les frais GoTaxi ({formatFCFA(fraisPlateforme)}) sont payés par Mobile Money maintenant.
            Le transport ({formatFCFA(prixTotal)}) se règle directement avec le chauffeur.
          </Text>
        </Animated.View>

      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.confirmBtn, creating && { opacity: 0.8 }]}
          onPress={handleReserver}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.confirmBtnTxt}>Réserver · Payer {formatFCFA(fraisPlateforme)}</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.footerHint}>
          En confirmant, vous acceptez les conditions d'utilisation de GoTaxi.
        </Text>
      </View>

      {/* ── Modal paiement FedaPay ── */}
      <Modal visible={payModal} transparent animationType="fade" onRequestClose={handleAnnulerPaiement}>
        <KeyboardAvoidingView style={ms.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={ms.overlay}>
            <View style={ms.card}>

              {/* ─ Étape : saisie téléphone ─ */}
              {payStep === "phone" && (
                <>
                  <View style={ms.iconWrap}>
                    <Text style={ms.iconEmoji}>📱</Text>
                  </View>
                  <Text style={ms.title}>Payer les frais GoTaxi</Text>
                  <Text style={ms.body}>
                    Entrez votre numéro Mobile Money (MTN ou Moov).{"\n"}
                    Vous recevrez une demande de confirmation USSD.
                  </Text>
                  <View style={ms.amtRow}>
                    <Text style={ms.amtLabel}>Frais de mise en relation</Text>
                    <Text style={ms.amtVal}>{formatFCFA(fraisPlateforme)}</Text>
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
                        : <Text style={ms.btnPrimaryTxt}>Payer {formatFCFA(fraisPlateforme)}</Text>}
                    </Pressable>
                    <Pressable onPress={handleAnnulerPaiement} hitSlop={8}>
                      <Text style={ms.cancelTxt}>Annuler la réservation</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* ─ Étape : en attente de paiement FedaPay ─ */}
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

              {/* ─ Étape : succès ─ */}
              {payStep === "success" && (
                <Animated.View entering={FadeIn.duration(300)} style={ms.successWrap}>
                  <View style={[ms.iconWrap, ms.iconWrapSuccess]}>
                    <Text style={ms.iconEmoji}>✅</Text>
                  </View>
                  <Text style={ms.title}>Paiement confirmé !</Text>
                  <Text style={ms.body}>
                    Votre réservation est enregistrée.{"\n"}Le chauffeur va confirmer votre place.
                  </Text>
                </Animated.View>
              )}

              {/* ─ Étape : erreur ─ */}
              {payStep === "error" && (
                <>
                  <View style={[ms.iconWrap, ms.iconWrapError]}>
                    <Text style={ms.iconEmoji}>❌</Text>
                  </View>
                  <Text style={ms.title}>Paiement échoué</Text>
                  <Text style={ms.body}>{payError}</Text>
                  <View style={ms.btnGroup}>
                    <Pressable
                      style={ms.btnPrimary}
                      onPress={() => { setPayStep("phone"); setPayError(""); }}
                    >
                      <Text style={ms.btnPrimaryTxt}>Réessayer</Text>
                    </Pressable>
                    <Pressable onPress={handleAnnulerPaiement} hitSlop={8}>
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

// ── Styles principaux ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing["2xl"],
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
  backIcon: { fontSize: 22, color: colors.textPrimary, fontFamily: typography.fontFamily.bold, lineHeight: 26, marginTop: -1 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  headerSub: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted },

  content: { padding: spacing["2xl"], paddingBottom: 140, gap: spacing.lg },

  routeCard: {
    backgroundColor: colors.white, borderRadius: radii["2xl"],
    overflow: "hidden", borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  routeAccent: { height: 5, backgroundColor: colors.primary },
  routeBody: { padding: spacing["2xl"], gap: spacing.lg },
  routeTimeline: { flexDirection: "row", alignItems: "center", height: 14 },
  rtDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.white, zIndex: 1 },
  rtDotStart: { backgroundColor: colors.primary },
  rtDotEnd:   { backgroundColor: colors.black },
  rtLine: { flex: 1, height: 2, backgroundColor: colors.border },
  routeCities: { flexDirection: "row", alignItems: "center", marginTop: -spacing.xs },
  routeCity: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  routeMeta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  departTime: { fontSize: typography.fontSize["4xl"], fontFamily: typography.fontFamily.extraBold, color: colors.textPrimary, lineHeight: 36 },
  dateBadge: {
    backgroundColor: colors.surface, borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  dateBadgeTxt: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, textTransform: "capitalize" },
  pointRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pointIconTxt: { fontSize: 13 },
  pointTxt: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary },

  card: {
    backgroundColor: colors.white, borderRadius: radii["2xl"],
    padding: spacing["2xl"], gap: spacing.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold,
    color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1,
  },

  counter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  counterBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  counterBtnDisabled: { opacity: 0.4 },
  counterBtnTxt: { fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bold, color: colors.textPrimary, lineHeight: 28 },
  counterBtnTxtDisabled: { color: colors.textMuted },
  counterValue: { alignItems: "center", gap: 2 },
  counterNum: { fontSize: typography.fontSize["5xl"], fontFamily: typography.fontFamily.extraBold, color: colors.textPrimary, lineHeight: 38 },
  counterSub: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textMuted },
  placesAvail: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textMuted, textAlign: "center" },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary },
  priceAmt: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  priceDiv: { height: 1, backgroundColor: colors.border },
  priceTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceTotalLabel: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  priceTotalAmt: { fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.extraBold, color: colors.primary },

  infoNote: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.md,
    backgroundColor: colors.infoBg, borderRadius: radii.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: `${colors.info}20`,
  },
  infoNoteIcon: { fontSize: 15 },
  infoNoteTxt: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.info, lineHeight: 20 },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"], paddingTop: spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.sm, ...shadows.lg,
  },
  confirmBtn: {
    backgroundColor: colors.primary, borderRadius: radii.full,
    paddingVertical: spacing.lg, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: spacing.md, minHeight: 52,
  },
  confirmBtnTxt: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.white },
  footerHint: { textAlign: "center", fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted },
});

// ── Styles modal ──────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  kav: { flex: 1 },
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
    padding: spacing["2xl"],
  },
  card: {
    backgroundColor: colors.white, borderRadius: radii["2xl"],
    padding: spacing["3xl"], width: "100%", alignItems: "center",
    gap: spacing.lg, ...shadows.lg,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center", justifyContent: "center",
  },
  iconWrapWaiting: { backgroundColor: `${colors.primary}10` },
  iconWrapSuccess: { backgroundColor: colors.successBg },
  iconWrapError:   { backgroundColor: colors.errorBg },
  iconEmoji: { fontSize: 34 },
  successWrap: { alignItems: "center", gap: spacing.lg, width: "100%" },

  title: { fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bold, color: colors.textPrimary, textAlign: "center" },
  body: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },

  amtRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    width: "100%", backgroundColor: colors.surface,
    borderRadius: radii.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  amtLabel: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  amtVal: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.extraBold, color: colors.primary },

  phoneInput: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    textAlign: "center",
  },
  errorTxt: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.error, textAlign: "center" },

  waitingHint: {
    flexDirection: "row", gap: spacing.sm, alignItems: "flex-start",
    backgroundColor: `${colors.primary}10`, borderRadius: radii.lg,
    padding: spacing.md, width: "100%",
  },
  waitingHintIcon: { fontSize: 14 },
  waitingHintText: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.primary, lineHeight: 18 },

  btnGroup: { width: "100%", gap: spacing.md, alignItems: "center" },
  btnPrimary: {
    width: "100%", backgroundColor: colors.primary,
    borderRadius: radii.full, paddingVertical: spacing.lg,
    alignItems: "center", justifyContent: "center", minHeight: 52,
  },
  btnPrimaryTxt: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.white },
  cancelTxt: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textMuted, paddingVertical: spacing.xs },
});
