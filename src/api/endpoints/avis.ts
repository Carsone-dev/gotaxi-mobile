import { apiClient } from "../client";
import type { Avis, AvisCreatePayload } from "../types";

export const avisApi = {
  create: async (payload: AvisCreatePayload): Promise<Avis> => {
    const { data } = await apiClient.post<Avis>("/avis", payload);
    return data;
  },
};
