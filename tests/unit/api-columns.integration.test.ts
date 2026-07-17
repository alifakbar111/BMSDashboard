import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

describe("GET /api/columns", () => {
  it("validates source param exists", async () => {
    // This imports the actual handler
    const { GET } = await import("@/app/api/columns/route");
    const req = new NextRequest("http://localhost/api/columns?source=energy_consumption");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("columns");
    expect(body.columns.length).toBeGreaterThan(0);
  });

  it("returns 400 when source param is missing", async () => {
    const { GET } = await import("@/app/api/columns/route");
    const req = new NextRequest("http://localhost/api/columns");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown data source", async () => {
    const { GET } = await import("@/app/api/columns/route");
    const req = new NextRequest("http://localhost/api/columns?source=nonexistent");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
