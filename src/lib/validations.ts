import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required"),
  phone: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  website: optionalUrl,
  instagram: optionalUrl,
  tiktok: optionalUrl,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const userCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().toLowerCase().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"]),
  projectIds: z.array(z.string()).default([]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = userCreateSchema
  .partial({ password: true })
  .extend({ id: z.string() });
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const orderItemSchema = z.object({
  productName: z.string().trim().min(1, "Product name required"),
  quantity: z.coerce.number().int().min(1, "Min 1"),
  unitPrice: z.coerce.number().min(0, "Cannot be negative"),
});

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
