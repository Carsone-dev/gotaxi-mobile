import { apiClient } from "../client";
import type { Reservation, ReservationCreatePayload } from "../types";

export const reservationsApi = {
  create: async (payload: ReservationCreatePayload): Promise<Reservation> => {
    const { data } = await apiClient.post<Reservation>("/reservations", payload);
    return data;
  },

  myReservations: async (): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>("/reservations/me");
    return data;
  },

  incoming: async (): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>("/reservations/me/incoming");
    return data;
  },

  detail: async (id: string): Promise<Reservation> => {
    const { data } = await apiClient.get<Reservation>(`/reservations/${id}`);
    return data;
  },

  accept: async (id: string): Promise<Reservation> => {
    const { data } = await apiClient.post<Reservation>(`/reservations/${id}/accept`);
    return data;
  },

  reject: async (id: string): Promise<Reservation> => {
    const { data } = await apiClient.post<Reservation>(`/reservations/${id}/reject`);
    return data;
  },

  cancel: async (id: string): Promise<void> => {
    await apiClient.post(`/reservations/${id}/cancel`);
  },
};