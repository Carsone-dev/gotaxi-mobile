export const APP_NAME = "GoTaxi";
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.6:8001/api/v1";
export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL ?? "ws://192.168.0.6:8001/ws";

// Retourne l'origine du serveur (sans /api/v1) pour construire les URLs media locales
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+.*$/, "");

// Convertit un chemin relatif /media/... en URL absolue ; les URLs https:// sont passées telles quelles
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SERVER_ORIGIN}${url}`;
}