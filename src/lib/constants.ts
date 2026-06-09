// Domain constants shared across the platform.

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

// Areas keyed by governorate enum value. Dynamic Area dropdown reads from here.
export const AREAS_BY_GOVERNORATE: Record<string, string[]> = {
  AL_ASIMAH: [
    "Kuwait City",
    "Dasman",
    "Sharq",
    "Mirqab",
    "Jibla",
    "Daiya",
    "Abdullah Al-Salem",
    "Mansouriya",
    "Qadsiya",
    "Faiha",
    "Shamiya",
    "Rawda",
    "Adailiya",
    "Khaldiya",
    "Kaifan",
    "Qortuba",
    "Surra",
    "Yarmouk",
    "Shuwaikh",
    "Jaber Al-Ahmad",
  ],
  HAWALLI: [
    "Hawalli",
    "Salmiya",
    "Jabriya",
    "Bayan",
    "Mishref",
    "Salwa",
    "Rumaithiya",
    "Maidan Hawalli",
    "Nugra",
    "Shaab",
    "Hateen",
    "Zahra",
    "Salam",
    "Mubarak Al-Abdullah",
  ],
  FARWANIYA: [
    "Farwaniya",
    "Khaitan",
    "Jleeb Al-Shuyoukh",
    "Ardiya",
    "Rabia",
    "Andalous",
    "Ishbiliya",
    "Riggae",
    "Omariya",
    "Abraq Khaitan",
    "Rai",
    "Sabah Al-Nasser",
    "Abdullah Al-Mubarak",
  ],
  AHMADI: [
    "Ahmadi",
    "Fahaheel",
    "Mangaf",
    "Abu Halifa",
    "Mahboula",
    "Fintas",
    "Riqqa",
    "Sabahiya",
    "Hadiya",
    "Jaber Al-Ali",
    "Fahad Al-Ahmad",
    "Ali Sabah Al-Salem",
    "Egaila",
    "Wafra",
  ],
  MUBARAK_AL_KABEER: [
    "Mubarak Al-Kabeer",
    "Qurain",
    "Adan",
    "Qusour",
    "Abu Futaira",
    "Messila",
    "Fnaitees",
    "Sabah Al-Salem",
    "Wista",
    "Sabhan",
  ],
  JAHRA: [
    "Jahra",
    "Naeem",
    "Nasseem",
    "Oyoun",
    "Qasr",
    "Saad Al-Abdullah",
    "Taima",
    "Waha",
    "Amghara",
    "Sulaibiya",
  ],
};

export type LabelValue = { value: string; label: string };

export function labelFor(list: readonly LabelValue[], value: string): string {
  return list.find((i) => i.value === value)?.label ?? value;
}
