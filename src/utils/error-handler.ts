import axios from "axios";
import type { ApiError } from "@/src/api/types";

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.error?.message) return data.error.message;
    if (error.response?.status === 401) return "Session expirée, veuillez vous reconnecter";
    if (error.response?.status === 403) return "Accès non autorisé";
    if (error.response?.status === 429) return "Trop de tentatives, réessayez plus tard";
    if (!error.response) return "Pas de connexion internet";
  }
  return "Une erreur est survenue";
};

export const getErrorCode = (error: unknown): string | null => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.error?.code ?? null;
  }
  return null;
};