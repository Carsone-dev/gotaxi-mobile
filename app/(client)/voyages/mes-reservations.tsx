import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router } from "expo-router";
import {
  useMyReservations,
  useCancelReservation,
} from "@/src/hooks/useReservations";
import { formatFCFA, formatDate, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Reservation, ReservationStatus } from "@/src/api/types";

// ─── Config statuts ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string; icon: string }> = {
  EN_ATTENTE: { label: "En attente",  color: colors.warningText, bg: colors.warningBg,  icon: "⏳" },
  CONFIRMEE:  { label: "Confirmée",   color: colors.success,     bg: colors.successBg,  icon: "✅" },
  REFUSEE:    { label: "Refusée",     color: colors.error,       bg: colors.errorBg,    icon: "❌" },
  ANNULEE:    { label: "Annulée",     color: colors.textMuted,   bg: colors.surface,    icon: "🚫" },
  TERMINEE:   { label: "Terminée",    color: colors.textSecondary, bg: colors.surface,  icon: "🏁" },
};

// ─── Étapes timeline ──────────────────────────────────────────────────────────

const ETAPES: { statut: ReservationStatus; label: string }[] = [
  { statut: "EN_ATTENTE", label: "Demande envoyée" },
  { statut: "CONFIRMEE",  label: "Confirmée par le chauffeur" },
  { statut: "TERMINEE",   label: "Voyage terminé" },
];

const ORDRE: Partial<Record<ReservationStatus, number>> = {
  EN_ATTENTE: 0,
  CONFIRMEE: 1,
  TERMINEE: 2,
};

// ─── Carte réservation ────────────────────────────────────────────────────────

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const { showToast } = useToast();
  const { mutateAsync: cancel, isPending } = useCancelReservation();

  const cfg = STATUS_CONFIG[reservation.statut];
  const voyage = reservation.voyage;
  const canCancel = reservation.statut === "EN_ATTENTE" || reservation.statut === "CONFIRMEE";
  const isTerminal = reservation.statut === "REFUSEE" || reservation.statut === "ANNULEE" || reservation.statut === "TERMINEE";

  const handleCancel = () => {
    Alert.alert(
      "Annuler la réservation",
      "Voulez-vous annuler cette réservation ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              await cancel(reservation.id);
              showToast("Réservation annulée.", "info");
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ]
    );
  };

  return (
    <Pressable
      style={[styles.card, reservation.statut === "EN_ATTENTE" && styles.cardPending]}
      onPress={() =>
        voyage && router.push(`/(client)/voyages/${voyage.id}` as any)
      }
    >
      {/* Statut hero */}
      <View style={[styles.statusStrip, { backgroundColor: cfg.bg }]}>
        <Text style={styles.statusIcon}>{cfg.icon}</Text>
        <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        {reservation.statut === "CONFIRMEE" && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>CODE</Text>
            <Text style={styles.codeValue}>{reservation.code_confirmation}</Text>
          </View>
        )}
      </View>

      {/* Trajet */}
      {voyage ? (
        <View style={styles.voyageBlock}>
          <View style={styles.routeRow}>
            <View style={styles.routeStop}>
              <View style={styles.routeDot} />
              <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
            </View>
            <View style={styles.routeConnector}>
              <View style={styles.routeLine} />
            </View>
            <View style={styles.routeStop}>
              <View style={[styles.routeDot, styles.routeDotEnd]} />
              <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
            </View>
          </View>
          <Text style={styles.voyageDate}>
            {formatDate(voyage.date_depart, "EEEE d MMMM")} · {formatTime(voyage.date_depart)}
          </Text>
        </View>
      ) : null}

      {/* Résumé */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{reservation.nombre_places}</Text>
          <Text style={styles.summaryLabel}>place{reservation.nombre_places > 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatFCFA(reservation.prix_total)}</Text>
          <Text style={styles.summaryLabel}>total à payer</Text>
        </View>
      </View>

      {/* Timeline progression */}
      {!isTerminal && (
        <View style={styles.timeline}>
          {ETAPES.map((etape, idx) => {
            const currentOrder = ORDRE[reservation.statut] ?? 0;
            const etapeOrder = ORDRE[etape.statut] ?? 0;
            const done = etapeOrder < currentOrder;
            const active = etape.statut === reservation.statut;

            return (
              <View key={etape.statut} style={styles.timelineStep}>
                <View
                  style={[
                    styles.timelineDot,
                    done && styles.timelineDotDone,
                    active && styles.timelineDotActive,
                  ]}
                >
                  {done && <Text style={styles.timelineCheck}>✓</Text>}
                  {active && <View style={styles.timelineDotInner} />}
                </View>
                {idx < ETAPES.length - 1 && (
                  <View style={[styles.timelineBar, done && styles.timelineBarDone]} />
                )}
                <Text
                  style={[
                    styles.timelineLabel,
                    done && styles.timelineLabelDone,
                    active && styles.timelineLabelActive,
                  ]}
                >
                  {etape.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Annuler */}
      {canCancel && (
        <Pressable
          style={styles.cancelBtn}
          onPress={(e) => { e.stopPropagation(); handleCancel(); }}
          disabled={isPending}
        >
          <Text style={styles.cancelBtnText}>
            {isPending ? "Annulation…" : "Annuler cette réservation"}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

export default function MesReservationsScreen() {
  const { data, isLoading, refetch, isRefetching } = useMyReservations();

  const active = data?.filter(
    (r) => r.statut === "EN_ATTENTE" || r.statut === "CONFIRMEE"
  ) ?? [];
  const history = data?.filter(
    (r) => r.statut === "REFUSEE" || r.statut === "ANNULEE" || r.statut === "TERMINEE"
  ) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mes réservations</Text>
          <Text style={styles.subtitle}>Suivez vos trajets réservés</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={[
            ...(active.length > 0 ? [{ type: "section", label: `En cours (${active.length})`, id: "s1" }] : []),
            ...active.map((r) => ({ type: "item", data: r, id: r.id })),
            ...(history.length > 0 ? [{ type: "section", label: "Historique", id: "s2" }] : []),
            ...history.map((r) => ({ type: "item", data: r, id: r.id })),
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptySubtitle}>Recherchez un trajet pour réserver votre place</Text>
              <Pressable
                style={styles.searchBtn}
                onPress={() => router.push("/(client)/voyages" as any)}
              >
                <Text style={styles.searchBtnText}>Rechercher un trajet</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            if (item.type === "section") {
              return <Text style={styles.sectionLabel}>{item.label}</Text>;
            }
            return <ReservationCard reservation={item.data} />;
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 28,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  list: { padding: spacing["2xl"], gap: spacing.md, paddingBottom: 40 },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    gap: 0,
    ...shadows.sm,
  },
  cardPending: {
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  statusIcon: { fontSize: 18 },
  statusLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },
  codeBox: { alignItems: "center" },
  codeLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    letterSpacing: 2,
  },

  // Voyage block
  voyageBlock: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  routeRow: { flexDirection: "row", alignItems: "center" },
  routeStop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  routeDotEnd: { backgroundColor: colors.black },
  routeCity: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  routeConnector: { flex: 1, alignItems: "center", paddingHorizontal: spacing.sm },
  routeLine: { height: 2, flex: 1, backgroundColor: colors.border },
  voyageDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 1 },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Timeline horizontale
  timeline: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 0,
  },
  timelineStep: { flex: 1, alignItems: "center", gap: spacing.xs },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  timelineDotActive: { borderColor: colors.primary, backgroundColor: colors.white },
  timelineDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  timelineCheck: {
    fontSize: 11,
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
  },
  timelineBar: {
    position: "absolute",
    top: 10,
    left: "50%",
    right: "-50%",
    height: 2,
    backgroundColor: colors.border,
  },
  timelineBarDone: { backgroundColor: colors.primary },
  timelineLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  timelineLabelDone: { color: colors.primary },
  timelineLabelActive: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.semiBold,
  },

  // Cancel
  cancelBtn: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.error,
  },

  // Empty
  empty: {
    alignItems: "center",
    paddingTop: spacing["5xl"],
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: typography.fontFamily.bold ? colors.textPrimary : colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },
  searchBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  searchBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});
