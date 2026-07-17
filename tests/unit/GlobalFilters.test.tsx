// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GlobalFilters from "@/components/layout/GlobalFilters";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn(), theme: "light" }),
}));

// Mock the dashboard store
const setFilters = vi.fn();
const filters: {
  buildingId: string | null;
  floor: number | null;
  timeRange: "today" | "last7" | "custom" | null;
  customStart: string | null;
  customEnd: string | null;
} = {
  buildingId: null,
  floor: null,
  timeRange: null,
  customStart: null,
  customEnd: null,
};

vi.mock("@/store/dashboard-store", () => ({
  useDashboardStore: () => ({ cards: [], filters, setFilters }),
}));

afterEach(() => {
  cleanup();
  setFilters.mockClear();
  // Reset to defaults between tests
  filters.buildingId = null;
  filters.floor = null;
  filters.timeRange = null;
  filters.customStart = null;
  filters.customEnd = null;
});

function openCustomRange() {
  filters.timeRange = "custom";
  render(<GlobalFilters />);
}

describe("GlobalFilters — custom date range picker", () => {
  // Regression: <input type="date"> returns "YYYY-MM-DD" with no time. The
  // old code did `new Date(val + "T00:00:00").toISOString()`, which constructs
  // a UTC midnight timestamp. In a negative-offset timezone (e.g. UTC-7), that
  // rolls the date back one day, so picking "2026-07-10" actually filtered
  // from "2026-07-09T07:00:00.000Z" in the database. The fix uses the local
  // Date constructor so the stored timestamp matches the user's wall clock.
  it("converts a 'From' date to local start-of-day (no UTC rollback)", () => {
    openCustomRange();
    const fromInput = screen.getByLabelText(/from/i) as HTMLInputElement;

    fireEvent.change(fromInput, { target: { value: "2026-07-10" } });

    expect(setFilters).toHaveBeenCalledTimes(1);
    const arg = setFilters.mock.calls[0][0] as { customStart: string };
    const d = new Date(arg.customStart);
    // The stored timestamp must represent start-of-day 2026-07-10 in LOCAL time,
    // not 2026-07-10T00:00:00Z. We assert it falls on 2026-07-10 local.
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July (0-indexed)
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  // Regression: the old code used "T00:00:00" for the "To" input too, so the
  // upper bound was the START of the picked day — all of that day's data was
  // excluded from the result. The fix uses end-of-day (23:59:59.999) so the
  // "To" date is inclusive.
  it("converts a 'To' date to local end-of-day so the day is inclusive", () => {
    openCustomRange();
    const toInput = screen.getByLabelText(/to/i) as HTMLInputElement;

    fireEvent.change(toInput, { target: { value: "2026-07-17" } });

    expect(setFilters).toHaveBeenCalledTimes(1);
    const arg = setFilters.mock.calls[0][0] as { customEnd: string };
    const d = new Date(arg.customEnd);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(17);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
  });

  it("clears customStart when the From input is emptied", () => {
    filters.timeRange = "custom";
    filters.customStart = "2026-07-10T00:00:00.000Z";
    render(<GlobalFilters />);

    const fromInput = screen.getByLabelText(/from/i) as HTMLInputElement;
    fireEvent.change(fromInput, { target: { value: "" } });

    expect(setFilters).toHaveBeenCalledWith({ customStart: null });
  });

  it("does not show the From/To inputs until 'Custom Range' is picked", () => {
    filters.timeRange = null;
    render(<GlobalFilters />);
    expect(screen.queryByLabelText(/from/i)).toBeNull();
    expect(screen.queryByLabelText(/to/i)).toBeNull();
  });
});
