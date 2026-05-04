import { apiClient } from "../client";
import type { User, UserPublic, UserUpdatePayload, Avis } from "../types";

export const usersApi = {
  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>("/users/me");
    return data;
  },

  update: async (payload: UserUpdatePayload): Promise<User> => {
    const { data } = await apiClient.patch<User>("/users/me", payload);
    return data;
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete("/users/me");
  },

  uploadPhoto: async (uri: string): Promise<User> => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    const { data } = await apiClient.post<User>("/users/me/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  registerFcmToken: async (token: string): Promise<void> => {
    await apiClient.post(`/users/me/fcm-token?token=${encodeURIComponent(token)}`);
  },

  myAvis: async (): Promise<Avis[]> => {
    const { data } = await apiClient.get<Avis[]>("/users/me/avis");
    return data;
  },

  getPublic: async (id: string): Promise<UserPublic> => {
    const { data } = await apiClient.get<UserPublic>(`/users/${id}`);
    return data;
  },
};