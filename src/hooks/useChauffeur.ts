import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chauffeursApi } from "@/src/api/endpoints/chauffeurs";
import type { ChauffeurUpdatePayload, VehiculeCreatePayload, VehiculeUpdatePayload } from "@/src/api/types";

export const useMyChauffeurProfile = () =>
  useQuery({
    queryKey: ["chauffeur", "me"],
    queryFn: chauffeursApi.me,
    staleTime: 60_000,
  });

export const useChauffeurStats = () =>
  useQuery({
    queryKey: ["chauffeur", "stats"],
    queryFn: chauffeursApi.stats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const useChauffeurRevenus = () =>
  useQuery({
    queryKey: ["chauffeur", "revenus"],
    queryFn: chauffeursApi.revenus,
    staleTime: 60_000,
  });

export const useMyVehicules = () =>
  useQuery({
    queryKey: ["chauffeur", "vehicules"],
    queryFn: chauffeursApi.vehicules,
    staleTime: 5 * 60_000,
  });

export const useGoOnline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chauffeursApi.goOnline,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chauffeur", "me"] });
      qc.invalidateQueries({ queryKey: ["chauffeur", "stats"] });
    },
  });
};

export const useGoOffline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chauffeursApi.goOffline,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chauffeur", "me"] });
      qc.invalidateQueries({ queryKey: ["chauffeur", "stats"] });
    },
  });
};

export const useAddVehicule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VehiculeCreatePayload) => chauffeursApi.addVehicule(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chauffeur", "vehicules"] }),
  });
};

export const useUploadVehiculePhoto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, uri }: { id: string; uri: string }) =>
      chauffeursApi.uploadVehiculePhoto(id, uri),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chauffeur", "vehicules"] }),
  });
};

export const useUpdateVehicule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VehiculeUpdatePayload }) =>
      chauffeursApi.updateVehicule(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chauffeur", "vehicules"] }),
  });
};

export const useDeleteVehicule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chauffeursApi.deleteVehicule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chauffeur", "vehicules"] }),
  });
};

export const useUpdateChauffeurProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChauffeurUpdatePayload) => chauffeursApi.update(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chauffeur", "me"] }),
  });
};

export const useUploadDocuments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docs: { cin?: string; permis?: string; casier?: string }) =>
      chauffeursApi.uploadDocuments(docs),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chauffeur", "me"] }),
  });
};

export const useChauffeurPublic = (id: string) =>
  useQuery({
    queryKey: ["chauffeur", id],
    queryFn: () => chauffeursApi.getPublic(id),
    enabled: !!id,
  });