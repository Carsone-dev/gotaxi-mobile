import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useColisDetail, useAnnulerColis } from "@/src/hooks/useColis";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { formatFCFA } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { ColisStatut, ColisCategorie, ColisModalitePaiement } from "@/src/api/types";

// ── Constantes ────────────────────────────────────────────────────────────────
const STATUT_CFG: Record<ColisStatut, { label: string; color: string; bg: string; icon: string; accentColor: string }> = {
  EN_ATTENTE: { label: "En attente",  color: colors.warningText, bg: colors.warningBg, icon: "⏳", accentColor: colors.warning  },
  CONFIRME:   { label: "Confirmé",    color: colors.info,        bg: colors.infoBg,    icon: "✅", accentColor: colors.info     },
  EN_TRANSIT: { label: "En transit",  color: colors.primary,     bg: colors.successBg, icon: "🚗", accentColor: colors.primary  },
  LIVRE:      { label: "Livré",       color: colors.success,     bg: colors.successBg, icon: "🎉", accentColor: colors.success  },
  ANNULE:     { label: "Annulé",      color: colors.error,       bg: colors.errorBg,   icon: "❌", accentColor: colors.error    },
};

const ETAPES: { statut: ColisStatut; label: string; hint: string }[] = [
  { statut: "EN_ATTENTE", label: "Demande envoyée",           hint: "En attente de confirmation du chauffeur" },
  { statut: "CONFIRME",   label: "Confirmé par le chauffeur", hint: "Le chauffeur a accepté votre colis"      },
  { statut: "EN_TRANSIT", label: "En transit",                hint: "Votre colis est en route"                },
  { statut: "LIVRE",      label: "Livré au destinataire",     hint: "Colis remis avec succès"                 },
];

const ORDRE: Record<ColisStatut, number> = {
  EN_ATTENTE: 0, CONFIRME: 1, EN_TRANSIT: 2, LIVRE: 3, ANNULE: -1,
};

const CAT: Record<ColisCategorie, { label: string; icon: string }> = {
  DOCUMENTS:    { label: "Documents",    icon: "📄" },
  VETEMENTS:    { label: "Vêtements",    icon: "👕" },
  ELECTRONIQUE: { label: "Électronique", icon: "📱" },
  ALIMENTAIRE:  { label: "Alimentaire",  icon: "🍱" },
  FRAGILE:      { label: "Fragile",      icon: "🔮" },
  AUTRE:        { label: "Autre",        icon: "📦" },
};

const MODALITE_LABEL: Record<ColisModalitePaiement, string> = {
  A_LA_LIVRAISON:    "à la livraison",
  A_LA_CONFIRMATION: "à la confirmation",
};

// ── Timeline suivi ────────────────────────────────────────────────────────────
function TrackingTimeline({ statut }: { statut: ColisStatut }) {
  if (statut === "ANNULE") {
    return (
      <View style={tl.cancelled}>
        <Text style={tl.cancelledIcon}>❌</Text>
        <View>
          <Text style={tl.cancelledTitle}>Colis annulé</Text>
          <Text style={tl.cancelledHint}>Cet envoi a été annulé</Text>
        </View>
      </View>
    );
  }

  const current = ORDRE[statut];

  return (
    <View style={tl.container}>
      {ETAPES.map((etape, idx) => {
        const done    = ORDRE[etape.statut] < current;
        const active  = etape.statut === statut;
        const pending = ORDRE[etape.statut] > current;
        const isLast  = idx === ETAPES.length - 1;

        return (
          <View key={etape.statut} style={tl.step}>
            {/* Left: dot + connector */}
            <View style={tl.left}>
              <View style={[tl.dot, done && tl.dotDone, active && tl.dotActive, pending && tl.dotPending]}>
                {done   && <Text style={tl.dotCheck}>✓</Text>}
                {active && <View style={tl.dotPulse} />}
              </View>
              {!isLast && <View style={[tl.connector, done && tl.connectorDone, active && tl.connectorActive]} />}
            </View>

            {/* Right: label + hint */}
            <View style={[tl.info, !isLast && { paddingBottom: spacing.xl }]}>
              <Text style={[tl.label, done && tl.labelDone, active && tl.labelActive, pending && tl.labelPending]}>
                {etape.label}
              </Text>
              {(done || active) && (
                <Text style={[tl.hint, active && tl.hintActive]}>{etape.hint}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const tl = StyleSheet.create({
  container: {},
  step: { flexDirection: "row", gap: spacing.lg },
  left: { alignItems: "center", width: 28 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  dotDone:    { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive:  { backgroundColor: colors.white, borderColor: colors.primary, borderWidth: 3 },
  dotPending: { backgroundColor: colors.surface, borderColor: colors.border },
  dotCheck:   { fontSize: 12, color: colors.white, fontFamily: typography.fontFamily.bold },
  dotPulse:   { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  connector:      { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 20, marginVertical: 2 },
  connectorDone:  { backgroundColor: colors.primary },
  connectorActive:{ backgroundColor: `${colors.primary}50` },
  info: { flex: 1, paddingTop: 3 },
  label:        { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.textMuted },
  labelDone:    { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
  labelActive:  { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
  labelPending: { color: colors.textMuted },
  hint:         { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted, marginTop: 2 },
  hintActive:   { color: colors.primary },
  cancelled: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.errorBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  cancelledIcon: { fontSize: 24 },
  cancelledTitle: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.error },
  cancelledHint:  { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: `${colors.error}99`, marginTop: 2 },
});

// ── Bannière paiement ─────────────────────────────────────────────────────────
function PaiementBanner({ statut, modalite, prix }: {
  statut: ColisStatut;
  modalite: ColisModalitePaiement;
  prix: number;
}) {
  if (statut === "ANNULE") return null;

  let icon = "💰", title = "", body = "", variant: "warn" | "info" | "success" | "neutral" = "neutral";
  const prixStr = formatFCFA(prix);

  if (statut === "CONFIRME" && modalite === "A_LA_CONFIRMATION") {
    icon = "💳"; title = "Paiement requis"; variant = "warn";
    body = `Le chauffeur a accepté votre colis. Veuillez régler ${prixStr} maintenant.`;
  } else if (statut === "EN_TRANSIT" && modalite === "A_LA_LIVRAISON") {
    icon = "🚗"; title = "Colis en route"; variant = "info";
    body = `Préparez ${prixStr} pour la livraison au destinataire.`;
  } else if (statut === "LIVRE" && modalite === "A_LA_LIVRAISON") {
    icon = "🎉"; title = "Colis livré — paiement dû"; variant = "warn";
    body = `Confirmez le paiement de ${prixStr} au destinataire.`;
  } else if (statut === "LIVRE" && modalite === "A_LA_CONFIRMATION") {
    icon = "✅"; title = "Livré avec succès"; variant = "success";
    body = "Paiement déjà effectué à la confirmation du chauffeur.";
  } else {
    body = `Prix estimé : ${prixStr}  ·  Paiement ${MODALITE_LABEL[modalite]}`;
  }

  const bgMap = { warn: colors.warningBg, info: colors.infoBg, success: colors.successBg, neutral: colors.white };
  const borderMap = { warn: `${colors.warning}40`, info: `${colors.info}30`, success: `${colors.primary}30`, neutral: colors.border };

  return (
    <View style={[pb.banner, { backgroundColor: bgMap[variant], borderColor: borderMap[variant] }]}>
      <View style={pb.iconWrap}>
        <Text style={pb.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {title ? <Text style={pb.title}>{title}</Text> : null}
        <Text style={pb.body}>{body}</Text>
      </View>
    </View>
  );
}

const pb = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.md,
    borderRadius: radii.xl, padding: spacing.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  icon: { fontSize: 20 },
  title: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: colors.textPrimary, marginBottom: 2 },
  body:  { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, lineHeight: 20 },
});

// ── En-tête de section ────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.secHeader}>
      <Text style={styles.secHeaderIcon}>{icon}</Text>
      <Text style={styles.secHeaderTitle}>{title}</Text>
    </View>
  );
}

// ── Ligne de détail ───────────────────────────────────────────────────────────
function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowWrap}><Text style={styles.rowIcon}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function ColisDetailScreen() {
  const insets = useSafeAreaInsets();
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

  // ── États ──
  if (isLoading) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Chargement du colis…</Text>
      </View>
    );
  }

  if (isError || !colis) {
    return (
      <View style={styles.stateScreen}>
        <Text style={styles.stateEmoji}>📦</Text>
        <Text style={styles.stateTitle}>Colis introuvable</Text>
        <Text style={styles.stateSub}>Ce colis n'existe pas ou a été supprimé.</Text>
        <Pressable style={styles.stateBtn} onPress={() => router.replace("/(client)/colis" as any)}>
          <Text style={styles.stateBtnText}>Retour à mes colis</Text>
        </Pressable>
      </View>
    );
  }

  const cfg = STATUT_CFG[colis.statut] ?? STATUT_CFG.EN_ATTENTE;
  const cat = colis.categorie as ColisCategorie;
  const catInfo = CAT[cat] ?? CAT.AUTRE;

  return (
    <View style={styles.root}>
      {/* ── Header fixe ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace("/(client)/colis" as any)}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Suivi du colis</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
            {cfg.icon}  {cfg.label}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={[styles.hero, { borderTopColor: cfg.accentColor }]}>
          <View style={[styles.heroAccent, { backgroundColor: cfg.accentColor }]} />

          <View style={styles.heroCenter}>
            <Text style={styles.heroEmoji}>{cfg.icon}</Text>
            <Text style={[styles.heroStatusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={styles.heroRoute}>{colis.ville_depart}  →  {colis.ville_arrivee}</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroInfoRow}>
            <View style={styles.heroInfoBlock}>
              <Text style={styles.heroInfoLabel}>CODE DE SUIVI</Text>
              <Text style={styles.heroCode}>#{colis.code_suivi}</Text>
            </View>
            <View style={styles.heroInfoSep} />
            <View style={styles.heroInfoBlock}>
              <Text style={styles.heroInfoLabel}>PRIX CALCULÉ</Text>
              <Text style={[styles.heroPrix, { color: cfg.color }]}>{formatFCFA(colis.prix)}</Text>
            </View>
          </View>
        </View>

        {/* ── Bannière paiement ── */}
        <PaiementBanner statut={colis.statut} modalite={colis.modalite_paiement} prix={colis.prix} />

        {/* ── Timeline ── */}
        <View style={styles.card}>
          <SectionHeader icon="📡" title="Suivi en temps réel" />
          <View style={styles.divider} />
          <TrackingTimeline statut={colis.statut} />
        </View>

        {/* ── Contenu colis ── */}
        <View style={styles.card}>
          <SectionHeader icon={catInfo.icon} title="Contenu du colis" />
          <View style={styles.divider} />

          <Row icon={catInfo.icon} label="Catégorie"    value={catInfo.label} />
          <Row icon="📝"           label="Description"  value={colis.description} />
          {colis.poids_kg != null && (
            <Row icon="⚖️" label="Poids estimé" value={`${colis.poids_kg} kg`} />
          )}
          {colis.fragile && (
            <View style={styles.fragilePill}>
              <Text style={styles.fragilePillIcon}>⚠️</Text>
              <Text style={styles.fragilePillText}>Fragile — manipulation avec précaution requise</Text>
            </View>
          )}
        </View>

        {/* ── Destinataire ── */}
        <View style={styles.card}>
          <SectionHeader icon="👤" title="Destinataire" />
          <View style={styles.divider} />
          <View style={styles.recipientRow}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientAvatarText}>
                {colis.destinataire_nom?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{colis.destinataire_nom}</Text>
              <Text style={styles.recipientPhone}>{colis.destinataire_telephone}</Text>
            </View>
          </View>
          <Row icon="💳" label="Paiement" value={
            colis.modalite_paiement === "A_LA_CONFIRMATION"
              ? "À la confirmation du chauffeur"
              : "À la livraison au destinataire"
          } />
        </View>

        {/* ── Chauffeur & trajet ── */}
        {colis.voyage && (
          <View style={styles.card}>
            <SectionHeader icon="🚗" title="Chauffeur & trajet" />
            <View style={styles.divider} />

            {/* Heure + date */}
            <View style={styles.voyageTimeRow}>
              <Text style={styles.voyageTime}>
                {format(new Date(colis.voyage.date_depart), "HH:mm")}
              </Text>
              <View style={styles.voyageDateBadge}>
                <Text style={styles.voyageDateText}>
                  {format(new Date(colis.voyage.date_depart), "EEEE d MMM yyyy", { locale: fr })}
                </Text>
              </View>
            </View>

            {/* Route timeline */}
            <View style={styles.routeTl}>
              <View style={styles.routeTlStop}>
                <View style={styles.routeTlDotDepart} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeTlCity}>{colis.voyage.ville_depart}</Text>
                  {colis.voyage.point_depart ? (
                    <Text style={styles.routeTlPoint}>{colis.voyage.point_depart}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.routeTlMiddle}>
                <View style={styles.routeTlLine} />
                {colis.voyage.distance_km ? (
                  <View style={styles.routeTlDistPill}>
                    <Text style={styles.routeTlDistText}>{colis.voyage.distance_km} km</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.routeTlStop}>
                <View style={styles.routeTlDotArrivee} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeTlCity}>{colis.voyage.ville_arrivee}</Text>
                  {colis.voyage.point_arrivee ? (
                    <Text style={styles.routeTlPoint}>{colis.voyage.point_arrivee}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Date création ── */}
        <Text style={styles.createdAt}>
          Envoi créé le {format(new Date(colis.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
        </Text>

        {/* ── Annulation ── */}
        {colis.statut === "EN_ATTENTE" && (
          <View style={styles.cancelBlock}>
            <Pressable
              style={[styles.cancelBtn, isAnnuling && { opacity: 0.5 }]}
              onPress={handleAnnuler}
              disabled={isAnnuling}
            >
              {isAnnuling
                ? <ActivityIndicator color={colors.error} size="small" />
                : <Text style={styles.cancelBtnText}>Annuler cet envoi</Text>}
            </Pressable>
            <Text style={styles.cancelHint}>
              L'annulation est gratuite tant que le chauffeur n'a pas confirmé.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PT = Platform.OS === "ios" ? 56 : 40;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  // États
  stateScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing["2xl"] },
  stateEmoji: { fontSize: 52 },
  stateText:  { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  stateTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  stateSub:   { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textMuted, textAlign: "center" },
  stateBtn:   { backgroundColor: colors.primary, borderRadius: radii.xl, paddingHorizontal: spacing["2xl"], paddingVertical: spacing.md, ...shadows.sm },
  stateBtnText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.white },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT, paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  backBtnText: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.primary, lineHeight: 24 },
  headerTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  statusBadge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: 5,
  },
  statusBadgeText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold },

  // Scroll
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },

  // Hero
  hero: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.md,
    borderWidth: 1, borderColor: colors.border,
  },
  heroAccent: { height: 5 },
  heroCenter: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  heroEmoji: { fontSize: 44 },
  heroStatusLabel: { fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.extraBold },
  heroRoute: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary },
  heroDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
  heroInfoRow: {
    flexDirection: "row",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  heroInfoBlock: { flex: 1, alignItems: "center", gap: 4 },
  heroInfoSep: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  heroInfoLabel: {
    fontSize: 9, fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted, letterSpacing: 0.8,
  },
  heroCode: {
    fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary, letterSpacing: 2,
  },
  heroPrix: { fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.extraBold },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  secHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  secHeaderIcon: { fontSize: 18 },
  secHeaderTitle: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary, textTransform: "uppercase", letterSpacing: 0.6,
  },
  divider: { height: 1, backgroundColor: colors.border },

  // Rows
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  rowIcon:  { fontSize: 16 },
  rowLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.textMuted },
  rowValue: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary, marginTop: 2, lineHeight: 22 },

  // Fragile pill
  fragilePill: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.warningBg, borderRadius: radii.lg,
    padding: spacing.md, borderWidth: 1, borderColor: `${colors.warning}40`,
  },
  fragilePillIcon: { fontSize: 18 },
  fragilePillText: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.warningText },

  // Destinataire
  recipientRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  recipientAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 2, borderColor: `${colors.primary}30`,
    alignItems: "center", justifyContent: "center",
  },
  recipientAvatarText: { fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bold, color: colors.primary },
  recipientName:  { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  recipientPhone: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 3 },

  // Voyage timeline
  voyageTimeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  voyageTime: {
    fontSize: typography.fontSize["3xl"], fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary, lineHeight: 40,
  },
  voyageDateBadge: {
    backgroundColor: `${colors.primary}12`, borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderWidth: 1, borderColor: `${colors.primary}25`,
  },
  voyageDateText: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold,
    color: colors.primary, textTransform: "capitalize",
  },
  routeTl: { gap: 2 },
  routeTlStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  routeTlDotDepart: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.primary, marginTop: 5,
    borderWidth: 2.5, borderColor: `${colors.primary}35`,
  },
  routeTlDotArrivee: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.black, marginTop: 5,
    borderWidth: 2.5, borderColor: `${colors.black}25`,
  },
  routeTlMiddle: {
    flexDirection: "row", alignItems: "center",
    paddingLeft: 5, gap: spacing.sm, marginVertical: 3,
  },
  routeTlLine: { width: 2, height: 20, backgroundColor: colors.border },
  routeTlDistPill: {
    backgroundColor: colors.surface, borderRadius: radii.full,
    paddingHorizontal: spacing.sm, paddingVertical: 1,
    borderWidth: 1, borderColor: colors.border,
  },
  routeTlDistText: { fontSize: 10, fontFamily: typography.fontFamily.medium, color: colors.textMuted },
  routeTlCity:  { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  routeTlPoint: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, maxWidth: 260, marginTop: 1 },

  // Footer
  createdAt: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular,
    color: colors.textMuted, textAlign: "center", textTransform: "capitalize",
  },
  cancelBlock: { gap: spacing.sm, alignItems: "center" },
  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: colors.error,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing["2xl"],
    gap: spacing.sm,
    minWidth: 200,
  },
  cancelBtnText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.error },
  cancelHint: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular,
    color: colors.textMuted, textAlign: "center",
  },
});
