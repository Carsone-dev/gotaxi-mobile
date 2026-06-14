import { apiClient } from "@/src/api/client";
import type { ComptePayoutChauffeur, ComptePayoutCreatePayload } from "../types";

const BASE = "/chauffeurs/me/payout-account";

export const payoutAccountApi = {
  get: async (): Promise<ComptePayoutChauffeur> => {
    const { data } = await apiClient.get(BASE);
    return data;
  },
  upsert: async (payload: ComptePayoutCreatePayload): Promise<ComptePayoutChauffeur> => {
    const { data } = await apiClient.put(BASE, payload);
    return data;
  },
  remove: async (): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(BASE);
    return data;
  },
};
