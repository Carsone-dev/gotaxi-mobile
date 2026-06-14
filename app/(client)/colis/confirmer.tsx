import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useVoyageDetail } from "@/src/hooks/useVoyages";
import { useCreateColis } from "@/src/hooks/useColis";
import { colisApi } from "@/src/api/endpoints/colis";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { ColisCategorie, ColisModalitePaiement } from "@/src/api/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
const CAT: Record<ColisCategorie, { label: string; icon: string }> = {
  DOCUMENTS:    { label: "Documents",    icon: "📄" },
  VETEMENTS:    { label: "Vêtements",    icon: "👕" },
  ELECTRONIQUE: { label: "Électronique", icon: "📱" },
  ALIMENTAIRE:  { label: "Alimentaire",  icon: "🍱" },
  FRAGILE:      { label: "Fragile",      icon: "🔮" },
  AUTRE:        { label: "Autre",        icon: "📦" },
};

// ── Ligne de détail ───────────────────────────────────────────────────────────
function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Text style={styles.rowIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── En-tête de section ────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderIcon}>{icon}</Text>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
  );
}

// ── Paramètres ────────────────────────────────────────────────────────────────
type Params = {
  voyage_id:               string;
  description:             string;
  categorie:               string;
  poids_kg:                string;
  fragile:                 string;
  destinataire_nom:        string;
  destinataire_telephone:  string;
  ville_depart:            string;
  ville_arrivee:           string;
  modalite_paiement:       string;
  photo_uri:               string;
};

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function ConfirmerColisScreen() {
  const insets = useSafeAreaInsets();
  const params  = useLocalSearchParams<Params>();
  const { showToast } = useToast();
  const {
    voyage_id, description, categorie, poids_kg, fragile,
    destinataire_nom, destinataire_telephone, modalite_paiement,
  } = params;

  const { data: voyage, isLoading: voyageLoading } = useVoyageDetail(voyage_id ?? "");
  const { mutateAsync: createColis, isPending } = useCreateColis();

  const cat = (categorie as ColisCategorie) ?? "AUTRE";
  const catInfo = CAT[cat] ?? CAT.AUTRE;
  const isFragile = fragile === "1";
  const isLivraison = modalite_paiement !== "A_LA_CONFIRMATION";
  const { photo_uri } = params;

  const handleConfirm = async () => {
    try {
      const newColis = await createColis({
        voyage_id:               voyage!.id,
        description,
        categorie:               cat,
        poids_kg:                poids_kg ? parseFloat(poids_kg) : undefined,
        fragile:                 isFragile,
        destinataire_nom,
        destinataire_telephone,
        modalite_paiement:       (modalite_paiement as ColisModalitePaiement) || "A_LA_LIVRAISON",
      });

      if (photo_uri) {
        try {
          await colisApi.uploadPhoto(newColis.id, photo_uri);
        } catch {
          // L'upload photo est non-bloquant : le colis est créé même si ça échoue
        }
      }

      showToast("Colis enregistré ! En attente de confirmation du chauffeur.", "success");
      router.replace(`/(client)/colis/${newColis.id}` as any);
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  // ── États ──
  if (voyageLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Chargement du trajet…</Text>
      </View>
    );
  }

  if (!voyage) return null;

  return (
    <View style={styles.root}>
      {/* ── Header fixe ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Confirmer l'envoi</Text>
          <Text style={styles.headerSub}>Vérifiez les informations avant d'envoyer</Text>
        </View>
      </View>

      {/* ── Contenu scrollable ── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Carte voyage ── */}
        <View style={styles.voyageCard}>
          <View style={styles.voyageCardAccent} />
          <View style={styles.voyageCardBody}>
            <SectionHeader icon="🚗" title="Trajet du chauffeur" />

            {/* Heure + date */}
            <View style={styles.voyageTimeRow}>
              <Text style={styles.voyageTime}>
                {format(new Date(voyage.date_depart), "HH:mm")}
              </Text>
              <View style={styles.voyageDateBadge}>
                <Text style={styles.voyageDateBadgeText}>
                  {format(new Date(voyage.date_depart), "EEEE d MMMM yyyy", { locale: fr })}
                </Text>
              </View>
            </View>

            {/* Timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineStop}>
                <View style={styles.timelineDotDepart} />
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineCity}>{voyage.ville_depart}</Text>
                  {voyage.point_depart ? (
                    <Text style={styles.timelinePoint}>{voyage.point_depart}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.timelineSpacer}>
                <View style={styles.timelineLine} />
                {voyage.distance_km ? (
                  <View style={styles.distancePill}>
                    <Text style={styles.distanceText}>{voyage.distance_km} km</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.timelineStop}>
                <View style={styles.timelineDotArrivee} />
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineCity}>{voyage.ville_arrivee}</Text>
                  {voyage.point_arrivee ? (
                    <Text style={styles.timelinePoint}>{voyage.point_arrivee}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Colis ── */}
        <View style={styles.card}>
          <SectionHeader icon={catInfo.icon} title="Votre colis" />
          <View style={styles.divider} />

          <Row icon={catInfo.icon} label="Catégorie" value={catInfo.label} />
          <Row icon="📝" label="Description" value={description} />
          {poids_kg ? (
            <Row icon="⚖️" label="Poids estimé" value={`${poids_kg} kg`} />
          ) : null}

          {isFragile && (
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
                {destinataire_nom?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{destinataire_nom}</Text>
              <Text style={styles.recipientPhone}>{destinataire_telephone}</Text>
            </View>
          </View>
        </View>

        {/* ── Paiement ── */}
        <View style={styles.card}>
          <SectionHeader icon="💳" title="Paiement" />
          <View style={styles.divider} />
          <View style={styles.paymentRow}>
            <View style={styles.paymentIconWrap}>
              <Text style={styles.paymentIcon}>{isLivraison ? "📦" : "✅"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentMode}>
                {isLivraison ? "À la livraison" : "À la confirmation"}
              </Text>
              <Text style={styles.paymentHint}>
                {isLivraison
                  ? "Vous payez quand le colis arrive à destination"
                  : "Vous payez quand le chauffeur confirme l'envoi"}
              </Text>
            </View>
          </View>

          {/* Note prix */}
          <View style={styles.priceNote}>
            <Text style={styles.priceNoteIcon}>💡</Text>
            <Text style={styles.priceNoteText}>
              Le prix est calculé automatiquement selon le trajet, la catégorie et le poids. Vous le verrez dès la création.
            </Text>
          </View>
        </View>

        {/* ── Note finale ── */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteIcon}>ℹ️</Text>
          <Text style={styles.infoNoteText}>
            Votre demande sera transmise au chauffeur. Il confirmera ou refusera l'envoi. Vous serez notifié.
          </Text>
        </View>

      </ScrollView>

      {/* ── Footer fixe ── */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.confirmBtn, isPending && styles.confirmBtnPending]}
          onPress={handleConfirm}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={styles.confirmBtnText}>Envoi en cours…</Text>
            </>
          ) : (
            <>
              <Text style={styles.confirmBtnText}>Envoyer le colis</Text>
              <Text style={styles.confirmBtnArrow}>→</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.footerHint}>
          En confirmant, vous acceptez les conditions d'envoi GoTaxi
        </Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PT = Platform.OS === "ios" ? 56 : 40;
const PB = Platform.OS === "ios" ? 36 : 24;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  loadingScreen: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, gap: spacing.md,
  },
  loadingText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: PT,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  backBtnText: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.primary, lineHeight: 24 },
  headerTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  headerSub: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted, marginTop: 2 },

  // Scroll
  content: {
    padding: spacing["2xl"],
    gap: spacing.lg,
    paddingBottom: 130,
  },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionHeaderIcon: { fontSize: 18 },
  sectionHeaderTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  divider: { height: 1, backgroundColor: colors.border },

  // Voyage card
  voyageCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voyageCardAccent: { height: 4, backgroundColor: colors.primary },
  voyageCardBody: { padding: spacing.xl, gap: spacing.lg },

  voyageTimeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  voyageTime: {
    fontSize: typography.fontSize["4xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
    lineHeight: 48,
  },
  voyageDateBadge: {
    backgroundColor: `${colors.primary}12`,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  voyageDateBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
    textTransform: "capitalize",
  },

  // Timeline
  timeline: { gap: 2 },
  timelineStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  timelineDotDepart: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.primary, marginTop: 4,
    borderWidth: 3, borderColor: `${colors.primary}30`,
  },
  timelineDotArrivee: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.black, marginTop: 4,
    borderWidth: 3, borderColor: `${colors.black}25`,
  },
  timelineInfo: { flex: 1 },
  timelineCity: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  timelinePoint: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 2 },
  timelineSpacer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    gap: spacing.sm,
    marginVertical: 3,
  },
  timelineLine: { width: 2, height: 22, backgroundColor: colors.border },
  distancePill: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distanceText: { fontSize: 10, fontFamily: typography.fontFamily.medium, color: colors.textMuted },

  // Generic card
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Detail row
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  rowIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  rowIcon: { fontSize: 16 },
  rowLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.textMuted },
  rowValue: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary, marginTop: 2, lineHeight: 22 },

  // Fragile
  fragilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
  },
  fragilePillIcon: { fontSize: 18 },
  fragilePillText: { flex: 1, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.warningText },

  // Destinataire
  recipientRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  recipientAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 2, borderColor: `${colors.primary}30`,
    alignItems: "center", justifyContent: "center",
  },
  recipientAvatarText: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.primary },
  recipientName: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  recipientPhone: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 3 },

  // Payment
  paymentRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  paymentIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${colors.primary}12`,
    alignItems: "center", justifyContent: "center",
  },
  paymentIcon: { fontSize: 20 },
  paymentMode: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold, color: colors.textPrimary },
  paymentHint: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.textMuted, marginTop: 2, lineHeight: 16 },

  priceNote: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "flex-start",
  },
  priceNoteIcon: { fontSize: 14 },
  priceNoteText: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.primary, lineHeight: 18 },

  // Info note
  infoNote: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.infoBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "flex-start",
  },
  infoNoteIcon: { fontSize: 14 },
  infoNoteText: { flex: 1, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.regular, color: colors.info, lineHeight: 18 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: PB,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    ...shadows.lg,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    ...shadows.md,
  },
  confirmBtnPending: { opacity: 0.7 },
  confirmBtnText: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.white },
  confirmBtnArrow: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: `${colors.white}cc` },
  footerHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },
});
