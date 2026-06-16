import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuthStore } from "@/src/stores/authStore";
import { useMyChauffeurProfile } from "@/src/hooks/useChauffeur";
import { usersApi } from "@/src/api/endpoints/users";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

type Tint = "primary" | "info" | "warning" | "danger";

const TINTS: Record<Tint, { bg: string; color: string }> = {
  primary: { bg: `${colors.primary}15`, color: colors.primary },
  info: { bg: colors.infoBg, color: colors.info },
  warning: { bg: colors.warningBg, color: colors.warningText },
  danger: { bg: colors.errorBg, color: colors.error },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNote(note: number | null | undefined): string {
  if (note == null || note === 0) return "—";
  return note.toFixed(1);
}

// ── Avatar avec sélecteur photo ───────────────────────────────────────────────

function AvatarPicker({
  photoUrl,
  initials,
  onPhotoSelected,
  uploading,
}: {
  photoUrl: string | null | undefined;
  initials: string;
  onPhotoSelected: (uri: string) => void;
  uploading: boolean;
}) {
  const handlePress = () => {
    Alert.alert(
      "Photo de profil",
      "Choisissez comment ajouter votre photo",
      [
        {
          text: "📷  Prendre une photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Permission refusée", "Autorisez l'accès à la caméra dans les paramètres.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.9,
            });
            if (!result.canceled && result.assets[0]) onPhotoSelected(result.assets[0].uri);
          },
        },
        {
          text: "🖼  Choisir depuis la galerie",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.9,
            });
            if (!result.canceled && result.assets[0]) onPhotoSelected(result.assets[0].uri);
          },
        },
        { text: "Annuler", style: "cancel" },
      ],
    );
  };

  return (
    <Pressable style={av.wrap} onPress={handlePress} disabled={uploading}>
      {/* Cercle avatar */}
      <View style={av.ring}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={av.image} resizeMode="cover" />
        ) : (
          <View style={av.initials}>
            <Text style={av.initialsText}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Overlay upload */}
      {uploading && (
        <View style={av.uploadOverlay}>
          <ActivityIndicator color={colors.white} size="small" />
        </View>
      )}

      {/* Bouton caméra */}
      <View style={av.cameraBtn}>
        <Ionicons name="camera" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const av = StyleSheet.create({
  wrap: { alignSelf: "center", marginBottom: spacing.md },
  ring: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: colors.white,
    overflow: "hidden",
    ...shadows.md,
  },
  image: { width: "100%", height: "100%" },
  initials: {
    flex: 1,
    backgroundColor: `${colors.primary}CC`,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 40,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 58,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  cameraIcon: { fontSize: 15 },
});

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
}) {
  return (
    <View style={sp.pill}>
      <View style={sp.iconBox}>
        <Ionicons name={icon} size={15} color={colors.white} />
      </View>
      <Text style={sp.value}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  );
}

const sp = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: spacing.md,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    color: `${colors.white}BB`,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});

// ── Ligne menu ────────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  sub,
  onPress,
  tint = "primary",
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sub?: string;
  onPress?: () => void;
  tint?: Tint;
  last?: boolean;
}) {
  const t = TINTS[tint];
  return (
    <>
      <Pressable
        style={({ pressed }) => [mi.row, pressed && mi.rowPressed]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={[mi.iconBox, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={19} color={t.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[mi.label, tint === "danger" && mi.labelDanger]}>{label}</Text>
          {sub ? <Text style={mi.sub}>{sub}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
      {!last && <View style={mi.sep} />}
    </>
  );
}

const mi = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surface },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  labelDanger: { color: colors.error },
  sub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
  sep: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
});

// ── Écran principal ───────────────────────────────────────────────────────────

export default function ChauffeurProfileScreen() {
  const insets = useSafeAreaInsets();
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout  = useAuthStore((s) => s.logout);

  const { data: chauffeur } = useMyChauffeurProfile();

  const [uploading, setUploading] = useState(false);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : "?";
  const photoUrl = localPhoto ?? user?.photo_url ?? null;

  const handlePhotoSelected = async (uri: string) => {
    setLocalPhoto(uri);
    setUploading(true);
    try {
      const updated = await usersApi.uploadPhoto(uri);
      setUser(updated);
      setLocalPhoto(null);
    } catch {
      setLocalPhoto(null);
      Alert.alert("Erreur", "Impossible d'enregistrer la photo. Réessayez.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () =>
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => { await logout(); router.replace("/(auth)/login"); },
      },
    ]);

  const PT = insets.top + 16;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: PT }]}>
        <View style={styles.deco1} />
        <View style={styles.deco2} />

        <AvatarPicker
          photoUrl={photoUrl}
          initials={initials}
          onPhotoSelected={handlePhotoSelected}
          uploading={uploading}
        />

        <Text style={styles.heroName}>{user?.prenom} {user?.nom}</Text>
        <Text style={styles.heroPhone}>{user?.telephone}</Text>

        <View style={styles.verifiedBadge}>
          <Ionicons name="sparkles" size={11} color={colors.white} />
          <Text style={styles.verifiedText}>Chauffeur GoTaxi</Text>
        </View>

        {/* Séparateur */}
        <View style={styles.heroSep} />

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatPill
            icon="car-sport"
            value={chauffeur?.nombre_trajets != null ? String(chauffeur.nombre_trajets) : "0"}
            label="Voyages"
          />
          <View style={styles.statsDivider} />
          <StatPill
            icon="star"
            value={formatNote(user?.note_moyenne)}
            label="Note"
          />
          <View style={styles.statsDivider} />
          <StatPill
            icon="chatbubble-ellipses"
            value={user?.nombre_avis != null ? String(user.nombre_avis) : "0"}
            label="Avis"
          />
        </View>
      </View>

      {/* ── Hint photo si pas de photo ── */}
      {!user?.photo_url && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.photoHint}>
          <Ionicons name="bulb" size={16} color={colors.primary} />
          <Text style={styles.photoHintText}>
            Ajoutez une photo professionnelle — les clients font plus confiance aux chauffeurs avec photo.
          </Text>
        </Animated.View>
      )}

      {/* ── Compte ── */}
      <Animated.View entering={FadeInDown.duration(300).delay(60)}>
        <Text style={styles.sectionLabel}>Mon compte</Text>
        <View style={styles.card}>
          <MenuItem
            icon="construct"
            tint="info"
            label="Paramètres & véhicule"
            sub="Profil, documents, véhicule"
            onPress={() => router.push("/(chauffeur)/settings" as any)}
            last
          />
        </View>
      </Animated.View>

      {/* ── Support ── */}
      <Animated.View entering={FadeInDown.duration(300).delay(120)}>
        <Text style={styles.sectionLabel}>Assistance</Text>
        <View style={styles.card}>
          <MenuItem
            icon="help-circle"
            tint="warning"
            label="Aide & support"
            sub="FAQ, nous contacter"
            onPress={() => router.push("/(chauffeur)/support" as any)}
          />
          <MenuItem
            icon="information-circle"
            tint="primary"
            label="À propos de GoTaxi"
            sub="Mission, fonctionnalités, légal"
            onPress={() => router.push("/(chauffeur)/about" as any)}
            last
          />
        </View>
      </Animated.View>

      {/* ── Déconnexion ── */}
      <Animated.View entering={FadeInDown.duration(300).delay(180)}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
        <Text style={styles.version}>GoTaxi · Chauffeur</Text>
      </Animated.View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    alignItems: "center",
    gap: spacing.xs,
    overflow: "hidden",
  },
  deco1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -70,
    right: -50,
  },
  deco2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 20,
    left: -40,
  },
  heroName: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    marginTop: spacing.xs,
  },
  heroPhone: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: `${colors.white}CC`,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 5,
    marginTop: spacing.xs,
  },
  verifiedText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  heroSep: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.20)",
  },

  photoHint: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: `${colors.primary}10`,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
    padding: spacing.lg,
    marginHorizontal: spacing["2xl"],
    marginTop: spacing.xl,
  },
  photoHintText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.primary,
    lineHeight: 20,
  },

  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginHorizontal: spacing["2xl"],
    marginTop: spacing["2xl"],
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    marginHorizontal: spacing["2xl"],
    overflow: "hidden",
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing["2xl"],
    marginTop: spacing["2xl"],
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
  },
  version: {
    textAlign: "center",
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});
