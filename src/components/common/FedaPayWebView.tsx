import React, { useState, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation, WebViewErrorEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

// Patterns d'URL FedaPay indiquant la fin du paiement
const SUCCESS_PATTERNS = ["approved", "success", "transferred"];
const FAILURE_PATTERNS = ["declined", "failed", "cancelled", "cancel", "error"];
const FEDAPAY_HOSTS = ["fedapay.com", "sandbox.fedapay.com", "app.fedapay.com"];

function detectPaymentResult(url: string): "success" | "failure" | null {
  if (!url || url === "about:blank") return null;
  const lower = url.toLowerCase();

  // Si l'URL contient un statut explicite
  if (SUCCESS_PATTERNS.some((p) => lower.includes(p))) return "success";
  if (FAILURE_PATTERNS.some((p) => lower.includes(p))) return "failure";

  // Si FedaPay a redirigé vers un domaine externe (notre return_url)
  const isFedaPay = FEDAPAY_HOSTS.some((h) => lower.includes(h));
  if (!isFedaPay) return "success";

  return null;
}

interface FedaPayWebViewProps {
  paymentUrl: string | null;
  onClose: () => void;
  onPaymentDetected?: (success: boolean) => void;
}

export function FedaPayWebView({ paymentUrl, onClose, onPaymentDetected }: FedaPayWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const resultHandled = useRef(false);

  const handleNavChange = useCallback(
    (nav: WebViewNavigation) => {
      if (resultHandled.current || !nav.url) return;
      const result = detectPaymentResult(nav.url);
      if (result) {
        resultHandled.current = true;
        onPaymentDetected?.(result === "success");
        onClose();
      }
    },
    [onClose, onPaymentDetected]
  );

  const handleError = useCallback((_: WebViewErrorEvent) => {
    setLoading(false);
    setHasError(true);
  }, []);

  const handleClose = useCallback(() => {
    resultHandled.current = false;
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={!!paymentUrl}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <SafeAreaView style={s.root}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.shieldWrap}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={s.headerTitle}>Paiement sécurisé</Text>
              <Text style={s.headerSub}>via FedaPay · Mobile Money</Text>
            </View>
          </View>
          <Pressable style={s.closeBtn} onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* ── Barre sécurité ── */}
        <View style={s.secBar}>
          <Ionicons name="lock-closed" size={11} color={colors.success} />
          <Text style={s.secText}>Connexion chiffrée · Données protégées</Text>
        </View>

        {/* ── WebView ── */}
        <View style={s.webviewWrap}>
          {paymentUrl && !hasError && (
            <WebView
              source={{ uri: paymentUrl }}
              style={s.webview}
              javaScriptEnabled
              domStorageEnabled
              onLoadStart={() => { setLoading(true); setHasError(false); }}
              onLoadEnd={() => setLoading(false)}
              onError={handleError}
              onNavigationStateChange={handleNavChange}
              allowsBackForwardNavigationGestures={false}
            />
          )}

          {/* Overlay chargement */}
          {loading && !hasError && (
            <View style={s.loadingOverlay}>
              <View style={s.loadingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={s.loadingTitle}>Chargement…</Text>
                <Text style={s.loadingBody}>
                  La page de paiement FedaPay se prépare
                </Text>
              </View>
            </View>
          )}

          {/* État erreur */}
          {hasError && (
            <View style={s.errorState}>
              <Ionicons name="wifi-outline" size={52} color={colors.textMuted} />
              <Text style={s.errorTitle}>Page inaccessible</Text>
              <Text style={s.errorBody}>
                Vérifiez votre connexion internet puis réessayez.
              </Text>
              <Pressable style={s.errorBtn} onPress={handleClose}>
                <Text style={s.errorBtnTxt}>Fermer</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Aide footer ── */}
        <View style={s.footer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={s.footerText}>
            Après confirmation USSD, fermez cette fenêtre si le paiement est validé.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  shieldWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: `${colors.primary}12`,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },

  secBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: 6,
    backgroundColor: `${colors.success}0D`,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.success}20`,
  },
  secText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
    color: colors.success,
  },

  webviewWrap: { flex: 1, position: "relative" },
  webview: { flex: 1 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
  },
  loadingCard: {
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii["2xl"],
    padding: spacing["3xl"],
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
    ...shadows.sm,
  },
  loadingTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  loadingBody: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },

  errorState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing["3xl"],
    backgroundColor: colors.white,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  errorBody: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  errorBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.lg,
  },
  errorBtnTxt: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
