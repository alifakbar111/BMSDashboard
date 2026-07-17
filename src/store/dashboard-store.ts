import { create } from "zustand";
import type {
  DashboardCard,
  CardConfig,
  CardType,
  GlobalFilters,
  TableName,
} from "@/lib";

const STORAGE_KEY = "bms-dashboard-layout";

const DEFAULT_FILTERS: GlobalFilters = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
};

const CARD_SIZES: Record<string, { width: number; height: number }> = {
  small: { width: 1, height: 1 },
  wide: { width: 2, height: 1 },
  tall: { width: 1, height: 2 },
  large: { width: 2, height: 2 },
};

function generateId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultConfig(type: CardType): CardConfig {
  const base = {
    type,
    title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Card`,
    dataSource: null as unknown as TableName,
    xAxis: null,
    yAxis: null,
    aggregation: "sum" as const,
    groupBy: null,
    filter: null,
  };

  const id = generateId();

  if (type === "gauge") {
    return {
      ...base,
      id,
      gaugeMin: 0,
      gaugeMax: 100,
      gaugeTarget: 75,
    };
  }

  return { ...base, id };
}

export interface DashboardStore {
  cards: DashboardCard[];
  filters: GlobalFilters;
  addCard: (type: CardType) => string;
  removeCard: (id: string) => void;
  updateCardConfig: (id: string, config: Partial<CardConfig>) => void;
  duplicateCard: (id: string) => string;
  resizeCard: (id: string, size: "small" | "wide" | "tall" | "large") => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
  setCards: (cards: DashboardCard[]) => void;
  setFilters: (filters: Partial<GlobalFilters>) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useDashboardStore = create<DashboardStore>()((set, get) => ({
  cards: [],
  filters: { ...DEFAULT_FILTERS },

  addCard: (type: CardType) => {
    const config = createDefaultConfig(type);
    const card: DashboardCard = {
      id: config.id,
      config,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
    set((state) => ({ cards: [...state.cards, card] }));
    get().saveToStorage();
    return card.id;
  },

  removeCard: (id: string) => {
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));
    get().saveToStorage();
  },

  updateCardConfig: (id: string, config: Partial<CardConfig>) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, config: { ...c.config, ...config } } : c,
      ),
    }));
    get().saveToStorage();
  },

  duplicateCard: (id: string) => {
    const original = get().cards.find((c) => c.id === id);
    if (!original) return "";

    const newId = generateId();
    const newCard: DashboardCard = {
      ...original,
      id: newId,
      config: {
        ...original.config,
        id: newId,
        title: `${original.config.title} (copy)`,
      },
    };
    set((state) => ({ cards: [...state.cards, newCard] }));
    get().saveToStorage();
    return newId;
  },

  resizeCard: (id: string, size: "small" | "wide" | "tall" | "large") => {
    const dims = CARD_SIZES[size];
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, width: dims.width, height: dims.height } : c,
      ),
    }));
    get().saveToStorage();
  },

  reorderCards: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const cards = [...state.cards];
      const [moved] = cards.splice(fromIndex, 1);
      cards.splice(toIndex, 0, moved);
      return { cards };
    });
    get().saveToStorage();
  },

  setCards: (cards: DashboardCard[]) => {
    set({ cards });
    get().saveToStorage();
  },

  setFilters: (filters: Partial<GlobalFilters>) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set({ cards: parsed });
        }
      }
    } catch {
      // Ignore SSR / private browsing errors
    }
  },

  saveToStorage: () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(get().cards));
    } catch {
      // Ignore SSR / private browsing errors
    }
  },
}));
