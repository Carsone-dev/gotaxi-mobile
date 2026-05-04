import * as SecureStore from "expo-secure-store";

export const secureStorage = {
  set: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  get: async (key: string) => SecureStore.getItemAsync(key),
  delete: async (key: string) => SecureStore.deleteItemAsync(key),
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
} as const;