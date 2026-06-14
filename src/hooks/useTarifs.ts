import { useQuery } from "@tanstack/react-query";
import { tarifsApi } from "@/src/api/endpoints/tarifs";

export function useTarifTrajet(villeDepartId: string, villeArriveeId: string) {
  return useQuery({
    queryKey: ["tarif", villeDepartId, villeArriveeId],
    queryFn: () => tarifsApi.getForRoute(villeDepartId, villeArriveeId),
    enabled: !!villeDepartId && !!villeArriveeId,
    staleTime: 5 * 60 * 1000,
  });
}
