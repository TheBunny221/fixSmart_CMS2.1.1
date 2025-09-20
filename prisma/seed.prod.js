import { PrismaClient } from "@prisma/client";
import seedCommon from "./seed.common.js";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || null;
  const adminPassword = process.env.ADMIN_PASSWORD || null;

  if (!adminEmail || !adminPassword) {
    console.log("⚠️ ADMIN_EMAIL and ADMIN_PASSWORD not set. Admin creation will be skipped. To create admin set these env vars and re-run the seed.");
  }

  // await seedCommon(prisma, {
  //   destructive: false,
  //   adminEmail,
  //   adminPassword,
  //   target: {
  //     wards: 8,
  //     subZonesPerWard: 3,
  //     maintenancePerWard: 3,
  //     citizens: 8,
  //     complaints: 94,
  //     serviceRequests: 10,
  //   },
  // });
  await seedCommon(prisma, {
    destructive: false,
    adminEmail,
    adminPassword,
    target: {
      wards: 0,
      subZonesPerWard: 0,
      maintenancePerWard: 0,
      citizens: 0,
      complaints: 0,
      serviceRequests: 0,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
