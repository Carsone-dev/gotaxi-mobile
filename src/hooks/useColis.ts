import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colisApi } from "@/src/api/endpoints/colis";
import { voyagesApi } from "@/src/api/endpoints/voyages";
import type { ColisCreatePayload } from "@/src/api/types";

const KEY = "colis";
const today = () => new Date().toISOString().split("T")[0];

export const useMesColis = () =>
  useQuery({
    queryKey: [KEY, "me"],
    queryFn: colisApi.me,
    staleTime: 30_000,
  });

export const useColisDetail = (id: string) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: () => colisApi.detail(id),
    enabled: !!id,
  });

export const useVoyagesAcceptantColis = (ville_depart: string, ville_arrivee: string) =>
  useQuery({
    queryKey: ["voyages", "colis-search", ville_depart, ville_arrivee],
    queryFn: () => voyagesApi.colisSearch(ville_depart, ville_arrivee),
    enabled: !!ville_depart && !!ville_arrivee,
    staleTime: 60_000,
  });

export const useCreateColis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ColisCreatePayload) => colisApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "me"] }),
  });
};

export const useAnnulerColis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => colisApi.annuler(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

// ── Côté chauffeur ────────────────────────────────────────────────────────────

export const useVoyageColis = (voyageId: string) =>
  useQuery({
    queryKey: [KEY, "voyage", voyageId],
    queryFn: () => colisApi.voyageColis(voyageId),
    enabled: !!voyageId,
    staleTime: 30_000,
  });

export const useConfirmerColis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => colisApi.confirmer(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
};

export const useEnTransitColis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => colisApi.enTransit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useLivrerColis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => colisApi.livrer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useRefuserColis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => colisApi.refuser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useInitierPaiementColis = () =>
  useMutation({
    mutationFn: ({ id, telephone }: { id: string; telephone: string }) =>
      colisApi.initierPaiement(id, telephone),
  });

export const useStatutPaiementColis = (id: string, enabled: boolean) => {
  const qc = useQueryClient();
  return useQuery({
    queryKey: [KEY, id, "statut-paiement"],
    queryFn: () => colisApi.statutPaiement(id),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const statut = query.state.data?.statut;
      if (statut === "confirme" || statut === "echec" || statut === "expire") return false;
      return 5_000;
    },
    onSuccess: (data: any) => {
      if (data.statut === "confirme") {
        qc.invalidateQueries({ queryKey: [KEY, "me"] });
      }
    },
  } as any);
};
