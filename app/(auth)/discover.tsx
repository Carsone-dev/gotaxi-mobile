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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePublicVoyages, usePublicSearchVoyages, usePublicVilles } from "@/src/hooks/useVoyages";
import type { Voyage } from "@/src/api/types";
import { colors, typography, spacing } from "@/src/theme";
import { resolveMediaUrl } from "@/src/constants/app";

// ── Helpers ────────────────────────────────────────────────────────────────

function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(n: number) {
  return n.toLocaleString("fr-FR");
}

// ── City picker ────────────────────────────────────────────────────────────

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

  const close = () => { setQuery(""); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={cp.overlay} onPress={close} />
      <View style={cp.sheet}>
        <View style={cp.handle} />
        <Text style={cp.title}>{title}</Text>
        <TextInput
          style={cp.search}
          placeholder="Rechercher..."
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
                style={({ pressed }) => [cp.item, pressed && { backgroundColor: colors.surface }]}
                onPress={() => { setQuery(""); onSelect(item); }}
              >
                <Text style={cp.itemIcon}>📍</Text>
                <Text style={cp.itemText}>{item}</Text>
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, maxHeight: "70%",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: "center",
    marginTop: 12, marginBottom: 16,
  },
  title: {
    fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary, paddingHorizontal: spacing.xl, marginBottom: 12,
  },
  search: {
    marginHorizontal: spacing.xl, marginBottom: 8,
    backgroundColor: colors.surface, borderRadius: 10,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.xl, gap: 12 },
  itemIcon: { fontSize: 16 },
  itemText: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium, color: colors.textPrimary },
  sep: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
});

// ── Auth gate ──────────────────────────────────────────────────────────────

interface AuthGateProps {
  visible: boolean;
  voyage: Voyage | null;
  actionType: "reserve" | "colis";
  onClose: () => void;
}

function AuthGateModal({ visible, voyage, actionType, onClose }: AuthGateProps) {
  const goTo = async (target: "login" | "register") => {
    if (voyage) await AsyncStorage.setItem("@pending_voyage_id", voyage.id);
    onClose();
    router.push(`/(auth)/${target}`);
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
          <View style={ag.voyagePill}>
            <Text style={ag.voyageRoute}>{voyage.ville_depart} → {voyage.ville_arrivee}</Text>
            <Text style={ag.voyageMeta}>{formatDate(voyage.date_depart)} · {formatPrice(voyage.prix_par_place)} FCFA/place</Text>
          </View>
        )}
        <Pressable style={ag.btnPrimary} onPress={() => goTo("login")}>
          <Text style={ag.btnPrimaryText}>Se connecter</Text>
        </Pressable>
        <Pressable style={ag.btnSecondary} onPress={() => goTo("register")}>
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: spacing["2xl"], paddingBottom: 40, alignItems: "center",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: "center",
    marginTop: 12, marginBottom: 20,
  },
  icon: { fontSize: 36, marginBottom: 12 },
  title: {
    fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary, marginBottom: 8, textAlign: "center",
  },
  sub: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary, textAlign: "center",
    marginBottom: 16, lineHeight: 22,
  },
  voyagePill: {
    backgroundColor: colors.successBg, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 16,
    width: "100%", marginBottom: 20, alignItems: "center",
  },
  voyageRoute: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold,
    color: colors.primaryDark, marginBottom: 2,
  },
  voyageMeta: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular,
    color: colors.primary,
  },
  btnPrimary: {
    width: "100%", backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: "center", marginBottom: 10,
  },
  btnPrimaryText: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  btnSecondary: {
    width: "100%", backgroundColor: colors.surface, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  btnSecondaryText: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  cancelBtn: { paddingVertical: 6 },
  cancelText: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
});

// ── Voyage card ────────────────────────────────────────────────────────────

const VEHICULE_EMOJI: Record<string, string> = {
  BERLINE: "🚗", SUV: "🚙", MINIBUS: "🚐", BUS: "🚌", MOTO: "🏍️",
};

interface VoyageCardProps {
  voyage: Voyage;
  onReserve: (v: Voyage) => void;
  onColis: (v: Voyage) => void;
}

function VoyageCard({ voyage, onReserve, onColis }: VoyageCardProps) {
  const isComplet = voyage.statut === "COMPLET";
  const photoUri = resolveMediaUrl(voyage.vehicule?.photo_url);
  const vehiculeEmoji = VEHICULE_EMOJI[voyage.vehicule?.type_vehicule ?? ""] ?? "🚗";

  return (
    <View style={vc.card}>
      {/* ── Rangée principale : image + infos ── */}
      <View style={vc.mainRow}>
        {/* Image véhicule */}
        <View style={vc.imgWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={vc.img} resizeMode="cover" />
          ) : (
            <View style={vc.imgFallback}>
              <Text style={vc.imgEmoji}>{vehiculeEmoji}</Text>
            </View>
          )}
        </View>

        {/* Infos trajet */}
        <View style={vc.infoBlock}>
          <Text style={vc.route} numberOfLines={1}>
            {voyage.ville_depart} → {voyage.ville_arrivee}
          </Text>
          <Text style={vc.meta}>
            {formatDate(voyage.date_depart)} · {formatTime(voyage.date_depart)}
          </Text>
          <View style={vc.tagsRow}>
            {voyage.climatise && (
              <View style={vc.tag}><Text style={vc.tagText}>❄️ Climatisé</Text></View>
            )}
            {voyage.accepte_colis && (
              <View style={vc.tag}><Text style={vc.tagText}>📦 Colis</Text></View>
            )}
          </View>
        </View>

        {/* Prix */}
        <View style={vc.priceBlock}>
          <Text style={vc.price}>{formatPrice(voyage.prix_par_place)}</Text>
          <Text style={vc.priceUnit}>FCFA</Text>
          <Text style={vc.priceUnit}>/place</Text>
        </View>
      </View>

      {/* ── Séparateur ── */}
      <View style={vc.sep} />

      {/* ── Pied : places + boutons ── */}
      <View style={vc.footer}>
        <View style={vc.placesRow}>
          {isComplet ? (
            <View style={vc.completBadge}>
              <Text style={vc.completText}>Complet</Text>
            </View>
          ) : (
            <Text style={vc.placesText}>
              {voyage.nombre_places_restantes} place{voyage.nombre_places_restantes > 1 ? "s" : ""} dispo.
            </Text>
          )}
        </View>
        <View style={vc.actions}>
          {voyage.accepte_colis && (
            <Pressable
              style={({ pressed }) => [vc.colisBtn, pressed && { opacity: 0.75 }]}
              onPress={() => onColis(voyage)}
            >
              <Text style={vc.colisBtnText}>Colis</Text>
            </Pressable>
          )}
          <Pressable
            style={[vc.reserveBtn, isComplet && vc.reserveBtnOff]}
            disabled={isComplet}
            onPress={() => onReserve(voyage)}
          >
            <Text style={[vc.reserveBtnText, isComplet && vc.reserveBtnTextOff]}>
              {isComplet ? "Complet" : "Réserver"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const vc = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // Rangée principale
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: 10,
  },

  // Image
  imgWrap: {
    width: 76,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  img: { width: "100%", height: "100%" },
  imgFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successBg,
  },
  imgEmoji: { fontSize: 28 },

  // Infos
  infoBlock: { flex: 1 },
  route: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  tagsRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // Prix
  priceBlock: { alignItems: "flex-end", minWidth: 60 },
  price: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    lineHeight: 24,
  },
  priceUnit: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Séparateur
  sep: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },

  // Pied
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  placesRow: {},
  placesText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  completBadge: {
    backgroundColor: colors.errorBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.errorText,
  },
  actions: { flexDirection: "row", gap: 8 },
  colisBtn: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colisBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  reserveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  reserveBtnOff: { backgroundColor: colors.border },
  reserveBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  reserveBtnTextOff: { color: colors.textMuted },
});

// ── Main screen ────────────────────────────────────────────────────────────

const DATE_CHIPS = [
  { label: "Aujourd'hui", value: todayStr(0) },
  { label: "Demain", value: todayStr(1) },
  { label: "Après-dem.", value: todayStr(2) },
];

export default function DiscoverScreen() {
  const [villeDepart, setVilleDepart] = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [dateChip, setDateChip] = useState(0);
  const [searchActive, setSearchActive] = useState(false);
  const [cityTarget, setCityTarget] = useState<"depart" | "arrivee" | null>(null);
  const [authGate, setAuthGate] = useState<{
    visible: boolean; voyage: Voyage | null; type: "reserve" | "colis";
  }>({ visible: false, voyage: null, type: "reserve" });

  const canSearch = !!villeDepart && !!villeArrivee;
  const dateStr = DATE_CHIPS[dateChip].value;

  const { data: recent, isLoading: loadingRecent } = usePublicVoyages({});
  const { data: results, isLoading: loadingSearch } = usePublicSearchVoyages(
    { ville_depart: villeDepart, ville_arrivee: villeArrivee, date_depart: dateStr },
    searchActive && canSearch,
  );

  const displayData = searchActive && canSearch ? results : recent;
  const isLoading = searchActive && canSearch ? loadingSearch : loadingRecent;
  const voyages: Voyage[] = displayData?.items ?? [];
  const total: number = displayData?.total ?? 0;

  const handleSearch = () => { if (canSearch) setSearchActive(true); };

  const handleReset = () => {
    setVilleDepart(""); setVilleArrivee(""); setDateChip(0); setSearchActive(false);
  };

  const handleCitySelect = useCallback((ville: string) => {
    if (cityTarget === "depart") setVilleDepart(ville);
    else setVilleArrivee(ville);
    setCityTarget(null);
    setSearchActive(false);
  }, [cityTarget]);

  const openAuthGate = (voyage: Voyage, type: "reserve" | "colis") =>
    setAuthGate({ visible: true, voyage, type });

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.safeTop} />
      <StatusBar barStyle="light-content" />

      {/* ── SECTION VERTE ── */}
      <View style={s.hero}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoCircle}>
            <Text style={s.logoLetter}>G</Text>
          </View>
          <Text style={s.appName}>GoTaxi</Text>
        </View>
        <Text style={s.heroSub}>Trouvez votre prochain voyage</Text>

        {/* Carte de recherche blanche */}
        <View style={s.searchCard}>
          <Pressable
            style={({ pressed }) => [s.cityRow, pressed && s.cityRowPressed]}
            onPress={() => setCityTarget("depart")}
          >
            <Text style={s.cityEmoji}>📍</Text>
            <View style={s.cityInfo}>
              <Text style={s.cityLabel}>Ville de départ</Text>
              <Text style={[s.cityValue, !villeDepart && s.cityPlaceholder]}>
                {villeDepart || "Sélectionner..."}
              </Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>

          <View style={s.cardSep} />

          <Pressable
            style={({ pressed }) => [s.cityRow, pressed && s.cityRowPressed]}
            onPress={() => setCityTarget("arrivee")}
          >
            <Text style={s.cityEmoji}>🏁</Text>
            <View style={s.cityInfo}>
              <Text style={s.cityLabel}>Ville d'arrivée</Text>
              <Text style={[s.cityValue, !villeArrivee && s.cityPlaceholder]}>
                {villeArrivee || "Sélectionner..."}
              </Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Date chips */}
        <View style={s.chipRow}>
          {DATE_CHIPS.map((chip, i) => (
            <Pressable
              key={chip.value}
              style={[s.chip, i === dateChip && s.chipActive]}
              onPress={() => { setDateChip(i); setSearchActive(false); }}
            >
              <Text style={[s.chipText, i === dateChip && s.chipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bouton rechercher */}
        <Pressable
          style={[s.searchBtn, !canSearch && s.searchBtnOff]}
          onPress={handleSearch}
          disabled={!canSearch}
        >
          <Text style={[s.searchBtnText, !canSearch && s.searchBtnTextOff]}>
            Rechercher
          </Text>
        </Pressable>
      </View>

      {/* ── SECTION BLANCHE (liste) ── */}
      <View style={s.listSection}>
        <View style={s.listHeader}>
          <Text style={s.listTitle}>
            {searchActive && canSearch ? "Résultats" : "Voyages disponibles"}
          </Text>
          <View style={s.listHeaderRight}>
            {(villeDepart || villeArrivee) && (
              <Pressable onPress={handleReset}>
                <Text style={s.resetText}>Réinitialiser ×</Text>
              </Pressable>
            )}
            {!isLoading && (
              <Text style={s.listCount}>{total} voyage{total !== 1 ? "s" : ""}</Text>
            )}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : voyages.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🚗</Text>
            <Text style={s.emptyTitle}>Aucun voyage trouvé</Text>
            <Text style={s.emptySub}>
              {searchActive
                ? "Essayez d'autres villes ou une autre date."
                : "Revenez bientôt, de nouveaux voyages sont ajoutés chaque jour."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={voyages}
            keyExtractor={(v) => v.id}
            renderItem={({ item }) => (
              <VoyageCard
                voyage={item}
                onReserve={(v) => openAuthGate(v, "reserve")}
                onColis={(v) => openAuthGate(v, "colis")}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
          />
        )}
      </View>

      {/* ── FOOTER ── */}
      <SafeAreaView edges={["bottom"]} style={s.safeBottom}>
        <View style={s.footer}>
          <Text style={s.footerText}>Déjà un compte ?</Text>
          <Pressable onPress={() => router.push("/(auth)/login")}>
            <Text style={s.footerLink}> Se connecter</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Modals */}
      <CityPickerModal
        visible={!!cityTarget}
        title={cityTarget === "depart" ? "Ville de départ" : "Ville d'arrivée"}
        onSelect={handleCitySelect}
        onClose={() => setCityTarget(null)}
      />
      <AuthGateModal
        visible={authGate.visible}
        voyage={authGate.voyage}
        actionType={authGate.type}
        onClose={() => setAuthGate((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  safeTop: { backgroundColor: colors.primary },
  safeBottom: { backgroundColor: colors.white },

  // ── Section verte (hero) ──
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  logoCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.white, alignItems: "center", justifyContent: "center",
  },
  logoLetter: {
    fontSize: 22, fontFamily: typography.fontFamily.extraBold,
    color: colors.primary, lineHeight: 26,
  },
  appName: {
    fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
  },
  heroSub: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular,
    color: "rgba(255,255,255,0.8)", marginBottom: spacing.lg,
  },

  // ── Carte de recherche ──
  searchCard: {
    backgroundColor: colors.white, borderRadius: 16,
    overflow: "hidden", marginBottom: spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  cityRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 12,
  },
  cityRowPressed: { backgroundColor: colors.surface },
  cityEmoji: { fontSize: 20, width: 26, textAlign: "center" },
  cityInfo: { flex: 1 },
  cityLabel: {
    fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium,
    color: colors.textMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5,
  },
  cityValue: {
    fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  cityPlaceholder: { color: colors.textMuted, fontFamily: typography.fontFamily.regular },
  chevron: {
    fontSize: 22, color: colors.textMuted, fontFamily: typography.fontFamily.regular,
  },
  cardSep: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  // ── Chips de date ──
  chipRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
  },
  chipActive: { backgroundColor: colors.white, borderColor: colors.white },
  chipText: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium,
    color: "rgba(255,255,255,0.8)",
  },
  chipTextActive: { color: colors.primary, fontFamily: typography.fontFamily.bold },

  // ── Bouton rechercher ──
  searchBtn: {
    backgroundColor: colors.white, borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  searchBtnOff: { backgroundColor: "rgba(255,255,255,0.25)" },
  searchBtnText: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  searchBtnTextOff: { color: "rgba(255,255,255,0.7)" },

  // ── Section liste ──
  listSection: {
    flex: 1, backgroundColor: colors.surface,
  },
  listHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  listTitle: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  listHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  listCount: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  resetText: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },

  // ── Empty state ──
  empty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: spacing["3xl"], paddingBottom: 40,
  },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: {
    fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary, marginBottom: 8, textAlign: "center",
  },
  emptySub: {
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary, textAlign: "center", lineHeight: 22,
  },

  // ── Footer ──
  footer: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 13, backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerText: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});
