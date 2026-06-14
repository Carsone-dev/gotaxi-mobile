import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { payoutAccountApi } from "../api/endpoints/payoutAccount";
import type { ComptePayoutCreatePayload } from "../api/types";

const KEY = ["payout-account"] as const;

export function usePayoutAccount() {
  return useQuery({
    queryKey: KEY,
    queryFn: payoutAccountApi.get,
    retry: (failureCount, error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useUpsertPayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ComptePayoutCreatePayload) => payoutAccountApi.upsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payoutAccountApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
