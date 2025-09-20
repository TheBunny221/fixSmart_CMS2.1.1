import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../app.js";
import { getPrisma } from "../../db/connection.js";
import { computeSlaComplianceClosed } from "../../utils/sla.js";

const prisma = getPrisma();

describe("SLA alignment between Admin Dashboard and Reports", () => {
  const wardId = "sla-ward-integration";
  const admin = {
    id: "sla-admin-1",
    email: "sla-admin@test.com",
    fullName: "SLA Admin",
    role: "ADMINISTRATOR",
    isActive: true,
  };
  let app;
  let adminToken;

  const types = [
    { key: "COMPLAINT_TYPE_WATER_SUPPLY", name: "WATER_SUPPLY", slaHours: 24 },
    { key: "COMPLAINT_TYPE_ELECTRICITY", name: "ELECTRICITY", slaHours: 48 },
  ];

  const cleanup = async () => {
    await prisma.complaint.deleteMany({ where: { wardId } });
    await prisma.systemConfig.deleteMany({
      where: { key: { in: types.map((t) => t.key) } },
    });
    await prisma.user.deleteMany({ where: { email: admin.email } });
    await prisma.ward.deleteMany({ where: { id: wardId } });
  };

  beforeAll(async () => {
    app = createApp();

    await prisma.ward.create({
      data: { id: wardId, name: wardId, isActive: true },
    });
    await prisma.user.create({ data: admin });
    adminToken = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" },
    );

    for (const t of types) {
      await prisma.systemConfig.create({
        data: {
          key: t.key,
          value: JSON.stringify({ name: t.name, slaHours: t.slaHours }),
          isActive: true,
        },
      });
    }

    const base = new Date();
    const mk = async (type, offsetH, durH) => {
      const submittedOn = new Date(base.getTime() - offsetH * 60 * 60 * 1000);
      const closedOn = new Date(submittedOn.getTime() + durH * 60 * 60 * 1000);
      return prisma.complaint.create({
        data: {
          description: `SLA ${type}`,
          type,
          status: "CLOSED",
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

    await mk("WATER_SUPPLY", 120, 12); // within 24h
    await mk("WATER_SUPPLY", 110, 30); // breach
    await mk("ELECTRICITY", 100, 36); // within 48h
    await mk("ELECTRICITY", 90, 60); // breach
  });

  afterAll(async () => {
    await cleanup();
  });

  it("admin dashboard and reports analytics reflect the same SLA compliance (within rounding)", async () => {
    const utilAll = await computeSlaComplianceClosed(prisma);

    const dashRes = await request(app)
      .get("/api/admin/dashboard/analytics")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const metrics = dashRes.body?.data?.metrics;
    expect(metrics).toBeDefined();

    const from = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();

    const reportsRes = await request(app)
      .get(
        `/api/reports/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&ward=${wardId}`,
      )
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const reportsSla = reportsRes.body?.data?.sla;
    expect(reportsSla).toBeDefined();

    // Both endpoints round to 1 decimal
    const dashCompliance = Number(metrics.slaCompliance);
    const reportsCompliance = Number(reportsSla.compliance);

    expect(dashCompliance).toBeTypeOf("number");
    expect(reportsCompliance).toBeTypeOf("number");

    // Sanity: dashboard equals util-all rounded
    expect(dashCompliance).toBeCloseTo(
      Math.round(utilAll.compliance * 10) / 10,
      5,
    );

    // Reports equals ward-filtered util rounded
    const utilWard = await computeSlaComplianceClosed(prisma, { wardId });
    expect(reportsCompliance).toBeCloseTo(
      Math.round(utilWard.compliance * 10) / 10,
      5,
    );
  });
});
