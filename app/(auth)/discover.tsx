import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePublicVoyages, usePublicSearchVoyages, usePublicVilles } from "@/src/hooks/useVoyages";
import type { Voyage } from "@/src/api/types";
import { colors, typography, spacing } from "@/src/theme";

// ── Helpers ────────────────────────────────────────────────────────────────

function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatPrice(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

// ── City picker modal ──────────────────────────────────────────────────────

interface CityPickerProps {
  visible: boolean;
  title: string;
  onSelect: (ville: string) => void;
  onClose: () => void;
}

function CityPickerModal({ visible, title, onSelect, onClose }: CityPickerProps) {
  const [query, setQuery] = useState("");
  const { data: villes = [], isLoading } = usePublicVilles();

  const filtered = query.trim()
    ? villes.filter((v) => v.toLowerCase().includes(query.toLowerCase()))
    : villes;

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={cp.overlay} onPress={handleClose} />
      <View style={cp.sheet}>
        <View style={cp.handle} />
        <Text style={cp.title}>{title}</Text>

        <TextInput
          style={cp.search}
          placeholder="Rechercher une ville..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(v) => v}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [cp.item, pressed && cp.itemPressed]}
                onPress={() => {
                  setQuery("");
                  onSelect(item);
                }}
              >
                <Text style={cp.itemText}>📍 {item}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={cp.sep} />}
          />
        )}
      </View>
    </Modal>
  );
}

const cp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: "75%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: spacing.xl,
  },
  search: {
    marginHorizontal: spacing.xl,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  itemPressed: {
    backgroundColor: colors.surface,
  },
  itemText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  sep: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
});

// ── Auth gate modal ────────────────────────────────────────────────────────

interface AuthGateProps {
  visible: boolean;
  voyage: Voyage | null;
  actionType: "reserve" | "colis";
  onClose: () => void;
}

function AuthGateModal({ visible, voyage, actionType, onClose }: AuthGateProps) {
  const handleLogin = async () => {
    if (voyage) {
      await AsyncStorage.setItem("@pending_voyage_id", voyage.id);
    }
    onClose();
    router.push("/(auth)/login");
  };

  const handleRegister = async () => {
    if (voyage) {
      await AsyncStorage.setItem("@pending_voyage_id", voyage.id);
    }
    onClose();
    router.push("/(auth)/register");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={ag.overlay} onPress={onClose} />
      <View style={ag.sheet}>
        <View style={ag.handle} />

        <Text style={ag.icon}>🔒</Text>
        <Text style={ag.title}>Connexion requise</Text>
        <Text style={ag.sub}>
          {actionType === "reserve"
            ? "Pour réserver ce voyage, connectez-vous ou créez un compte."
            : "Pour envoyer un colis, connectez-vous ou créez un compte."}
        </Text>

        {voyage && (
          <View style={ag.voyageRow}>
            <Text style={ag.voyageRoute}>
              {voyage.ville_depart} → {voyage.ville_arrivee}
            </Text>
            <Text style={ag.voyageMeta}>
              {formatDate(voyage.date_depart)} · {formatPrice(voyage.prix_par_place)} / place
            </Text>
          </View>
        )}

        <Pressable style={ag.btnPrimary} onPress={handleLogin}>
          <Text style={ag.btnPrimaryText}>Se connecter</Text>
        </Pressable>

        <Pressable style={ag.btnSecondary} onPress={handleRegister}>
          <Text style={ag.btnSecondaryText}>Créer un compte</Text>
        </Pressable>

        <Pressable onPress={onClose} style={ag.cancelBtn}>
          <Text style={ag.cancelText}>Continuer à naviguer</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const ag = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: 40,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  icon: { fontSize: 40, marginBottom: 12 },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  sub: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  voyageRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 24,
    alignItems: "center",
  },
  voyageRoute: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  voyageMeta: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  btnPrimary: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  btnPrimaryText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  btnSecondary: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  btnSecondaryText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  cancelBtn: { paddingVertical: 8 },
  cancelText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
});

// ── Voyage card ────────────────────────────────────────────────────────────

interface VoyageCardProps {
  voyage: Voyage;
  onReserve: (v: Voyage) => void;
  onColis: (v: Voyage) => void;
}

function VoyageCard({ voyage, onReserve, onColis }: VoyageCardProps) {
  return (
    <View style={vc.card}>
      <View style={vc.header}>
        <View style={vc.routeBlock}>
          <Text style={vc.route}>
            {voyage.ville_depart} → {voyage.ville_arrivee}
          </Text>
          <Text style={vc.meta}>
            {formatDate(voyage.date_depart)} · {formatTime(voyage.date_depart)}
          </Text>
        </View>
        <View style={vc.badges}>
          {voyage.climatise && <Text style={vc.badge}>❄️</Text>}
          {voyage.accepte_colis && <Text style={vc.badge}>📦</Text>}
        </View>
      </View>

      <View style={vc.infoRow}>
        <Text style={vc.places}>
          {voyage.nombre_places_restantes} place{voyage.nombre_places_restantes > 1 ? "s" : ""} restante{voyage.nombre_places_restantes > 1 ? "s" : ""}
        </Text>
        <Text style={vc.price}>{formatPrice(voyage.prix_par_place)} / place</Text>
      </View>

      <View style={vc.actions}>
        <Pressable
          style={({ pressed }) => [vc.btnReserve, pressed && { opacity: 0.85 }]}
          onPress={() => onReserve(voyage)}
        >
          <Text style={vc.btnReserveText}>Réserver</Text>
        </Pressable>

        {voyage.accepte_colis && (
          <Pressable
            style={({ pressed }) => [vc.btnColis, pressed && { opacity: 0.85 }]}
            onPress={() => onColis(voyage)}
          >
            <Text style={vc.btnColisText}>📦 Colis</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const vc = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  routeBlock: { flex: 1 },
  route: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  badges: { flexDirection: "row", gap: 4, paddingTop: 2 },
  badge: { fontSize: 16 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  places: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  price: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  btnReserve: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnReserveText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  btnColis: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnColisText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────

const DATE_CHIPS = [
  { label: "Aujourd'hui", value: todayStr(0) },
  { label: "Demain", value: todayStr(1) },
  { label: "Après-demain", value: todayStr(2) },
];

export default function DiscoverScreen() {
  const [villeDepart, setVilleDepart] = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [dateChip, setDateChip] = useState(0);
  const [searchActive, setSearchActive] = useState(false);

  const [cityPickerTarget, setCityPickerTarget] = useState<"depart" | "arrivee" | null>(null);
  const [authGate, setAuthGate] = useState<{
    visible: boolean;
    voyage: Voyage | null;
    type: "reserve" | "colis";
  }>({ visible: false, voyage: null, type: "reserve" });

  const dateStr = DATE_CHIPS[dateChip].value;

  const canSearch = !!villeDepart && !!villeArrivee;

  const { data: recent, isLoading: loadingRecent } = usePublicVoyages(
    searchActive ? undefined : {}
  );

  const { data: results, isLoading: loadingSearch } = usePublicSearchVoyages(
    { ville_depart: villeDepart, ville_arrivee: villeArrivee, date_depart: dateStr },
    searchActive && canSearch,
  );

  const displayData = searchActive && canSearch ? results : recent;
  const isLoading = searchActive && canSearch ? loadingSearch : loadingRecent;
  const voyages: Voyage[] = displayData?.items ?? [];
  const total: number = displayData?.total ?? 0;

  const handleSearch = () => {
    if (!canSearch) return;
    setSearchActive(true);
  };

  const handleReset = () => {
    setVilleDepart("");
    setVilleArrivee("");
    setDateChip(0);
    setSearchActive(false);
  };

  const handleCitySelect = useCallback(
    (ville: string) => {
      if (cityPickerTarget === "depart") setVilleDepart(ville);
      else setVilleArrivee(ville);
      setCityPickerTarget(null);
      setSearchActive(false);
    },
    [cityPickerTarget],
  );

  const openAuthGate = (voyage: Voyage, type: "reserve" | "colis") =>
    setAuthGate({ visible: true, voyage, type });

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.safeTop} />
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.logoRow}>
          <View style={s.logoCircle}>
            <Text style={s.logoLetter}>G</Text>
          </View>
          <View>
            <Text style={s.appName}>GoTaxi</Text>
            <Text style={s.tagline}>Voyagez sereinement</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={voyages}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={
          <View>
            {/* Search card */}
            <View style={s.searchCard}>
              <Text style={s.searchTitle}>Trouver un voyage</Text>

              {/* Depart */}
              <Pressable
                style={({ pressed }) => [s.cityBtn, pressed && s.cityBtnPressed]}
                onPress={() => setCityPickerTarget("depart")}
              >
                <Text style={s.cityBtnLabel}>Ville de départ</Text>
                <Text style={[s.cityBtnValue, !villeDepart && s.cityBtnPlaceholder]}>
                  {villeDepart || "Sélectionner..."}
                </Text>
              </Pressable>

              <View style={s.swapRow}>
                <View style={s.swapLine} />
                <View style={s.swapDot}>
                  <Text style={s.swapIcon}>⇅</Text>
                </View>
                <View style={s.swapLine} />
              </View>

              {/* Arrivee */}
              <Pressable
                style={({ pressed }) => [s.cityBtn, pressed && s.cityBtnPressed]}
                onPress={() => setCityPickerTarget("arrivee")}
              >
                <Text style={s.cityBtnLabel}>Ville d'arrivée</Text>
                <Text style={[s.cityBtnValue, !villeArrivee && s.cityBtnPlaceholder]}>
                  {villeArrivee || "Sélectionner..."}
                </Text>
              </Pressable>

              {/* Date chips */}
              <View style={s.chipRow}>
                {DATE_CHIPS.map((chip, i) => (
                  <Pressable
                    key={chip.value}
                    style={[s.chip, i === dateChip && s.chipActive]}
                    onPress={() => {
                      setDateChip(i);
                      if (searchActive) setSearchActive(false);
                    }}
                  >
                    <Text style={[s.chipText, i === dateChip && s.chipTextActive]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Search / reset */}
              <View style={s.searchActions}>
                <Pressable
                  style={[s.searchBtn, !canSearch && s.searchBtnDisabled]}
                  onPress={handleSearch}
                  disabled={!canSearch}
                >
                  <Text style={s.searchBtnText}>Rechercher</Text>
                </Pressable>
                {(villeDepart || villeArrivee) && (
                  <Pressable onPress={handleReset} style={s.resetBtn}>
                    <Text style={s.resetText}>Réinitialiser</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Section header */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>
                {searchActive && canSearch ? "Résultats de recherche" : "Voyages disponibles"}
              </Text>
              {!isLoading && (
                <Text style={s.sectionCount}>{total} voyage{total !== 1 ? "s" : ""}</Text>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <VoyageCard
            voyage={item}
            onReserve={(v) => openAuthGate(v, "reserve")}
            onColis={(v) => openAuthGate(v, "colis")}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🚗</Text>
              <Text style={s.emptyTitle}>Aucun voyage trouvé</Text>
              <Text style={s.emptyMsg}>
                {searchActive
                  ? "Essayez d'autres villes ou une autre date."
                  : "Revenez bientôt, de nouveaux voyages sont ajoutés chaque jour."}
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={voyages.length === 0 ? { flex: 1 } : undefined}
      />

      {/* Sticky footer */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.white }}>
        <View style={s.footer}>
          <Text style={s.footerText}>Déjà un compte ?</Text>
          <Pressable onPress={() => router.push("/(auth)/login")}>
            <Text style={s.footerLink}> Se connecter</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* City picker */}
      <CityPickerModal
        visible={!!cityPickerTarget}
        title={cityPickerTarget === "depart" ? "Ville de départ" : "Ville d'arrivée"}
        onSelect={handleCitySelect}
        onClose={() => setCityPickerTarget(null)}
      />

      {/* Auth gate */}
      <AuthGateModal
        visible={authGate.visible}
        voyage={authGate.voyage}
        actionType={authGate.type}
        onClose={() => setAuthGate((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  safeTop: { backgroundColor: colors.primary },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 24,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 26,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    lineHeight: 30,
  },
  appName: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
  },
  tagline: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.75)",
  },

  // Search card
  searchCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: -12,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: spacing.xl,
  },
  searchTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  cityBtn: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityBtnPressed: { opacity: 0.75 },
  cityBtnLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    marginBottom: 2,
  },
  cityBtnValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  cityBtnPlaceholder: { color: colors.textMuted },

  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: 8,
  },
  swapLine: { flex: 1, height: 1, backgroundColor: colors.border },
  swapDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  swapIcon: { fontSize: 14, color: colors.textSecondary },

  chipRow: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  chipTextActive: { color: colors.white, fontFamily: typography.fontFamily.bold },

  searchActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  searchBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  searchBtnDisabled: { backgroundColor: colors.border },
  searchBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  resetBtn: { paddingVertical: 12, paddingHorizontal: 8 },
  resetText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
    marginTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMsg: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});
