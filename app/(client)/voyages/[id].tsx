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
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useVoyageDetail } from "@/src/hooks/useVoyages";
import { useAuthStore } from "@/src/stores/authStore";
import { formatFCFA, formatTime } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { VoyageStatus } from "@/src/api/types";

// ── Config statuts ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<VoyageStatus, { label: string; color: string; bg: string }> = {
  PUBLIE:   { label: "Disponible", color: colors.success,       bg: colors.successBg },
  COMPLET:  { label: "Complet",    color: colors.warningText,   bg: colors.warningBg },
  EN_COURS: { label: "En cours",   color: colors.info,          bg: colors.infoBg },
  TERMINE:  { label: "Terminé",    color: colors.textSecondary, bg: colors.surface },
  ANNULE:   { label: "Annulé",     color: colors.error,         bg: colors.errorBg },
};

// ── Row info ──────────────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, last,
}: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <>
      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <Text style={styles.infoIconText}>{icon}</Text>
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {!last && <View style={styles.infoDiv} />}
    </>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function VoyageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: voyage, isLoading, isError } = useVoyageDetail(id ?? "");

  // ── États chargement / erreur ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (isError || !voyage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errEmoji}>🚫</Text>
        <Text style={styles.errTitle}>Trajet introuvable</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.errBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.errBtnTxt}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const cfg       = STATUS_CFG[voyage.statut];
  const isOwner   = !!user && voyage.chauffeur_id === user.id;
  const canReserve =
    voyage.statut === "PUBLIE" &&
    voyage.nombre_places_restantes > 0 &&
    !isOwner;

  const btnLabel = canReserve
    ? `Réserver · ${formatFCFA(voyage.prix_par_place)}`
    : isOwner
    ? "Votre voyage"
    : voyage.statut === "COMPLET" || voyage.nombre_places_restantes === 0
    ? "Complet"
    : cfg.label;

  return (
    <View style={styles.screen}>
      {/* ── Header fixe ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Détail du trajet</Text>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusChipText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* ── Contenu scrollable ───────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero carte trajet ─────── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.heroCard}>
          {/* Barre accent */}
          <View style={[styles.heroAccent, { backgroundColor: cfg.color }]} />

          <View style={styles.heroBody}>
            {/* Timeline verticale */}
            <View style={styles.vertTimeline}>
              {/* Départ */}
              <View style={styles.vtStop}>
                <View style={[styles.vtDot, styles.vtDotStart]} />
                <View style={styles.vtInfo}>
                  <Text style={styles.vtCity}>{voyage.ville_depart}</Text>
                  <Text style={styles.vtTime}>{formatTime(voyage.date_depart)}</Text>
                  {voyage.point_depart ? (
                    <Text style={styles.vtAddr} numberOfLines={2}>{voyage.point_depart}</Text>
                  ) : null}
                </View>
              </View>

              {/* Connecteur + distance */}
              <View style={styles.vtConnector}>
                <View style={styles.vtLine} />
                {voyage.distance_km ? (
                  <View style={styles.distPill}>
                    <Text style={styles.distText}>{voyage.distance_km} km</Text>
                  </View>
                ) : null}
              </View>

              {/* Arrivée */}
              <View style={styles.vtStop}>
                <View style={[styles.vtDot, styles.vtDotEnd]} />
                <View style={styles.vtInfo}>
                  <Text style={styles.vtCity}>{voyage.ville_arrivee}</Text>
                  {voyage.date_arrivee_estimee ? (
                    <Text style={styles.vtTime}>{formatTime(voyage.date_arrivee_estimee)}</Text>
                  ) : null}
                  {voyage.point_arrivee ? (
                    <Text style={styles.vtAddr} numberOfLines={2}>{voyage.point_arrivee}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Date + places */}
            <View style={styles.heroMeta}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeTxt}>
                  {format(new Date(voyage.date_depart), "EEEE d MMMM yyyy", { locale: fr })}
                </Text>
              </View>
              <View style={[
                styles.placesBadge,
                voyage.nombre_places_restantes === 0 && styles.placesBadgeFull,
              ]}>
                <Text style={[
                  styles.placesTxt,
                  voyage.nombre_places_restantes === 0 && styles.placesTxtFull,
                ]}>
                  {voyage.nombre_places_restantes === 0
                    ? "Complet"
                    : `${voyage.nombre_places_restantes} / ${voyage.nombre_places_total} places`}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Caractéristiques ──────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(80)} style={styles.card}>
          <Text style={styles.cardLabel}>Caractéristiques</Text>
          <InfoRow icon="💺" label="Places disponibles"
            value={`${voyage.nombre_places_restantes} sur ${voyage.nombre_places_total}`} />
          <InfoRow icon="💰" label="Prix par place"
            value={formatFCFA(voyage.prix_par_place)} />
          <InfoRow icon={voyage.climatise ? "❄️" : "🌡️"} label="Climatisation"
            value={voyage.climatise ? "Oui" : "Non"} />
          <InfoRow icon={voyage.non_fumeur ? "🚭" : "🚬"} label="Tabac"
            value={voyage.non_fumeur ? "Non-fumeur" : "Fumeur OK"} />
          <InfoRow icon="📦" label="Accepte les colis"
            value={voyage.accepte_colis ? "Oui" : "Non"} last />
        </Animated.View>

        {/* ── Bannière colis ────────── */}
        {voyage.accepte_colis && (
          <Animated.View entering={FadeInDown.duration(300).delay(160)}>
            <Pressable
              style={({ pressed }) => [styles.colisBanner, pressed && { opacity: 0.85 }]}
              onPress={() =>
                router.push({
                  pathname: "/(client)/colis/nouveau" as any,
                  params: {
                    ville_depart: voyage.ville_depart,
                    ville_arrivee: voyage.ville_arrivee,
                  },
                })
              }
            >
              <View style={styles.colisIconWrap}>
                <Text style={styles.colisIconTxt}>📦</Text>
              </View>
              <View style={styles.colisBody}>
                <Text style={styles.colisTitle}>Ce chauffeur accepte les colis</Text>
                <Text style={styles.colisHint}>Envoyer un colis sur ce trajet →</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Footer fixe ──────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceAmt}>{formatFCFA(voyage.prix_par_place)}</Text>
          <Text style={styles.footerPriceSub}>par personne</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.reserveBtn,
            !canReserve && styles.reserveBtnDisabled,
            pressed && canReserve && { opacity: 0.85 },
          ]}
          disabled={!canReserve}
          onPress={() =>
            router.push({
              pathname: "/(client)/voyages/confirm" as any,
              params: { voyage_id: voyage.id, prix: String(voyage.prix_par_place) },
            })
          }
        >
          <Text style={[styles.reserveBtnTxt, !canReserve && styles.reserveBtnTxtDisabled]}>
            {btnLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },

  // États loading / erreur
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  errEmoji: { fontSize: 48 },
  errTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  errBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radii.full,
  },
  errBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },

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
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
  },

  // Scroll
  content: {
    padding: spacing["2xl"],
    paddingBottom: 120,
    gap: spacing.lg,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  heroAccent: { height: 5 },
  heroBody: { padding: spacing["2xl"], gap: spacing.xl },

  // Timeline verticale
  vertTimeline: { gap: 0 },
  vtStop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  vtDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    borderWidth: 2,
    borderColor: colors.white,
    flexShrink: 0,
  },
  vtDotStart: { backgroundColor: colors.primary },
  vtDotEnd:   { backgroundColor: colors.black },
  vtInfo: { flex: 1, gap: 2 },
  vtCity: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  vtTime: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  vtAddr: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  vtConnector: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  vtLine: {
    width: 2,
    height: 28,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  distPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },

  // Meta (date + places)
  heroMeta: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadgeTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  placesBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  placesBadgeFull: { backgroundColor: colors.errorBg },
  placesTxt: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
  placesTxtFull: { color: colors.error },

  // Card caractéristiques
  card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  infoIconText: { fontSize: 16 },
  infoLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  infoDiv: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },

  // Bannière colis
  colisBanner: {
    backgroundColor: colors.successBg,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  colisIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  colisIconTxt: { fontSize: 22 },
  colisBody: { flex: 1, gap: 2 },
  colisTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.success,
  },
  colisHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  footerPrice: { gap: 2 },
  footerPriceAmt: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
  },
  footerPriceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  reserveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  reserveBtnDisabled: { backgroundColor: colors.border },
  reserveBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  reserveBtnTxtDisabled: { color: colors.textMuted },
});
