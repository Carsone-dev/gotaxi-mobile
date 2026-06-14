import { apiClient } from "../client";
import type { TarifTrajet } from "../types";

export const tarifsApi = {
  getForRoute: async (villeDepartId: string, villeArriveeId: string): Promise<TarifTrajet | null> => {
    const { data } = await apiClient.get<TarifTrajet | null>("/tarifs", {
      params: { ville_depart_id: villeDepartId, ville_arrivee_id: villeArriveeId },
    });
    return data;
  },
};
