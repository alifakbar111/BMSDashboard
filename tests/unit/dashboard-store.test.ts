import { describe, it, expect, beforeEach, vi } from "vitest";
import { useDashboardStore } from "../../src/store/dashboard-store";
import type { DashboardCard, GlobalFilters } from "../../src/lib";

const DEFAULT_FILTERS: GlobalFilters = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
};

function makeCard(overrides: Partial<DashboardCard> = {}): DashboardCard {
  return {
    id: "test-card-1",
    config: {
      id: "test-card-1",
      type: "kpi",
      title: "Test Card",
      dataSource: "energy_consumption",
      xAxis: null,
      yAxis: { field: "energy_kwh", label: "Energy (kWh)" },
      aggregation: "sum",
      groupBy: null,
      filter: null,
    },
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    ...overrides,
  };
}

beforeEach(() => {
  // Reset store state to default
  useDashboardStore.setState({ cards: [], filters: { ...DEFAULT_FILTERS } });

  // Stub localStorage for Node.js test environment
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
  });
});

describe("DashboardStore", () => {
  describe("addCard", () => {
    it("returns a string id and adds a card to the store", () => {
      const id = useDashboardStore.getState().addCard("kpi");

      expect(typeof id).toBe("string");
      expect(id).toMatch(/^card-/);

      const state = useDashboardStore.getState();
      expect(state.cards).toHaveLength(1);
      expect(state.cards[0].id).toBe(id);
      expect(state.cards[0].config.title).toBe("New Kpi Card");
    });

    it("accepts all card types", () => {
      const types = ["kpi", "bar", "line", "gauge"] as const;
      for (const type of types) {
        useDashboardStore.getState().addCard(type);
      }

      const state = useDashboardStore.getState();
      expect(state.cards).toHaveLength(4);
      expect(state.cards.map((c) => c.config.type)).toEqual([
        "kpi",
        "bar",
        "line",
        "gauge",
      ]);
    });

    it("creates gauge cards with default gauge config", () => {
      useDashboardStore.getState().addCard("gauge");

      const card = useDashboardStore.getState().cards[0];
      expect(card.config.gaugeMin).toBe(0);
      expect(card.config.gaugeMax).toBe(100);
      expect(card.config.gaugeTarget).toBe(75);
    });
  });

  describe("removeCard", () => {
    it("removes a card by id", () => {
      const id = useDashboardStore.getState().addCard("kpi");
      useDashboardStore.getState().addCard("bar");
      expect(useDashboardStore.getState().cards).toHaveLength(2);

      useDashboardStore.getState().removeCard(id);

      const state = useDashboardStore.getState();
      expect(state.cards).toHaveLength(1);
      expect(state.cards[0].id).not.toBe(id);
    });

    it("does nothing when id does not exist", () => {
      useDashboardStore.getState().addCard("kpi");
      useDashboardStore.getState().removeCard("non-existent");

      expect(useDashboardStore.getState().cards).toHaveLength(1);
    });
  });

  describe("updateCardConfig", () => {
    it("merges partial config values", () => {
      const id = useDashboardStore.getState().addCard("kpi");

      useDashboardStore
        .getState()
        .updateCardConfig(id, { title: "Updated Title" });

      const card = useDashboardStore.getState().cards[0];
      expect(card.config.title).toBe("Updated Title");
      expect(card.config.type).toBe("kpi");
      expect(card.config.aggregation).toBe("sum");
    });

    it("does not affect other cards", () => {
      const id1 = useDashboardStore.getState().addCard("kpi");
      const id2 = useDashboardStore.getState().addCard("bar");

      useDashboardStore
        .getState()
        .updateCardConfig(id1, { title: "Only First" });

      const cards = useDashboardStore.getState().cards;
      expect(cards.find((c) => c.id === id1)?.config.title).toBe("Only First");
      expect(cards.find((c) => c.id === id2)?.config.title).toBe("New Bar Card");
    });
  });

  describe("reorderCards", () => {
    it("moves a card from source index to target index", () => {
      useDashboardStore.getState().addCard("kpi");
      useDashboardStore.getState().addCard("bar");
      useDashboardStore.getState().addCard("line");

      const before = useDashboardStore.getState().cards;
      expect(before.map((c) => c.config.type)).toEqual(["kpi", "bar", "line"]);

      useDashboardStore.getState().reorderCards(0, 2);

      const after = useDashboardStore.getState().cards;
      expect(after.map((c) => c.config.type)).toEqual(["bar", "line", "kpi"]);
    });
  });

  describe("setFilters", () => {
    it("sets buildingId, floor, and timeRange", () => {
      useDashboardStore
        .getState()
        .setFilters({ buildingId: "BLD-001", floor: 3, timeRange: "today" });

      const filters = useDashboardStore.getState().filters;
      expect(filters.buildingId).toBe("BLD-001");
      expect(filters.floor).toBe(3);
      expect(filters.timeRange).toBe("today");
    });

    it("merges partial updates without resetting other fields", () => {
      useDashboardStore
        .getState()
        .setFilters({ buildingId: "BLD-001" });

      let filters = useDashboardStore.getState().filters;
      expect(filters.buildingId).toBe("BLD-001");
      expect(filters.floor).toBeNull();

      useDashboardStore.getState().setFilters({ floor: 5 });

      filters = useDashboardStore.getState().filters;
      expect(filters.buildingId).toBe("BLD-001");
      expect(filters.floor).toBe(5);
    });
  });

  describe("duplicateCard", () => {
    it("creates a copy of the card with (copy) suffix", () => {
      const id = useDashboardStore.getState().addCard("bar");
      useDashboardStore
        .getState()
        .updateCardConfig(id, { title: "My Chart" });

      const newId = useDashboardStore.getState().duplicateCard(id);

      expect(typeof newId).toBe("string");
      expect(newId).not.toBe(id);

      const state = useDashboardStore.getState();
      expect(state.cards).toHaveLength(2);

      const original = state.cards.find((c) => c.id === id);
      const duplicate = state.cards.find((c) => c.id === newId);
      expect(duplicate).toBeDefined();
      expect(duplicate!.config.title).toBe("My Chart (copy)");
      expect(duplicate!.config.type).toBe("bar");
      expect(duplicate!.width).toBe(original!.width);
      expect(duplicate!.height).toBe(original!.height);
    });
  });

  describe("resizeCard", () => {
    it("changes width and height for small size", () => {
      const id = useDashboardStore.getState().addCard("kpi");
      useDashboardStore.getState().resizeCard(id, "small");
      const card = useDashboardStore.getState().cards[0];
      expect(card.width).toBe(1);
      expect(card.height).toBe(1);
    });

    it("changes width and height for wide size", () => {
      const id = useDashboardStore.getState().addCard("kpi");
      useDashboardStore.getState().resizeCard(id, "wide");
      const card = useDashboardStore.getState().cards[0];
      expect(card.width).toBe(2);
      expect(card.height).toBe(1);
    });

    it("changes width and height for tall size", () => {
      const id = useDashboardStore.getState().addCard("kpi");
      useDashboardStore.getState().resizeCard(id, "tall");
      const card = useDashboardStore.getState().cards[0];
      expect(card.width).toBe(1);
      expect(card.height).toBe(2);
    });

    it("changes width and height for large size", () => {
      const id = useDashboardStore.getState().addCard("kpi");
      useDashboardStore.getState().resizeCard(id, "large");
      const card = useDashboardStore.getState().cards[0];
      expect(card.width).toBe(2);
      expect(card.height).toBe(2);
    });
  });

  describe("setCards", () => {
    it("replaces all cards in the store", () => {
      useDashboardStore.getState().addCard("kpi");
      useDashboardStore.getState().addCard("bar");
      expect(useDashboardStore.getState().cards).toHaveLength(2);

      const newCards = [
        makeCard({ id: "replacement-1" }),
        makeCard({ id: "replacement-2" }),
        makeCard({ id: "replacement-3" }),
      ];
      useDashboardStore.getState().setCards(newCards);

      const state = useDashboardStore.getState();
      expect(state.cards).toHaveLength(3);
      expect(state.cards[0].id).toBe("replacement-1");
      expect(state.cards[1].id).toBe("replacement-2");
      expect(state.cards[2].id).toBe("replacement-3");
    });
  });

  describe("localStorage persistence", () => {
    it("saveToStorage writes cards to localStorage", () => {
      const id = useDashboardStore.getState().addCard("kpi");
      const stored = localStorage.getItem("bms-dashboard-layout");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].id).toBe(id);
    });

    it("loadFromStorage reads cards from localStorage and restores them", () => {
      const id = useDashboardStore.getState().addCard("line");

      // Reset store to simulate fresh load
      useDashboardStore.setState({ cards: [] });
      expect(useDashboardStore.getState().cards).toHaveLength(0);

      useDashboardStore.getState().loadFromStorage();

      const state = useDashboardStore.getState();
      expect(state.cards).toHaveLength(1);
      expect(state.cards[0].id).toBe(id);
      expect(state.cards[0].config.type).toBe("line");
    });

    it("loadFromStorage handles missing key gracefully", () => {
      localStorage.clear();
      useDashboardStore.getState().loadFromStorage();
      expect(useDashboardStore.getState().cards).toHaveLength(0);
    });
  });
});
