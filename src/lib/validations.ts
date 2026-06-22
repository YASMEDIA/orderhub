import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal("").transform(() => undefined));

// Contact / social fields accept a bare username, a full URL, or a number —
// they're normalised into links at render time (see src/lib/social.ts).
const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal("").transform(() => undefined));

// Project core attributes. Contact / social fields (phone, instagram, tiktok,
// whatsapp) are owned by the Store page (updateStoreSettings), not here — so
// editing a project never clobbers the storefront's contact details.
export const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required"),
  website: optionalUrl,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ProjectInput = z.infer<typeof projectSchema>;

// Public storefront order: customer picks catalog products (by id) and the
// server computes prices — never trust client-supplied prices.
export const publicOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const publicOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Your name is required"),
  customerPhone: z.string().trim().min(6, "A valid phone number is required"),
  governorate: z.enum([
    "AL_ASIMAH",
    "HAWALLI",
    "FARWANIYA",
    "AHMADI",
    "MUBARAK_AL_KABEER",
    "JAHRA",
  ]),
  area: z.string().trim().min(1, "Area is required"),
  block: z.string().trim().min(1, "Block is required"),
  street: z.string().trim().min(1, "Street is required"),
  housingType: z.enum(["HOUSE", "APARTMENT"]),
  buildingNumber: z.string().trim().min(1, "Building number is required"),
  floor: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  apartmentNumber: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  locationUrl: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  paymentMethod: z.enum(["ONLINE", "CASH"]),
  items: z.array(publicOrderItemSchema).min(1, "Add at least one product"),
});
export type PublicOrderInput = z.infer<typeof publicOrderSchema>;

export const userCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().toLowerCase().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "DRIVER"]),
  projectIds: z.array(z.string()).default([]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = userCreateSchema
  .partial({ password: true })
  .extend({ id: z.string() });
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const orderItemSchema = z.object({
  productId: z.string().optional().or(z.literal("").transform(() => undefined)),
  productName: z.string().trim().min(1, "Product name required"),
  quantity: z.coerce.number().int().min(1, "Min 1"),
  unitPrice: z.coerce.number().min(0, "Cannot be negative"),
});

export const productTierSchema = z.object({
  minQuantity: z.coerce.number().int().min(2, "Tier quantity must be 2 or more"),
  unitPrice: z.coerce.number().min(0, "Cannot be negative"),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  description: z
    .string()
    .trim()
    .max(300, "Description must be 300 characters or less")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  projectId: z.string().min(1, "Project is required"),
  basePrice: z.coerce.number().min(0, "Cannot be negative"),
  isActive: z.coerce.boolean().default(true),
  tiers: z.array(productTierSchema).default([]),
  // Optional (not defaulted): when omitted, the action leaves existing images
  // untouched, so editing a product elsewhere never wipes its images.
  images: z.array(z.string()).max(4, "Up to 4 images per product").optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

// Storefront settings managed from the dashboard Store page.
// logoUrl accepts an https URL or an uploaded image as a data URL (validated server-side).
export const storeSettingsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and hyphens only")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  storeEnabled: z.coerce.boolean().default(false),
  logoUrl: z.string().trim().default(""),
  // Contact / social shown under the store name. All optional; a username,
  // full URL or phone number is accepted and turned into a link on display.
  instagram: optionalText,
  tiktok: optionalText,
  whatsapp: optionalText,
  phone: optionalText,
});
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

export const orderSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  customerName: z.string().trim().min(2, "Customer name is required"),
  customerPhone: z.string().trim().min(6, "Customer phone is required"),
  source: z.enum(["TIKTOK", "INSTAGRAM", "WHATSAPP", "WEBSITE"]),
  paymentMethod: z.enum(["ONLINE", "CASH"]),
  orderDate: z.string().min(1, "Order date is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  governorate: z.enum([
    "AL_ASIMAH",
    "HAWALLI",
    "FARWANIYA",
    "AHMADI",
    "MUBARAK_AL_KABEER",
    "JAHRA",
  ]),
  area: z.string().trim().min(1, "Area is required"),
  block: z.string().trim().min(1, "Block is required"),
  street: z.string().trim().min(1, "Street is required"),
  housingType: z.enum(["HOUSE", "APARTMENT"]),
  buildingNumber: z.string().trim().min(1, "Building number is required"),
  floor: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  apartmentNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  locationUrl: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  deliveryFee: z.coerce.number().min(0).default(0),
  items: z.array(orderItemSchema).min(1, "Add at least one item"),
});
export type OrderInput = z.infer<typeof orderSchema>;

export const statusSchema = z.object({
  id: z.string(),
  status: z.enum([
    "PENDING",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const settingsSchema = z.object({
  currency: z.string().trim().min(1),
  timezone: z.string().trim().min(1),
  receiptHeader: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  receiptFooter: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  qrSize: z.coerce.number().int().min(80).max(600),
});
