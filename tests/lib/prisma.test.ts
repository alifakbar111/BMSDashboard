import { describe, it, expect, vi, beforeEach } from "vitest";

describe("PrismaClient singleton", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports a prisma object when DATABASE_URL is set", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "sqlserver://localhost:1433;database=bms_dashboard;user=SA;password=test;trustServerCertificate=true",
    );
    vi.stubEnv("NODE_ENV", "test");

    const mod = await import("@/lib/prisma");
    expect(mod).toHaveProperty("prisma");
  });

  it("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(async () => {
      await import("@/lib/prisma");
    }).rejects.toThrow();
  });
});
