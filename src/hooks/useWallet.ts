import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "@/src/api/endpoints/wallet";
import type { WithdrawPayload } from "@/src/api/types";

const KEY = "wallet";

export const useWallet = () =>
  useQuery({
    queryKey: [KEY, "me"],
    queryFn: walletApi.me,
    staleTime: 30_000,
  });

export const useWalletActivity = (page = 1) =>
  useQuery({
    queryKey: [KEY, "activity", page],
    queryFn: () => walletApi.activity(page, 20),
    staleTime: 30_000,
  });

export const useWithdraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WithdrawPayload) => walletApi.withdraw(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
