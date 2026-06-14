import { useQuery } from "@tanstack/react-query";
import { garesApi } from "@/src/api/endpoints/gares";

export function useVilles() {
  return useQuery({
    queryKey: ["villes"],
    queryFn: garesApi.villes,
    staleTime: 10 * 60_000,
  });
}

export function useGaresByVille(villeId: string | null) {
  return useQuery({
    queryKey: ["gares", villeId],
    queryFn: () => garesApi.gares(villeId!),
    enabled: !!villeId,
    staleTime: 10 * 60_000,
  });
}

export function useAllGares() {
  return useQuery({
    queryKey: ["gares"],
    queryFn: () => garesApi.gares(),
    staleTime: 10 * 60_000,
  });
}
