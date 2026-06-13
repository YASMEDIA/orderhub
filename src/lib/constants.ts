// Domain constants shared across the platform.

import { kuwaitAreas } from "@/data/kuwait-areas";

export const CURRENCY = "KD";
export const TIMEZONE = "Asia/Kuwait";

export const ORDER_SOURCES = [
  { value: "TIKTOK", label: "TikTok" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBSITE", label: "Website" },
] as const;

export const ORDER_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "OUT_FOR_DELIVERY", label: "Out For Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export const HOUSING_TYPES = [
  { value: "HOUSE", label: "House" },
  { value: "APARTMENT", label: "Apartment" },
] as const;

export const PAYMENT_METHODS = [
  { value: "ONLINE", label: "Online Payment" },
  { value: "CASH", label: "Cash" },
] as const;

export const PROJECT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const;

export const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "EMPLOYEE", label: "Employee" },
] as const;

export const GOVERNORATES = [
  { value: "AL_ASIMAH", label: "Al Asimah" },
  { value: "HAWALLI", label: "Hawalli" },
  { value: "FARWANIYA", label: "Farwaniya" },
  { value: "AHMADI", label: "Ahmadi" },
  { value: "MUBARAK_AL_KABEER", label: "Mubarak Al Kabeer" },
  { value: "JAHRA", label: "Jahra" },
] as const;

// Maps the Governorate enum value to its display key in the centralized dataset.
const GOVERNORATE_DATA_KEY: Record<string, string> = {
  AL_ASIMAH: "Al Asimah",
  HAWALLI: "Hawalli",
  FARWANIYA: "Farwaniya",
  AHMADI: "Al Ahmadi",
  MUBARAK_AL_KABEER: "Mubarak Al-Kabeer",
  JAHRA: "Al Jahra",
};

// Areas keyed by governorate enum value, derived from the centralized,
// residential-only dataset in src/data/kuwait-areas.ts. The dynamic Area
// dropdown reads from here.
export const AREAS_BY_GOVERNORATE: Record<string, string[]> = Object.fromEntries(
  Object.entries(GOVERNORATE_DATA_KEY).map(([enumValue, dataKey]) => [
    enumValue,
    kuwaitAreas[dataKey] ?? [],
  ]),
);

export type LabelValue = { value: string; label: string };

export function labelFor(list: readonly LabelValue[], value: string): string {
  return list.find((i) => i.value === value)?.label ?? value;
}
