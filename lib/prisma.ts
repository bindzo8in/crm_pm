import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});
const createPrismaClient = () =>
  new PrismaClient({
    adapter,
  });

const prisma =
  globalForPrisma.prisma && (globalForPrisma.prisma as any).exchangeRateCache
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;