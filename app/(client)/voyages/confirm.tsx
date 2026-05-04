import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useVoyageDetail } from "@/src/hooks/useVoyages";
import { useCreateReservation } from "@/src/hooks/useReservations";
import { formatFCFA, formatDate, formatTime } from "@/src/utils/formatters";
import { getErrorCode, getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

export default function ConfirmScreen() {
  const { voyage_id, places: placesParam } = useLocalSearchParams<{ voyage_id: string; places?: string }>();
  const { showToast } = useToast();
  const [places, setPlaces] = useState(() => Math.max(1, Number(placesParam) || 1));

  const { data: voyage } = useVoyageDetail(voyage_id ?? "");
  const { mutateAsync: createReservation, isPending } = useCreateReservation();

  if (!voyage) return null;

  const prixTotal = voyage.prix_par_place * places;

  const handleConfirm = async () => {
    try {
      const reservation = await createReservation({ voyage_id: voyage.id, nombre_places: places });
      showToast("Réservation envoyée ! En attente de confirmation du chauffeur.", "success");
      router.replace("/(client)/voyages/mes-reservations" as any);
    } catch (e) {
      const code = getErrorCode(e);
      if (code === "PLACES_INSUFFISANTES" || getErrorMessage(e).includes("insuffisantes")) {
        showToast("Plus assez de places disponibles.", "error");
      } else {
        showToast(getErrorMessage(e), "error");
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Retour</Text>
        </Pressable>

        <Text style={styles.title}>Confirmer la réservation</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Trajet</Text>
          <View style={styles.routeRow}>
            <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>{formatDate(voyage.date_depart, "EEEE d MMMM yyyy")}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕐</Text>
            <Text style={styles.detailText}>{formatTime(voyage.date_depart)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText} numberOfLines={2}>{voyage.point_depart}</Text>
          </View>
        </View>

        <View style={styles.placesCard}>
          <Text style={styles.cardLabel}>Nombre de places</Text>
          <View style={styles.counter}>
            <Pressable
              onPress={() => setPlaces((p) => Math.max(1, p - 1))}
              style={styles.counterBtn}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </Pressable>
            <Text style={styles.counterValue}>{places}</Text>
            <Pressable
              onPress={() => setPlaces((p) => Math.min(voyage.nombre_places_restantes, p + 1))}
              style={styles.counterBtn}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.placesAvail}>
            {voyage.nombre_places_restantes} place(s) disponible(s)
          </Text>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.cardLabel}>Détail du prix</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{formatFCFA(voyage.prix_par_place)} × {places} place(s)</Text>
            <Text style={styles.priceValue}>{formatFCFA(prixTotal)}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceTotalLabel}>Total</Text>
            <Text style={styles.priceTotalValue}>{formatFCFA(prixTotal)}</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            ℹ️ Votre réservation sera en attente jusqu'à la confirmation du chauffeur. Le paiement se fait directement au chauffeur lors du voyage.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          size="lg"
          loading={isPending}
          onPress={handleConfirm}
          style={styles.confirmBtn}
        >
          Confirmer · {formatFCFA(prixTotal)}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 120, gap: spacing.xl, paddingTop: 56 },
  headerBack: { paddingHorizontal: spacing["2xl"], paddingBottom: spacing.md },
  headerBackText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing["2xl"],
  },
  summaryCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.md,
    ...shadows.sm,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  routeCity: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  routeArrow: {
    fontSize: typography.fontSize.xl,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  detailIcon: { fontSize: 16, width: 20 },
  detailText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    flex: 1,
    textTransform: "capitalize",
  },
  placesCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.md,
    ...shadows.sm,
  },
  counter: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  counterValue: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: "center",
  },
  placesAvail: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  priceCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.md,
    ...shadows.sm,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  priceDivider: { height: 1, backgroundColor: colors.border },
  priceTotalLabel: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  priceTotalValue: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  noteCard: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.infoBg,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  noteText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.info,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.xl,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  confirmBtn: { width: "100%" },
});