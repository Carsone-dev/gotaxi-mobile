import { apiClient } from "../client";
import type { Colis, ColisCreatePayload } from "../types";

export const colisApi = {
  create: async (payload: ColisCreatePayload): Promise<Colis> => {
    const { data } = await apiClient.post<Colis>("/colis", payload);
    return data;
  },

  me: async (): Promise<Colis[]> => {
    const { data } = await apiClient.get<Colis[]>("/colis/me");
    return data;
  },

  detail: async (id: string): Promise<Colis> => {
    const { data } = await apiClient.get<Colis>(`/colis/${id}`);
    return data;
  },

  annuler: async (id: string): Promise<Colis> => {
    const { data } = await apiClient.post<Colis>(`/colis/${id}/annuler`);
    return data;
  },

  // ── Côté chauffeur ────────────────────────────────────────────────────────

  voyageColis: async (voyageId: string): Promise<Colis[]> => {
    const { data } = await apiClient.get<Colis[]>(`/colis/voyage/${voyageId}`);
    return data;
  },

  confirmer: async (id: string): Promise<Colis> => {
    const { data } = await apiClient.post<Colis>(`/colis/${id}/confirmer`);
    return data;
  },

  enTransit: async (id: string): Promise<Colis> => {
    const { data } = await apiClient.post<Colis>(`/colis/${id}/en_transit`);
    return data;
  },

  livrer: async (id: string): Promise<Colis> => {
    const { data } = await apiClient.post<Colis>(`/colis/${id}/livrer`);
    return data;
  },

  refuser: async (id: string): Promise<Colis> => {
    const { data } = await apiClient.post<Colis>(`/colis/${id}/annuler`);
    return data;
  },
};
