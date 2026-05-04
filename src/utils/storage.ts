import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "gotaxi-storage" });

export const localStorage = {
  set: <T>(key: string, value: T) => storage.set(key, JSON.stringify(value)),
  get: <T>(key: string): T | null => {
    const v = storage.getString(key);
    return v ? (JSON.parse(v) as T) : null;
  },
  delete: (key: string) => storage.remove(key),
  clear: () => storage.clearAll(),
};