import { create } from "zustand";
import { authApi } from "@/src/api/endpoints/auth";
import { secureStorage, STORAGE_KEYS } from "@/src/utils/secure-storage";
import type { User } from "@/src/api/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isChauffeurMode: boolean;

  login: (telephone: string, password: string) => Promise<void>;
  register: (telephone: string, nom: string, prenom: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  toggleChauffeurMode: () => void;
  refreshAccessToken: () => Promise<string | null>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  isChauffeurMode: false,

  login: async (telephone, password) => {
    set({ isLoading: true });
    try {
      const { access_token, refresh_token } = await authApi.login({ telephone, password });
      await secureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, access_token);
      await secureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
      const user = await authApi.getMe(access_token);
      set({
        user,
        accessToken: access_token,
        refreshToken: refresh_token,
        isAuthenticated: true,
        isChauffeurMode: user.role === "CHAUFFEUR",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (telephone, nom, prenom, password, email) => {
    await authApi.register({ telephone, nom, prenom, password, email });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    await secureStorage.delete(STORAGE_KEYS.ACCESS_TOKEN);
    await secureStorage.delete(STORAGE_KEYS.REFRESH_TOKEN);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isChauffeurMode: false,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await secureStorage.get(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await secureStorage.get(STORAGE_KEYS.REFRESH_TOKEN);
      if (!accessToken || !refreshToken) return;
      const user = await authApi.getMe(accessToken);
      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isChauffeurMode: user.role === "CHAUFFEUR",
      });
    } catch {
      await get().logout();
    } finally {
      set({ isLoading: false });
    }
  },

  toggleChauffeurMode: () => {
    const { user } = get();
    if (user?.role !== "CHAUFFEUR") return;
    set((s) => ({ isChauffeurMode: !s.isChauffeurMode }));
  },

  setUser: (user) => set({ user }),

  refreshAccessToken: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return null;
    try {
      const { access_token, refresh_token } = await authApi.refresh(refreshToken);
      await secureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, access_token);
      await secureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
      set({ accessToken: access_token, refreshToken: refresh_token });
      return access_token;
    } catch {
      await get().logout();
      return null;
    }
  },
}));