import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "@/src/api/endpoints/wallet";
import type { RechargeInitiatePayload, WithdrawPayload, TransferPayload } from "@/src/api/types";

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

export const useRechargeInitiate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RechargeInitiatePayload) => walletApi.rechargeInitiate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useRechargeConfirm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => walletApi.rechargeConfirm(transactionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useWithdraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WithdrawPayload) => walletApi.withdraw(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useTransfer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferPayload) => walletApi.transfer(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useWalletSearch = () =>
  useMutation({
    mutationFn: (telephone: string) => walletApi.searchByPhone(telephone),
  });
