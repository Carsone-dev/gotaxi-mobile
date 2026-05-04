import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useVoyageDetail } from "@/src/hooks/useVoyages";
import { useAuthStore } from "@/src/stores/authStore";
import { formatFCFA, formatDate, formatTime } from "@/src/utils/formatters";
import { Button } from "@/src/components/ui/Button";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { VoyageStatus } from "@/src/api/types";

const STATUS_LABEL: Record<VoyageStatus, string> = {
  PUBLIE: "Disponible",
  COMPLET: "Complet",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const STATUS_COLOR: Record<VoyageStatus, string> = {
  PUBLIE: colors.success,
  COMPLET: colors.warning,
  EN_COURS: colors.info,
  TERMINE: colors.textSecondary,
  ANNULE: colors.error,
};

export default function VoyageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: voyage, isLoading, isError } = useVoyageDetail(id ?? "");

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !voyage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Trajet introuvable.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = !!user && voyage.chauffeur_id === user.id;
  const canReserve =
    voyage.statut === "PUBLIE" &&
    voyage.nombre_places_restantes > 0 &&
    !isOwner;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Retour</Text>
        </Pressable>

        <View style={styles.routeCard}>
          <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[voyage.statut]}20` }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[voyage.statut] }]}>
              {STATUS_LABEL[voyage.statut]}
            </Text>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.routeStop}>
              <View style={styles.routeDot} />
              <View>
                <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
                <Text style={styles.routeTime}>{formatTime(voyage.date_depart)}</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>{voyage.point_depart}</Text>
              </View>
            </View>
            <View style={styles.routeConnector}>
              <View style={styles.routeLine} />
              {voyage.distance_km && (
                <Text style={styles.routeDistance}>{voyage.distance_km} km</Text>
              )}
            </View>
            <View style={styles.routeStop}>
              <View style={[styles.routeDot, styles.routeDotEnd]} />
              <View>
                <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
                {voyage.date_arrivee_estimee && (
                  <Text style={styles.routeTime}>{formatTime(voyage.date_arrivee_estimee)}</Text>
                )}
                <Text style={styles.routeAddress} numberOfLines={2}>{voyage.point_arrivee}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.fullDate}>{formatDate(voyage.date_depart, "EEEE d MMMM yyyy")}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>💺</Text>
            <Text style={styles.infoValue}>{voyage.nombre_places_restantes}</Text>
            <Text style={styles.infoLabel}>places dispo.</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>💰</Text>
            <Text style={styles.infoValue}>{formatFCFA(voyage.prix_par_place)}</Text>
            <Text style={styles.infoLabel}>/ personne</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>{voyage.climatise ? "❄" : "🌡"}</Text>
            <Text style={styles.infoValue}>{voyage.climatise ? "Oui" : "Non"}</Text>
            <Text style={styles.infoLabel}>Climatisation</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>{voyage.non_fumeur ? "🚭" : "🚬"}</Text>
            <Text style={styles.infoValue}>{voyage.non_fumeur ? "Non-fumeur" : "Fumeur OK"}</Text>
            <Text style={styles.infoLabel}>Tabac</Text>
          </View>
        </View>

        {voyage.accepte_colis && (
          <Pressable
            style={styles.colisBar}
            onPress={() =>
              router.push({
                pathname: "/(client)/colis/nouveau" as any,
                params: {
                  ville_depart: voyage.ville_depart,
                  ville_arrivee: voyage.ville_arrivee,
                },
              })
            }
          >
            <View style={styles.colisBarContent}>
              <Text style={styles.colisIcon}>📦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.colisText}>Ce chauffeur accepte les colis</Text>
                <Text style={styles.colisHint}>Appuyez pour envoyer un colis →</Text>
              </View>
            </View>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerPrice}>{formatFCFA(voyage.prix_par_place)}</Text>
          <Text style={styles.footerPriceSub}>par personne</Text>
        </View>
        <Button
          size="lg"
          disabled={!canReserve}
          onPress={() =>
            router.push({
              pathname: "/(client)/voyages/confirm" as any,
              params: { voyage_id: voyage.id, prix: String(voyage.prix_par_place) },
            })
          }
          style={styles.reserveBtn}
        >
          {canReserve
            ? "Réserver"
            : isOwner
            ? "Votre voyage"
            : voyage.nombre_places_restantes === 0
            ? "Complet"
            : STATUS_LABEL[voyage.statut]}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 120, gap: spacing.xl, paddingTop: 56 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl },
  errorText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  backBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  backBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  headerBack: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.md,
  },
  headerBackText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  routeCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.xl,
    ...shadows.md,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },
  routeRow: { gap: spacing.md },
  routeStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  routeDotEnd: { backgroundColor: colors.black },
  routeConnector: { flexDirection: "row", alignItems: "center", paddingLeft: 6, gap: spacing.sm },
  routeLine: { width: 2, height: 24, backgroundColor: colors.border },
  routeDistance: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  routeCity: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  routeTime: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  routeAddress: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 240,
  },
  fullDate: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: spacing["2xl"],
    gap: spacing.md,
  },
  infoItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
    ...shadows.sm,
  },
  infoIcon: { fontSize: 28 },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  colisBar: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.successBg,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
  },
  colisBarContent: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  colisIcon: { fontSize: 28 },
  colisText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
  colisHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.xl,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  footerPrice: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
  },
  footerPriceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  reserveBtn: { flex: 1, marginLeft: spacing.xl },
});