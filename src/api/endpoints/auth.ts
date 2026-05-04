import { apiClient } from "../client";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  OtpSendPayload,
  OtpVerifyPayload,
  PasswordForgotPayload,
  PasswordResetPayload,
  PasswordChangePayload,
  User,
} from "../types";

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<{ message: string }>("/auth/register", payload);
    return data;
  },

  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<AuthTokens>("/auth/login", payload);
    return data;
  },

  logout: async () => {
    const { data } = await apiClient.post<{ message: string }>("/auth/logout");
    return data;
  },

  refresh: async (refresh_token: string) => {
    const { data } = await apiClient.post<AuthTokens>("/auth/refresh", { refresh_token });
    return data;
  },

  getMe: async (token: string) => {
    const { data } = await apiClient.get<User>("/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  },

  sendOtp: async (payload: OtpSendPayload) => {
    const { data } = await apiClient.post<{ message: string }>("/auth/otp/send", payload);
    return data;
  },

  verifyOtp: async (payload: OtpVerifyPayload) => {
    const { data } = await apiClient.post<{ message: string }>("/auth/otp/verify", payload);
    return data;
  },

  forgotPassword: async (payload: PasswordForgotPayload) => {
    const { data } = await apiClient.post<{ message: string }>("/auth/password/forgot", payload);
    return data;
  },

  resetPassword: async (payload: PasswordResetPayload) => {
    const { data } = await apiClient.post<{ message: string }>("/auth/password/reset", payload);
    return data;
  },

  changePassword: async (payload: PasswordChangePayload) => {
    const { data } = await apiClient.post<{ message: string }>("/auth/password/change", payload);
    return data;
  },
};