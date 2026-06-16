import { apiClient } from "@/src/api/client";
import type {
  Wallet,
  TransactionListResult,
  WithdrawPayload,
} from "@/src/api/types";

export const walletApi = {
  me: async (): Promise<Wallet> => {
    const { data } = await apiClient.get("/wallet/me");
    return data;
  },

  withdraw: async (payload: WithdrawPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post("/wallet/me/withdraw", payload);
    return data;
  },

  activity: async (page = 1, size = 20): Promise<TransactionListResult> => {
    const { data } = await apiClient.get("/wallet/me/activity", { params: { page, size } });
    return data;
  },
};
