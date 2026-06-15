import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  useVoyageDetail,
  useStartVoyage,
  useEndVoyage,
  useCancelVoyage,
  useVoyageReservations,
} from "@/src/hooks/useVoyages";
import {
  useVoyageColis,
  useConfirmerColis,
  useRefuserColis,
  useLivrerColis,
  useEnTransitColis,
} from "@/src/hooks/useColis";
import {
  useAcceptReservation,
  useRejectReservation,
} from "@/src/hooks/useReservations";
import { formatFCFA, formatDate, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { VoyageStatus, ReservationStatus, Reservation, Colis, ColisStatut, ColisCategorie, UserPublic } from "@/src/api/types";

// ── Colis ─────────────────────────────────────────────────────────────────────

const COLIS_STATUT_CONFIG: Record<ColisStatut, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: "En attente",  color: colors.warningText, bg: colors.warningBg },
  CONFIRME:   { label: "Confirmé",    color: colors.info,        bg: colors.infoBg    },
  EN_TRANSIT: { label: "En transit",  color: colors.primary,     bg: colors.successBg },
  LIVRE:      { label: "Livré",       color: colors.success,     bg: colors.successBg },
  ANNULE:     { label: "Annulé",      color: colors.error,       bg: colors.errorBg   },
};

const CATEGORIE_ICON: Record<ColisCategorie, string> = {
  DOCUMENTS:    "📄",
  VETEMENTS:    "👕",
  ELECTRONIQUE: "📱",
  ALIMENTAIRE:  "🍱",
  FRAGILE:      "🔮",
  AUTRE:        "📦",
};

const CATEGORIE_LABEL: Record<ColisCategorie, string> = {
  DOCUMENTS:    "Documents",
  VETEMENTS:    "Vêtements",
  ELECTRONIQUE: "Électronique",
  ALIMENTAIRE:  "Alimentaire",
  FRAGILE:      "Fragile",
  AUTRE:        "Autre",
};

function ColisCard({
  colis,
  voyageStatut,
  onAction,
}: {
  colis: Colis;
  voyageStatut: VoyageStatus;
  onAction: () => void;
}) {
  const { showToast } = useToast();
  const { mutateAsync: confirmer, isPending: confirming } = useConfirmerColis();
  const { mutateAsync: refuser,   isPending: refusing   } = useRefuserColis();
  const { mutateAsync: livrer,    isPending: livering    } = useLivrerColis();
  const { mutateAsync: enTransit, isPending: transiting  } = useEnTransitColis();

  const cfg  = COLIS_STATUT_CONFIG[colis.statut] ?? { label: colis.statut, color: colors.textMuted, bg: colors.surface };
  const cat  = colis.categorie as ColisCategorie;
  const icon = CATEGORIE_ICON[cat] ?? "📦";

  const handleConfirmer = async () => {
    try {
      await confirmer(colis.id);
      showToast("Colis confirmé !", "success");
      onAction();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleRefuser = () => {
    Alert.alert(
      "Refuser le colis",
      "Voulez-vous refuser cet envoi ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Refuser",
          style: "destructive",
          onPress: async () => {
            try {
              await refuser(colis.id);
              showToast("Colis refusé.", "info");
              onAction();
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ]
    );
  };

  const handleLivrer = () => {
    Alert.alert(
      "Marquer comme livré",
      `Confirmer la livraison à ${colis.destinataire_nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              await livrer(colis.id);
              showToast("Colis marqué livré !", "success");
              onAction();
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ]
    );
  };

  const handleEnTransit = async () => {
    try {
      await enTransit(colis.id);
      showToast("Colis en transit !", "success");
      onAction();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const canConfirmRefuse = colis.statut === "EN_ATTENTE";
  const canTransit       = colis.statut === "CONFIRME" && voyageStatut === "EN_COURS";
  const canDeliver       = colis.statut === "EN_TRANSIT";

  return (
    <View style={colisStyles.card}>
      <View style={colisStyles.cardTop}>
        <View style={colisStyles.cardLeft}>
          <Text style={colisStyles.catIcon}>{icon}</Text>
        </View>
        <View style={colisStyles.cardBody}>
          <Text style={colisStyles.cardDesc} numberOfLines={1}>{colis.description}</Text>
          <Text style={colisStyles.catLabel}>{CATEGORIE_LABEL[cat]}</Text>
          {colis.fragile && <Text style={colisStyles.fragile}>🔮 Fragile</Text>}
          {colis.poids_kg != null && (
            <Text style={colisStyles.poids}>⚖️ {colis.poids_kg} kg</Text>
          )}
        </View>
        <View style={[colisStyles.pill, { backgroundColor: cfg.bg }]}>
          <Text style={[colisStyles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={colisStyles.destRow}>
        <Text style={colisStyles.destLabel}>Destinataire</Text>
        <Text style={colisStyles.destName}>{colis.destinataire_nom}</Text>
        <Text style={colisStyles.destTel}>{colis.destinataire_telephone}</Text>
      </View>

      <View style={colisStyles.prixRow}>
        <View style={colisStyles.prixBlock}>
          <Text style={colisStyles.prixLabel}>Prix</Text>
          <Text style={colisStyles.prixValue}>{formatFCFA(colis.prix)}</Text>
        </View>
        <View style={colisStyles.modaliteBlock}>
          <Text style={colisStyles.prixLabel}>Transport</Text>
          <Text style={colisStyles.modaliteValue}>À régler avec l'expéditeur</Text>
        </View>
      </View>

      {(canConfirmRefuse || canTransit || canDeliver) && (
        <View style={colisStyles.actions}>
          {canConfirmRefuse && (
            <>
              <Pressable
                style={[colisStyles.btn, colisStyles.btnSuccess]}
                onPress={handleConfirmer}
                disabled={confirming || refusing}
              >
                {confirming
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={colisStyles.btnText}>✓ Confirmer</Text>
                }
              </Pressable>
              <Pressable
                style={[colisStyles.btn, colisStyles.btnDanger]}
                onPress={handleRefuser}
                disabled={confirming || refusing}
              >
                <Text style={colisStyles.btnText}>✕ Refuser</Text>
              </Pressable>
            </>
          )}
          {canTransit && (
            <Pressable
              style={[colisStyles.btn, colisStyles.btnPrimary]}
              onPress={handleEnTransit}
              disabled={transiting}
            >
              {transiting
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={colisStyles.btnText}>🚗 En transit</Text>
              }
            </Pressable>
          )}
          {canDeliver && (
            <Pressable
              style={[colisStyles.btn, colisStyles.btnSuccess]}
              onPress={handleLivrer}
              disabled={livering}
            >
              {livering
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={colisStyles.btnText}>🎉 Marquer livré</Text>
              }
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const colisStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  cardLeft: {
    width: 40, height: 40, borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  catIcon: { fontSize: 22 },
  cardBody: { flex: 1, gap: 2 },
  cardDesc: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  catLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  fragile: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warningText,
  },
  poids: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  destRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  destLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  destName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  destTel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  prixRow: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  prixBlock: { flex: 1, gap: 2 },
  modaliteBlock: { flex: 1, gap: 2 },
  prixLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  prixValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  modaliteValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  btn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center", minHeight: 40,
  },
  btnSuccess: { backgroundColor: colors.success },
  btnDanger:  { backgroundColor: colors.error },
  btnPrimary: { backgroundColor: colors.primary },
  btnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

// ─── Avatar passager ──────────────────────────────────────────────────────────

function PassagerAvatar({ client }: { client: UserPublic | null }) {
  if (!client) {
    return (
      <View style={passagerStyles.avatarPlaceholder}>
        <Text style={{ fontSize: 18 }}>👤</Text>
      </View>
    );
  }
  if (client.photo_url) {
    return <Image source={{ uri: client.photo_url }} style={passagerStyles.avatarImg} />;
  }
  const initials = `${client.prenom[0] ?? ""}${client.nom[0] ?? ""}`.toUpperCase();
  return (
    <View style={passagerStyles.avatarPlaceholder}>
      <Text style={passagerStyles.avatarInitials}>{initials}</Text>
    </View>
  );
}

const passagerStyles = StyleSheet.create({
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});

// ─── Carte passager/réservation ───────────────────────────────────────────────

function PassagerCard({
  reservation,
  voyageStatut,
  onAction,
}: {
  reservation: Reservation;
  voyageStatut: VoyageStatus;
  onAction: () => void;
}) {
  const { showToast } = useToast();
  const { mutateAsync: accept, isPending: accepting } = useAcceptReservation();
  const { mutateAsync: reject, isPending: rejecting } = useRejectReservation();

  const client = reservation.client;
  const isEnAttente = reservation.statut === "EN_ATTENTE";

  const handleAccept = async () => {
    try {
      await accept(reservation.id);
      showToast("Réservation acceptée ✓", "success");
      onAction();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleReject = () => {
    Alert.alert(
      "Refuser la demande",
      `Refuser ${client ? `${client.prenom} ${client.nom}` : "ce passager"} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Refuser",
          style: "destructive",
          onPress: async () => {
            try {
              await reject(reservation.id);
              showToast("Demande refusée.", "info");
              onAction();
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[passagerCardStyles.card, isEnAttente && passagerCardStyles.cardPending]}>
      <View style={passagerCardStyles.row}>
        <PassagerAvatar client={client} />
        <View style={passagerCardStyles.info}>
          {client ? (
            <>
              <Text style={passagerCardStyles.name}>
                {client.prenom} {client.nom}
              </Text>
              <View style={passagerCardStyles.ratingRow}>
                <Text style={passagerCardStyles.star}>★</Text>
                <Text style={passagerCardStyles.rating}>{client.note_moyenne.toFixed(1)}</Text>
                <Text style={passagerCardStyles.ratingCount}>({client.nombre_avis})</Text>
              </View>
            </>
          ) : (
            <Text style={passagerCardStyles.name}>Passager</Text>
          )}
          <Text style={passagerCardStyles.places}>
            {reservation.nombre_places} place{reservation.nombre_places > 1 ? "s" : ""}
            {" · "}{formatFCFA(reservation.prix_total)}
          </Text>
        </View>
        <View style={passagerCardStyles.right}>
          <View style={[passagerCardStyles.badge, { backgroundColor: `${RESA_STATUS_COLOR[reservation.statut]}18` }]}>
            <Text style={[passagerCardStyles.badgeText, { color: RESA_STATUS_COLOR[reservation.statut] }]}>
              {RESA_STATUS_LABEL[reservation.statut]}
            </Text>
          </View>
          {reservation.statut === "CONFIRMEE" && (
            <Text style={passagerCardStyles.code}>{reservation.code_confirmation}</Text>
          )}
        </View>
      </View>

      {isEnAttente && (
        <View style={passagerCardStyles.actions}>
          <Pressable
            style={[passagerCardStyles.btn, passagerCardStyles.btnAccept]}
            onPress={handleAccept}
            disabled={accepting || rejecting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={passagerCardStyles.btnText}>✓ Accepter</Text>
            )}
          </Pressable>
          <Pressable
            style={[passagerCardStyles.btn, passagerCardStyles.btnReject]}
            onPress={handleReject}
            disabled={accepting || rejecting}
          >
            <Text style={passagerCardStyles.btnText}>✕ Refuser</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const passagerCardStyles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  cardPending: {
    borderColor: colors.warning,
    borderLeftWidth: 3,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  info: { flex: 1, gap: 2 },
  name: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  star: { fontSize: 12, color: colors.warning },
  rating: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  ratingCount: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  places: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: { alignItems: "flex-end", gap: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  code: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
  },
  btnAccept: { backgroundColor: colors.success },
  btnReject: { backgroundColor: colors.error },
  btnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

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

const RESA_STATUS_COLOR: Record<ReservationStatus, string> = {
  EN_ATTENTE: colors.warning,
  CONFIRMEE: colors.success,
  REFUSEE: colors.error,
  ANNULEE: colors.textMuted,
  TERMINEE: colors.textSecondary,
};

const RESA_STATUS_LABEL: Record<ReservationStatus, string> = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
  TERMINEE: "Terminée",
};

export default function VoyageDetailChauffeurScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();

  const { data: voyage, isLoading, refetch, isRefetching } = useVoyageDetail(id);
  const canFetchReservations =
    voyage?.statut === "PUBLIE" ||
    voyage?.statut === "COMPLET" ||
    voyage?.statut === "EN_COURS" ||
    voyage?.statut === "TERMINE";
  const {
    data: reservations,
    isLoading: resaLoading,
    isError: resaError,
    error: resaErrorObj,
    refetch: refetchReservations,
  } = useVoyageReservations(id, undefined, canFetchReservations);
  const {
    data: colisList,
    isLoading: colisLoading,
    refetch: refetchColis,
  } = useVoyageColis(id ?? "");

  const { mutateAsync: startVoyage, isPending: starting } = useStartVoyage();
  const { mutateAsync: endVoyage, isPending: ending } = useEndVoyage();
  const { mutateAsync: cancelVoyage, isPending: cancelling } = useCancelVoyage();

  const handleColisAction = () => { refetchColis(); };
  const handleResaAction = () => { refetchReservations(); };

  const handleStart = async () => {
    try {
      await startVoyage(id);
      showToast("Voyage démarré !", "success");
      refetch();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleEnd = async () => {
    try {
      await endVoyage(id);
      showToast("Voyage terminé !", "success");
      refetch();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Annuler le voyage",
      "Êtes-vous sûr ? Toutes les réservations en attente et confirmées seront annulées.",
      [
        { text: "Retour", style: "cancel" },
        {
          text: "Annuler le voyage",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelVoyage(id);
              showToast("Voyage annulé", "info");
              router.back();
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!voyage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Voyage introuvable</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>← Retour</Text>
        </Pressable>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[voyage.statut];
  const canStart = voyage.statut === "PUBLIE" || voyage.statut === "COMPLET";
  const canEnd = voyage.statut === "EN_COURS";
  const canCancel = voyage.statut === "PUBLIE" || voyage.statut === "COMPLET";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Détail du voyage</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABEL[voyage.statut]}
          </Text>
        </View>
      </View>

      {/* Route card */}
      <View style={styles.routeCard}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={styles.routeTextBlock}>
            <Text style={styles.routeLabel}>DÉPART</Text>
            <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
            <Text style={styles.routeAddress}>{voyage.point_depart}</Text>
          </View>
        </View>
        <View style={styles.routeConnector}>
          <View style={styles.routeLine} />
        </View>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
          <View style={styles.routeTextBlock}>
            <Text style={styles.routeLabel}>ARRIVÉE</Text>
            <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
            <Text style={styles.routeAddress}>{voyage.point_arrivee}</Text>
          </View>
        </View>
      </View>

      {/* Info grid */}
      <View style={styles.infoCard}>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>Date</Text>
            <Text style={styles.infoCellValue}>{formatDate(voyage.date_depart)}</Text>
            <Text style={styles.infoCellSub}>{formatTime(voyage.date_depart)}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>Prix / place</Text>
            <Text style={styles.infoCellValue}>{formatFCFA(voyage.prix_par_place)}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>Places</Text>
            <Text style={styles.infoCellValue}>
              {voyage.nombre_places_restantes}/{voyage.nombre_places_total}
            </Text>
            <Text style={styles.infoCellSub}>restantes</Text>
          </View>
        </View>

        <View style={styles.optionsRow}>
          {voyage.climatise && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>❄ Climatisé</Text>
            </View>
          )}
          {voyage.accepte_colis && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>📦 Colis OK</Text>
            </View>
          )}
          {voyage.non_fumeur && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>🚭 Non-fumeur</Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      {(canStart || canEnd || canCancel) && (
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsRow}>
            {canStart && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleStart}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>▶  Démarrer</Text>
                )}
              </Pressable>
            )}
            {canEnd && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.info }]}
                onPress={handleEnd}
                disabled={ending}
              >
                {ending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>■  Terminer</Text>
                )}
              </Pressable>
            )}
            {canEnd && (
              <Pressable
                style={[styles.actionBtn, styles.navBtn]}
                onPress={() =>
                  router.push({
                    pathname: "/(chauffeur)/voyages/navigation" as any,
                    params: { voyage_id: id },
                  })
                }
              >
                <Text style={styles.actionBtnText}>🗺️  Navigation</Text>
              </Pressable>
            )}
            {canCancel && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.error }]}
                onPress={handleCancel}
                disabled={cancelling}
              >
                <Text style={styles.actionBtnText}>✕  Annuler</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Passagers / Réservations */}
      {voyage.statut !== "ANNULE" && (
        <View style={styles.passagersCard}>
          <View style={styles.colisSectionHeader}>
            <Text style={styles.sectionTitle}>
              Passagers{reservations ? ` (${reservations.length})` : ""}
            </Text>
            {reservations && reservations.filter((r) => r.statut === "EN_ATTENTE").length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  {reservations.filter((r) => r.statut === "EN_ATTENTE").length} à valider
                </Text>
              </View>
            )}
          </View>
          {resaLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : resaError ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorRowText}>
                ⚠️ {(resaErrorObj as any)?.response?.data?.detail ?? (resaErrorObj as any)?.message ?? "Erreur de chargement"}
              </Text>
              <Pressable onPress={() => refetchReservations()} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : reservations && reservations.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              {reservations.map((r) => (
                <PassagerCard
                  key={r.id}
                  reservation={r}
                  voyageStatut={voyage.statut}
                  onAction={handleResaAction}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Aucune réservation pour ce voyage</Text>
          )}
        </View>
      )}

      {/* Colis */}
      {voyage.accepte_colis && voyage.statut !== "ANNULE" && (
        <View style={styles.passagersCard}>
          <View style={styles.colisSectionHeader}>
            <Text style={styles.sectionTitle}>
              Colis{colisList ? ` (${colisList.length})` : ""}
            </Text>
            {colisList && colisList.filter((c) => c.statut === "EN_ATTENTE").length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  {colisList.filter((c) => c.statut === "EN_ATTENTE").length} en attente
                </Text>
              </View>
            )}
          </View>

          {colisLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : colisList && colisList.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              {colisList.map((c) => (
                <ColisCard
                  key={c.id}
                  colis={c}
                  voyageStatut={voyage.statut}
                  onAction={handleColisAction}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Aucun colis pour ce voyage</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  backLink: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    gap: spacing.md,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.textPrimary,
    lineHeight: 28,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },
  routeCard: {
    backgroundColor: colors.white,
    margin: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadows.sm,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeTextBlock: { flex: 1, gap: 2 },
  routeLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  routeCity: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  routeAddress: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  routeConnector: {
    paddingLeft: 5,
    paddingVertical: spacing.xs,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 0,
  },
  infoCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.sm,
  },
  infoGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoCell: { flex: 1, alignItems: "center", gap: 2 },
  infoDivider: { width: 1, height: 40, backgroundColor: colors.border },
  infoCellLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCellValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  infoCellSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  actionsCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  actionBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  navBtn: {
    backgroundColor: "#1a1a2e",
    flexBasis: "100%",
  },
  passagersCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  errorRow: {
    gap: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  errorRowText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.error,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  retryBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  colisSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pendingBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  pendingBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.warningText,
  },
});
