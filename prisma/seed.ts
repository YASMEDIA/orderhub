import {
  PrismaClient,
  type OrderSource,
  type OrderStatus,
  type Governorate,
  type HousingType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

const YEAR = 2026;

// ---------------------------------------------------------------------------
// Deterministic demo data (no randomness so re-runs / diffs stay stable).
// All `area` values MUST exist in AREAS_BY_GOVERNORATE for the chosen
// governorate (see src/lib/constants.ts).
// ---------------------------------------------------------------------------

type ProjectSeed = {
  id: string;
  name: string;
  phone?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
  status: "ACTIVE" | "INACTIVE";
};

const PROJECTS: ProjectSeed[] = [
  {
    id: "seed-project", // kept stable with the previous seed to avoid orphaning
    name: "Husseini Sweets",
    phone: "+965 5000 0000",
    instagram: "https://instagram.com/husseinisweets",
    tiktok: "https://tiktok.com/@husseinisweets",
    status: "ACTIVE",
  },
  {
    id: "seed-project-bayan-bakery",
    name: "Bayan Bakery",
    phone: "+965 6011 2233",
    instagram: "https://instagram.com/bayanbakery",
    website: "https://bayanbakery.com",
    status: "ACTIVE",
  },
  {
    id: "seed-project-q8-florist",
    name: "Q8 Florist",
    phone: "+965 9988 7766",
    instagram: "https://instagram.com/q8florist",
    tiktok: "https://tiktok.com/@q8florist",
    website: "https://q8florist.com",
    status: "ACTIVE",
  },
  {
    id: "seed-project-desert-roast",
    name: "Desert Roast Coffee",
    phone: "+965 5544 3322",
    instagram: "https://instagram.com/desertroast",
    status: "INACTIVE",
  },
];

type ItemSeed = { productName: string; quantity: number; unitPrice: number };

type OrderSeed = {
  projectId: string;
  createdBy: "admin" | "employee" | "superadmin";
  customerName: string;
  source: OrderSource;
  status: OrderStatus;
  governorate: Governorate;
  area: string; // must be valid for governorate
  block: string;
  street: string;
  housingType: HousingType;
  buildingNumber: string;
  floor?: string;
  apartmentNumber?: string;
  deliveryFee: number; // KD, sometimes 0
  dayOffset: number; // days before "now" the order was placed (0..13)
  deliveryAfterDays: number; // 1 or 2 days after the order date
  items: ItemSeed[];
};

// 29 orders spread across all projects, all in 2026, offsets 0..13 so the
// "Orders Per Day" chart and "Orders Today" stat have data. Status mix is
// weighted toward DELIVERED / PENDING with the others represented too.
const ORDERS: OrderSeed[] = [
  // ----- Husseini Sweets -----
  {
    projectId: "seed-project",
    createdBy: "admin",
    customerName: "Ahmad Ali",
    source: "INSTAGRAM",
    status: "DELIVERED",
    governorate: "HAWALLI",
    area: "Salmiya",
    block: "10",
    street: "Amman St",
    housingType: "APARTMENT",
    buildingNumber: "25",
    floor: "3",
    apartmentNumber: "12",
    deliveryFee: 1,
    dayOffset: 13,
    deliveryAfterDays: 1,
    items: [
      { productName: "Husseini Turbah Box", quantity: 4, unitPrice: 2 },
      { productName: "Date Maamoul", quantity: 2, unitPrice: 1.5 },
    ],
  },
  {
    projectId: "seed-project",
    createdBy: "employee",
    customerName: "Fatima Hassan",
    source: "WHATSAPP",
    status: "DELIVERED",
    governorate: "AL_ASIMAH",
    area: "Qadsiya",
    block: "4",
    street: "Street 12",
    housingType: "HOUSE",
    buildingNumber: "8",
    deliveryFee: 0,
    dayOffset: 12,
    deliveryAfterDays: 2,
    items: [
      { productName: "Assorted Baklava Tray", quantity: 1, unitPrice: 6.5 },
      { productName: "Pistachio Knafeh", quantity: 2, unitPrice: 3 },
    ],
  },
  {
    projectId: "seed-project",
    createdBy: "employee",
    customerName: "Yousef Al-Mutairi",
    source: "TIKTOK",
    status: "PENDING",
    governorate: "FARWANIYA",
    area: "Khaitan",
    block: "2",
    street: "Block 2 St 5",
    housingType: "APARTMENT",
    buildingNumber: "14",
    floor: "1",
    apartmentNumber: "3",
    deliveryFee: 1.5,
    dayOffset: 9,
    deliveryAfterDays: 1,
    items: [
      { productName: "Saffron Ghraybeh", quantity: 3, unitPrice: 2.25 },
    ],
  },
  {
    projectId: "seed-project",
    createdBy: "admin",
    customerName: "Noura Saleh",
    source: "WEBSITE",
    status: "PREPARING",
    governorate: "MUBARAK_AL_KABEER",
    area: "Sabah Al-Salem",
    block: "5",
    street: "Avenue 3",
    housingType: "HOUSE",
    buildingNumber: "31",
    deliveryFee: 1,
    dayOffset: 6,
    deliveryAfterDays: 2,
    items: [
      { productName: "Husseini Turbah Box", quantity: 2, unitPrice: 2 },
      { productName: "Walnut Maamoul", quantity: 4, unitPrice: 1.75 },
      { productName: "Rosewater Lokum", quantity: 1, unitPrice: 4 },
    ],
  },
  {
    projectId: "seed-project",
    createdBy: "employee",
    customerName: "Mishari Al-Adwani",
    source: "INSTAGRAM",
    status: "OUT_FOR_DELIVERY",
    governorate: "HAWALLI",
    area: "Jabriya",
    block: "7",
    street: "Street 9",
    housingType: "APARTMENT",
    buildingNumber: "5",
    floor: "2",
    apartmentNumber: "7",
    deliveryFee: 0,
    dayOffset: 3,
    deliveryAfterDays: 1,
    items: [
      { productName: "Assorted Baklava Tray", quantity: 1, unitPrice: 6.5 },
    ],
  },
  {
    projectId: "seed-project",
    createdBy: "admin",
    customerName: "Dana Al-Fadhli",
    source: "WHATSAPP",
    status: "PENDING",
    governorate: "AL_ASIMAH",
    area: "Shamiya",
    block: "3",
    street: "Street 1",
    housingType: "HOUSE",
    buildingNumber: "12",
    deliveryFee: 1,
    dayOffset: 0,
    deliveryAfterDays: 1,
    items: [
      { productName: "Pistachio Knafeh", quantity: 3, unitPrice: 3 },
      { productName: "Date Maamoul", quantity: 6, unitPrice: 1.5 },
    ],
  },
  {
    projectId: "seed-project",
    createdBy: "employee",
    customerName: "Hessa Al-Rashidi",
    source: "TIKTOK",
    status: "CANCELLED",
    governorate: "AHMADI",
    area: "Fahaheel",
    block: "9",
    street: "Makkah St",
    housingType: "APARTMENT",
    buildingNumber: "40",
    floor: "4",
    apartmentNumber: "15",
    deliveryFee: 1.5,
    dayOffset: 8,
    deliveryAfterDays: 2,
    items: [
      { productName: "Saffron Ghraybeh", quantity: 2, unitPrice: 2.25 },
    ],
  },
  {
    projectId: "seed-project",
    createdBy: "admin",
    customerName: "Abdulaziz Khaled",
    source: "WEBSITE",
    status: "DELIVERED",
    governorate: "JAHRA",
    area: "Naeem",
    block: "1",
    street: "Street 4",
    housingType: "HOUSE",
    buildingNumber: "22",
    deliveryFee: 2,
    dayOffset: 11,
    deliveryAfterDays: 2,
    items: [
      { productName: "Rosewater Lokum", quantity: 2, unitPrice: 4 },
      { productName: "Walnut Maamoul", quantity: 3, unitPrice: 1.75 },
    ],
  },
  {
    projectId: "seed-project",
    createdBy: "admin",
    customerName: "Mona Al-Subaie",
    source: "WHATSAPP",
    status: "DELIVERED",
    governorate: "AL_ASIMAH",
    area: "Rawda",
    block: "3",
    street: "Street 8",
    housingType: "HOUSE",
    buildingNumber: "19",
    deliveryFee: 1,
    dayOffset: 7,
    deliveryAfterDays: 1,
    items: [
      { productName: "Pistachio Knafeh", quantity: 2, unitPrice: 3 },
      { productName: "Assorted Baklava Tray", quantity: 1, unitPrice: 6.5 },
    ],
  },

  // ----- Bayan Bakery -----
  {
    projectId: "seed-project-bayan-bakery",
    createdBy: "admin",
    customerName: "Layla Ibrahim",
    source: "INSTAGRAM",
    status: "DELIVERED",
    governorate: "HAWALLI",
    area: "Bayan",
    block: "6",
    street: "Street 2",
    housingType: "HOUSE",
    buildingNumber: "18",
    deliveryFee: 0,
    dayOffset: 13,
    deliveryAfterDays: 1,
    items: [
      { productName: "Sourdough Loaf", quantity: 2, unitPrice: 1.5 },
      { productName: "Cheese Croissant", quantity: 6, unitPrice: 0.75 },
    ],
  },
  {
    projectId: "seed-project-bayan-bakery",
    createdBy: "employee",
    customerName: "Omar Saad",
    source: "WHATSAPP",
    status: "DELIVERED",
    governorate: "AL_ASIMAH",
    area: "Surra",
    block: "2",
    street: "Street 7",
    housingType: "APARTMENT",
    buildingNumber: "9",
    floor: "5",
    apartmentNumber: "21",
    deliveryFee: 1,
    dayOffset: 10,
    deliveryAfterDays: 2,
    items: [
      { productName: "Cinnamon Roll Box", quantity: 1, unitPrice: 4.5 },
      { productName: "Butter Croissant", quantity: 4, unitPrice: 0.65 },
    ],
  },
  {
    projectId: "seed-project-bayan-bakery",
    createdBy: "employee",
    customerName: "Reem Al-Otaibi",
    source: "WEBSITE",
    status: "PENDING",
    governorate: "MUBARAK_AL_KABEER",
    area: "Qurain",
    block: "4",
    street: "Avenue 1",
    housingType: "HOUSE",
    buildingNumber: "27",
    deliveryFee: 1,
    dayOffset: 7,
    deliveryAfterDays: 1,
    items: [
      { productName: "Birthday Cake (1kg)", quantity: 1, unitPrice: 8 },
    ],
  },
  {
    projectId: "seed-project-bayan-bakery",
    createdBy: "admin",
    customerName: "Khaled Al-Sabah",
    source: "TIKTOK",
    status: "READY",
    governorate: "HAWALLI",
    area: "Salwa",
    block: "11",
    street: "Street 3",
    housingType: "APARTMENT",
    buildingNumber: "3",
    floor: "2",
    apartmentNumber: "4",
    deliveryFee: 0,
    dayOffset: 4,
    deliveryAfterDays: 1,
    items: [
      { productName: "Chocolate Muffin", quantity: 6, unitPrice: 0.85 },
      { productName: "Sourdough Loaf", quantity: 1, unitPrice: 1.5 },
    ],
  },
  {
    projectId: "seed-project-bayan-bakery",
    createdBy: "employee",
    customerName: "Sara Mansour",
    source: "INSTAGRAM",
    status: "PREPARING",
    governorate: "FARWANIYA",
    area: "Rabia",
    block: "3",
    street: "Street 8",
    housingType: "HOUSE",
    buildingNumber: "44",
    deliveryFee: 1.5,
    dayOffset: 2,
    deliveryAfterDays: 2,
    items: [
      { productName: "Cheese Croissant", quantity: 8, unitPrice: 0.75 },
      { productName: "Cinnamon Roll Box", quantity: 1, unitPrice: 4.5 },
    ],
  },
  {
    projectId: "seed-project-bayan-bakery",
    createdBy: "admin",
    customerName: "Talal Al-Hajri",
    source: "WHATSAPP",
    status: "PENDING",
    governorate: "AL_ASIMAH",
    area: "Qortuba",
    block: "1",
    street: "Street 5",
    housingType: "HOUSE",
    buildingNumber: "16",
    deliveryFee: 1,
    dayOffset: 0,
    deliveryAfterDays: 1,
    items: [
      { productName: "Birthday Cake (1kg)", quantity: 1, unitPrice: 8 },
      { productName: "Butter Croissant", quantity: 6, unitPrice: 0.65 },
    ],
  },
  {
    projectId: "seed-project-bayan-bakery",
    createdBy: "employee",
    customerName: "Maryam Al-Azmi",
    source: "WEBSITE",
    status: "DELIVERED",
    governorate: "AHMADI",
    area: "Mangaf",
    block: "5",
    street: "Street 10",
    housingType: "APARTMENT",
    buildingNumber: "12",
    floor: "1",
    apartmentNumber: "2",
    deliveryFee: 2,
    dayOffset: 9,
    deliveryAfterDays: 2,
    items: [
      { productName: "Chocolate Muffin", quantity: 12, unitPrice: 0.85 },
    ],
  },

  // ----- Q8 Florist -----
  {
    projectId: "seed-project-q8-florist",
    createdBy: "superadmin",
    customerName: "Bashayer Al-Kandari",
    source: "INSTAGRAM",
    status: "DELIVERED",
    governorate: "AL_ASIMAH",
    area: "Mansouriya",
    block: "2",
    street: "Street 6",
    housingType: "HOUSE",
    buildingNumber: "5",
    deliveryFee: 1,
    dayOffset: 12,
    deliveryAfterDays: 1,
    items: [
      { productName: "Red Rose Bouquet", quantity: 1, unitPrice: 12 },
    ],
  },
  {
    projectId: "seed-project-q8-florist",
    createdBy: "admin",
    customerName: "Fahad Al-Dosari",
    source: "TIKTOK",
    status: "OUT_FOR_DELIVERY",
    governorate: "HAWALLI",
    area: "Mishref",
    block: "6",
    street: "Street 1",
    housingType: "HOUSE",
    buildingNumber: "29",
    deliveryFee: 0,
    dayOffset: 5,
    deliveryAfterDays: 1,
    items: [
      { productName: "Tulip Arrangement", quantity: 1, unitPrice: 9.5 },
      { productName: "Greeting Card", quantity: 1, unitPrice: 0.75 },
    ],
  },
  {
    projectId: "seed-project-q8-florist",
    createdBy: "superadmin",
    customerName: "Ghadeer Al-Enezi",
    source: "WHATSAPP",
    status: "PENDING",
    governorate: "FARWANIYA",
    area: "Andalous",
    block: "3",
    street: "Street 4",
    housingType: "APARTMENT",
    buildingNumber: "8",
    floor: "3",
    apartmentNumber: "9",
    deliveryFee: 1.5,
    dayOffset: 1,
    deliveryAfterDays: 1,
    items: [
      { productName: "Mixed Seasonal Flowers", quantity: 1, unitPrice: 14 },
    ],
  },
  {
    projectId: "seed-project-q8-florist",
    createdBy: "admin",
    customerName: "Salem Al-Mutawa",
    source: "WEBSITE",
    status: "DELIVERED",
    governorate: "MUBARAK_AL_KABEER",
    area: "Adan",
    block: "8",
    street: "Avenue 2",
    housingType: "HOUSE",
    buildingNumber: "33",
    deliveryFee: 2,
    dayOffset: 10,
    deliveryAfterDays: 2,
    items: [
      { productName: "Orchid Vase", quantity: 1, unitPrice: 18 },
      { productName: "Greeting Card", quantity: 1, unitPrice: 0.75 },
    ],
  },
  {
    projectId: "seed-project-q8-florist",
    createdBy: "admin",
    customerName: "Wadha Al-Shemmari",
    source: "INSTAGRAM",
    status: "READY",
    governorate: "JAHRA",
    area: "Saad Al-Abdullah",
    block: "2",
    street: "Street 11",
    housingType: "HOUSE",
    buildingNumber: "7",
    deliveryFee: 2,
    dayOffset: 3,
    deliveryAfterDays: 2,
    items: [
      { productName: "Red Rose Bouquet", quantity: 2, unitPrice: 12 },
    ],
  },
  {
    projectId: "seed-project-q8-florist",
    createdBy: "superadmin",
    customerName: "Jaber Al-Failakawi",
    source: "WHATSAPP",
    status: "PENDING",
    governorate: "AL_ASIMAH",
    area: "Daiya",
    block: "1",
    street: "Street 2",
    housingType: "APARTMENT",
    buildingNumber: "10",
    floor: "6",
    apartmentNumber: "18",
    deliveryFee: 0,
    dayOffset: 0,
    deliveryAfterDays: 1,
    items: [
      { productName: "Tulip Arrangement", quantity: 1, unitPrice: 9.5 },
      { productName: "Mixed Seasonal Flowers", quantity: 1, unitPrice: 14 },
    ],
  },
  {
    projectId: "seed-project-q8-florist",
    createdBy: "admin",
    customerName: "Amani Al-Bloushi",
    source: "TIKTOK",
    status: "CANCELLED",
    governorate: "AHMADI",
    area: "Mahboula",
    block: "4",
    street: "Street 7",
    housingType: "APARTMENT",
    buildingNumber: "21",
    floor: "2",
    apartmentNumber: "5",
    deliveryFee: 1.5,
    dayOffset: 6,
    deliveryAfterDays: 2,
    items: [
      { productName: "Orchid Vase", quantity: 1, unitPrice: 18 },
    ],
  },

  // ----- Desert Roast Coffee (INACTIVE project, historical orders) -----
  {
    projectId: "seed-project-desert-roast",
    createdBy: "superadmin",
    customerName: "Nasser Al-Ajmi",
    source: "WEBSITE",
    status: "DELIVERED",
    governorate: "AL_ASIMAH",
    area: "Sharq",
    block: "5",
    street: "Arabian Gulf St",
    housingType: "APARTMENT",
    buildingNumber: "2",
    floor: "8",
    apartmentNumber: "30",
    deliveryFee: 1,
    dayOffset: 13,
    deliveryAfterDays: 1,
    items: [
      { productName: "Ethiopian Single Origin 250g", quantity: 2, unitPrice: 4.5 },
      { productName: "Cold Brew Bottle", quantity: 3, unitPrice: 1.75 },
    ],
  },
  {
    projectId: "seed-project-desert-roast",
    createdBy: "superadmin",
    customerName: "Shaikha Al-Roumi",
    source: "INSTAGRAM",
    status: "DELIVERED",
    governorate: "HAWALLI",
    area: "Rumaithiya",
    block: "10",
    street: "Street 5",
    housingType: "HOUSE",
    buildingNumber: "14",
    deliveryFee: 0,
    dayOffset: 11,
    deliveryAfterDays: 2,
    items: [
      { productName: "House Blend 1kg", quantity: 1, unitPrice: 12 },
    ],
  },
  {
    projectId: "seed-project-desert-roast",
    createdBy: "superadmin",
    customerName: "Mohammed Al-Qallaf",
    source: "WHATSAPP",
    status: "PENDING",
    governorate: "FARWANIYA",
    area: "Ishbiliya",
    block: "2",
    street: "Street 9",
    housingType: "HOUSE",
    buildingNumber: "38",
    deliveryFee: 1,
    dayOffset: 5,
    deliveryAfterDays: 1,
    items: [
      { productName: "Espresso Roast 250g", quantity: 4, unitPrice: 4 },
    ],
  },
  {
    projectId: "seed-project-desert-roast",
    createdBy: "superadmin",
    customerName: "Latifa Al-Sane",
    source: "TIKTOK",
    status: "PREPARING",
    governorate: "MUBARAK_AL_KABEER",
    area: "Messila",
    block: "3",
    street: "Avenue 4",
    housingType: "HOUSE",
    buildingNumber: "11",
    deliveryFee: 1.5,
    dayOffset: 2,
    deliveryAfterDays: 2,
    items: [
      { productName: "Cold Brew Bottle", quantity: 6, unitPrice: 1.75 },
      { productName: "Ethiopian Single Origin 250g", quantity: 1, unitPrice: 4.5 },
    ],
  },
  {
    projectId: "seed-project-desert-roast",
    createdBy: "superadmin",
    customerName: "Bader Al-Khalifa",
    source: "WEBSITE",
    status: "DELIVERED",
    governorate: "AL_ASIMAH",
    area: "Yarmouk",
    block: "1",
    street: "Street 3",
    housingType: "HOUSE",
    buildingNumber: "20",
    deliveryFee: 2,
    dayOffset: 8,
    deliveryAfterDays: 2,
    items: [
      { productName: "House Blend 1kg", quantity: 1, unitPrice: 12 },
      { productName: "Espresso Roast 250g", quantity: 2, unitPrice: 4 },
    ],
  },
  {
    projectId: "seed-project-desert-roast",
    createdBy: "superadmin",
    customerName: "Eman Al-Saleh",
    source: "INSTAGRAM",
    status: "PENDING",
    governorate: "JAHRA",
    area: "Oyoun",
    block: "4",
    street: "Street 6",
    housingType: "APARTMENT",
    buildingNumber: "6",
    floor: "1",
    apartmentNumber: "1",
    deliveryFee: 0,
    dayOffset: 0,
    deliveryAfterDays: 1,
    items: [
      { productName: "Cold Brew Bottle", quantity: 4, unitPrice: 1.75 },
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// Round to 3 decimals (KD precision used throughout the schema).
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@orderhub.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

  // --- Settings (singleton) ---
  await prisma.setting.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {},
  });

  // --- Users ---
  const superHash = await bcrypt.hash(password, 12);
  const superAdmin = await prisma.user.upsert({
    where: { email },
    create: { fullName: "Super Admin", email, passwordHash: superHash, role: "SUPER_ADMIN" },
    update: { role: "SUPER_ADMIN", isActive: true },
  });

  const adminHash = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "manager@orderhub.com" },
    create: {
      fullName: "Maya Al-Saleh",
      email: "manager@orderhub.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
    update: { role: "ADMIN", isActive: true },
  });

  const empHash = await bcrypt.hash("Employee@123", 12);
  const employee = await prisma.user.upsert({
    where: { email: "employee@orderhub.com" },
    create: {
      fullName: "Sample Employee",
      email: "employee@orderhub.com",
      passwordHash: empHash,
      role: "EMPLOYEE",
    },
    update: { role: "EMPLOYEE", isActive: true },
  });

  // --- Projects ---
  for (const p of PROJECTS) {
    await prisma.project.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        name: p.name,
        phone: p.phone ?? null,
        instagram: p.instagram ?? null,
        tiktok: p.tiktok ?? null,
        website: p.website ?? null,
        status: p.status,
      },
      update: {
        name: p.name,
        phone: p.phone ?? null,
        instagram: p.instagram ?? null,
        tiktok: p.tiktok ?? null,
        website: p.website ?? null,
        status: p.status,
      },
    });
  }

  // --- Assignments ---
  // Admin -> Husseini Sweets + Bayan Bakery (2 projects)
  // Employee -> Husseini Sweets + Bayan Bakery (1-2 projects)
  // Super Admin -> all projects.
  const adminProjects = ["seed-project", "seed-project-bayan-bakery"];
  const employeeProjects = ["seed-project", "seed-project-bayan-bakery"];

  for (const projectId of adminProjects) {
    await prisma.projectAssignment.upsert({
      where: { userId_projectId: { userId: admin.id, projectId } },
      create: { userId: admin.id, projectId },
      update: {},
    });
  }
  for (const projectId of employeeProjects) {
    await prisma.projectAssignment.upsert({
      where: { userId_projectId: { userId: employee.id, projectId } },
      create: { userId: employee.id, projectId },
      update: {},
    });
  }
  for (const p of PROJECTS) {
    await prisma.projectAssignment.upsert({
      where: { userId_projectId: { userId: superAdmin.id, projectId: p.id } },
      create: { userId: superAdmin.id, projectId: p.id },
      update: {},
    });
  }

  // --- Orders (idempotent: only seed when the table is empty) ---
  const existingOrders = await prisma.order.count();
  let createdOrders = 0;

  const creatorId: Record<OrderSeed["createdBy"], string> = {
    admin: admin.id,
    employee: employee.id,
    superadmin: superAdmin.id,
  };

  if (existingOrders === 0) {
    const now = Date.now();

    for (let i = 0; i < ORDERS.length; i++) {
      const o = ORDERS[i];
      const seq = i + 1; // 1-based sequence for this year

      const items = o.items.map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: round3(it.unitPrice),
        lineTotal: round3(it.quantity * it.unitPrice),
      }));
      const subtotal = round3(items.reduce((s, it) => s + it.lineTotal, 0));
      const deliveryFee = round3(o.deliveryFee);
      const grandTotal = round3(subtotal + deliveryFee);

      const orderDate = new Date(now - o.dayOffset * DAY_MS);
      const deliveryDate = new Date(
        orderDate.getTime() + o.deliveryAfterDays * DAY_MS,
      );

      await prisma.order.create({
        data: {
          publicId: nanoid(12),
          orderNumber: `ORD-${YEAR}-${String(seq).padStart(6, "0")}`,
          year: YEAR,
          customerName: o.customerName,
          source: o.source,
          orderDate,
          deliveryDate,
          governorate: o.governorate,
          area: o.area,
          block: o.block,
          street: o.street,
          housingType: o.housingType,
          buildingNumber: o.buildingNumber,
          floor: o.floor ?? null,
          apartmentNumber: o.apartmentNumber ?? null,
          deliveryFee,
          subtotal,
          grandTotal,
          status: o.status,
          projectId: o.projectId,
          createdById: creatorId[o.createdBy],
          items: { create: items },
        },
      });
      createdOrders++;
    }

    // Keep the yearly counter in sync so app-created orders continue the
    // sequence right after the last seeded order number.
    await prisma.orderCounter.upsert({
      where: { year: YEAR },
      create: { year: YEAR, current: createdOrders },
      update: { current: createdOrders },
    });
  }

  // --- Summary ---
  const projectCount = await prisma.project.count();
  const userCount = await prisma.user.count();
  const orderCount = await prisma.order.count();

  console.log("✅ Seed complete.");
  console.log(`   Projects:    ${projectCount}`);
  console.log(`   Users:       ${userCount}`);
  console.log(
    `   Orders:      ${orderCount}` +
      (createdOrders === 0 && existingOrders > 0
        ? " (existing orders detected — order seeding skipped)"
        : ` (${createdOrders} created this run)`),
  );
  console.log(`   OrderCounter[${YEAR}] kept in sync with seeded orders.`);
  console.log("   ---------------------------------------------");
  console.log(`   Super Admin: ${email} / ${password}`);
  console.log(`   Admin:       manager@orderhub.com / Admin@123`);
  console.log(`   Employee:    employee@orderhub.com / Employee@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
