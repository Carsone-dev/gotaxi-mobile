import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useColisDetail, useAnnulerColis } from "@/src/hooks/useColis";
import { formatDate, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { ColisStatut, ColisCategorie, ColisModalitePaiement } from "@/src/api/types";
import { formatFCFA } from "@/src/utils/formatters";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<ColisStatut, { label: string; color: string; bg: string; icon: string }> = {
  EN_ATTENTE: { label: "En attente",  color: colors.warningText, bg: colors.warningBg, icon: "⏳" },
  CONFIRME:   { label: "Confirmé",    color: colors.info,        bg: colors.infoBg,    icon: "✅" },
  EN_TRANSIT: { label: "En transit",  color: colors.primary,     bg: colors.successBg, icon: "🚗" },
  LIVRE:      { label: "Livré",       color: colors.success,     bg: colors.successBg, icon: "🎉" },
  ANNULE:     { label: "Annulé",      color: colors.error,       bg: colors.errorBg,   icon: "❌" },
};

const ETAPES: { statut: ColisStatut; label: string }[] = [
  { statut: "EN_ATTENTE", label: "Demande envoyée" },
  { statut: "CONFIRME",   label: "Confirmé par le chauffeur" },
  { statut: "EN_TRANSIT", label: "En transit" },
  { statut: "LIVRE",      label: "Livré au destinataire" },
];

const ORDRE: Record<ColisStatut, number> = {
  EN_ATTENTE: 0,
  CONFIRME:   1,
  EN_TRANSIT: 2,
  LIVRE:      3,
  ANNULE:     -1,
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

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ statut }: { statut: ColisStatut }) {
  if (statut === "ANNULE") {
    return (
      <View style={styles.timelineCancelled}>
        <Text style={styles.timelineCancelledText}>❌ Colis annulé</Text>
      </View>
    );
  }

  const current = ORDRE[statut];

  return (
    <View style={styles.timeline}>
      {ETAPES.map((etape, idx) => {
        const done    = ORDRE[etape.statut] < current;
        const active  = etape.statut === statut;
        const pending = ORDRE[etape.statut] > current;

        return (
          <View key={etape.statut} style={styles.timelineStep}>
            <View style={styles.timelineLeft}>
              <View
                style={[
                  styles.timelineDot,
                  done   && styles.timelineDotDone,
                  active && styles.timelineDotActive,
                ]}
              >
                {done ? (
                  <Text style={styles.timelineDotCheck}>✓</Text>
                ) : active ? (
                  <View style={styles.timelineDotInner} />
                ) : null}
              </View>
              {idx < ETAPES.length - 1 && (
                <View style={[styles.timelineConnector, done && styles.timelineConnectorDone]} />
              )}
            </View>
            <Text
              style={[
                styles.timelineLabel,
                done   && styles.timelineLabelDone,
                active && styles.timelineLabelActive,
                pending && styles.timelineLabelPending,
              ]}
            >
              {etape.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Ligne détail ─────────────────────────────────────────────────────────────

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Bannière paiement contextuelle ──────────────────────────────────────────

const MODALITE_LABEL: Record<ColisModalitePaiement, string> = {
  A_LA_LIVRAISON:    "à la livraison",
  A_LA_CONFIRMATION: "à la confirmation",
};

function PaiementBanner({
  statut,
  modalite,
  prix,
}: {
  statut: ColisStatut;
  modalite: ColisModalitePaiement;
  prix: number;
}) {
  if (statut === "ANNULE") return null;

  if (statut === "CONFIRME" && modalite === "A_LA_CONFIRMATION") {
    return (
      <View style={[bannerStyles.banner, bannerStyles.bannerWarning]}>
        <Text style={bannerStyles.bannerIcon}>💳</Text>
        <View style={bannerStyles.bannerBody}>
          <Text style={bannerStyles.bannerTitle}>Paiement requis</Text>
          <Text style={bannerStyles.bannerText}>
            Le chauffeur a accepté votre colis. Veuillez régler{" "}
            <Text style={bannerStyles.bannerAmount}>{formatFCFA(prix)}</Text> maintenant.
          </Text>
        </View>
      </View>
    );
  }

  if (statut === "EN_TRANSIT" && modalite === "A_LA_LIVRAISON") {
    return (
      <View style={[bannerStyles.banner, bannerStyles.bannerInfo]}>
        <Text style={bannerStyles.bannerIcon}>🚗</Text>
        <View style={bannerStyles.bannerBody}>
          <Text style={bannerStyles.bannerTitle}>Colis en route</Text>
          <Text style={bannerStyles.bannerText}>
            Préparez <Text style={bannerStyles.bannerAmountInfo}>{formatFCFA(prix)}</Text> pour la livraison au destinataire.
          </Text>
        </View>
      </View>
    );
  }

  if (statut === "LIVRE" && modalite === "A_LA_LIVRAISON") {
    return (
      <View style={[bannerStyles.banner, bannerStyles.bannerWarning]}>
        <Text style={bannerStyles.bannerIcon}>🎉</Text>
        <View style={bannerStyles.bannerBody}>
          <Text style={bannerStyles.bannerTitle}>Colis livré — paiement dû</Text>
          <Text style={bannerStyles.bannerText}>
            Confirmez le paiement de{" "}
            <Text style={bannerStyles.bannerAmount}>{formatFCFA(prix)}</Text> au destinataire.
          </Text>
        </View>
      </View>
    );
  }

  if (statut === "LIVRE" && modalite === "A_LA_CONFIRMATION") {
    return (
      <View style={[bannerStyles.banner, bannerStyles.bannerSuccess]}>
        <Text style={bannerStyles.bannerIcon}>✅</Text>
        <View style={bannerStyles.bannerBody}>
          <Text style={bannerStyles.bannerTitle}>Colis livré ✓</Text>
          <Text style={bannerStyles.bannerText}>Paiement déjà effectué à la confirmation.</Text>
        </View>
      </View>
    );
  }

  // EN_ATTENTE + CONFIRME (A_LA_LIVRAISON) → info légère
  return (
    <View style={[bannerStyles.banner, bannerStyles.bannerNeutral]}>
      <Text style={bannerStyles.bannerIcon}>💰</Text>
      <View style={bannerStyles.bannerBody}>
        <Text style={bannerStyles.bannerText}>
          Prix estimé : <Text style={bannerStyles.bannerAmountNeutral}>{formatFCFA(prix)}</Text>
          {"  ·  "}Paiement {MODALITE_LABEL[modalite]}
        </Text>
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  bannerWarning: { backgroundColor: colors.warningBg },
  bannerInfo:    { backgroundColor: colors.infoBg },
  bannerSuccess: { backgroundColor: colors.successBg },
  bannerNeutral: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bannerIcon: { fontSize: 22, marginTop: 1 },
  bannerBody: { flex: 1, gap: 3 },
  bannerTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  bannerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bannerAmount: {
    fontFamily: typography.fontFamily.extraBold,
    color: colors.warningText,
  },
  bannerAmountInfo: {
    fontFamily: typography.fontFamily.extraBold,
    color: colors.info,
  },
  bannerAmountNeutral: {
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
});

// ─── Écran ────────────────────────────────────────────────────────────────────

export default function ColisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();

  const { data: colis, isLoading, isError } = useColisDetail(id ?? "");
  const { mutateAsync: annuler, isPending: isAnnuling } = useAnnulerColis();

  const handleAnnuler = () => {
    Alert.alert(
      "Annuler le colis",
      "Voulez-vous vraiment annuler cet envoi ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              await annuler(id!);
              showToast("Colis annulé.", "success");
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !colis) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>📦</Text>
        <Text style={styles.errorTitle}>Colis introuvable</Text>
        <Text style={styles.errorSub}>Ce colis n'existe pas ou a été supprimé.</Text>
        <Pressable onPress={() => router.replace("/(client)/colis" as any)} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Retour à mes colis</Text>
        </Pressable>
      </View>
    );
  }

  const cfg = STATUT_CONFIG[colis.statut] ?? {
    label: colis.statut,
    color: colors.textMuted,
    bg: colors.surface,
    icon: "📦",
  };
  const cat = colis.categorie as ColisCategorie;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Pressable onPress={() => router.replace("/(client)/colis" as any)} style={styles.backBtn}>
          <Text style={styles.backText}>← Mes colis</Text>
        </Pressable>

        {/* Statut hero */}
        <View style={[styles.heroCard, { backgroundColor: cfg.bg }]}>
          <Text style={styles.heroIcon}>{cfg.icon}</Text>
          <Text style={[styles.heroStatus, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.heroRoute}>
            {colis.ville_depart} → {colis.ville_arrivee}
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Code de suivi</Text>
            <Text style={styles.codeValue}>#{colis.code_suivi}</Text>
          </View>
          <View style={styles.prixBox}>
            <Text style={styles.prixLabel}>Prix calculé</Text>
            <Text style={[styles.prixValue, { color: cfg.color }]}>{formatFCFA(colis.prix)}</Text>
          </View>
        </View>

        {/* Bannière paiement */}
        <PaiementBanner statut={colis.statut} modalite={colis.modalite_paiement} prix={colis.prix} />

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suivi</Text>
          <Timeline statut={colis.statut} />
        </View>

        {/* Détails colis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contenu</Text>
          <Row icon={CATEGORIE_ICON[cat]} label="Catégorie" value={CATEGORIE_LABEL[cat]} />
          <Row icon="📝" label="Description" value={colis.description} />
          {colis.poids_kg != null && (
            <Row icon="⚖️" label="Poids" value={`${colis.poids_kg} kg`} />
          )}
          {colis.fragile && (
            <View style={styles.fragileBadge}>
              <Text style={styles.fragileText}>🔮 Colis fragile</Text>
            </View>
          )}
        </View>

        {/* Destinataire */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Destinataire</Text>
          <Row icon="👤" label="Nom" value={colis.destinataire_nom} />
          <Row icon="📞" label="Téléphone" value={colis.destinataire_telephone} />
        </View>

        {/* Voyage info */}
        {colis.voyage && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chauffeur & trajet</Text>
            <Row
              icon="📅"
              label="Date de départ"
              value={formatDate(colis.voyage.date_depart, "EEEE d MMMM yyyy")}
            />
            <Row icon="🕐" label="Heure" value={formatTime(colis.voyage.date_depart)} />
            <Row icon="📍" label="Point de départ" value={colis.voyage.point_depart} />
          </View>
        )}

        {/* Date création */}
        <Text style={styles.createdAt}>
          Envoi créé le {format(new Date(colis.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
        </Text>

        {/* Annulation */}
        {colis.statut === "EN_ATTENTE" && (
          <Pressable
            style={styles.cancelBtn}
            onPress={handleAnnuler}
            disabled={isAnnuling}
          >
            <Text style={styles.cancelBtnText}>
              {isAnnuling ? "Annulation..." : "Annuler cet envoi"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 48, gap: spacing.xl, paddingTop: 56 },

  backBtn: { paddingHorizontal: spacing["2xl"] },
  backText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },

  heroCard: {
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    alignItems: "center",
    gap: spacing.sm,
  },
  heroIcon: { fontSize: 40, marginBottom: spacing.xs },
  heroStatus: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
  },
  heroRoute: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  codeBox: {
    marginTop: spacing.sm,
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  codeLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  prixBox: {
    marginTop: spacing.xs,
    alignItems: "center",
    gap: 2,
  },
  prixLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  prixValue: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
  },

  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.lg,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Timeline
  timeline: { gap: 0 },
  timelineStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    minHeight: 44,
  },
  timelineLeft: { alignItems: "center", width: 24 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  timelineDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  timelineDotInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary,
  },
  timelineDotCheck: {
    fontSize: 11,
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
  },
  timelineConnector: {
    width: 2, flex: 1, minHeight: 20,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineConnectorDone: { backgroundColor: colors.primary },
  timelineLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    paddingTop: 2,
    paddingBottom: spacing.lg,
    flex: 1,
  },
  timelineLabelDone: { color: colors.primary },
  timelineLabelActive: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bold,
  },
  timelineLabelPending: { color: colors.textMuted },

  timelineCancelled: {
    backgroundColor: colors.errorBg,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  timelineCancelledText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.error,
  },

  // Row
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowIcon: { fontSize: 18, width: 22, marginTop: 2 },
  rowLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  rowValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginTop: 2,
  },

  fragileBadge: {
    backgroundColor: colors.warningBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  fragileText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warningText,
  },

  createdAt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing["2xl"],
    textTransform: "capitalize",
  },

  cancelBtn: {
    marginHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.error,
  },

  errorIcon: { fontSize: 48, marginBottom: spacing.md },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.xl,
  },
  errorBtn: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  errorBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
});
