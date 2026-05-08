import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/src/stores/authStore";

type Options = {
  enabled?: boolean;
  onMessage?: (data: string) => void;
  onOpen?: () => void;
};

const MAX_BACKOFF_MS = 30_000;

export function useWebSocket(baseUrl: string, options: Options = {}) {
  const { enabled = true, onMessage, onOpen } = options;
  const [connected, setConnected] = useState(false);

  const wsRef         = useRef<WebSocket | null>(null);
  const mountedRef    = useRef(true);
  const retryCountRef = useRef(0);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callbacks and url in refs so the connect closure never goes stale
  const onMessageRef = useRef(onMessage);
  const onOpenRef    = useRef(onOpen);
  const baseUrlRef   = useRef(baseUrl);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onOpenRef.current    = onOpen;    }, [onOpen]);
  useEffect(() => { baseUrlRef.current   = baseUrl;   }, [baseUrl]);

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current    = true;
    retryCountRef.current = 0;

    const connect = async () => {
      if (!mountedRef.current) return;

      const token = useAuthStore.getState().accessToken;
      if (!token) return;

      const url = `${baseUrlRef.current}?token=${encodeURIComponent(token)}`;
      const ws  = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(1000); return; }
        retryCountRef.current = 0;
        setConnected(true);
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        onMessageRef.current?.(event.data);
      };

      // onerror always fires just before onclose — let onclose drive reconnection
      ws.onerror = () => {};

      ws.onclose = async (event) => {
        if (!mountedRef.current) return;
        setConnected(false);

        if (event.code === 1008) {
          // Backend rejected the token — refresh then reconnect with the new one
          const newToken = await useAuthStore.getState().refreshAccessToken();
          if (!mountedRef.current) return;
          // refreshAccessToken logs out automatically if the refresh token is also expired
          if (newToken) connect();
          return;
        }

        // Network error or normal close — exponential backoff
        const delay = Math.min(1_000 * 2 ** retryCountRef.current, MAX_BACKOFF_MS);
        retryCountRef.current += 1;
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close(1000, "unmount");
    };
  }, [enabled]);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { connected, send };
}
