import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useVoyageDetail } from "@/src/hooks/useVoyages";
import { useCreateReservation } from "@/src/hooks/useReservations";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { getErrorCode, getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

export default function ConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { voyage_id, places: placesParam } = useLocalSearchParams<{ voyage_id: string; places?: string }>();
  const { showToast } = useToast();
  const [places, setPlaces] = useState(() => Math.max(1, Number(placesParam) || 1));

  const { data: voyage } = useVoyageDetail(voyage_id ?? "");
  const { mutateAsync: createReservation, isPending } = useCreateReservation();

  if (!voyage) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const prixTotal = voyage.prix_par_place * places;

  const handleConfirm = async () => {
    try {
      await createReservation({ voyage_id: voyage.id, nombre_places: places });
      showToast("Réservation envoyée ! En attente de confirmation du chauffeur.", "success");
      router.replace("/(client)/reservations" as any);
    } catch (e) {
      const code = getErrorCode(e);
      if (code === "PLACES_INSUFFISANTES" || getErrorMessage(e).includes("insuffisantes")) {
        showToast("Plus assez de places disponibles.", "error");
      } else {
        showToast(getErrorMessage(e), "error");
      }
    }
  };

  const maxPlaces = voyage.nombre_places_restantes;

  return (
    <View style={styles.screen}>
      {/* ── Header fixe ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Confirmer la réservation</Text>
          <Text style={styles.headerSub}>Vérifiez les informations</Text>
        </View>
      </View>

      {/* ── Contenu scrollable ───────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Carte trajet ──────────── */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.routeCard}>
          <View style={styles.routeAccent} />
          <View style={styles.routeBody}>
            {/* Timeline horizontal */}
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

            {/* Grande heure + date */}
            <View style={styles.routeMeta}>
              <Text style={styles.departTime}>{formatTime(voyage.date_depart)}</Text>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeTxt}>
                  {format(new Date(voyage.date_depart), "EEE d MMM yyyy", { locale: fr })}
                </Text>
              </View>
            </View>

            {/* Point de départ */}
            {voyage.point_depart ? (
              <View style={styles.pointRow}>
                <View style={styles.pointIconWrap}>
                  <Text style={styles.pointIconTxt}>📍</Text>
                </View>
                <Text style={styles.pointTxt} numberOfLines={2}>{voyage.point_depart}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* ── Nombre de places ──────── */}
        <Animated.View entering={FadeInDown.duration(280).delay(80)} style={styles.card}>
          <Text style={styles.cardLabel}>Nombre de places</Text>
          <View style={styles.counter}>
            <Pressable
              onPress={() => setPlaces((p) => Math.max(1, p - 1))}
              style={({ pressed }) => [
                styles.counterBtn,
                places <= 1 && styles.counterBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
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
              style={({ pressed }) => [
                styles.counterBtn,
                places >= maxPlaces && styles.counterBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
              disabled={places >= maxPlaces}
            >
              <Text style={[styles.counterBtnTxt, places >= maxPlaces && styles.counterBtnTxtDisabled]}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.placesAvail}>
            {maxPlaces} place{maxPlaces > 1 ? "s" : ""} disponible{maxPlaces > 1 ? "s" : ""}
          </Text>
        </Animated.View>

        {/* ── Détail du prix ────────── */}
        <Animated.View entering={FadeInDown.duration(280).delay(160)} style={styles.card}>
          <Text style={styles.cardLabel}>Détail du prix</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {formatFCFA(voyage.prix_par_place)} × {places} place{places > 1 ? "s" : ""}
            </Text>
            <Text style={styles.priceAmt}>{formatFCFA(prixTotal)}</Text>
          </View>
          <View style={styles.priceDiv} />
          <View style={styles.priceTotalRow}>
            <Text style={styles.priceTotalLabel}>Total à payer</Text>
            <Text style={styles.priceTotalAmt}>{formatFCFA(prixTotal)}</Text>
          </View>
        </Animated.View>

        {/* ── Note info ─────────────── */}
        <Animated.View entering={FadeInDown.duration(280).delay(240)} style={styles.infoNote}>
          <View style={styles.infoNoteIconWrap}>
            <Text style={styles.infoNoteIcon}>ℹ️</Text>
          </View>
          <Text style={styles.infoNoteTxt}>
            Votre réservation sera en attente jusqu'à confirmation du chauffeur.
            Le paiement se fait directement lors du voyage.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* ── Footer fixe ──────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, isPending && { opacity: 0.8 }, pressed && { opacity: 0.85 }]}
          onPress={handleConfirm}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.confirmBtnTxt}>Confirmer la réservation</Text>
              <View style={styles.confirmBtnPrice}>
                <Text style={styles.confirmBtnPriceTxt}>{formatFCFA(prixTotal)}</Text>
              </View>
            </>
          )}
        </Pressable>
        <Text style={styles.footerHint}>
          En confirmant, vous acceptez les conditions d'utilisation de GoTaxi.
        </Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 22,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 26,
    marginTop: -1,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Scroll
  content: {
    padding: spacing["2xl"],
    paddingBottom: 140,
    gap: spacing.lg,
  },

  // Route card
  routeCard: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  routeAccent: {
    height: 5,
    backgroundColor: colors.primary,
  },
  routeBody: {
    padding: spacing["2xl"],
    gap: spacing.lg,
  },
  routeTimeline: {
    flexDirection: "row",
    alignItems: "center",
    height: 14,
  },
  rtDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 1,
  },
  rtDotStart: { backgroundColor: colors.primary },
  rtDotEnd:   { backgroundColor: colors.black },
  rtLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
  },
  routeCities: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -spacing.xs,
  },
  routeCity: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  routeMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  departTime: {
    fontSize: typography.fontSize["4xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  dateBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadgeTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pointIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pointIconTxt: { fontSize: 13 },
  pointTxt: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  // Cards génériques
  card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing["2xl"],
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Counter
  counter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnDisabled: { opacity: 0.4 },
  counterBtnTxt: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  counterBtnTxtDisabled: { color: colors.textMuted },
  counterValue: { alignItems: "center", gap: 2 },
  counterNum: {
    fontSize: typography.fontSize["5xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 38,
  },
  counterSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  placesAvail: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Prix
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  priceAmt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  priceDiv: { height: 1, backgroundColor: colors.border },
  priceTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceTotalLabel: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  priceTotalAmt: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },

  // Note info
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.infoBg,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.info}20`,
  },
  infoNoteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.info}18`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoNoteIcon: { fontSize: 15 },
  infoNoteTxt: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.info,
    lineHeight: 20,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    ...shadows.lg,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    minHeight: 52,
  },
  confirmBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  confirmBtnPrice: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  confirmBtnPriceTxt: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  footerHint: {
    textAlign: "center",
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
});
