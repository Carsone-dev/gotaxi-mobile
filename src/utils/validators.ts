import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^\+229\d{10}$|^\+228\d{8}$/, "Format invalide (ex: +22901XXXXXXXX)");

export const passwordSchema = z.string().min(8, "Minimum 8 caractères");

export const loginSchema = z.object({
  telephone: phoneSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  telephone: phoneSchema,
  nom: z.string().min(2, "Minimum 2 caractères").max(100),
  prenom: z.string().min(2, "Minimum 2 caractères").max(100),
  password: passwordSchema,
  email: z.string().email("Email invalide").optional().or(z.literal("")),
});

export const otpSchema = z.object({
  code: z.string().length(6, "Le code doit avoir 6 chiffres").regex(/^\d+$/, "Chiffres uniquement"),
});

export const resetPasswordSchema = z.object({
  code: z.string().length(6, "Le code doit avoir 6 chiffres"),
  new_password: passwordSchema,
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type OtpForm = z.infer<typeof otpSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;