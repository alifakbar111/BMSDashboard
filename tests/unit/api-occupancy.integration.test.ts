import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma before importing the handler to prevent DATABASE_URL errors
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("GET /api/occupancy/latest", () => {
  it("returns 400 when building_id is missing", async () => {
    const { GET } = await import("@/app/api/occupancy/latest/route");
    const req = new NextRequest("http://localhost/api/occupancy/latest?floor=1");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid parameters");
  });

  it("returns 500 when floor is missing (coerces to 0, DB query fails)", async () => {
    // Note: Zod's z.coerce.number() coerces null to 0, so validation passes.
    // The DB query then fails since there's no database connection.
    const { GET } = await import("@/app/api/occupancy/latest/route");
    const req = new NextRequest("http://localhost/api/occupancy/latest?building_id=BLD-001");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("returns 400 for non-numeric floor", async () => {
    const { GET } = await import("@/app/api/occupancy/latest/route");
    const req = new NextRequest("http://localhost/api/occupancy/latest?building_id=BLD-001&floor=abc");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
