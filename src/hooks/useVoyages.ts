import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { voyagesApi } from "@/src/api/endpoints/voyages";
import type { VoyageSearchParams, VoyageCreatePayload, VoyageUpdatePayload, ReservationStatus } from "@/src/api/types";

export const usePopularVoyages = () =>
  useQuery({
    queryKey: ["voyages", "popular"],
    queryFn: voyagesApi.popular,
    staleTime: 5 * 60_000,
  });

export const useActiveVoyages = () =>
  useQuery({
    queryKey: ["voyages", "active"],
    queryFn: voyagesApi.active,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const useSearchVoyages = (params: VoyageSearchParams, enabled = true) =>
  useQuery({
    queryKey: ["voyages", "search", params],
    queryFn: () => voyagesApi.search(params),
    enabled: enabled && !!params.ville_depart && !!params.ville_arrivee && !!params.date_depart,
    staleTime: 60_000,
  });

export const useVoyagesFromCity = (ville_depart: string) =>
  useQuery({
    queryKey: ["voyages", "fromCity", ville_depart],
    queryFn: () => voyagesApi.fromCity(ville_depart),
    enabled: !!ville_depart,
    staleTime: 60_000,
  });

export const useVoyagesByRoute = (ville_depart: string, ville_arrivee: string) =>
  useQuery({
    queryKey: ["voyages", "route", ville_depart, ville_arrivee],
    queryFn: () => voyagesApi.byRoute(ville_depart, ville_arrivee),
    enabled: !!ville_depart && !!ville_arrivee,
    staleTime: 60_000,
  });

export const useVoyageDetail = (id: string) =>
  useQuery({
    queryKey: ["voyages", id],
    queryFn: () => voyagesApi.detail(id),
    enabled: !!id,
  });

export const useMyVoyages = () =>
  useQuery({
    queryKey: ["voyages", "me"],
    queryFn: voyagesApi.myVoyages,
    staleTime: 30_000,
  });

export const useCreateVoyage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VoyageCreatePayload) => voyagesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["voyages", "me"] }),
  });
};

export const useUpdateVoyage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VoyageUpdatePayload }) =>
      voyagesApi.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["voyages", id] });
      qc.invalidateQueries({ queryKey: ["voyages", "me"] });
    },
  });
};

export const useStartVoyage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => voyagesApi.start(id),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ["voyages", id] }),
  });
};

export const useEndVoyage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => voyagesApi.end(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["voyages", id] });
      qc.invalidateQueries({ queryKey: ["voyages", "me"] });
    },
  });
};

export const useCancelVoyage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => voyagesApi.cancel(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["voyages", id] });
      qc.invalidateQueries({ queryKey: ["voyages", "me"] });
    },
  });
};

export const useVoyagePassagers = (id: string, enabled = true) =>
  useQuery({
    queryKey: ["voyages", id, "passagers"],
    queryFn: () => voyagesApi.passagers(id),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });

export const useVoyageReservations = (id: string, statut?: ReservationStatus, enabled = true) =>
  useQuery({
    queryKey: ["voyages", id, "reservations", statut ?? "all"],
    queryFn: () => voyagesApi.voyageReservations(id, statut),
    enabled: !!id && enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
