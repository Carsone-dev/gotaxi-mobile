import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

const APP_VERSION = "1.0.0";
const CONTACT_EMAIL = "fccarsone@gmail.com";

// ── Données ───────────────────────────────────────────────────────────────────

const STATS = [
  { value: "12+", label: "Villes" },
  { value: "500+", label: "Chauffeurs" },
  { value: "4.8 ⭐", label: "Note moy." },
];

const FEATURES: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  title: string;
  desc: string;
}[] = [
  {
    icon: "shield-checkmark",
    color: "#2e7d32",
    title: "Chauffeurs vérifiés",
    desc: "Identité et permis contrôlés avant toute activation",
  },
  {
    icon: "pricetag",
    color: colors.primary,
    title: "Prix transparents",
    desc: "Tarif affiché à la réservation, aucune surprise",
  },
  {
    icon: "cube",
    color: "#e65100",
    title: "Envoi de colis",
    desc: "Confiez vos envois aux chauffeurs sur leurs trajets",
  },
  {
    icon: "phone-portrait",
    color: "#0066FF",
    title: "Paiement mobile",
    desc: "MTN MoMo, Moov Money ou portefeuille GoTaxi",
  },
  {
    icon: "location",
    color: "#7b1fa2",
    title: "100 % béninois",
    desc: "Conçu pour les trajets interurbains du Bénin",
  },
  {
    icon: "star",
    color: "#f9a825",
    title: "Système d'avis",
    desc: "Évaluations mutuelles pour un service de qualité",
  },
];

const LEGAL = [
  {
    icon: "document-text-outline" as React.ComponentProps<typeof Ionicons>["name"],
    label: "Conditions d'utilisation",
    onPress: () => {},
  },
  {
    icon: "lock-closed-outline" as React.ComponentProps<typeof Ionicons>["name"],
    label: "Politique de confidentialité",
    onPress: () => {},
  },
  {
    icon: "mail-outline" as React.ComponentProps<typeof Ionicons>["name"],
    label: "Nous contacter",
    onPress: () => Linking.openURL(`mailto:${CONTACT_EMAIL}`),
  },
];

// ── Sous-composants ───────────────────────────────────────────────────────────

function FeatureCard({
  icon, color, title, desc,
}: (typeof FEATURES)[0]) {
  return (
    <View style={feat.card}>
      <View style={[feat.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={feat.title}>{title}</Text>
      <Text style={feat.desc}>{desc}</Text>
    </View>
  );
}

const feat = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  desc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

function LegalRow({ icon, label, onPress }: (typeof LEGAL)[0]) {
  return (
    <Pressable
      style={({ pressed }) => [lr.row, pressed && { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={lr.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
    </Pressable>
  );
}

const lr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
});

// ── Écran ─────────────────────────────────────────────────────────────────────

export function AboutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>À propos</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── HERO ──────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Décors */}
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <View style={styles.deco3} />

          {/* Logo */}
          <View style={styles.logoRing}>
            <Ionicons name="car-sport" size={40} color={colors.primary} />
          </View>

          <Text style={styles.heroAppName}>GoTaxi</Text>
          <Text style={styles.heroTagline}>
            Le covoiturage & colis simplifié{"\n"}au Bénin
          </Text>

          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* ── STATS ─────────────────────────────────────────────── */}
        <View style={styles.statsStrip}>
          {STATS.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statSep} />}
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── MISSION ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notre mission</Text>
          <View style={styles.missionCard}>
            <View style={styles.missionQuote}>
              <Text style={styles.missionQuoteIcon}>"</Text>
              <Text style={styles.missionText}>
                Rendre chaque déplacement interurbain au Bénin plus simple,
                plus sûr et plus abordable — pour les voyageurs comme pour
                les chauffeurs.
              </Text>
            </View>
            <View style={styles.missionDivider} />
            <Text style={styles.missionBody}>
              GoTaxi connecte en temps réel les chauffeurs qui font la route
              et les clients qui souhaitent voyager ou envoyer un colis.
              La plateforme garantit la transparence des prix, la vérification
              des chauffeurs et un paiement 100 % mobile.
            </Text>
          </View>
        </View>

        {/* ── FONCTIONNALITÉS ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pourquoi GoTaxi ?</Text>
          <View style={styles.featGrid}>
            {FEATURES.map((f, i) =>
              i % 2 === 0 ? (
                <View key={f.title} style={styles.featRow}>
                  <FeatureCard {...FEATURES[i]} />
                  {FEATURES[i + 1] && <FeatureCard {...FEATURES[i + 1]} />}
                </View>
              ) : null
            )}
          </View>
        </View>

        {/* ── COMMENT ÇA MARCHE ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Comment ça marche ?</Text>
          <View style={styles.stepsCard}>
            {[
              { n: "1", title: "Cherchez un trajet", desc: "Entrez votre ville de départ, d'arrivée et la date souhaitée." },
              { n: "2", title: "Réservez en un tap", desc: "Choisissez votre chauffeur, confirmez les places et payez via mobile money." },
              { n: "3", title: "Voyagez l'esprit tranquille", desc: "Suivez votre réservation et notez votre chauffeur à l'arrivée." },
            ].map((step, i, arr) => (
              <View key={step.n} style={[styles.step, i < arr.length - 1 && styles.stepBorder]}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{step.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── LÉGAL ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Informations légales</Text>
          <View style={styles.legalCard}>
            {LEGAL.map((item) => (
              <LegalRow key={item.label} {...item} />
            ))}
          </View>
        </View>

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <View style={styles.footerIconRow}>
            <Ionicons name="car-sport" size={16} color={colors.primary} />
            <Text style={styles.footerBrand}>GoTaxi</Text>
          </View>
          <Text style={styles.footerSub}>
            Fait avec ❤️ au Bénin · {new Date().getFullYear()}
          </Text>
          <Text style={styles.footerEmail}>{CONTACT_EMAIL}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  /* Hero */
  hero: {
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingBottom: 48,
    paddingHorizontal: spacing["2xl"],
    overflow: "hidden",
  },
  deco1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -100,
    right: -80,
  },
  deco2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 0,
    left: -50,
  },
  deco3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: 20,
    left: 20,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  heroAppName: {
    fontSize: 38,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    letterSpacing: -1,
  },
  heroTagline: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.80)",
    textAlign: "center",
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  versionBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
  },
  versionText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: "rgba(255,255,255,0.90)",
    letterSpacing: 0.5,
  },

  /* Stats */
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "#0d2418",
    paddingVertical: spacing.xl,
    marginTop: -1,
  },
  statCell: { flex: 1, alignItems: "center", gap: 3 },
  statSep: { width: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Sections */
  section: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },

  /* Mission */
  missionCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  missionQuote: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  missionQuoteIcon: {
    fontSize: 48,
    fontFamily: typography.fontFamily.extraBold,
    color: `${colors.primary}30`,
    lineHeight: 48,
    marginTop: -8,
  },
  missionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    lineHeight: 24,
    fontStyle: "italic",
  },
  missionDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  missionBody: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 21,
  },

  /* Features */
  featGrid: { gap: spacing.sm },
  featRow: { flexDirection: "row", gap: spacing.sm },

  /* Steps */
  stepsCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  stepTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  /* Legal */
  legalCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* Footer */
  footer: {
    alignItems: "center",
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  footerIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  footerBrand: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  footerSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  footerEmail: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
});
