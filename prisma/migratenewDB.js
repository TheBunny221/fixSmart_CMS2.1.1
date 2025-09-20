// Cleanup legacy team fields prior to schema migration
// - Copies teamId -> maintenanceTeamId if needed
// - Nulls legacy fields (teamId, isMaintenanceUnassigned) before dropping columns

import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function run() {
  try {
    console.log("Starting legacy team fields cleanup...");

    // Copy teamId to maintenanceTeamId where not set
    // Use raw SQL to avoid schema type coupling
    const provider = process.env.DATABASE_URL?.includes("postgresql")
      ? "postgres"
      : process.env.DATABASE_URL?.includes("mysql")
      ? "mysql"
      : "sqlite";

    if (provider === "postgres") {
      await prisma.$executeRawUnsafe(
        'UPDATE "complaints" SET "maintenanceTeamId" = "teamId" WHERE "maintenanceTeamId" IS NULL AND "teamId" IS NOT NULL;'
      );
      await prisma.$executeRawUnsafe(
        'UPDATE "complaints" SET "teamId" = NULL;'
      );
      await prisma.$executeRawUnsafe(
        'UPDATE "complaints" SET "isMaintenanceUnassigned" = NULL;'
      );
    } else if (provider === "mysql") {
      await prisma.$executeRawUnsafe(
        'UPDATE `complaints` SET `maintenanceTeamId` = `teamId` WHERE `maintenanceTeamId` IS NULL AND `teamId` IS NOT NULL;'
      );
      await prisma.$executeRawUnsafe('UPDATE `complaints` SET `teamId` = NULL;');
      await prisma.$executeRawUnsafe(
        'UPDATE `complaints` SET `isMaintenanceUnassigned` = NULL;'
      );
    } else {
      // SQLite
      await prisma.$executeRawUnsafe(
        'UPDATE complaints SET maintenanceTeamId = teamId WHERE maintenanceTeamId IS NULL AND teamId IS NOT NULL;'
      );
      await prisma.$executeRawUnsafe('UPDATE complaints SET teamId = NULL;');
      await prisma.$executeRawUnsafe(
        'UPDATE complaints SET isMaintenanceUnassigned = NULL;'
      );
    }

    console.log("Legacy team fields cleanup completed.");
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
