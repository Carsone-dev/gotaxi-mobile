import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/src/stores/authStore";
import { authApi } from "@/src/api/endpoints/auth";

export const useLogin = () => {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: ({ telephone, password }: { telephone: string; password: string }) =>
      login(telephone, password),
  });
};

export const useRegister = () =>
  useMutation({
    mutationFn: ({
      telephone,
      nom,
      prenom,
      password,
      email,
    }: {
      telephone: string;
      nom: string;
      prenom: string;
      password: string;
      email?: string;
    }) => authApi.register({ telephone, nom, prenom, password, email }),
  });

export const useSendOtp = () =>
  useMutation({
    mutationFn: (telephone: string) => authApi.sendOtp({ telephone }),
  });

export const useVerifyOtp = () =>
  useMutation({
    mutationFn: ({ telephone, code }: { telephone: string; code: string }) =>
      authApi.verifyOtp({ telephone, code }),
  });

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (telephone: string) => authApi.forgotPassword({ telephone }),
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({
      telephone,
      code,
      new_password,
    }: {
      telephone: string;
      code: string;
      new_password: string;
    }) => authApi.resetPassword({ telephone, code, new_password }),
  });