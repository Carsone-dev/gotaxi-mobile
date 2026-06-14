import { apiClient } from "../client";

export interface VilleRead {
  id: string;
  nom: string;
  actif: boolean;
}

export interface GareRead {
  id: string;
  nom: string;
  ville_id: string;
  ville: VilleRead;
  adresse: string | null;
  lat: number | null;
  lng: number | null;
  actif: boolean;
}

export const garesApi = {
  villes: (): Promise<VilleRead[]> =>
    apiClient.get("/villes").then((r) => r.data),

  gares: (ville_id?: string): Promise<GareRead[]> =>
    apiClient.get("/gares", { params: ville_id ? { ville_id } : undefined }).then((r) => r.data),
};
