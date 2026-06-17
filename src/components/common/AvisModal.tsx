import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSubmitAvis } from "@/src/hooks/useAvis";
import { useToast } from "@/src/components/common/Toast";
import { getErrorMessage } from "@/src/utils/error-handler";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import type { Reservation } from "@/src/api/types";

const TAGS_OPTIONS = [
  "Conduite sécurisée",
  "Ponctuel",
  "Véhicule propre",
  "Agréable",
  "Professionnel",
  "Trajet confortable",
];

const STAR_LABELS: Record<number, string> = {
  1: "Mauvais",
  2: "Passable",
  3: "Correct",
  4: "Bien",
  5: "Excellent",
};

interface AvisModalProps {
  reservation: Reservation | null;
  onDismiss: () => void;
}

export function AvisModal({ reservation, onDismiss }: AvisModalProps) {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const { mutateAsync: submit, isPending } = useSubmitAvis();
  const { showToast } = useToast();

  const reset = useCallback(() => {
    setNote(0);
    setCommentaire("");
    setTags([]);
  }, []);

  const handleDismiss = useCallback(() => {
    reset();
    onDismiss();
  }, [reset, onDismiss]);

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!reservation || note === 0) return;
    try {
      await submit({
        voyage_id: reservation.voyage_id,
        note,
        commentaire: commentaire.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      showToast("Merci pour votre avis !", "success");
      reset();
      onDismiss();
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  }, [reservation, note, commentaire, tags, submit, showToast, reset, onDismiss]);

  const voyage = reservation?.voyage;

  return (
    <Modal
      visible={!!reservation}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleDismiss} />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerEmoji}>⭐</Text>
              <Text style={styles.headerTitle}>Comment s'est passé votre trajet ?</Text>
              <Text style={styles.headerSub}>Votre avis aide à améliorer la qualité du service.</Text>
            </View>

            {/* Voyage info */}
            {voyage ? (
              <View style={styles.voyageCard}>
                <View style={styles.routeRow}>
                  <View style={styles.routeDotStart} />
                  <View style={styles.routeBar} />
                  <View style={styles.routeDotEnd} />
                </View>
                <View style={styles.routeCities}>
                  <Text style={styles.routeCity}>{voyage.ville_depart}</Text>
                  <Text style={styles.routeCity}>{voyage.ville_arrivee}</Text>
                </View>
                <Text style={styles.voyageDate}>
                  {format(new Date(voyage.date_depart), "EEEE d MMMM yyyy", { locale: fr })}
                </Text>
              </View>
            ) : null}

            {/* Stars */}
            <View style={styles.starsSection}>
              <Text style={styles.sectionLabel}>Votre note</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setNote(n)}
                    style={({ pressed }) => [styles.starBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.starText, n <= note && styles.starActive]}>★</Text>
                  </Pressable>
                ))}
              </View>
              {note > 0 && (
                <Text style={styles.starLabel}>{STAR_LABELS[note]}</Text>
              )}
            </View>

            {/* Tags */}
            <View style={styles.tagsSection}>
              <Text style={styles.sectionLabel}>Points forts (optionnel)</Text>
              <View style={styles.tagsWrap}>
                {TAGS_OPTIONS.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={({ pressed }) => [
                        styles.tagChip,
                        selected && styles.tagChipSelected,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                        {selected ? "✓ " : ""}{tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Commentaire */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionLabel}>Commentaire (optionnel)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Dites-en plus sur votre expérience…"
                placeholderTextColor={colors.textMuted}
                value={commentaire}
                onChangeText={setCommentaire}
                multiline
                numberOfLines={3}
                maxLength={1000}
                textAlignVertical="top"
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  note === 0 && styles.submitBtnDisabled,
                  pressed && note > 0 && { opacity: 0.85 },
                ]}
                onPress={handleSubmit}
                disabled={note === 0 || isPending}
              >
                {isPending
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.submitBtnText}>Envoyer mon avis</Text>}
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
                onPress={handleDismiss}
                disabled={isPending}
              >
                <Text style={styles.skipBtnText}>Ignorer pour l'instant</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    paddingHorizontal: spacing["2xl"],
    paddingBottom: Platform.OS === "ios" ? 36 : spacing["2xl"],
    maxHeight: "90%",
    ...shadows.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  header: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  headerEmoji: { fontSize: 40 },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  headerSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
  },

  voyageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  routeDotStart: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary,
  },
  routeBar: {
    flex: 1, height: 2,
    backgroundColor: colors.border,
  },
  routeDotEnd: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.black,
  },
  routeCities: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  routeCity: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  voyageDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textTransform: "capitalize",
  },

  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  starsSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  starsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  starBtn: {
    padding: spacing.xs,
  },
  starText: {
    fontSize: 40,
    color: colors.border,
  },
  starActive: {
    color: colors.yellow,
  },
  starLabel: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },

  tagsSection: {
    marginBottom: spacing.xl,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tagChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  tagChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.successBg,
  },
  tagText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  tagTextSelected: {
    color: colors.primary,
    fontFamily: typography.fontFamily.semiBold,
  },

  commentSection: {
    marginBottom: spacing.xl,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 80,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },

  actions: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    ...shadows.sm,
  },
  submitBtnDisabled: {
    backgroundColor: colors.border,
  },
  submitBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  skipBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
});
