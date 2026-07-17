import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/query/route";
import { NextRequest } from "next/server";

// Mock the prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    energyConsumption: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    hvacPerformance: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    occupancy: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    alertsEvent: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("POST /api/query - Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createNextRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(body),
    });
  }

  describe("Example 1: KPI — Total Energy Consumption (Building B1)", () => {
    it("returns aggregated sum for KPI card", async () => {
      const mockData = [
        { energyKwh: 1000.5 },
        { energyKwh: 2345.67 },
        { energyKwh: 890.12 },
      ];

      vi.mocked(prisma.energyConsumption.findMany).mockResolvedValue(mockData as any);

      const request = createNextRequest({
        config: {
          type: "kpi",
          title: "Total Energy B1",
          dataSource: "energy_consumption",
          xAxis: null,
          yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
          aggregation: "sum",
          groupBy: null,
          filter: { field: "device_type", operator: "eq", value: "HVAC" },
          id: "kpi-1",
        },
        globalFilters: {
          buildingId: "B1",
          floor: null,
          timeRange: null,
          customStart: null,
          customEnd: null,
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("aggregated");
      expect(json.aggregated).toBeCloseTo(4236.29, 2);
      expect(json.data).toEqual(mockData);

      expect(prisma.energyConsumption.findMany).toHaveBeenCalledWith({
        where: {
          buildingId: "B1",
          deviceType: "HVAC",
        },
        select: { energyKwh: true },
        orderBy: undefined,
      });
    });
  });

  describe("Example 4: Bar Chart — Energy by Floor (Today)", () => {
    it("returns grouped data for bar chart", async () => {
      const mockData = [
        { floor: 1, _sum: { energyKwh: 1500.0 } },
        { floor: 2, _sum: { energyKwh: 2200.5 } },
        { floor: 3, _sum: { energyKwh: 1800.75 } },
      ];

      vi.mocked(prisma.energyConsumption.groupBy).mockResolvedValue(mockData as any);

      const request = createNextRequest({
        config: {
          type: "bar",
          title: "Energy by Floor (Today)",
          dataSource: "energy_consumption",
          xAxis: { field: "floor", label: "Floor" },
          yAxis: { field: "energy_kwh", label: "Total Energy (kWh)" },
          aggregation: "sum",
          groupBy: null,
          filter: null,
          id: "bar-1",
        },
        globalFilters: {
          buildingId: "B1",
          floor: null,
          timeRange: "today",
          customStart: null,
          customEnd: null,
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("aggregated");
      expect(json.aggregated).toBeNull();
      // API flattens Prisma's nested aggregation result for chart consumption
      expect(json.data).toEqual([
        { floor: 1, energyKwh: 1500.0 },
        { floor: 2, energyKwh: 2200.5 },
        { floor: 3, energyKwh: 1800.75 },
      ]);

      const groupByCall = vi.mocked(prisma.energyConsumption.groupBy).mock.calls[0][0];
      expect(groupByCall.by).toEqual(["floor"]);
      expect(groupByCall._sum).toEqual({ energyKwh: true });
      expect(groupByCall.where).toHaveProperty("buildingId", "B1");
      expect(groupByCall.where).toHaveProperty("timestamp");
    });
  });

  describe("Example 6: Line Chart — Energy Trend by Device (Last 7 Days)", () => {
    it("returns time-series data grouped by device", async () => {
      const mockData = [
        { timestamp: new Date("2026-07-10T08:00:00Z"), deviceId: "DEV-001", _sum: { energyKwh: 45.2 } },
        { timestamp: new Date("2026-07-10T08:00:00Z"), deviceId: "DEV-002", _sum: { energyKwh: 38.9 } },
        { timestamp: new Date("2026-07-11T08:00:00Z"), deviceId: "DEV-001", _sum: { energyKwh: 47.5 } },
        { timestamp: new Date("2026-07-11T08:00:00Z"), deviceId: "DEV-002", _sum: { energyKwh: 39.1 } },
      ];

      vi.mocked(prisma.energyConsumption.groupBy).mockResolvedValue(mockData as any);

      const request = createNextRequest({
        config: {
          type: "line",
          title: "Energy Trend by Device",
          dataSource: "energy_consumption",
          xAxis: { field: "timestamp", label: "Time" },
          yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
          aggregation: "sum",
          groupBy: { field: "device_id", label: "Device" },
          filter: null,
          id: "line-1",
        },
        globalFilters: {
          buildingId: "B1",
          floor: 2,
          timeRange: "last7",
          customStart: null,
          customEnd: null,
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty("data");
      expect(json.aggregated).toBeNull();
      // API flattens Prisma's nested aggregation result for chart consumption
      // JSON serialization converts Date objects to ISO strings
      expect(json.data).toEqual([
        { timestamp: "2026-07-10T08:00:00.000Z", deviceId: "DEV-001", energyKwh: 45.2 },
        { timestamp: "2026-07-10T08:00:00.000Z", deviceId: "DEV-002", energyKwh: 38.9 },
        { timestamp: "2026-07-11T08:00:00.000Z", deviceId: "DEV-001", energyKwh: 47.5 },
        { timestamp: "2026-07-11T08:00:00.000Z", deviceId: "DEV-002", energyKwh: 39.1 },
      ]);

      const groupByCall = vi.mocked(prisma.energyConsumption.groupBy).mock.calls[0][0];
      expect(groupByCall.by).toEqual(["timestamp", "deviceId"]);
      expect(groupByCall._sum).toEqual({ energyKwh: true });
      expect(groupByCall.where).toHaveProperty("buildingId", "B1");
      expect(groupByCall.where).toHaveProperty("floor", 2);
    });
  });

  describe("Example 8: Gauge — Occupancy Rate", () => {
    it("returns aggregated average for gauge card", async () => {
      const mockData = [
        { occupancyRatePercent: 75.5 },
        { occupancyRatePercent: 82.3 },
        { occupancyRatePercent: 78.9 },
        { occupancyRatePercent: 81.2 },
      ];

      vi.mocked(prisma.occupancy.findMany).mockResolvedValue(mockData as any);

      const request = createNextRequest({
        config: {
          type: "gauge",
          title: "Occupancy Rate",
          dataSource: "occupancy",
          xAxis: null,
          yAxis: { field: "occupancy_rate_percent", label: "Rate (%)" },
          aggregation: "avg",
          groupBy: null,
          filter: { field: "building_id", operator: "eq", value: "B1" },
          id: "gauge-1",
          gaugeMin: 0,
          gaugeMax: 100,
          gaugeTarget: 80,
        },
        globalFilters: {
          buildingId: null,
          floor: null,
          timeRange: null,
          customStart: null,
          customEnd: null,
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("aggregated");
      expect(json.aggregated).toBeCloseTo(79.475, 2);
      expect(json.data).toEqual(mockData);

      expect(prisma.occupancy.findMany).toHaveBeenCalledWith({
        where: { buildingId: "B1" },
        select: { occupancyRatePercent: true },
        orderBy: undefined,
      });
    });
  });

  describe("Error Response: Unknown field name", () => {
    it("returns 400 for unknown field in yAxis", async () => {
      const request = createNextRequest({
        config: {
          type: "kpi",
          title: "Bad Field",
          dataSource: "energy_consumption",
          xAxis: null,
          yAxis: { field: "nonexistent_field", label: "Bad" },
          aggregation: "sum",
          groupBy: null,
          filter: null,
          id: "bad-1",
        },
        globalFilters: {
          buildingId: null,
          floor: null,
          timeRange: null,
          customStart: null,
          customEnd: null,
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toHaveProperty("error");
      expect(json.error).toBe("Invalid request body");
      expect(json).toHaveProperty("details");
    });

    it("returns 400 for unknown field in filter", async () => {
      const request = createNextRequest({
        config: {
          type: "kpi",
          title: "Bad Filter",
          dataSource: "energy_consumption",
          xAxis: null,
          yAxis: { field: "energy_kwh", label: "Energy" },
          aggregation: "sum",
          groupBy: null,
          filter: { field: "invalid_column", operator: "eq", value: "test" },
          id: "bad-2",
        },
        globalFilters: {
          buildingId: null,
          floor: null,
          timeRange: null,
          customStart: null,
          customEnd: null,
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toHaveProperty("error");
      expect(json.error).toBe("Invalid request body");
    });
  });

  describe("CSRF and Security", () => {
    it("returns 403 for origin mismatch", async () => {
      const request = new NextRequest("http://localhost:3000/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://evil.com",
        },
        body: JSON.stringify({
          config: {
            type: "kpi",
            title: "Test",
            dataSource: "energy_consumption",
            xAxis: null,
            yAxis: { field: "energy_kwh", label: "Energy" },
            aggregation: "sum",
            groupBy: null,
            filter: null,
            id: "csrf-test",
          },
          globalFilters: {
            buildingId: null,
            floor: null,
            timeRange: null,
            customStart: null,
            customEnd: null,
          },
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json).toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: "{ invalid json",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "Invalid JSON in request body" });
    });
  });
});
