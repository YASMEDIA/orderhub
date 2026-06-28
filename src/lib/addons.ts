export type AddonSnapshot = { id: string; name: string; price: number; text?: string };

export function parseAddonSnapshot(value: unknown): AddonSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const addon = item as { id?: unknown; name?: unknown; price?: unknown; text?: unknown };
    if (typeof addon.id !== "string" || typeof addon.name !== "string" || typeof addon.price !== "number") return [];
    return [{
      id: addon.id,
      name: addon.name,
      price: addon.price,
      ...(typeof addon.text === "string" && addon.text.trim() ? { text: addon.text.trim() } : {}),
    }];
  });
}
