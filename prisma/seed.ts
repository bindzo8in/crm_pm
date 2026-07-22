import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseJsonField(val: string | null | undefined) {
  if (!val || val.trim() === "" || val === "null") return null;
  try {
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

function parseBool(val: string | null | undefined, defaultVal = false): boolean {
  if (!val) return defaultVal;
  const s = val.trim().toLowerCase();
  return s === "true" || s === "t" || s === "1";
}

function parseDate(val: string | null | undefined): Date | null {
  if (!val || val.trim() === "" || val === "null") return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

function readCsv(fileName: string): Record<string, any>[] {
  const filePath = path.join(process.cwd(), "data", fileName);
  if (!fs.existsSync(filePath)) return [];
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

async function seedData() {
  console.log("Starting data import from data/ directory...");

  // 1. Company
  const companyRows = readCsv("Company_rows.csv");
  for (const row of companyRows) {
    await prisma.company.upsert({
      where: { id: row.id },
      update: {
        displayName: row.displayName,
        legalName: row.legalName,
        tagline: row.tagline || null,
        about: row.about || null,
        website: row.website || null,
        email: row.email,
        supportEmail: row.supportEmail || null,
        salesEmail: row.salesEmail || null,
        phone: row.phone,
        secondaryPhone: row.secondaryPhone || null,
        gstNumber: row.gstNumber || null,
        panNumber: row.panNumber || null,
        cinNumber: row.cinNumber || null,
        address: row.address,
        city: row.city,
        state: row.state,
        country: row.country,
        postalCode: row.postalCode || null,
        googleMapUrl: row.googleMapUrl || null,
        logo: parseJsonField(row.logo),
        darkLogo: parseJsonField(row.darkLogo),
        favicon: parseJsonField(row.favicon),
        signatureImage: parseJsonField(row.signatureImage),
        sealImage: parseJsonField(row.sealImage),
      },
      create: {
        id: row.id,
        displayName: row.displayName,
        legalName: row.legalName,
        tagline: row.tagline || null,
        about: row.about || null,
        website: row.website || null,
        email: row.email,
        supportEmail: row.supportEmail || null,
        salesEmail: row.salesEmail || null,
        phone: row.phone,
        secondaryPhone: row.secondaryPhone || null,
        gstNumber: row.gstNumber || null,
        panNumber: row.panNumber || null,
        cinNumber: row.cinNumber || null,
        address: row.address,
        city: row.city,
        state: row.state,
        country: row.country,
        postalCode: row.postalCode || null,
        googleMapUrl: row.googleMapUrl || null,
        logo: parseJsonField(row.logo),
        darkLogo: parseJsonField(row.darkLogo),
        favicon: parseJsonField(row.favicon),
        signatureImage: parseJsonField(row.signatureImage),
        sealImage: parseJsonField(row.sealImage),
        createdAt: parseDate(row.createdAt) || new Date(),
        updatedAt: parseDate(row.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Imported ${companyRows.length} Company records.`);

  // 2. CompanyBankAccount
  const bankRows = readCsv("CompanyBankAccount_rows.csv");
  for (const row of bankRows) {
    await prisma.companyBankAccount.upsert({
      where: { id: row.id },
      update: {
        companyId: row.companyId,
        accountName: row.accountName,
        bankName: row.bankName,
        branch: row.branch || null,
        accountNumber: row.accountNumber,
        ifscCode: row.ifscCode,
        swiftCode: row.swiftCode || null,
        accountType: row.accountType || null,
        upiId: row.upiId || null,
        qrCodeImage: parseJsonField(row.qrCodeImage),
        isDefault: parseBool(row.isDefault),
        isActive: parseBool(row.isActive, true),
        displayOrder: Number(row.displayOrder || 0),
      },
      create: {
        id: row.id,
        companyId: row.companyId,
        accountName: row.accountName,
        bankName: row.bankName,
        branch: row.branch || null,
        accountNumber: row.accountNumber,
        ifscCode: row.ifscCode,
        swiftCode: row.swiftCode || null,
        accountType: row.accountType || null,
        upiId: row.upiId || null,
        qrCodeImage: parseJsonField(row.qrCodeImage),
        isDefault: parseBool(row.isDefault),
        isActive: parseBool(row.isActive, true),
        displayOrder: Number(row.displayOrder || 0),
        createdAt: parseDate(row.createdAt) || new Date(),
        updatedAt: parseDate(row.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Imported ${bankRows.length} CompanyBankAccount records.`);

  // 3. Service
  const serviceRows = readCsv("Service_rows.csv");
  for (const row of serviceRows) {
    await prisma.service.upsert({
      where: { id: row.id },
      update: {
        name: row.name,
        slug: row.slug,
        description: row.description || null,
        isActive: parseBool(row.isActive, true),
        deletedAt: parseDate(row.deletedAt),
      },
      create: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description || null,
        isActive: parseBool(row.isActive, true),
        createdAt: parseDate(row.createdAt) || new Date(),
        updatedAt: parseDate(row.updatedAt) || new Date(),
        deletedAt: parseDate(row.deletedAt),
      },
    });
  }
  console.log(`Imported ${serviceRows.length} Service records.`);

  // 4. ServicePackage
  const packageRows = readCsv("ServicePackage_rows.csv");
  for (const row of packageRows) {
    await prisma.servicePackage.upsert({
      where: { id: row.id },
      update: {
        serviceId: row.serviceId,
        name: row.name,
        description: row.description || null,
        isPopular: parseBool(row.isPopular),
        isActive: parseBool(row.isActive, true),
        totalPrice: Number(row.totalPrice || 0),
        totalPriceUSD: Number(row.totalPriceUSD || 0),
      },
      create: {
        id: row.id,
        serviceId: row.serviceId,
        name: row.name,
        description: row.description || null,
        isPopular: parseBool(row.isPopular),
        isActive: parseBool(row.isActive, true),
        totalPrice: Number(row.totalPrice || 0),
        totalPriceUSD: Number(row.totalPriceUSD || 0),
        createdAt: parseDate(row.createdAt) || new Date(),
        updatedAt: parseDate(row.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Imported ${packageRows.length} ServicePackage records.`);

  // 5. ServicePackageItem
  const packageItemRows = readCsv("ServicePackageItem_rows.csv");
  for (const row of packageItemRows) {
    await prisma.servicePackageItem.upsert({
      where: { id: row.id },
      update: {
        packageId: row.packageId,
        name: row.name,
        description: row.description || null,
        quantity: Number(row.quantity || 1),
        unitPrice: Number(row.unitPrice || 0),
        unitPriceUSD: Number(row.unitPriceUSD || 0),
        unit: row.unit || "item",
        billingCycle: (row.billingCycle || "ONE_TIME") as any,
        sortOrder: Number(row.sortOrder || 0),
        isOptional: parseBool(row.isOptional),
      },
      create: {
        id: row.id,
        packageId: row.packageId,
        name: row.name,
        description: row.description || null,
        quantity: Number(row.quantity || 1),
        unitPrice: Number(row.unitPrice || 0),
        unitPriceUSD: Number(row.unitPriceUSD || 0),
        unit: row.unit || "item",
        billingCycle: (row.billingCycle || "ONE_TIME") as any,
        sortOrder: Number(row.sortOrder || 0),
        isOptional: parseBool(row.isOptional),
        createdAt: parseDate(row.createdAt) || new Date(),
        updatedAt: parseDate(row.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Imported ${packageItemRows.length} ServicePackageItem records.`);

  // 6. PackageFeature
  const featureRows = readCsv("PackageFeature_rows.csv");
  for (const row of featureRows) {
    await prisma.packageFeature.upsert({
      where: { id: row.id },
      update: {
        packageId: row.packageId,
        content: row.content,
        isHeading: parseBool(row.isHeading),
        sortOrder: Number(row.sortOrder || 0),
      },
      create: {
        id: row.id,
        packageId: row.packageId,
        content: row.content,
        isHeading: parseBool(row.isHeading),
        sortOrder: Number(row.sortOrder || 0),
      },
    });
  }
  console.log(`Imported ${featureRows.length} PackageFeature records.`);

  // 7. TariffGrid
  const tariffGridRows = readCsv("TariffGrid_rows.csv");
  for (const row of tariffGridRows) {
    await prisma.tariffGrid.upsert({
      where: { id: row.id },
      update: {
        name: row.name,
        description: row.description || null,
        isActive: parseBool(row.isActive, true),
      },
      create: {
        id: row.id,
        name: row.name,
        description: row.description || null,
        isActive: parseBool(row.isActive, true),
        createdAt: parseDate(row.createdAt) || new Date(),
        updatedAt: parseDate(row.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Imported ${tariffGridRows.length} TariffGrid records.`);

  // 8. TariffGridPackage
  const tariffGridPkgRows = readCsv("TariffGridPackage_rows.csv");
  for (const row of tariffGridPkgRows) {
    await prisma.tariffGridPackage.upsert({
      where: { id: row.id },
      update: {
        tariffGridId: row.tariffGridId,
        packageId: row.packageId,
        isStartsFrom: parseBool(row.isStartsFrom),
        sortOrder: Number(row.sortOrder || 0),
      },
      create: {
        id: row.id,
        tariffGridId: row.tariffGridId,
        packageId: row.packageId,
        isStartsFrom: parseBool(row.isStartsFrom),
        sortOrder: Number(row.sortOrder || 0),
      },
    });
  }
  console.log(`Imported ${tariffGridPkgRows.length} TariffGridPackage records.`);

  console.log("Database seed completed successfully!");
}

seedData()
  .catch((e) => {
    console.error("Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
