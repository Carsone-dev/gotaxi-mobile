import { apiClient } from "@/src/api/client";
import type {
  Wallet,
  TransactionListResult,
  RechargeInitiatePayload,
  RechargeInitiateResult,
  WithdrawPayload,
  TransferPayload,
  WalletPublic,
} from "@/src/api/types";

export const walletApi = {
  me: async (): Promise<Wallet> => {
    const { data } = await apiClient.get("/wallet/me");
    return data;
  },

  rechargeInitiate: async (payload: RechargeInitiatePayload): Promise<RechargeInitiateResult> => {
    const { data } = await apiClient.post("/wallet/me/recharge/initiate", payload);
    return data;
  },

  rechargeConfirm: async (transactionId: string): Promise<Wallet> => {
    const { data } = await apiClient.post(
      `/wallet/me/recharge/confirm?transaction_id=${transactionId}`,
    );
    return data;
  },

  withdraw: async (payload: WithdrawPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post("/wallet/me/withdraw", payload);
    return data;
  },

  transfer: async (payload: TransferPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post("/wallet/me/transfer", payload);
    return data;
  },

  activity: async (page = 1, size = 20): Promise<TransactionListResult> => {
    const { data } = await apiClient.get("/wallet/me/activity", { params: { page, size } });
    return data;
  },

  searchByPhone: async (telephone: string): Promise<WalletPublic> => {
    const { data } = await apiClient.get("/wallet/search", { params: { telephone } });
    return data;
  },
};
