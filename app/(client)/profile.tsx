import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthStore } from "@/src/stores/authStore";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

// ── Composants utilitaires ────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function MenuRow({
  icon,
  label,
  right,
  onPress,
  danger,
  separator,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  separator?: boolean;
}) {
  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Text style={styles.rowIconText}>{icon}</Text>
        </View>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        <View style={styles.rowRight}>{right ?? <Text style={styles.rowChevron}>›</Text>}</View>
      </Pressable>
      {separator && <View style={styles.rowDivider} />}
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Toggle pill chauffeur ─────────────────────────────────────────────────────
function ModeToggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toggle, active && styles.toggleActive]}
    >
      <View style={[styles.toggleKnob, active && styles.toggleKnobActive]} />
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
        {active ? "Actif" : "Inactif"}
      </Text>
    </Pressable>
  );
}

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const user               = useAuthStore((s) => s.user);
  const logout             = useAuthStore((s) => s.logout);
  const toggleChauffeur    = useAuthStore((s) => s.toggleChauffeurMode);
  const isChauffeurMode    = useAuthStore((s) => s.isChauffeurMode);
  const isChauffeur        = user?.role === "CHAUFFEUR";

  const initials    = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : "?";
  const memberSince = user?.created_at
    ? format(new Date(user.created_at), "MMMM yyyy", { locale: fr })
    : "—";

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

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
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.hero}>
          {/* Avatar */}
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          {/* Nom + téléphone */}
          <Text style={styles.heroName}>{user?.prenom} {user?.nom}</Text>
          <Text style={styles.heroPhone}>{user?.telephone}</Text>

          {/* Badges */}
          <View style={styles.heroBadges}>
            <View style={[
              styles.verifiedBadge,
              user?.telephone_verifie ? styles.verifiedBadgeOk : styles.verifiedBadgePending,
            ]}>
              <Text style={[
                styles.verifiedText,
                user?.telephone_verifie ? styles.verifiedTextOk : styles.verifiedTextPending,
              ]}>
                {user?.telephone_verifie ? "✓ Vérifié" : "⚠ Non vérifié"}
              </Text>
            </View>

            {(user?.note_moyenne ?? 0) > 0 && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingStar}>⭐</Text>
                <Text style={styles.ratingText}>
                  {user!.note_moyenne.toFixed(1)}
                </Text>
                <Text style={styles.ratingCount}>· {user!.nombre_avis} avis</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Infos personnelles ──────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(80)} style={styles.card}>
          <SectionLabel label="Informations" />
          <InfoRow
            icon="📧"
            label="Email"
            value={user?.email ?? "Non renseigné"}
          />
          <View style={styles.rowDivider} />
          <InfoRow
            icon="📅"
            label="Membre depuis"
            value={memberSince}
          />
          <View style={styles.rowDivider} />
          <InfoRow
            icon="🌍"
            label="Langue"
            value={user?.langue === "fr" ? "Français" : user?.langue ?? "Français"}
          />
        </Animated.View>

        {/* ── Compte ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(160)} style={styles.card}>
          <SectionLabel label="Compte" />
          {isChauffeur && (
            <>
              <MenuRow
                icon="🚗"
                label="Mode chauffeur"
                right={<ModeToggle active={isChauffeurMode} onPress={toggleChauffeur} />}
                separator
              />
            </>
          )}
          <MenuRow
            icon="📱"
            label="Vérifier mon numéro"
            onPress={() => router.push("/(auth)/otp" as any)}
            separator
          />
          <MenuRow
            icon="✏️"
            label="Modifier le profil"
            onPress={() => {}}
          />
        </Animated.View>

        {/* ── Support ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(240)} style={styles.card}>
          <SectionLabel label="Support" />
          <MenuRow
            icon="❓"
            label="Aide et FAQ"
            onPress={() => {}}
            separator
          />
          <MenuRow
            icon="ℹ️"
            label="À propos de GoTaxi"
            onPress={() => {}}
          />
        </Animated.View>

        {/* ── Déconnexion ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300).delay(320)}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>
          <Text style={styles.versionText}>GoTaxi · v1.0.0</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
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
    textAlign: "center",
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },

  // Scroll content
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: 48,
    gap: spacing.lg,
  },

  // Hero
  hero: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing["2xl"],
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  heroName: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  heroPhone: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  heroBadges: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  verifiedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  verifiedBadgeOk: { backgroundColor: colors.successBg },
  verifiedBadgePending: { backgroundColor: colors.warningBg },
  verifiedText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },
  verifiedTextOk: { color: colors.success },
  verifiedTextPending: { color: colors.warningText },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  ratingStar: { fontSize: 12 },
  ratingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  ratingCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  // Row commun
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDanger: { backgroundColor: colors.errorBg, borderColor: colors.errorBg },
  rowIconText: { fontSize: 16 },
  rowLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  rowLabelDanger: { color: colors.error },
  rowRight: { alignItems: "flex-end" },
  rowChevron: {
    fontSize: typography.fontSize.xl,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 24,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoBody: { flex: 1, gap: 2 },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },

  // Toggle
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    minWidth: 72,
  },
  toggleActive: {
    backgroundColor: colors.successBg,
    borderColor: colors.primary,
  },
  toggleKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textMuted,
  },
  toggleKnobActive: { backgroundColor: colors.primary },
  toggleLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textMuted,
  },
  toggleLabelActive: { color: colors.primary },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  logoutIcon: { fontSize: 18 },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
  },
  versionText: {
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
});
