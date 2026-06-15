import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservationsApi } from "@/src/api/endpoints/reservations";
import type { ReservationCreatePayload } from "@/src/api/types";

export const useMyReservations = () =>
  useQuery({
    queryKey: ["reservations", "me"],
    queryFn: reservationsApi.myReservations,
    staleTime: 0,
  });

export const useIncomingReservations = () =>
  useQuery({
    queryKey: ["reservations", "incoming"],
    queryFn: reservationsApi.incoming,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

export const useReservationDetail = (id: string) =>
  useQuery({
    queryKey: ["reservations", id],
    queryFn: () => reservationsApi.detail(id),
    enabled: !!id,
  });

export const useCreateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReservationCreatePayload) => reservationsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations", "me"] }),
  });
};

export const useAcceptReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.accept(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reservations", "incoming"] });
      qc.invalidateQueries({ queryKey: ["voyages", data.voyage_id, "reservations"] });
      qc.invalidateQueries({ queryKey: ["voyages", data.voyage_id] });
    },
  });
};

export const useRejectReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.reject(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reservations", "incoming"] });
      qc.invalidateQueries({ queryKey: ["voyages", data.voyage_id, "reservations"] });
      qc.invalidateQueries({ queryKey: ["voyages", data.voyage_id] });
    },
  });
};

export const useCancelReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations", "me"] });
      qc.invalidateQueries({ queryKey: ["reservations", "incoming"] });
    },
  });
};

export const useInitierPaiementReservation = () =>
  useMutation({
    mutationFn: ({ id, telephone }: { id: string; telephone: string }) =>
      reservationsApi.initierPaiement(id, telephone),
  });

export const useStatutPaiementReservation = (id: string, enabled: boolean) => {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["reservations", id, "statut-paiement"],
    queryFn: () => reservationsApi.statutPaiement(id),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const statut = query.state.data?.statut;
      if (statut === "confirme" || statut === "echec" || statut === "expire") return false;
      return 5_000;
    },
    onSuccess: (data: any) => {
      if (data.statut === "confirme") {
        qc.invalidateQueries({ queryKey: ["reservations", "me"] });
      }
    },
  } as any);
};