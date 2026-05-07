import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across requests in dev (Next.js hot-reload)
// and within a serverless function instance in production.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
