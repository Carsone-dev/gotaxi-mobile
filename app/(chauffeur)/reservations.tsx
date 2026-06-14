import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useIncomingReservations,
  useAcceptReservation,
  useRejectReservation,
} from "@/src/hooks/useReservations";
import { formatFCFA, formatDate, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Reservation, ReservationStatus } from "@/src/api/types";

type Tab = "pending" | "confirmed";

const STATUS_COLOR: Record<ReservationStatus, string> = {
  EN_ATTENTE: colors.warning,
  CONFIRMEE: colors.success,
  REFUSEE: colors.error,
  ANNULEE: colors.textMuted,
  TERMINEE: colors.textSecondary,
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
  TERMINEE: "Terminée",
};

// ─── Avatar initiales ─────────────────────────────────────────────────────────

function Avatar({ photoUrl, nom, prenom }: { photoUrl: string | null; nom: string; prenom: string }) {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={avatarStyles.img} />;
  }
  const initials = `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
  return (
    <View style={avatarStyles.placeholder}>
      <Text style={avatarStyles.initials}>{initials}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  img: { width: 48, height: 48, borderRadius: 24 },
  placeholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});

// ─── Note étoile ──────────────────────────────────────────────────────────────

function StarRating({ note, count }: { note: number; count: number }) {
  return (
    <View style={ratingStyles.row}>
      <Text style={ratingStyles.star}>★</Text>
      <Text style={ratingStyles.note}>{note.toFixed(1)}</Text>
      <Text style={ratingStyles.count}>({count})</Text>
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  star: { fontSize: 13, color: colors.warning },
  note: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  count: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
});

// ─── Carte réservation ────────────────────────────────────────────────────────

function ReservationCard({
  reservation,
  showActions,
}: {
  reservation: Reservation;
  showActions: boolean;
}) {
  const { showToast } = useToast();
  const { mutateAsync: accept, isPending: accepting } = useAcceptReservation();
  const { mutateAsync: reject, isPending: rejecting } = useRejectReservation();

  const client = reservation.client;
  const voyage = reservation.voyage;

  const handleAccept = async () => {
    try {
      await accept(reservation.id);
      showToast("Réservation acceptée ✓", "success");
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleReject = async () => {
    try {
      await reject(reservation.id);
      showToast("Réservation refusée", "info");
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  return (
    <View style={cardStyles.card}>
      {/* Profil client */}
      <View style={cardStyles.clientRow}>
        {client ? (
          <Avatar photoUrl={client.photo_url} nom={client.nom} prenom={client.prenom} />
        ) : (
          <View style={[avatarStyles.placeholder, { backgroundColor: colors.border }]}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
        )}
        <View style={cardStyles.clientInfo}>
          {client ? (
            <>
              <Text style={cardStyles.clientName}>
                {client.prenom} {client.nom}
              </Text>
              <StarRating note={client.note_moyenne} count={client.nombre_avis} />
            </>
          ) : (
            <Text style={cardStyles.clientName}>Client</Text>
          )}
        </View>
        <View style={[cardStyles.statusBadge, { backgroundColor: `${STATUS_COLOR[reservation.statut]}18` }]}>
          <Text style={[cardStyles.statusText, { color: STATUS_COLOR[reservation.statut] }]}>
            {STATUS_LABEL[reservation.statut]}
          </Text>
        </View>
      </View>

      {/* Trajet */}
      {voyage && (
        <View style={cardStyles.voyageRow}>
          <View style={cardStyles.routeChip}>
            <View style={cardStyles.routeDot} />
            <Text style={cardStyles.routeCity} numberOfLines={1}>{voyage.ville_depart}</Text>
            <Text style={cardStyles.routeArrow}>→</Text>
            <View style={[cardStyles.routeDot, cardStyles.routeDotEnd]} />
            <Text style={cardStyles.routeCity} numberOfLines={1}>{voyage.ville_arrivee}</Text>
          </View>
          <Text style={cardStyles.voyageDate}>
            {formatDate(voyage.date_depart)} · {formatTime(voyage.date_depart)}
          </Text>
        </View>
      )}

      {/* Résumé places & prix */}
      <View style={cardStyles.summaryRow}>
        <View style={cardStyles.summaryItem}>
          <Text style={cardStyles.summaryIcon}>💺</Text>
          <Text style={cardStyles.summaryValue}>{reservation.nombre_places}</Text>
          <Text style={cardStyles.summaryLabel}>place{reservation.nombre_places > 1 ? "s" : ""}</Text>
        </View>
        <View style={cardStyles.summaryDivider} />
        <View style={cardStyles.summaryItem}>
          <Text style={cardStyles.summaryIcon}>💰</Text>
          <Text style={cardStyles.summaryValue}>{formatFCFA(reservation.prix_total)}</Text>
          <Text style={cardStyles.summaryLabel}>total</Text>
        </View>
        {reservation.statut === "CONFIRMEE" && (
          <>
            <View style={cardStyles.summaryDivider} />
            <View style={cardStyles.summaryItem}>
              <Text style={cardStyles.summaryIcon}>🔑</Text>
              <Text style={cardStyles.summaryValue}>{reservation.code_confirmation}</Text>
              <Text style={cardStyles.summaryLabel}>code</Text>
            </View>
          </>
        )}
      </View>

      {/* Actions accepter / refuser */}
      {showActions && reservation.statut === "EN_ATTENTE" && (
        <View style={cardStyles.actions}>
          <Pressable
            style={[cardStyles.btn, cardStyles.btnAccept]}
            onPress={handleAccept}
            disabled={accepting || rejecting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={cardStyles.btnText}>✓ Accepter</Text>
            )}
          </Pressable>
          <Pressable
            style={[cardStyles.btn, cardStyles.btnReject]}
            onPress={handleReject}
            disabled={accepting || rejecting}
          >
            {rejecting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={cardStyles.btnText}>✕ Refuser</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  clientRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  clientInfo: { flex: 1, gap: 2 },
  clientName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  voyageRow: { gap: spacing.xs },
  routeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignSelf: "flex-start",
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  routeDotEnd: { backgroundColor: colors.black },
  routeCity: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    maxWidth: 100,
  },
  routeArrow: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.medium,
  },
  voyageDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    paddingLeft: spacing.xs,
    textTransform: "capitalize",
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  summaryIcon: { fontSize: 16 },
  summaryValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  actions: { flexDirection: "row", gap: spacing.md },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  btnAccept: { backgroundColor: colors.success },
  btnReject: { backgroundColor: colors.error },
  btnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ReservationsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("pending");
  const {
    data: incoming,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useIncomingReservations();

  const pendingList = incoming?.filter((r) => r.statut === "EN_ATTENTE") ?? [];
  const pendingCount = pendingList.length;
  const confirmedList = incoming?.filter((r) => r.statut === "CONFIRMEE") ?? [];

  const data = tab === "pending" ? pendingList : confirmedList;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Réservations</Text>
          <Text style={styles.subtitle}>Gérez les demandes de vos passagers</Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "pending" && styles.tabActive]}
          onPress={() => setTab("pending")}
        >
          <Text style={[styles.tabText, tab === "pending" && styles.tabTextActive]}>
            À valider
            {pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "confirmed" && styles.tabActive]}
          onPress={() => setTab("confirmed")}
        >
          <Text style={[styles.tabText, tab === "confirmed" && styles.tabTextActive]}>
            Confirmées
            {confirmedList.length > 0 ? ` (${confirmedList.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Erreur de chargement</Text>
          <Text style={styles.emptySubtitle}>
            {(error as any)?.response?.data?.detail ?? (error as any)?.message ?? "Impossible de charger les réservations"}
          </Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{tab === "pending" ? "✓" : "🎉"}</Text>
              <Text style={styles.emptyTitle}>
                {tab === "pending"
                  ? "Aucune demande en attente"
                  : "Aucune réservation confirmée"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {tab === "pending"
                  ? "Les nouvelles demandes apparaîtront ici"
                  : "Les passagers confirmés apparaîtront ici"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReservationCard
              reservation={item}
              showActions={tab === "pending"}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  headerLeft: { flex: 1, gap: 2 },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  notifBadge: {
    backgroundColor: colors.error,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    marginTop: 4,
  },
  notifBadgeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  list: { padding: spacing["2xl"], gap: spacing.md },
  empty: { alignItems: "center", paddingTop: spacing["5xl"], gap: spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing["2xl"],
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  retryBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});
