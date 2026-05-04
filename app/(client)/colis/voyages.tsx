import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useVoyagesAcceptantColis } from "@/src/hooks/useColis";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage } from "@/src/api/types";

// ─── Helpers statut ───────────────────────────────────────────────────────────

type StatutVoyage = "PUBLIE" | "COMPLET" | "EN_COURS" | string;

function getStatusConfig(statut: StatutVoyage) {
  switch (statut) {
    case "EN_COURS":
      return {
        icon: "🚗",
        label: "En route",
        bg: colors.infoBg,
        text: colors.info,
        btnLabel: "Confier le colis →",
      };
    case "COMPLET":
      return {
        icon: "⚡",
        label: "Complet — colis OK",
        bg: colors.warningBg,
        text: colors.warningText,
        btnLabel: "Confier le colis →",
      };
    default:
      return {
        icon: "✅",
        label: "Disponible",
        bg: colors.successBg,
        text: colors.primary,
        btnLabel: "Choisir ce chauffeur →",
      };
  }
}

// ─── Carte voyage ─────────────────────────────────────────────────────────────

function VoyageColisCard({
  voyage,
  onSelect,
}: {
  voyage: Voyage;
  onSelect: () => void;
}) {
  const status = getStatusConfig(voyage.statut);

  return (
    <Pressable style={styles.card} onPress={onSelect}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTimeBlock}>
          <Text style={styles.cardTime}>{formatTime(voyage.date_depart)}</Text>
          <Text style={styles.cardDate}>
            {format(new Date(voyage.date_depart), "EEE d MMM", { locale: fr })}
          </Text>
        </View>
        <View style={[styles.statusTag, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusTagText, { color: status.text }]}>
            {status.icon} {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <Text style={styles.routePoint} numberOfLines={1}>{voyage.point_depart}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, styles.routeDotEnd]} />
          <Text style={styles.routePoint} numberOfLines={1}>{voyage.point_arrivee}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>📦 Accepte colis</Text>
          </View>
          {voyage.climatise && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>❄️ Climatisé</Text>
            </View>
          )}
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>Prix colis</Text>
          <Text style={styles.price}>{formatFCFA(voyage.prix_par_place)}</Text>
        </View>
      </View>

      <View style={[styles.selectBtn, voyage.statut === "EN_COURS" && styles.selectBtnInRoute]}>
        <Text style={styles.selectBtnText}>{status.btnLabel}</Text>
      </View>
    </Pressable>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

type Params = {
  ville_depart: string;
  ville_arrivee: string;
  description: string;
  categorie: string;
  poids_kg: string;
  fragile: string;
  destinataire_nom: string;
  destinataire_telephone: string;
};

export default function VoyagesColisScreen() {
  const params = useLocalSearchParams<Params>();
  const { ville_depart, ville_arrivee } = params;

  const { data: voyages, isLoading, refetch, isRefetching } = useVoyagesAcceptantColis(
    ville_depart ?? "",
    ville_arrivee ?? "",
  );

  const handleSelect = (voyage: Voyage) => {
    router.push({
      pathname: "/(client)/colis/confirmer" as any,
      params: { ...params, voyage_id: voyage.id },
    });
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>Choisir un chauffeur</Text>
        <Text style={styles.subtitle}>
          {ville_depart} → {ville_arrivee}
        </Text>
        <View style={styles.filterInfo}>
          <Text style={styles.filterIcon}>📦</Text>
          <Text style={styles.filterText}>Uniquement les chauffeurs acceptant les colis</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {(voyages?.length ?? 0) === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>😔</Text>
              <Text style={styles.emptyTitle}>Aucun chauffeur disponible</Text>
              <Text style={styles.emptySub}>
                Aucun trajet {ville_depart} → {ville_arrivee} n'accepte de colis pour le moment.
                Réessayez plus tard.
              </Text>
              <Pressable onPress={() => router.back()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Modifier ma recherche</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.countLabel}>
                {voyages!.length} chauffeur{voyages!.length > 1 ? "s" : ""} trouvé{voyages!.length > 1 ? "s" : ""}
              </Text>
              {voyages!.map((v) => (
                <VoyageColisCard key={v.id} voyage={v} onSelect={() => handleSelect(v)} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  backBtn: { marginBottom: spacing.sm },
  backText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  filterInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  filterIcon: { fontSize: 14 },
  filterText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },

  listContent: { padding: spacing["2xl"], paddingBottom: 40, gap: spacing.md },

  countLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTimeBlock: { gap: 2 },
  cardTime: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  statusTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusTagText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },

  cardBody: { gap: 6, paddingHorizontal: spacing.xs },
  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  routeDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary,
  },
  routeDotEnd: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  routeLine: {
    width: 2, height: 14, backgroundColor: colors.border,
    marginLeft: 4,
  },
  routePoint: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  badges: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap", flex: 1 },
  badge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  priceBlock: { alignItems: "flex-end" },
  priceLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  price: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },

  selectBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  selectBtnInRoute: {
    backgroundColor: colors.info,
  },
  selectBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },

  empty: {
    alignItems: "center",
    paddingTop: spacing["4xl"],
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
});
