// tests/unit/default-dashboard.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_DASHBOARD_CARDS,
  DEFAULT_FILTERS,
} from "../../src/lib/default-dashboard";
import {
  CardConfigSchema,
  GlobalFiltersSchema,
} from "../../src/lib/schemas";

describe("DEFAULT_DASHBOARD_CARDS", () => {
  it("is a non-empty array of cards", () => {
    expect(Array.isArray(DEFAULT_DASHBOARD_CARDS)).toBe(true);
    expect(DEFAULT_DASHBOARD_CARDS.length).toBeGreaterThan(0);
  });

  it("covers one of every card type", () => {
    const types = new Set(DEFAULT_DASHBOARD_CARDS.map((c) => c.config.type));
    for (const t of ["kpi", "bar", "line", "gauge"] as const) {
      expect(types.has(t)).toBe(true);
    }
  });

  it("every card config passes CardConfigSchema", () => {
    for (const card of DEFAULT_DASHBOARD_CARDS) {
      const result = CardConfigSchema.safeParse(card.config);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
  });

  it("every card id matches its config id", () => {
    for (const card of DEFAULT_DASHBOARD_CARDS) {
      expect(card.id).toBe(card.config.id);
    }
  });

  it("card ids are unique", () => {
    const ids = DEFAULT_DASHBOARD_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("DEFAULT_FILTERS passes GlobalFiltersSchema", () => {
    const result = GlobalFiltersSchema.safeParse(DEFAULT_FILTERS);
    expect(result.success).toBe(true);
  });
});
