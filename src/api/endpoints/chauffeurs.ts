import { apiClient } from "../client";
import type {
  Chauffeur,
  ChauffeurPublic,
  ChauffeurStats,
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

  vehicules: async (): Promise<Vehicule[]> => {
    const { data } = await apiClient.get<Vehicule[]>("/chauffeurs/me/vehicules");
    return data;
  },

  addVehicule: async (payload: VehiculeCreatePayload): Promise<Vehicule> => {
    const { data } = await apiClient.post<Vehicule>("/chauffeurs/me/vehicules", payload);
    return data;
  },

  uploadVehiculePhoto: async (id: string, uri: string): Promise<Vehicule> => {
    const formData = new FormData();
    formData.append("photo", { uri, name: "vehicule.jpg", type: "image/jpeg" } as unknown as Blob);
    const { data } = await apiClient.post<Vehicule>(`/chauffeurs/me/vehicules/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  updateVehicule: async (id: string, payload: VehiculeUpdatePayload): Promise<Vehicule> => {
    const { data } = await apiClient.patch<Vehicule>(`/chauffeurs/me/vehicules/${id}`, payload);
    return data;
  },

  deleteVehicule: async (id: string): Promise<void> => {
    await apiClient.delete(`/chauffeurs/me/vehicules/${id}`);
  },

  uploadInteriorPhoto: async (id: string, uri: string): Promise<Vehicule> => {
    const formData = new FormData();
    formData.append("photo", { uri, name: "interieur.jpg", type: "image/jpeg" } as unknown as Blob);
    const { data } = await apiClient.post<Vehicule>(
      `/chauffeurs/me/vehicules/${id}/photos-interieures`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  deleteInteriorPhoto: async (id: string, index: number): Promise<Vehicule> => {
    const { data } = await apiClient.delete<Vehicule>(
      `/chauffeurs/me/vehicules/${id}/photos-interieures/${index}`,
    );
    return data;
  },

  uploadVehiculeDocuments: async (
    id: string,
    docs: {
      assurance?: { uri: string; expiration?: string };
      visite_technique?: { uri: string; expiration?: string };
      titre?: { uri: string; expiration?: string };
      livret_bord?: { uri: string };
    },
  ): Promise<Vehicule> => {
    const formData = new FormData();
    if (docs.assurance) {
      formData.append("assurance", { uri: docs.assurance.uri, name: "assurance.jpg", type: "image/jpeg" } as unknown as Blob);
      if (docs.assurance.expiration) formData.append("assurance_expiration", docs.assurance.expiration);
    }
    if (docs.visite_technique) {
      formData.append("visite_technique", { uri: docs.visite_technique.uri, name: "visite_technique.jpg", type: "image/jpeg" } as unknown as Blob);
      if (docs.visite_technique.expiration) formData.append("visite_technique_expiration", docs.visite_technique.expiration);
    }
    if (docs.titre) {
      formData.append("titre", { uri: docs.titre.uri, name: "titre.jpg", type: "image/jpeg" } as unknown as Blob);
      if (docs.titre.expiration) formData.append("titre_expiration", docs.titre.expiration);
    }
    if (docs.livret_bord) {
      formData.append("livret_bord", { uri: docs.livret_bord.uri, name: "livret_bord.jpg", type: "image/jpeg" } as unknown as Blob);
    }
    const { data } = await apiClient.post<Vehicule>(`/chauffeurs/me/vehicules/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
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