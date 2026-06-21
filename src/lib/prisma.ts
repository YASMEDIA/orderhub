import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Reuse a single PrismaClient across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

neonConfig.webSocketConstructor = ws;

function createPrismaClient() {
  const log: Prisma.LogLevel[] = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  const connectionString = process.env.DATABASE_URL;

  if (connectionString?.includes("neon.tech")) {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter, log });
  }

  return new PrismaClient({ log });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
