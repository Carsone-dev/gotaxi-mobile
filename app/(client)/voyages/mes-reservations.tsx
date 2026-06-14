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
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useMyReservations,
  useCancelReservation,
} from "@/src/hooks/useReservations";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Reservation, ReservationStatus } from "@/src/api/types";

// ── Config statuts ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ReservationStatus, { label: string; color: string; bg: string; icon: string }> = {
  EN_ATTENTE: { label: "En attente",  color: colors.warningText,    bg: colors.warningBg,  icon: "⏳" },
  CONFIRMEE:  { label: "Confirmée",   color: colors.success,        bg: colors.successBg,  icon: "✅" },
  REFUSEE:    { label: "Refusée",     color: colors.error,          bg: colors.errorBg,    icon: "❌" },
  ANNULEE:    { label: "Annulée",     color: colors.textMuted,      bg: colors.surface,    icon: "🚫" },
  TERMINEE:   { label: "Terminée",    color: colors.textSecondary,  bg: colors.surface,    icon: "🏁" },
};

// ── Timeline statuts ──────────────────────────────────────────────────────────
const ETAPES: { statut: ReservationStatus; label: string }[] = [
  { statut: "EN_ATTENTE", label: "Envoyée" },
  { statut: "CONFIRMEE",  label: "Confirmée" },
  { statut: "TERMINEE",   label: "Terminée" },
];
const ORDRE: Partial<Record<ReservationStatus, number>> = {
  EN_ATTENTE: 0,
  CONFIRMEE: 1,
  TERMINEE: 2,
};

// ── Nodes FlatList ────────────────────────────────────────────────────────────
type NodeSection = { kind: "section"; id: string; label: string; count: number };
type NodeItem    = { kind: "item";    id: string; data: Reservation; index: number };
type Node = NodeSection | NodeItem;

// ── Carte réservation ─────────────────────────────────────────────────────────
function ReservationCard({ reservation, index }: { reservation: Reservation; index: number }) {
  const { showToast } = useToast();
  const { mutateAsync: cancel, isPending } = useCancelReservation();

  const cfg     = STATUS_CFG[reservation.statut];
  const voyage  = reservation.voyage;
  const canCancel   = reservation.statut === "EN_ATTENTE" || reservation.statut === "CONFIRMEE";
  const isTerminal  = reservation.statut === "REFUSEE" || reservation.statut === "ANNULEE" || reservation.statut === "TERMINEE";
  const isConfirmed = reservation.statut === "CONFIRMEE";

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
      ],
    );
  };

  return (
    <Animated.View entering={FadeInDown.duration(280).delay(index * 70)}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => voyage && router.push(`/(client)/voyages/${voyage.id}` as any)}
      >
        {/* Barre accent top */}
        <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />

        {/* Status header */}
        <View style={[styles.statusRow, { backgroundColor: cfg.bg }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: `${cfg.color}22` }]}>
            <Text style={styles.statusIconText}>{cfg.icon}</Text>
          </View>
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          {isConfirmed && reservation.code_confirmation ? (
            <View style={styles.codePill}>
              <Text style={styles.codeLabel}>CODE</Text>
              <Text style={styles.codeValue}>{reservation.code_confirmation}</Text>
            </View>
          ) : null}
        </View>

        {/* Trajet */}
        {voyage ? (
          <View style={styles.tripBlock}>
            {/* Route timeline */}
            <View style={styles.routeWrap}>
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, styles.routeDotStart]} />
              <View style={styles.routeMiddle} />
              <View style={[styles.routeDot, styles.routeDotEnd]} />
            </View>
            <View style={styles.routeCities}>
              <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
            </View>

            {/* Heure + date */}
            <View style={styles.timeRow}>
              <Text style={styles.departureTime}>{formatTime(voyage.date_depart)}</Text>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>
                  {format(new Date(voyage.date_depart), "EEE d MMM", { locale: fr })}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Résumé places + prix */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{reservation.nombre_places}</Text>
            <Text style={styles.summaryLabel}>place{reservation.nombre_places > 1 ? "s" : ""}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.summaryPrice]}>
              {formatFCFA(reservation.prix_total)}
            </Text>
            <Text style={styles.summaryLabel}>total à payer</Text>
          </View>
        </View>

        {/* Timeline progression */}
        {!isTerminal && (
          <View style={styles.timeline}>
            {ETAPES.map((etape, idx) => {
              const currentOrder = ORDRE[reservation.statut] ?? 0;
              const etapeOrder   = ORDRE[etape.statut] ?? 0;
              const done   = etapeOrder < currentOrder;
              const active = etape.statut === reservation.statut;

              return (
                <View key={etape.statut} style={styles.timelineStep}>
                  {/* Connecteur gauche */}
                  {idx > 0 && (
                    <View style={[styles.timelineConnector, done && styles.timelineConnectorDone]} />
                  )}

                  <View style={[
                    styles.timelineDot,
                    done   && styles.timelineDotDone,
                    active && styles.timelineDotActive,
                  ]}>
                    {done   && <Text style={styles.timelineCheck}>✓</Text>}
                    {active && <View style={styles.timelinePulse} />}
                  </View>

                  <Text style={[
                    styles.timelineLabel,
                    done   && styles.timelineLabelDone,
                    active && styles.timelineLabelActive,
                  ]}>
                    {etape.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Bouton annuler */}
        {canCancel && (
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
            onPress={(e) => { e.stopPropagation(); handleCancel(); }}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator size="small" color={colors.error} />
              : <Text style={styles.cancelBtnText}>Annuler cette réservation</Text>
            }
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function MesReservationsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useMyReservations();

  const active = data?.filter(
    (r) => r.statut === "EN_ATTENTE" || r.statut === "CONFIRMEE",
  ) ?? [];
  const history = data?.filter(
    (r) => r.statut === "REFUSEE" || r.statut === "ANNULEE" || r.statut === "TERMINEE",
  ) ?? [];

  const nodes: Node[] = [];
  let itemIndex = 0;
  if (active.length > 0) {
    nodes.push({ kind: "section", id: "s-active", label: "En cours", count: active.length });
    active.forEach((r) => nodes.push({ kind: "item", id: r.id, data: r, index: itemIndex++ }));
  }
  if (history.length > 0) {
    nodes.push({ kind: "section", id: "s-history", label: "Historique", count: history.length });
    history.forEach((r) => nodes.push({ kind: "item", id: r.id, data: r, index: itemIndex++ }));
  }

  return (
    <View style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mes réservations</Text>
          <Text style={styles.headerSub}>Suivez vos trajets réservés</Text>
        </View>
        <Pressable
          onPress={() => refetch()}
          disabled={isRefetching || isLoading}
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
        >
          {isLoading || isRefetching
            ? <ActivityIndicator color={colors.primary} size="small" />
            : <Text style={styles.refreshIcon}>↻</Text>
          }
        </Pressable>
      </View>

      {/* ── Liste ──────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList<Node>
          data={nodes}
          keyExtractor={(n) => n.id}
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎫</Text>
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptySub}>
                Recherchez un trajet et réservez votre place en quelques secondes.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
                onPress={() => router.push("/(client)/voyages" as any)}
              >
                <Text style={styles.emptyBtnTxt}>Rechercher un trajet</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === "section") {
              return (
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>{item.label}</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{item.count}</Text>
                  </View>
                </View>
              );
            }
            return <ReservationCard reservation={item.data} index={item.index} />;
          }}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },

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
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIcon: {
    fontSize: 18,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 20,
  },

  // Liste
  listContent: {
    padding: spacing["2xl"],
    paddingBottom: 48,
    gap: spacing.md,
  },

  // Section header
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionBadge: {
    backgroundColor: colors.border,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  sectionBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardPressed: { opacity: 0.86 },
  cardAccent: { height: 4 },

  // Status row
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconText: { fontSize: 15 },
  statusLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
  },
  codePill: {
    backgroundColor: colors.successBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 8,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  codeValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    letterSpacing: 2,
  },

  // Trip block
  tripBlock: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  routeWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 14,
  },
  routeLine: {
    position: "absolute",
    left: 7,
    right: 7,
    height: 2,
    backgroundColor: colors.border,
  },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 1,
  },
  routeDotStart: { backgroundColor: colors.primary },
  routeDotEnd:   { backgroundColor: colors.black },
  routeMiddle:   { flex: 1 },
  routeCities: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeCity: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  departureTime: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  dateBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
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
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: 2 },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  summaryPrice: { color: colors.primary },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Timeline progression
  timeline: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timelineStep: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    position: "relative",
  },
  timelineConnector: {
    position: "absolute",
    top: 11,
    left: "-50%",
    right: "50%",
    height: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  timelineConnectorDone: { backgroundColor: colors.primary },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timelineDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  timelineDotActive: { borderColor: colors.primary },
  timelinePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  timelineCheck: {
    fontSize: 12,
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
  },
  timelineLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textAlign: "center",
  },
  timelineLabelDone:   { color: colors.primary },
  timelineLabelActive: { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold },

  // Cancel
  cancelBtn: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
    backgroundColor: colors.errorBg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
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
  emptyEmoji: { fontSize: 52 },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
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
  emptyBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.md,
  },
  emptyBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});
