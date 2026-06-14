import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMyVoyages, useStartVoyage, useEndVoyage, useCancelVoyage } from "@/src/hooks/useVoyages";
import { formatFCFA, formatDate, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage, VoyageStatus } from "@/src/api/types";

const STATUS_LABEL: Record<VoyageStatus, string> = {
  PUBLIE: "Publié",
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

export default function ChauffeurVoyagesScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { data: voyages, isLoading, refetch, isRefetching } = useMyVoyages();
  const { mutateAsync: startVoyage, isPending: starting } = useStartVoyage();
  const { mutateAsync: endVoyage, isPending: ending } = useEndVoyage();
  const { mutateAsync: cancelVoyage, isPending: cancelling } = useCancelVoyage();

  const handleAction = async (action: "start" | "end" | "cancel", id: string) => {
    try {
      if (action === "start") { await startVoyage(id); showToast("Voyage démarré", "success"); }
      if (action === "end") { await endVoyage(id); showToast("Voyage terminé", "success"); }
      if (action === "cancel") { await cancelVoyage(id); showToast("Voyage annulé", "info"); }
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const renderVoyage = ({ item: v }: { item: Voyage }) => (
    <Pressable
      style={styles.voyageCard}
      onPress={() => router.push(`/(chauffeur)/voyages/${v.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.routeRow}>
          <Text style={styles.city}>{v.ville_depart}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.city}>{v.ville_arrivee}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${STATUS_COLOR[v.statut]}20` }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[v.statut] }]}>
            {STATUS_LABEL[v.statut]}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>📅 {formatDate(v.date_depart)} à {formatTime(v.date_depart)}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>💺 {v.nombre_places_restantes}/{v.nombre_places_total} places</Text>
        <Text style={styles.infoText}>💰 {formatFCFA(v.prix_par_place)} / pers.</Text>
      </View>

      {(v.statut === "PUBLIE" || v.statut === "COMPLET") && (
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnGreen]}
            onPress={() => handleAction("start", v.id)}
            disabled={starting}
          >
            <Text style={styles.actionBtnText}>▶ Démarrer</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnRed]}
            onPress={() => handleAction("cancel", v.id)}
            disabled={cancelling}
          >
            <Text style={styles.actionBtnText}>✕ Annuler</Text>
          </Pressable>
        </View>
      )}

      {v.statut === "EN_COURS" && (
        <Pressable
          style={[styles.actionBtn, styles.actionBtnBlue, { flex: undefined, width: "100%" }]}
          onPress={() => handleAction("end", v.id)}
          disabled={ending}
        >
          <Text style={styles.actionBtnText}>■ Terminer le voyage</Text>
        </Pressable>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Mes Voyages</Text>
        <Pressable
          style={styles.publishBtn}
          onPress={() => router.push("/(chauffeur)/voyages/publish" as any)}
        >
          <Text style={styles.publishBtnText}>+ Publier</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={voyages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>Aucun voyage</Text>
              <Text style={styles.emptyText}>Publiez votre premier trajet !</Text>
            </View>
          }
          renderItem={renderVoyage}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  publishBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  publishBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  list: { padding: spacing["2xl"], gap: spacing.md },
  voyageCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  city: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  arrow: {
    fontSize: typography.fontSize.lg,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  actionsRow: { flexDirection: "row", gap: spacing.md },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
  },
  actionBtnGreen: { backgroundColor: colors.primary },
  actionBtnRed: { backgroundColor: colors.error },
  actionBtnBlue: { backgroundColor: colors.info },
  actionBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  empty: { alignItems: "center", paddingTop: spacing["5xl"], gap: spacing.md },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
});