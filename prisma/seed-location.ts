import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import fs from "fs";
import path from "path";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedLocations() {
  console.log("Starting Country and State seed...");

  const countriesPath = path.join(process.cwd(), "data", "countries.json");
  const statesPath = path.join(process.cwd(), "data", "states.json");

  if (fs.existsSync(countriesPath)) {
    console.log("Reading data/countries.json...");
    const countriesData = JSON.parse(fs.readFileSync(countriesPath, "utf-8"));
    const countryDataToInsert = countriesData.map((c: any) => ({
      id: c.id,
      name: c.name,
      iso2: c.iso2,
      iso3: c.iso3 || null,
      phonecode: c.phonecode ? String(c.phonecode) : null,
      currency: c.currency || null,
      emoji: c.emoji || null,
    }));

    await prisma.country.createMany({
      data: countryDataToInsert,
      skipDuplicates: true,
    });
    console.log(`Seeded ${countryDataToInsert.length} countries.`);
  }

  if (fs.existsSync(statesPath)) {
    console.log("Reading data/states.json...");
    const statesData = JSON.parse(fs.readFileSync(statesPath, "utf-8"));
    const stateDataToInsert = statesData.map((s: any) => ({
      id: s.id,
      name: s.name,
      countryId: s.country_id,
      countryCode: s.country_code || "",
    }));

    const CHUNK_SIZE = 5000;
    for (let i = 0; i < stateDataToInsert.length; i += CHUNK_SIZE) {
      const chunk = stateDataToInsert.slice(i, i + CHUNK_SIZE);
      await prisma.state.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      console.log(`Seeded states chunk ${i / CHUNK_SIZE + 1} (${chunk.length} records)...`);
    }
    console.log(`Seeded ${stateDataToInsert.length} total states.`);
  }

  console.log("Location seed completed successfully!");
}

seedLocations()
  .catch((e) => {
    console.error("Error seeding locations:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
