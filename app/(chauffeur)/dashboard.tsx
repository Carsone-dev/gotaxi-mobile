import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  FlatList,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/src/stores/authStore";
import {
  useChauffeurStats,
  useMyChauffeurProfile,
  useGoOnline,
  useGoOffline,
} from "@/src/hooks/useChauffeur";
import { useColisEnAttenteCount } from "@/src/hooks/useColis";
import { getErrorCode, getErrorMessage } from "@/src/utils/error-handler";
import { useIncomingReservations } from "@/src/hooks/useReservations";
import { useMyVoyages } from "@/src/hooks/useVoyages";
import { formatFCFA } from "@/src/utils/formatters";
import { useToast } from "@/src/components/common/Toast";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage, VoyageStatus } from "@/src/api/types";

type DateFilter = "all" | "today" | "week" | "month";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bonjour";
  if (h >= 12 && h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function formatVoyageDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-BJ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CFG: Record<VoyageStatus, { label: string; bg: string; text: string }> = {
  PUBLIE:   { label: "Publié",   bg: `${colors.primary}15`, text: colors.primary },
  COMPLET:  { label: "Complet",  bg: "#fff3e0",             text: "#e65100" },
  EN_COURS: { label: "En cours", bg: "#e8f5e9",             text: "#2e7d32" },
  TERMINE:  { label: "Terminé",  bg: colors.surface,        text: colors.textMuted },
  ANNULE:   { label: "Annulé",   bg: `${colors.error}10`,   text: colors.error },
};

// ── Bouton action rapide ──────────────────────────────────────────────────────
function QuickBtn({
  icon, label, iconBg, iconColor, badge, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  iconBg: string;
  iconColor: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [qb.btn, pressed && { opacity: 0.72 }]} onPress={onPress}>
      <View style={[qb.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={21} color={iconColor} />
        {badge != null && badge > 0 && (
          <View style={qb.badge}>
            <Text style={qb.badgeText}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        )}
      </View>
      <Text style={qb.label} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const qb = StyleSheet.create({
  btn: { flex: 1, alignItems: "center", gap: 5 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: colors.error,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

// ── Filtre chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[fc.chip, active && fc.chipActive]}>
      <Text style={[fc.label, active && fc.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const fc = StyleSheet.create({
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  labelActive: { color: colors.white, fontFamily: typography.fontFamily.semiBold },
});

// ── Carte voyage ──────────────────────────────────────────────────────────────
function VoyageCard({ voyage }: { voyage: Voyage }) {
  const cfg = STATUS_CFG[voyage.statut];
  const passagers = voyage.nombre_places_total - voyage.nombre_places_restantes;
  const gain = voyage.prix_par_place * passagers;

  return (
    <Pressable
      style={({ pressed }) => [vc.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/(chauffeur)/voyages/${voyage.id}` as any)}
    >
      <View style={vc.top}>
        <Text style={vc.route} numberOfLines={1}>
          {voyage.ville_depart} → {voyage.ville_arrivee}
        </Text>
        <View style={[vc.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[vc.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={vc.date}>{formatVoyageDate(voyage.date_depart)}</Text>
      <View style={vc.footer}>
        <Text style={vc.meta}>
          👤 {passagers}/{voyage.nombre_places_total} passager{passagers > 1 ? "s" : ""}
        </Text>
        {gain > 0 && <Text style={vc.gain}>{formatFCFA(gain)}</Text>}
      </View>
    </Pressable>
  );
}

const vc = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.sm,
    gap: 4,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  route: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  badgeText: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  date: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  meta: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  gain: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: "#2e7d32",
  },
});

// ── Écran ─────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { showToast } = useToast();

  const { data: chauffeur } = useMyChauffeurProfile();
  const { data: stats } = useChauffeurStats();
  const kycValide = chauffeur?.kyc_valide ?? false;
  const { data: incoming } = useIncomingReservations();
  const { data: mesVoyages } = useMyVoyages();
  const { mutateAsync: goOnline, isPending: goingOnline } = useGoOnline();
  const { mutateAsync: goOffline, isPending: goingOffline } = useGoOffline();

  const [filterDate, setFilterDate] = useState<DateFilter>("all");
  const [filterRoute, setFilterRoute] = useState("");

  const isOnline = stats?.en_ligne ?? false;
  const pendingCount = incoming?.length ?? 0;
  const voyagesAvecColisActifIds = useMemo(
    () =>
      (mesVoyages ?? [])
        .filter(
          (v) =>
            v.accepte_colis &&
            (v.statut === "PUBLIE" || v.statut === "COMPLET" || v.statut === "EN_COURS")
        )
        .map((v) => v.id),
    [mesVoyages]
  );
  const { count: colisEnAttenteCount } = useColisEnAttenteCount(voyagesAvecColisActifIds);

  const greeting = useMemo(() => getGreeting(), []);
  const photoUrl = user?.photo_url ?? null;
  const initials = `${user?.prenom?.[0] ?? ""}${user?.nom?.[0] ?? ""}`.toUpperCase();

  const filteredVoyages = useMemo(() => {
    let result = [...(mesVoyages ?? [])];

    if (filterDate !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let cutoff: Date;
      if (filterDate === "today") cutoff = today;
      else if (filterDate === "week") cutoff = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      else cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter((v) => new Date(v.date_depart) >= cutoff);
    }

    if (filterRoute.trim()) {
      const q = filterRoute.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.ville_depart.toLowerCase().includes(q) ||
          v.ville_arrivee.toLowerCase().includes(q)
      );
    }

    return result.sort(
      (a, b) => new Date(b.date_depart).getTime() - new Date(a.date_depart).getTime()
    );
  }, [mesVoyages, filterDate, filterRoute]);

  const handleToggleOnline = async () => {
    if (!kycValide) {
      showToast("KYC non validé — envoyez vos documents dans Paramètres", "error");
      return;
    }
    try {
      if (isOnline) {
        await goOffline();
        showToast("Vous êtes maintenant hors ligne", "info");
      } else {
        await goOnline();
        showToast("Vous êtes maintenant en ligne", "success");
      }
    } catch (e) {
      if (getErrorCode(e) === "KYC_NOT_VALIDATED") {
        showToast("KYC non validé — contactez le support GoTaxi", "error");
      } else {
        showToast(getErrorMessage(e), "error");
      }
    }
  };

  const toggling = goingOnline || goingOffline;

  const renderVoyage = useCallback(({ item }: { item: Voyage }) => (
    <VoyageCard voyage={item} />
  ), []);

  const keyExtractor = useCallback((item: Voyage) => item.id, []);

  return (
    <View style={styles.root}>
      {/* ══════════════════ HERO ══════════════════ */}
      <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <View style={styles.deco1} />
        <View style={styles.deco2} />

        <View style={styles.topRow}>
          <View style={styles.avatarRing}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={[styles.onlineDot, isOnline && kycValide ? styles.dotOn : styles.dotOff]} />
          </View>

          <View style={styles.greetingCol}>
            <Text style={styles.greetingText}>{greeting} 👋</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {user?.prenom} {user?.nom}
            </Text>
          </View>

          <Pressable
            onPress={handleToggleOnline}
            disabled={toggling}
            style={[
              styles.toggle,
              !kycValide ? styles.toggleKyc : isOnline ? styles.toggleOn : styles.toggleOff,
            ]}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={isOnline && kycValide ? colors.white : colors.textMuted} />
            ) : (
              <Text
                style={[
                  styles.toggleText,
                  isOnline && kycValide && styles.toggleTextOn,
                  !kycValide && styles.toggleTextKyc,
                ]}
              >
                {!kycValide ? "⚠ KYC" : isOnline ? "● En ligne" : "○ Hors ligne"}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statCell}>
            <Text style={styles.statVal}>{stats?.nombre_trajets ?? 0}</Text>
            <Text style={styles.statLbl}>Courses</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.yellow }]}>
              ⭐ {stats?.note_moyenne ? stats.note_moyenne.toFixed(1) : "—"}
            </Text>
            <Text style={styles.statLbl}>Note</Text>
          </View>
        </View>
      </View>

      {/* ══════════════ ALERTES + ACTIONS (fixées) ══════════════ */}
      <View style={styles.fixedSection}>
        {!kycValide && (
          <Pressable
            style={[styles.alert, styles.alertWarn]}
            onPress={() => router.push("/(chauffeur)/settings" as any)}
          >
            <Ionicons name="warning-outline" size={15} color={colors.warningText} />
            <Text style={[styles.alertText, { color: colors.warningText }]} numberOfLines={1}>
              KYC en attente — envoyez vos documents
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.warningText} />
          </Pressable>
        )}

        {pendingCount > 0 && (
          <Pressable
            style={[styles.alert, styles.alertErr]}
            onPress={() => router.push("/(chauffeur)/reservations" as any)}
          >
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{pendingCount}</Text>
            </View>
            <Text style={[styles.alertText, { color: colors.error, flex: 1 }]} numberOfLines={1}>
              {pendingCount} réservation{pendingCount > 1 ? "s" : ""} en attente
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.error} />
          </Pressable>
        )}

        <View style={styles.actionsBar}>
          <QuickBtn
            icon="add-circle"
            label="Publier"
            iconBg={`${colors.primary}18`}
            iconColor={colors.primary}
            onPress={() => router.push("/(chauffeur)/voyages/publish" as any)}
          />
          <QuickBtn
            icon="calendar-clear"
            label="Réservations"
            iconBg={pendingCount > 0 ? `${colors.error}15` : "#1a1a2e15"}
            iconColor={pendingCount > 0 ? colors.error : "#1a1a2e"}
            badge={pendingCount > 0 ? pendingCount : undefined}
            onPress={() => router.push("/(chauffeur)/reservations" as any)}
          />
          <QuickBtn
            icon="cube"
            label="Colis"
            iconBg={colisEnAttenteCount > 0 ? `${colors.primary}18` : colors.surface}
            iconColor={colisEnAttenteCount > 0 ? colors.primary : colors.textSecondary}
            badge={colisEnAttenteCount > 0 ? colisEnAttenteCount : undefined}
            onPress={() => router.push("/(chauffeur)/colis" as any)}
          />
        </View>
      </View>

      {/* ══════════════════ HISTORIQUE ══════════════════ */}
      <FlatList
        style={styles.list}
        data={filteredVoyages}
        renderItem={renderVoyage}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Filtres */}
            <View style={styles.filtersWrap}>
              <View style={styles.chipRow}>
                {(["all", "today", "week", "month"] as const).map((d) => (
                  <FilterChip
                    key={d}
                    label={
                      d === "all" ? "Tous" :
                      d === "today" ? "Auj." :
                      d === "week" ? "Semaine" : "Mois"
                    }
                    active={filterDate === d}
                    onPress={() => setFilterDate(d)}
                  />
                ))}
              </View>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={15} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filtrer par ville..."
                  placeholderTextColor={colors.textMuted}
                  value={filterRoute}
                  onChangeText={setFilterRoute}
                  returnKeyType="search"
                />
                {filterRoute.length > 0 && (
                  <Pressable onPress={() => setFilterRoute("")}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Titre section */}
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Historique des voyages</Text>
              <Text style={styles.historyCount}>
                {filteredVoyages.length} voyage{filteredVoyages.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyText}>Aucun voyage trouvé</Text>
            {(filterDate !== "all" || filterRoute.length > 0) && (
              <Pressable
                style={styles.clearBtn}
                onPress={() => { setFilterDate("all"); setFilterRoute(""); }}
              >
                <Text style={styles.clearBtnText}>Effacer les filtres</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  /* ── Hero ── */
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: 0,
    overflow: "hidden",
  },
  deco1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -70,
    right: -50,
  },
  deco2: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 40,
    left: -40,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dotOn: { backgroundColor: colors.yellow },
  dotOff: { backgroundColor: "rgba(255,255,255,0.3)" },
  greetingCol: { flex: 1 },
  greetingText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.75)",
  },
  heroName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    lineHeight: 22,
  },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    minWidth: 94,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: "rgba(255,255,255,0.22)" },
  toggleOff: { backgroundColor: "rgba(0,0,0,0.20)" },
  toggleKyc: { backgroundColor: colors.warningBg },
  toggleText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: "rgba(255,255,255,0.75)",
  },
  toggleTextOn: { color: colors.white },
  toggleTextKyc: { color: colors.warningText },
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  statCell: { flex: 1, alignItems: "center", gap: 2 },
  statSep: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  statVal: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  statLbl: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* ── Section fixée (alertes + actions) ── */
  fixedSection: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  alertWarn: {
    backgroundColor: colors.warningBg,
    borderColor: `${colors.warning}60`,
  },
  alertErr: {
    backgroundColor: `${colors.error}10`,
    borderColor: `${colors.error}40`,
  },
  alertText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
  },
  alertBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  /* Barre d'actions */
  actionsBar: {
    flexDirection: "row",
    paddingTop: spacing.sm,
  },

  /* ── Historique ── */
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },

  filtersWrap: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    padding: 0,
  },

  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  historyTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  historyCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  emptyState: {
    alignItems: "center",
    paddingTop: spacing["2xl"],
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  clearBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: `${colors.primary}15`,
  },
  clearBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
});
