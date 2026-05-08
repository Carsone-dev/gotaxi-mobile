import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { VILLES, VILLES_LIST, nearestCity } from "@/src/constants/cities";
import { useVoyagesFromCity, useVoyagesByRoute } from "@/src/hooks/useVoyages";
import { formatFCFA, formatDate, formatTime } from "@/src/utils/formatters";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Voyage } from "@/src/api/types";

// ── Sélecteur de ville ────────────────────────────────────────────────────────
function CityPicker({
  label,
  value,
  onSelect,
  exclude,
}: {
  label: string;
  value: string;
  onSelect: (v: string) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const choices = VILLES_LIST.filter((v) => v !== exclude);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.pickerBtn} onPress={() => setOpen(!open)}>
        <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]}>
          {value || "Sélectionner une ville"}
        </Text>
        <Text style={styles.pickerArrow}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
            {choices.map((v) => (
              <Pressable
                key={v}
                style={[styles.dropdownItem, value === v && styles.dropdownItemActive]}
                onPress={() => { onSelect(v); setOpen(false); }}
              >
                <Text style={[styles.dropdownText, value === v && styles.dropdownTextActive]}>
                  {v}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Carte voyage — étape 1 ────────────────────────────────────────────────────
function VoyageCardDepart({ voyage, onPress }: { voyage: Voyage; onPress: () => void }) {
  const full = voyage.nombre_places_restantes === 0;
  return (
    <Pressable style={styles.voyageCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardRoute}>
          {voyage.ville_depart} → {voyage.ville_arrivee}
        </Text>
        <View style={[styles.placeBadge, full && styles.placeBadgeFull]}>
          <Text style={[styles.placeBadgeText, full && styles.placeBadgeTextFull]}>
            {full ? "Complet" : `${voyage.nombre_places_restantes} pl.`}
          </Text>
        </View>
      </View>

      <View style={styles.cardPointRow}>
        <Text style={styles.cardPointIcon}>📍</Text>
        <Text style={styles.cardPoint} numberOfLines={2}>
          {voyage.point_depart}
        </Text>
      </View>

      <View style={styles.cardFooterRow}>
        <View style={styles.cardTimeBox}>
          <Text style={styles.cardTimeLabel}>Départ</Text>
          <Text style={styles.cardTime}>{formatTime(voyage.date_depart)}</Text>
          <Text style={styles.cardDate}>{formatDate(voyage.date_depart, "dd MMM")}</Text>
        </View>
        <Text style={styles.cardPrice}>{formatFCFA(voyage.prix_par_place)}<Text style={styles.cardPriceSub}>/pers</Text></Text>
      </View>
    </Pressable>
  );
}

// ── Carte voyage — étape 2 ────────────────────────────────────────────────────
function VoyageCardRoute({ voyage, nombrePlaces }: { voyage: Voyage; nombrePlaces: number }) {
  const full = voyage.nombre_places_restantes < nombrePlaces;
  return (
    <View style={styles.voyageCard}>
      {/* Date/heure badge + lien vers détail */}
      <Pressable onPress={() => router.push(`/(client)/voyages/${voyage.id}` as any)}>
        <View style={styles.cardDateBadge}>
          <Text style={styles.cardDateBadgeText}>
            {format(new Date(voyage.date_depart), "EEEE d MMM · HH:mm", { locale: fr })}
          </Text>
        </View>

        {/* Trajet */}
        <View style={[styles.cardRouteBlock, { marginTop: 8 }]}>
          <View style={styles.cardRouteStop}>
            <View style={styles.routeDot} />
            <View>
              <Text style={styles.cardRouteCity}>{voyage.ville_depart}</Text>
              <Text style={styles.cardRoutePoint} numberOfLines={1}>{voyage.point_depart}</Text>
            </View>
          </View>
          <View style={styles.routeLineRow}>
            <View style={styles.routeLine} />
            {voyage.distance_km ? (
              <Text style={styles.routeDistance}>{voyage.distance_km} km</Text>
            ) : null}
          </View>
          <View style={styles.cardRouteStop}>
            <View style={[styles.routeDot, styles.routeDotEnd]} />
            <View>
              <Text style={styles.cardRouteCity}>{voyage.ville_arrivee}</Text>
              <Text style={styles.cardRoutePoint} numberOfLines={1}>{voyage.point_arrivee}</Text>
            </View>
          </View>
        </View>

        {/* Footer infos */}
        <View style={[styles.cardFooterRow, { marginTop: 8 }]}>
          <View style={styles.cardTags}>
            {voyage.climatise && <Text style={styles.tag}>❄ Clim</Text>}
            {voyage.accepte_colis && <Text style={styles.tag}>📦 Colis</Text>}
            {voyage.non_fumeur && <Text style={styles.tag}>🚭</Text>}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardPrice}>
              {formatFCFA(voyage.prix_par_place)}
              <Text style={styles.cardPriceSub}>/pers</Text>
            </Text>
            <View style={[styles.placeBadge, full && styles.placeBadgeFull]}>
              <Text style={[styles.placeBadgeText, full && styles.placeBadgeTextFull]}>
                {full ? "Complet" : `${voyage.nombre_places_restantes} pl.`}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Bouton réserver — séparé du Pressable parent */}
      {!full && (
        <Pressable
          style={styles.reserveBtn}
          onPress={() =>
            router.push({
              pathname: "/(client)/voyages/confirm" as any,
              params: {
                voyage_id: voyage.id,
                prix: String(voyage.prix_par_place),
                places: String(nombrePlaces),
              },
            })
          }
        >
          <Text style={styles.reserveBtnText}>
            Réserver · {nombrePlaces} place{nombrePlaces > 1 ? "s" : ""}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────
export default function VoyagesScreen() {
  const [step, setStep] = useState<1 | 2>(1);

  // Étape 1
  const [cityDepart, setCityDepart] = useState("");
  const [pointDepart, setPointDepart] = useState("");
  const [locStatus, setLocStatus] = useState<"detecting" | "found" | "denied" | "idle">("idle");

  // Étape 2
  const [cityArrivee, setCityArrivee] = useState("");
  const [pointArrivee, setPointArrivee] = useState("");
  const [nombrePlaces, setNombrePlaces] = useState(1);

  const { data: voyagesDepart, isLoading: loadingDepart } = useVoyagesFromCity(cityDepart);
  const { data: voyagesRoute, isLoading: loadingRoute } = useVoyagesByRoute(cityDepart, cityArrivee);

  // Filtre les voyages qui ont assez de places pour la demande
  const voyagesFiltres = voyagesRoute?.filter(
    (v) => v.nombre_places_restantes >= nombrePlaces,
  );

  const detectLocation = useCallback(async () => {
    setLocStatus("detecting");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocStatus("denied");
        return;
      }

      // Position en cache (< 5 min) → instantané
      const cached = await Location.getLastKnownPositionAsync({ maxAge: 300_000 });
      if (cached) {
        setCityDepart(nearestCity(cached.coords.latitude, cached.coords.longitude));
        setLocStatus("found");
        return;
      }

      // Nouvelle position GPS avec timeout 8 s pour éviter un blocage indéfini
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 8_000)
        ),
      ]);
      setCityDepart(nearestCity(pos.coords.latitude, pos.coords.longitude));
      setLocStatus("found");
    } catch {
      setLocStatus("denied");
    }
  }, []);

  // Lance la détection uniquement quand l'écran devient actif (tab monté en arrière-plan au démarrage)
  useFocusEffect(
    useCallback(() => {
      if (locStatus === "idle") {
        detectLocation();
      }
    }, [locStatus, detectLocation])
  );

  const canGoStep2 = !!cityDepart && pointDepart.trim().length >= 3;
  const canShowResults = !!cityDepart && !!cityArrivee;

  // ── Étape 1 ──
  if (step === 1) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>D'où partez-vous ?</Text>
          <Text style={styles.headerSub}>Votre position et point de départ</Text>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Carte localisation */}
          <View style={styles.locCard}>
            {locStatus === "detecting" ? (
              <View style={styles.locRow}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.locText}>Détection de votre position…</Text>
              </View>
            ) : locStatus === "found" ? (
              <View style={styles.locRow}>
                <Text style={styles.locIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locCity}>{cityDepart}</Text>
                  <Text style={styles.locHint}>Ville détectée automatiquement</Text>
                </View>
                <Pressable onPress={detectLocation} style={styles.locRefresh}>
                  <Text style={styles.locRefreshText}>↻</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.locRow}>
                <Text style={styles.locIcon}>📍</Text>
                <Text style={styles.locTextDenied}>
                  {locStatus === "denied" ? "Position non disponible" : "Sélectionnez votre ville"}
                </Text>
                <Pressable onPress={detectLocation} style={styles.locRefresh}>
                  <Text style={styles.locRefreshText}>↻</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Ville de départ (modifiable) */}
          <View style={styles.section}>
            <CityPicker
              label="Ville de départ"
              value={cityDepart}
              onSelect={setCityDepart}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Votre point de départ précis</Text>
              <TextInput
                style={styles.textInput}
                value={pointDepart}
                onChangeText={setPointDepart}
                placeholder="Ex : Gare de Cotonou, Carrefour Godomey…"
                placeholderTextColor={colors.textMuted}
                multiline={false}
              />
              <Text style={styles.fieldHint}>
                Indiquez l'endroit exact où vous souhaitez embarquer
              </Text>
            </View>
          </View>

          {/* Liste voyages depuis cette ville */}
          {cityDepart ? (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  Trajets depuis {cityDepart}
                </Text>
                {loadingDepart && <ActivityIndicator color={colors.primary} size="small" />}
              </View>

              {!loadingDepart && !voyagesDepart?.length ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Aucun trajet disponible depuis {cityDepart}</Text>
                </View>
              ) : (
                voyagesDepart?.map((v) => (
                  <VoyageCardDepart
                    key={v.id}
                    voyage={v}
                    onPress={() => router.push(`/(client)/voyages/${v.id}` as any)}
                  />
                ))
              )}
            </View>
          ) : null}

          {/* Bouton continuer */}
          <Pressable
            style={[styles.continueBtn, !canGoStep2 && styles.continueBtnDisabled]}
            onPress={() => canGoStep2 && setStep(2)}
            disabled={!canGoStep2}
          >
            <Text style={styles.continueBtnText}>Choisir ma destination →</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Étape 2 ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setStep(1)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Où allez-vous ?</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Depuis : {cityDepart} · {pointDepart}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Destination */}
        <View style={styles.section}>
          <CityPicker
            label="Ville de destination"
            value={cityArrivee}
            onSelect={setCityArrivee}
            exclude={cityDepart}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Votre point d'arrivée souhaité</Text>
            <TextInput
              style={styles.textInput}
              value={pointArrivee}
              onChangeText={setPointArrivee}
              placeholder="Ex : Gare de Parakou, Rue des Routiers…"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Nombre de places */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nombre de places</Text>
          <View style={styles.counterRow}>
            <Pressable
              style={styles.counterBtn}
              onPress={() => setNombrePlaces((p) => Math.max(1, p - 1))}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </Pressable>
            <View style={styles.counterCenter}>
              <Text style={styles.counterValue}>{nombrePlaces}</Text>
              <Text style={styles.counterLabel}>
                place{nombrePlaces > 1 ? "s" : ""}
              </Text>
            </View>
            <Pressable
              style={styles.counterBtn}
              onPress={() => setNombrePlaces((p) => Math.min(8, p + 1))}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Résultats */}
        {canShowResults && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>
                {cityDepart} → {cityArrivee}
              </Text>
              {loadingRoute && <ActivityIndicator color={colors.primary} size="small" />}
            </View>

            {!loadingRoute && !voyagesFiltres?.length ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🚗</Text>
                <Text style={styles.emptyTitle}>Aucun trajet disponible</Text>
                <Text style={styles.emptyText}>
                  {voyagesRoute?.length
                    ? `Pas assez de places (${nombrePlaces} demandées). Réduisez le nombre de places.`
                    : "Pas de voyage pour ce trajet aujourd'hui."}
                </Text>
              </View>
            ) : (
              voyagesFiltres?.map((v) => (
                <VoyageCardRoute key={v.id} voyage={v} nombrePlaces={nombrePlaces} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 40, gap: spacing.xl },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  backBtn: { padding: spacing.xs },
  backBtnText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },

  // Localisation
  locCard: {
    marginHorizontal: spacing["2xl"],
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.sm,
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  locIcon: { fontSize: 24 },
  locCity: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  locHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.primary,
  },
  locText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  locTextDenied: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  locRefresh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  locRefreshText: {
    fontSize: 18,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },

  // Sections
  section: {
    backgroundColor: colors.white,
    marginHorizontal: spacing["2xl"],
    borderRadius: radii.xl,
    padding: spacing["2xl"],
    gap: spacing.lg,
    ...shadows.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },

  // Champs
  fieldGroup: { gap: spacing.xs },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  fieldHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },

  // CityPicker
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  pickerText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  pickerPlaceholder: { color: colors.textMuted },
  pickerArrow: { fontSize: 10, color: colors.textMuted },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    overflow: "hidden",
    ...shadows.md,
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: { backgroundColor: `${colors.primary}12` },
  dropdownText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  dropdownTextActive: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },

  // Voyage cards
  voyageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardRoute: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  placeBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  placeBadgeFull: { backgroundColor: colors.errorBg },
  placeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
  placeBadgeTextFull: { color: colors.error },
  cardPointRow: { flexDirection: "row", gap: spacing.xs, alignItems: "flex-start" },
  cardPointIcon: { fontSize: 14, marginTop: 1 },
  cardPoint: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  cardFooterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cardTimeBox: { gap: 1 },
  cardTimeLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  cardTime: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  cardPrice: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
  },
  cardPriceSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Carte route (étape 2)
  cardDateBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${colors.primary}15`,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  cardDateBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
    textTransform: "capitalize",
  },
  cardRouteBlock: { gap: spacing.xs },
  cardRouteStop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  routeDotEnd: { backgroundColor: colors.black },
  routeLineRow: { flexDirection: "row", alignItems: "center", paddingLeft: 5, gap: spacing.sm },
  routeLine: { width: 2, height: 20, backgroundColor: colors.border },
  routeDistance: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  cardRouteCity: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  cardRoutePoint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    maxWidth: 260,
  },
  cardTags: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  tag: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRight: { alignItems: "flex-end", gap: spacing.xs },
  reserveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  reserveBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  // Compteur places
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing["2xl"],
    paddingVertical: spacing.sm,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  counterCenter: { alignItems: "center", minWidth: 60 },
  counterValue: {
    fontSize: typography.fontSize["4xl"],
    fontFamily: typography.fontFamily.extraBold,
    color: colors.primary,
    lineHeight: 44,
  },
  counterLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // Vide / continuer
  emptyBox: {
    alignItems: "center",
    padding: spacing["2xl"],
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },
  continueBtn: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    alignItems: "center",
    ...shadows.md,
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
});
