import { formatInTimeZone } from "date-fns-tz";
import { CURRENCY, TIMEZONE } from "./constants";

// Money: always 3 decimals (KD fils) + currency suffix.
export function formatMoney(amount: number): string {
  return `${amount.toFixed(3)} ${CURRENCY}`;
}

// Numbers without currency, used inside receipts / tables.
export function formatAmount(amount: number): string {
  return amount.toFixed(3);
}

// DD/MM/YYYY in Asia/Kuwait.
export function formatDate(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, "dd/MM/yyyy");
}

// DD/MM/YYYY HH:mm in Asia/Kuwait.
export function formatDateTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, "dd/MM/yyyy HH:mm");
}
