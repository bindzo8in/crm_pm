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

const cachedPrisma = globalForPrisma.prisma;
const prisma =
  cachedPrisma &&
  typeof cachedPrisma.exchangeRateCache === "object" &&
  typeof cachedPrisma.project === "object" &&
  typeof cachedPrisma.notification === "object" &&
  typeof cachedPrisma.employeeStatusHistory === "object"
    ? cachedPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;