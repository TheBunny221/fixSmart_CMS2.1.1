import { PrismaClient } from "@prisma/client";
import seedCommon from "./seed.common.js";

const prisma = new PrismaClient();

async function main() {
  await seedCommon(prisma, {
    destructive: true,
    adminEmail: "admin@cochinsmartcity.dev",
    adminPassword: "admin123",
    target: {
      wards: 8,
      subZonesPerWard: 3,
      maintenancePerWard: 3,
      citizens: 8,
      complaints: 94,
      serviceRequests: 10,
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
