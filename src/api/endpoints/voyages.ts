import { apiClient } from "../client";
import type {
  Voyage,
  VoyageSearchParams,
  VoyageSearchResult,
  VoyageCreatePayload,
  VoyageUpdatePayload,
  Reservation,
  ReservationStatus,
} from "../types";

const today = () => new Date().toISOString().split("T")[0];

export const voyagesApi = {
  popular: async (): Promise<Voyage[]> => {
    const { data } = await apiClient.get<Voyage[]>("/voyages/popular");
    return data;
  },

  search: async (params: VoyageSearchParams): Promise<VoyageSearchResult> => {
    const { data } = await apiClient.get<VoyageSearchResult>("/voyages/search", { params });
    return data;
  },

  // Voyages depuis une ville (sans destination fixée — étape 1 du flow)
  fromCity: async (ville_depart: string): Promise<Voyage[]> => {
    try {
      const { data } = await apiClient.get<VoyageSearchResult>("/voyages/search", {
        params: { ville_depart, date_depart: today(), size: 100 },
      });
      const items = data.items ?? [];
      return items.filter((v) => v.statut === "PUBLIE");
    } catch {
      // Fallback : popular filtré côté client
      const { data } = await apiClient.get<Voyage[]>("/voyages/popular");
      return data.filter((v) => v.ville_depart === ville_depart && v.statut === "PUBLIE");
    }
  },

  // Voyages pour un trajet complet (étape 2 du flow)
  byRoute: async (ville_depart: string, ville_arrivee: string): Promise<Voyage[]> => {
    try {
      const { data } = await apiClient.get<VoyageSearchResult>("/voyages/search", {
        params: { ville_depart, ville_arrivee, date_depart: today(), size: 100 },
      });
      const items = data.items ?? [];
      return items.filter((v) => v.statut === "PUBLIE");
    } catch {
      const { data } = await apiClient.get<Voyage[]>("/voyages/popular");
      return data.filter(
        (v) =>
          v.ville_depart === ville_depart &&
          v.ville_arrivee === ville_arrivee &&
          v.statut === "PUBLIE",
      );
    }
  },

  detail: async (id: string): Promise<Voyage> => {
    const { data } = await apiClient.get<Voyage>(`/voyages/${id}`);
    return data;
  },

  myVoyages: async (): Promise<Voyage[]> => {
    const { data } = await apiClient.get<Voyage[]>("/voyages/me");
    return data;
  },

  create: async (payload: VoyageCreatePayload): Promise<Voyage> => {
    const { data } = await apiClient.post<Voyage>("/voyages", payload);
    return data;
  },

  update: async (id: string, payload: VoyageUpdatePayload): Promise<Voyage> => {
    const { data } = await apiClient.patch<Voyage>(`/voyages/${id}`, payload);
    return data;
  },

  start: async (id: string): Promise<void> => {
    await apiClient.post(`/voyages/${id}/start`);
  },

  end: async (id: string): Promise<void> => {
    await apiClient.post(`/voyages/${id}/end`);
  },

  cancel: async (id: string): Promise<void> => {
    await apiClient.post(`/voyages/${id}/cancel`);
  },

  passagers: async (id: string): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>(`/voyages/${id}/passagers`);
    return data;
  },

  voyageReservations: async (id: string, statut?: ReservationStatus): Promise<Reservation[]> => {
    const params = statut ? { statut } : {};
    const { data } = await apiClient.get<Reservation[]>(`/voyages/${id}/reservations`, { params });
    return data;
  },

  // Recherche dédiée colis : retourne PUBLIE + COMPLET + EN_COURS avec accepte_colis=true
  colisSearch: async (ville_depart: string, ville_arrivee: string): Promise<Voyage[]> => {
    const date_depart = new Date().toISOString().split("T")[0];
    const { data } = await apiClient.get<VoyageSearchResult>("/voyages/colis-search", {
      params: { ville_depart, ville_arrivee, date_depart, size: 50 },
    });
    return data.items ?? [];
  },
};
