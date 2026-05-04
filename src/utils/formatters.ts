import { format, formatDistance } from "date-fns";
import { fr } from "date-fns/locale";

export const formatFCFA = (amount: number): string =>
  new Intl.NumberFormat("fr-BJ", { style: "decimal" }).format(amount) + " FCFA";

export const formatDate = (date: string | Date, pattern = "dd MMM yyyy"): string =>
  format(new Date(date), pattern, { locale: fr });

export const formatTime = (date: string | Date): string =>
  format(new Date(date), "HH:mm");

export const formatRelative = (date: string | Date): string =>
  formatDistance(new Date(date), new Date(), { addSuffix: true, locale: fr });

export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("229")) {
    return `+229 ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  return phone;
};