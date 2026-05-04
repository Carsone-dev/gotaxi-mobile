import { apiClient } from "../client";
import type {
  Chauffeur,
  ChauffeurPublic,
  ChauffeurStats,
  ChauffeurRevenus,
  ChauffeurUpdatePayload,
  Vehicule,
  VehiculeCreatePayload,
  VehiculeUpdatePayload,
  PositionPayload,
  Voyage,
} from "../types";

export const chauffeursApi = {
  me: async (): Promise<Chauffeur> => {
    const { data } = await apiClient.get<Chauffeur>("/chauffeurs/me");
    return data;
  },

  update: async (payload: ChauffeurUpdatePayload): Promise<Chauffeur> => {
    const { data } = await apiClient.patch<Chauffeur>("/chauffeurs/me", payload);
    return data;
  },

  uploadDocuments: async (docs: { cin?: string; permis?: string; casier?: string }): Promise<Chauffeur> => {
    const formData = new FormData();
    if (docs.cin) {
      formData.append("cin", { uri: docs.cin, name: "cin.jpg", type: "image/jpeg" } as unknown as Blob);
    }
    if (docs.permis) {
      formData.append("permis", { uri: docs.permis, name: "permis.jpg", type: "image/jpeg" } as unknown as Blob);
    }
    if (docs.casier) {
      formData.append("casier_judiciaire", { uri: docs.casier, name: "casier.jpg", type: "image/jpeg" } as unknown as Blob);
    }
    const { data } = await apiClient.post<Chauffeur>("/chauffeurs/me/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  goOnline: async (): Promise<void> => {
    await apiClient.post("/chauffeurs/me/online");
  },

  goOffline: async (): Promise<void> => {
    await apiClient.post("/chauffeurs/me/offline");
  },

  updatePosition: async (payload: PositionPayload): Promise<void> => {
    await apiClient.post("/chauffeurs/me/position", payload);
  },

  stats: async (): Promise<ChauffeurStats> => {
    const { data } = await apiClient.get<ChauffeurStats>("/chauffeurs/me/stats");
    return data;
  },

  revenus: async (): Promise<ChauffeurRevenus> => {
    const { data } = await apiClient.get<ChauffeurRevenus>("/chauffeurs/me/revenus");
    return data;
  },

  vehicules: async (): Promise<Vehicule[]> => {
    const { data } = await apiClient.get<Vehicule[]>("/chauffeurs/me/vehicules");
    return data;
  },

  addVehicule: async (payload: VehiculeCreatePayload): Promise<Vehicule> => {
    const { data } = await apiClient.post<Vehicule>("/chauffeurs/me/vehicules", payload);
    return data;
  },

  updateVehicule: async (id: string, payload: VehiculeUpdatePayload): Promise<Vehicule> => {
    const { data } = await apiClient.patch<Vehicule>(`/chauffeurs/me/vehicules/${id}`, payload);
    return data;
  },

  deleteVehicule: async (id: string): Promise<void> => {
    await apiClient.delete(`/chauffeurs/me/vehicules/${id}`);
  },

  getPublic: async (id: string): Promise<ChauffeurPublic> => {
    const { data } = await apiClient.get<ChauffeurPublic>(`/chauffeurs/${id}`);
    return data;
  },

  voyages: async (id: string): Promise<Voyage[]> => {
    const { data } = await apiClient.get<Voyage[]>(`/chauffeurs/${id}/voyages`);
    return data;
  },
};