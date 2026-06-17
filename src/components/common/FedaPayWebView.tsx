/**
 * Ouvre la page de paiement FedaPay dans un navigateur intégré à l'app.
 *
 * Utilise expo-web-browser (Chrome Custom Tabs sur Android, SFSafariViewController sur iOS)
 * plutôt qu'un WebView classique, parce que FedaPay bloque l'affichage dans les WebViews
 * via X-Frame-Options / CSP frame-ancestors pour des raisons de sécurité.
 *
 * L'interface reste identique à celle attendue par confirm.tsx et confirmer.tsx :
 * - paymentUrl non-null  → ouvre le navigateur intégré
 * - paymentUrl null      → ne fait rien
 * - onClose              → appelé quand le navigateur est fermé (par l'utilisateur)
 */
import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";

interface FedaPayWebViewProps {
  paymentUrl: string | null;
  onClose: () => void;
  onPaymentDetected?: (success: boolean) => void;
}

export function FedaPayWebView({ paymentUrl, onClose }: FedaPayWebViewProps) {
  useEffect(() => {
    if (!paymentUrl) return;

    let cancelled = false;

    (async () => {
      await WebBrowser.openBrowserAsync(paymentUrl, {
        // Android : garde l'app dans la même tâche (pas de switch app)
        createTask: false,
        // iOS : comportement plein écran
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        // Barre d'outils aux couleurs GoTaxi
        toolbarColor: "#1B6F3A",
        controlsColor: "#FFFFFF",
        showTitle: true,
      });

      // openBrowserAsync se résout quand le navigateur est fermé
      if (!cancelled) onClose();
    })();

    return () => { cancelled = true; };
  }, [paymentUrl]);

  // Aucun rendu — le navigateur est géré par le système
  return null;
}
