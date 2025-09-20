import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { getPrisma } from "../../db/connection.js";
import { computeSlaComplianceClosed } from "../../utils/sla.js";

const prisma = getPrisma();

describe("SLA utility - computeSlaComplianceClosed", () => {
  const wardId = "sla-ward-unit";
  const types = [
    { key: "COMPLAINT_TYPE_WATER_SUPPLY", name: "WATER_SUPPLY", slaHours: 24 },
    { key: "COMPLAINT_TYPE_ELECTRICITY", name: "ELECTRICITY", slaHours: 48 },
  ];
  const cleanup = async () => {
    await prisma.complaint.deleteMany({ where: { wardId } });
    await prisma.systemConfig.deleteMany({
      where: { key: { in: types.map((t) => t.key) } },
    });
    await prisma.ward.deleteMany({ where: { id: wardId } });
  };

  beforeAll(async () => {
    await prisma.ward.create({
      data: { id: wardId, name: wardId, isActive: true },
    });
    for (const t of types) {
      await prisma.systemConfig.create({
        data: {
          key: t.key,
          value: JSON.stringify({ name: t.name, slaHours: t.slaHours }),
          isActive: true,
        },
      });
    }

    const now = new Date();

    const mk = async (
      type,
      submittedAgoHours,
      closedAfterHours,
      status = "CLOSED",
    ) => {
      const submittedOn = new Date(
        now.getTime() - submittedAgoHours * 60 * 60 * 1000,
      );
      const closedOn = new Date(
        submittedOn.getTime() + closedAfterHours * 60 * 60 * 1000,
      );
      return prisma.complaint.create({
        data: {
          description: `Test ${type}`,
          type,
          status,
          priority: "MEDIUM",
          wardId,
          area: "Test",
          contactPhone: "+910000000000",
          submittedOn,
          closedOn,
          deadline: new Date(submittedOn.getTime() + 72 * 60 * 60 * 1000),
        },
      });
    };

    // WATER_SUPPLY SLA 24: one within (12h), one breach (30h)
    await mk("WATER_SUPPLY", 100, 12);
    await mk("WATER_SUPPLY", 90, 30);
    // ELECTRICITY SLA 48: one within (36h), one breach (60h)
    await mk("ELECTRICITY", 80, 36);
    await mk("ELECTRICITY", 70, 60);
  });

  afterAll(async () => {
    await cleanup();
  });

  it("calculates 50% compliance across closed complaints for ward", async () => {
    const { compliance, totalClosed, compliantClosed } =
      await computeSlaComplianceClosed(prisma, { wardId });
    expect(totalClosed).toBe(4);
    expect(compliantClosed).toBe(2);
    expect(Math.round(compliance)).toBe(50);
  });
});
