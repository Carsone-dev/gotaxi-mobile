import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useVoyageDetail } from "@/src/hooks/useVoyages";
import { useCreateColis } from "@/src/hooks/useColis";
import { formatDate, formatTime } from "@/src/utils/formatters";
import { getErrorMessage } from "@/src/utils/error-handler";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { ColisCategorie, ColisModalitePaiement } from "@/src/api/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIE_LABEL: Record<ColisCategorie, string> = {
  DOCUMENTS:    "Documents",
  VETEMENTS:    "Vêtements",
  ELECTRONIQUE: "Électronique",
  ALIMENTAIRE:  "Alimentaire",
  FRAGILE:      "Fragile",
  AUTRE:        "Autre",
};

const CATEGORIE_ICON: Record<ColisCategorie, string> = {
  DOCUMENTS:    "📄",
  VETEMENTS:    "👕",
  ELECTRONIQUE: "📱",
  ALIMENTAIRE:  "🍱",
  FRAGILE:      "🔮",
  AUTRE:        "📦",
};

// ─── Composant ligne de résumé ────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

type Params = {
  voyage_id: string;
  description: string;
  categorie: string;
  poids_kg: string;
  fragile: string;
  destinataire_nom: string;
  destinataire_telephone: string;
  ville_depart: string;
  ville_arrivee: string;
  modalite_paiement: string;
};

export default function ConfirmerColisScreen() {
  const params = useLocalSearchParams<Params>();
  const { showToast } = useToast();

  const {
    voyage_id,
    description,
    categorie,
    poids_kg,
    fragile,
    destinataire_nom,
    destinataire_telephone,
    modalite_paiement,
  } = params;

  const { data: voyage, isLoading: voyageLoading } = useVoyageDetail(voyage_id ?? "");
  const { mutateAsync: createColis, isPending } = useCreateColis();

  if (voyageLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!voyage) return null;

  const cat = (categorie as ColisCategorie) ?? "AUTRE";

  const handleConfirm = async () => {
    try {
      const newColis = await createColis({
        voyage_id: voyage.id,
        description,
        categorie: cat,
        poids_kg:  poids_kg ? parseFloat(poids_kg) : undefined,
        fragile:   fragile === "1",
        destinataire_nom,
        destinataire_telephone,
        modalite_paiement: (modalite_paiement as ColisModalitePaiement) || "A_LA_LIVRAISON",
      });
      showToast("Colis enregistré ! En attente de confirmation du chauffeur.", "success");
      router.replace(`/(client)/colis/${newColis.id}` as any);
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>Confirmer l'envoi</Text>

        {/* Résumé voyage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trajet du chauffeur</Text>
          <View style={styles.routeRow}>
            <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
          </View>
          <DetailRow
            icon="📅"
            label="Date de départ"
            value={formatDate(voyage.date_depart, "EEEE d MMMM yyyy")}
          />
          <DetailRow
            icon="🕐"
            label="Heure"
            value={formatTime(voyage.date_depart)}
          />
          <DetailRow
            icon="📍"
            label="Point de départ"
            value={voyage.point_depart}
          />
        </View>

        {/* Résumé colis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Votre colis</Text>
          <DetailRow
            icon={CATEGORIE_ICON[cat]}
            label="Catégorie"
            value={CATEGORIE_LABEL[cat]}
          />
          <DetailRow
            icon="📝"
            label="Description"
            value={description}
          />
          {poids_kg ? (
            <DetailRow icon="⚖️" label="Poids estimé" value={`${poids_kg} kg`} />
          ) : null}
          {fragile === "1" && (
            <View style={styles.fragileBadge}>
              <Text style={styles.fragileText}>🔮 Colis fragile — manipulation avec précaution</Text>
            </View>
          )}
        </View>

        {/* Destinataire */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Destinataire</Text>
          <DetailRow icon="👤" label="Nom" value={destinataire_nom} />
          <DetailRow icon="📞" label="Téléphone" value={destinataire_telephone} />
        </View>

        {/* Modalité de paiement */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paiement</Text>
          <DetailRow
            icon="💳"
            label="Modalité"
            value={modalite_paiement === "A_LA_CONFIRMATION"
              ? "À la confirmation du chauffeur"
              : "À la livraison au destinataire"}
          />
          <View style={styles.priceNoteBox}>
            <Text style={styles.priceNoteText}>
              💡 Le prix est calculé automatiquement par le serveur selon le trajet, la catégorie et le poids du colis. Vous le verrez dès la création.
            </Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            ℹ️ Votre demande sera envoyée au chauffeur. Il confirmera ou refusera l'envoi.
            Vous serez notifié par la suite.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" loading={isPending} onPress={handleConfirm} style={styles.confirmBtn}>
          Envoyer le colis
        </Button>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 120, gap: spacing.xl, paddingTop: 56 },

  backBtn: { paddingHorizontal: spacing["2xl"], paddingBottom: spacing.sm },
  backText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing["2xl"],
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

  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  routeCity: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  routeArrow: {
    fontSize: typography.fontSize.xl,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  detailIcon: { fontSize: 18, width: 22, marginTop: 2 },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  detailValue: {
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

  noteCard: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.infoBg,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  noteText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.info,
    lineHeight: 20,
  },
  priceNoteBox: {
    backgroundColor: colors.successBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  priceNoteText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.primary,
    lineHeight: 20,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.xl,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  confirmBtn: { width: "100%" },
});
