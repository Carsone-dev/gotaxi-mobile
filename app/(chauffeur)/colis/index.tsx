import React, { useState } from "react";
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
import { router } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMyVoyages } from "@/src/hooks/useVoyages";
import {
  useVoyageColis,
  useConfirmerColis,
  useRefuserColis,
  useEnTransitColis,
  useLivrerColis,
} from "@/src/hooks/useColis";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage, Colis, ColisStatut, ColisCategorie, VoyageStatus } from "@/src/api/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

type TabId = "valider" | "en_cours" | "termines";

const TABS: { id: TabId; label: string; statuts: ColisStatut[] }[] = [
  { id: "valider",  label: "À valider",  statuts: ["EN_ATTENTE"] },
  { id: "en_cours", label: "En cours",   statuts: ["CONFIRME", "EN_TRANSIT"] },
  { id: "termines", label: "Terminés",   statuts: ["LIVRE", "ANNULE"] },
];

const STATUT_CONFIG: Record<ColisStatut, { label: string; color: string; bg: string; icon: string }> = {
  EN_ATTENTE: { label: "En attente", color: colors.warningText, bg: colors.warningBg, icon: "⏳" },
  CONFIRME:   { label: "Confirmé",   color: colors.info,        bg: colors.infoBg,    icon: "✅" },
  EN_TRANSIT: { label: "En transit", color: colors.primary,     bg: colors.successBg, icon: "🚗" },
  LIVRE:      { label: "Livré",      color: colors.success,     bg: colors.successBg, icon: "🎉" },
  ANNULE:     { label: "Annulé",     color: colors.error,       bg: colors.errorBg,   icon: "❌" },
};

const CATEGORIE_ICON: Record<ColisCategorie, string> = {
  DOCUMENTS: "📄", VETEMENTS: "👕", ELECTRONIQUE: "📱",
  ALIMENTAIRE: "🍱", FRAGILE: "🔮", AUTRE: "📦",
};

const CATEGORIE_LABEL: Record<ColisCategorie, string> = {
  DOCUMENTS: "Documents", VETEMENTS: "Vêtements", ELECTRONIQUE: "Électronique",
  ALIMENTAIRE: "Alimentaire", FRAGILE: "Fragile", AUTRE: "Autre",
};

const VOYAGE_STATUS_LABEL: Record<VoyageStatus, string> = {
  PUBLIE: "Publié", COMPLET: "Complet", EN_COURS: "En route", TERMINE: "Terminé", ANNULE: "Annulé",
};

const VOYAGE_STATUS_COLOR: Record<VoyageStatus, string> = {
  PUBLIE:   colors.success,
  COMPLET:  colors.warning,
  EN_COURS: colors.info,
  TERMINE:  colors.textSecondary,
  ANNULE:   colors.error,
};

// ─── Carte colis avec actions ─────────────────────────────────────────────────

function ColisActionCard({
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
  const { mutateAsync: enTransit, isPending: transiting  } = useEnTransitColis();
  const { mutateAsync: livrer,    isPending: livering    } = useLivrerColis();

  const cfg  = STATUT_CONFIG[colis.statut];
  const cat  = colis.categorie as ColisCategorie;
  const icon = CATEGORIE_ICON[cat] ?? "📦";

  const canConfirmRefuse = colis.statut === "EN_ATTENTE";
  const canTransit       = colis.statut === "CONFIRME" && voyageStatut === "EN_COURS";
  const canDeliver       = colis.statut === "EN_TRANSIT";

  const handleConfirmer = async () => {
    try {
      await confirmer(colis.id);
      showToast("Colis confirmé ✓", "success");
      onAction();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleRefuser = () =>
    Alert.alert(
      "Refuser le colis",
      `Refuser l'envoi de ${colis.destinataire_nom} ?`,
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
      ],
    );

  const handleEnTransit = async () => {
    try {
      await enTransit(colis.id);
      showToast("Colis mis en transit 🚗", "success");
      onAction();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleLivrer = () =>
    Alert.alert(
      "Marquer comme livré",
      `Confirmer la livraison à ${colis.destinataire_nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Livré ✓",
          onPress: async () => {
            try {
              await livrer(colis.id);
              showToast("Colis livré ! 🎉", "success");
              onAction();
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ],
    );

  return (
    <View style={[cardStyles.card, colis.statut === "EN_ATTENTE" && cardStyles.cardPending]}>

      {/* Photo du colis (si disponible) */}
      {colis.photo_url ? (
        <View style={cardStyles.photoWrap}>
          <Image
            source={{ uri: colis.photo_url }}
            style={cardStyles.photo}
            resizeMode="cover"
          />
          <View style={cardStyles.photoBadge}>
            <Text style={cardStyles.photoBadgeText}>{icon} {CATEGORIE_LABEL[cat]}</Text>
          </View>
          <View style={[cardStyles.photoStatut, { backgroundColor: cfg.bg }]}>
            <Text style={[cardStyles.photoStatutText, { color: cfg.color }]}>
              {cfg.icon}  {cfg.label}
            </Text>
          </View>
        </View>
      ) : null}

      {/* En-tête : code + statut */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.codeBlock}>
          <Text style={cardStyles.codeLabel}>CODE SUIVI</Text>
          <Text style={cardStyles.codeValue}>{colis.code_suivi}</Text>
        </View>
        {!colis.photo_url && (
          <View style={[cardStyles.pill, { backgroundColor: cfg.bg }]}>
            <Text style={[cardStyles.pillText, { color: cfg.color }]}>
              {cfg.icon}  {cfg.label}
            </Text>
          </View>
        )}
      </View>

      {/* Destinataire */}
      <View style={cardStyles.destRow}>
        <Text style={cardStyles.destIcon}>👤</Text>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.destName}>{colis.destinataire_nom}</Text>
          <Text style={cardStyles.destTel}>{colis.destinataire_telephone}</Text>
        </View>
      </View>

      {/* Contenu */}
      <View style={cardStyles.contentRow}>
        <Text style={cardStyles.catChip}>{icon} {CATEGORIE_LABEL[cat]}</Text>
        {colis.poids_kg != null && (
          <Text style={cardStyles.chip}>⚖️ {colis.poids_kg} kg</Text>
        )}
        {colis.fragile && <Text style={[cardStyles.chip, cardStyles.chipFragile]}>🔮 Fragile</Text>}
      </View>

      {colis.description ? (
        <Text style={cardStyles.desc} numberOfLines={2}>{colis.description}</Text>
      ) : null}

      {/* Prix + Modalité */}
      <View style={cardStyles.prixRow}>
        <View style={cardStyles.prixBlock}>
          <Text style={cardStyles.prixLabel}>Prix</Text>
          <Text style={cardStyles.prixValue}>{formatFCFA(colis.prix)}</Text>
        </View>
        <View style={cardStyles.prixDivider} />
        <View style={cardStyles.prixBlock}>
          <Text style={cardStyles.prixLabel}>Paiement</Text>
          <Text style={cardStyles.modaliteValue}>
            {colis.modalite_paiement === "A_LA_CONFIRMATION"
              ? "À la confirmation"
              : "À la livraison"}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {(canConfirmRefuse || canTransit || canDeliver) && (
        <View style={cardStyles.actions}>
          {canConfirmRefuse && (
            <>
              <Pressable
                style={[cardStyles.btn, cardStyles.btnSuccess]}
                onPress={handleConfirmer}
                disabled={confirming || refusing}
              >
                {confirming
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={cardStyles.btnText}>✓ Confirmer</Text>}
              </Pressable>
              <Pressable
                style={[cardStyles.btn, cardStyles.btnDanger]}
                onPress={handleRefuser}
                disabled={confirming || refusing}
              >
                <Text style={cardStyles.btnText}>✕ Refuser</Text>
              </Pressable>
            </>
          )}
          {canTransit && (
            <Pressable
              style={[cardStyles.btn, cardStyles.btnPrimary]}
              onPress={handleEnTransit}
              disabled={transiting}
            >
              {transiting
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={cardStyles.btnText}>🚗 Mettre en transit</Text>}
            </Pressable>
          )}
          {canDeliver && (
            <Pressable
              style={[cardStyles.btn, cardStyles.btnSuccess]}
              onPress={handleLivrer}
              disabled={livering}
            >
              {livering
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={cardStyles.btnText}>🎉 Marquer livré</Text>}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    gap: spacing.md,
    ...shadows.sm,
  },
  cardPending: {
    borderColor: colors.warning,
    borderLeftWidth: 4,
  },

  // Photo
  photoWrap: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
  },
  photoBadge: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  photoBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  photoStatut: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  photoStatutText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },

  // Le reste du padding s'applique à partir du topRow
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  codeBlock: { gap: 2 },
  codeLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  codeValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  pillText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  destRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
  },
  destIcon: { fontSize: 18 },
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
  contentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  catChip: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipFragile: {
    color: colors.warningText,
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  desc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
    paddingHorizontal: spacing.xl,
  },
  prixRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  prixBlock: { flex: 1, alignItems: "center", gap: 2 },
  prixDivider: { width: 1, height: 32, backgroundColor: colors.border },
  prixLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  prixValue: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  modaliteValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, marginTop: -spacing.sm, marginBottom: spacing.xl },
  btn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center", minHeight: 42,
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

// ─── Section par voyage ───────────────────────────────────────────────────────

function VoyageColisSection({
  voyage,
  activeTab,
  onRefetch,
}: {
  voyage: Voyage;
  activeTab: TabId;
  onRefetch: () => void;
}) {
  const { data: colisList, isLoading, refetch } = useVoyageColis(voyage.id);

  const tabStatuts = TABS.find((t) => t.id === activeTab)!.statuts;
  const filtered   = (colisList ?? []).filter((c) => tabStatuts.includes(c.statut));

  if (!isLoading && filtered.length === 0) return null;

  const handleAction = () => {
    refetch();
    onRefetch();
  };

  const statusColor = VOYAGE_STATUS_COLOR[voyage.statut];

  return (
    <View style={sectionStyles.section}>
      {/* En-tête voyage */}
      <Pressable
        style={sectionStyles.header}
        onPress={() => router.push(`/(chauffeur)/voyages/${voyage.id}` as any)}
      >
        <View style={sectionStyles.headerLeft}>
          <Text style={sectionStyles.route}>
            {voyage.ville_depart} → {voyage.ville_arrivee}
          </Text>
          <Text style={sectionStyles.date}>
            {format(new Date(voyage.date_depart), "EEE d MMM", { locale: fr })}
            {"  ·  "}{formatTime(voyage.date_depart)}
          </Text>
        </View>
        <View style={[sectionStyles.statutBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[sectionStyles.statutText, { color: statusColor }]}>
            {VOYAGE_STATUS_LABEL[voyage.statut]}
          </Text>
        </View>
        <Text style={sectionStyles.chevron}>›</Text>
      </Pressable>

      {/* Colis */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
      ) : (
        <View style={sectionStyles.colisGrid}>
          {filtered.map((c) => (
            <ColisActionCard
              key={c.id}
              colis={c}
              voyageStatut={voyage.statut}
              onAction={handleAction}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  section: { marginBottom: spacing["2xl"] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  headerLeft: { flex: 1, gap: 2 },
  route: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  date: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  statutBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statutText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bold,
    lineHeight: 24,
  },
  colisGrid: { gap: spacing.md },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ChauffeurColisScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>("valider");

  const {
    data: voyages,
    isLoading,
    refetch,
    isRefetching,
  } = useMyVoyages();

  const voyagesAvecColis = (voyages ?? []).filter(
    (v) => v.accepte_colis && v.statut !== "ANNULE",
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Mes Colis</Text>
        <Text style={styles.subtitle}>
          {voyagesAvecColis.length > 0
            ? `${voyagesAvecColis.length} voyage${voyagesAvecColis.length > 1 ? "s" : ""} avec livraisons`
            : "Gérez vos livraisons"}
        </Text>
      </View>

      {/* Onglets */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Contenu */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing["3xl"] }} size="large" />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
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
          {voyagesAvecColis.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Aucun voyage avec colis</Text>
              <Text style={styles.emptySub}>
                Activez «&nbsp;Accepte colis&nbsp;» lors de la publication d'un trajet pour recevoir des demandes d'envoi.
              </Text>
              <Pressable
                style={styles.publishBtn}
                onPress={() => router.push("/(chauffeur)/voyages/publish" as any)}
              >
                <Text style={styles.publishBtnText}>Publier un trajet →</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {activeTab === "valider" && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💡 Confirmez les colis que vous acceptez de transporter avant de démarrer votre voyage.
                  </Text>
                </View>
              )}
              {activeTab === "en_cours" && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    🚗 Passez les colis «&nbsp;En transit&nbsp;» une fois votre voyage démarré, puis «&nbsp;Livré&nbsp;» à la remise.
                  </Text>
                </View>
              )}
              {voyagesAvecColis.map((v) => (
                <VoyageColisSection
                  key={v.id}
                  voyage={v}
                  activeTab={activeTab}
                  onRefetch={refetch}
                />
              ))}
              <View style={styles.bottomHint}>
                <Text style={styles.bottomHintText}>
                  Tirez vers le bas pour actualiser
                </Text>
              </View>
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
    gap: 2,
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

  tabs: {
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing["2xl"],
    paddingBottom: 48,
  },

  infoBox: {
    backgroundColor: colors.infoBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.info,
    lineHeight: 20,
  },

  empty: {
    alignItems: "center",
    paddingTop: spacing["4xl"],
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
  },
  emptyIcon: { fontSize: 56 },
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
    lineHeight: 22,
  },
  publishBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  publishBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },

  bottomHint: { alignItems: "center", paddingTop: spacing.xl },
  bottomHintText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
});
