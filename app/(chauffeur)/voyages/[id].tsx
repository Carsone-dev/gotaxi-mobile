import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
  EN_ATTENTE_PAIEMENT: { label: "Paiement en attente", color: colors.warningText, bg: colors.warningBg },
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

  const [activeTab, setActiveTab] = useState<"passagers" | "colis">("passagers");

  useEffect(() => {
    if (activeTab === "colis" && !voyage?.accepte_colis) {
      setActiveTab("passagers");
    }
  }, [activeTab, voyage?.accepte_colis]);

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
  const showTabs = voyage.statut !== "ANNULE";
  const showColisTab = showTabs && voyage.accepte_colis;
  const pendingResaCount = reservations?.filter((r) => r.statut === "EN_ATTENTE").length ?? 0;
  const pendingColisCount = colisList?.filter((c) => c.statut === "EN_ATTENTE").length ?? 0;

  const activeList = activeTab === "colis" ? colisList : reservations;
  const activeLoading = activeTab === "colis" ? colisLoading : resaLoading;
  const isRefreshing = activeTab === "colis" ? false : isRefetching;
  const handleRefresh = () => {
    refetch();
    if (activeTab === "colis") refetchColis();
    else refetchReservations();
  };

  return (
    <View style={styles.screen}>
      {/* ── En-tête fixe ── */}
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

      {/* ── Résumé fixe (non scrollable) ── */}
      <View style={styles.summaryContent}>
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
      </View>

      {/* ── Onglets Passagers / Colis ── */}
      {showTabs ? (
        <>
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabBtn, activeTab === "passagers" && styles.tabBtnActive]}
              onPress={() => setActiveTab("passagers")}
            >
              <Text style={[styles.tabBtnText, activeTab === "passagers" && styles.tabBtnTextActive]}>
                Passagers{reservations ? ` (${reservations.length})` : ""}
              </Text>
              {pendingResaCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingResaCount}</Text>
                </View>
              )}
            </Pressable>
            {showColisTab && (
              <Pressable
                style={[styles.tabBtn, activeTab === "colis" && styles.tabBtnActive]}
                onPress={() => setActiveTab("colis")}
              >
                <Text style={[styles.tabBtnText, activeTab === "colis" && styles.tabBtnTextActive]}>
                  Colis{colisList ? ` (${colisList.length})` : ""}
                </Text>
                {pendingColisCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{pendingColisCount}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>

          {/* ── Contenu de l'onglet actif (seule zone scrollable) ── */}
          {activeTab === "passagers" ? (
            resaError ? (
              <View style={styles.errorRow}>
                <Text style={styles.errorRowText}>
                  ⚠️ {(resaErrorObj as any)?.response?.data?.detail ?? (resaErrorObj as any)?.message ?? "Erreur de chargement"}
                </Text>
                <Pressable onPress={() => refetchReservations()} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Réessayer</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                style={styles.listArea}
                data={reservations ?? []}
                keyExtractor={(r) => r.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                }
                renderItem={({ item }) => (
                  <PassagerCard
                    reservation={item}
                    voyageStatut={voyage.statut}
                    onAction={handleResaAction}
                  />
                )}
                ListEmptyComponent={
                  activeLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
                  ) : (
                    <Text style={styles.emptyText}>Aucune réservation pour ce voyage</Text>
                  )
                }
              />
            )
          ) : (
            <FlatList
              style={styles.listArea}
              data={colisList ?? []}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
              }
              renderItem={({ item }) => (
                <ColisCard
                  colis={item}
                  voyageStatut={voyage.statut}
                  onAction={handleColisAction}
                />
              )}
              ListEmptyComponent={
                activeLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
                ) : (
                  <Text style={styles.emptyText}>Aucun colis pour ce voyage</Text>
                )
              }
            />
          )}
        </>
      ) : (
        <View style={styles.cancelledNotice}>
          <Text style={styles.emptyText}>Ce voyage a été annulé.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
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
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    gap: spacing.sm,
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
  summaryContent: { paddingBottom: 0 },
  routeCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 4,
    ...shadows.sm,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  routeTextBlock: { flex: 1, gap: 0 },
  routeLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  routeCity: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  routeAddress: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  routeConnector: {
    paddingLeft: 3,
    paddingVertical: 2,
  },
  routeLine: {
    width: 2,
    height: 10,
    backgroundColor: colors.border,
    marginLeft: 0,
  },
  infoCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  infoGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoCell: { flex: 1, alignItems: "center", gap: 1 },
  infoDivider: { width: 1, height: 28, backgroundColor: colors.border },
  infoCellLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoCellValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  infoCellSub: {
    fontSize: 9,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  actionsCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  actionBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  navBtn: {
    backgroundColor: "#1a1a2e",
    flexBasis: "100%",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
  },
  tabBtnTextActive: { color: colors.primary },
  tabBadge: {
    backgroundColor: colors.warningBg,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.warningText,
  },
  listArea: { flex: 1, backgroundColor: colors.surface },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  cancelledNotice: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
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
});
