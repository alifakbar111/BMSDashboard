// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Stub next-themes so the underlying components render without a provider
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn(), theme: "light" }),
}));

// Provide a deterministic dashboard-store stub
const mockUpdateCardConfig = vi.fn();
const mockCards = [
  {
    id: "card-1",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    config: {
      id: "card-1",
      type: "bar" as const,
      title: "Alerts by Severity",
      dataSource: null,
      xAxis: null,
      yAxis: null,
      aggregation: "sum" as const,
      groupBy: null,
      filter: null,
    },
  },
];
vi.mock("@/store/dashboard-store", () => ({
  useDashboardStore: () => ({
    cards: mockCards,
    updateCardConfig: mockUpdateCardConfig,
  }),
}));

// Mock the Select UI primitives — Radix's Select uses scrollIntoView which
// jsdom doesn't implement, so we substitute a plain native <select> here.
// The real Select is exercised in the browser; this test only verifies the
// conditional rendering of the severity legend inside CardConfigModal.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="mock-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

import CardConfigModal from "@/components/dashboard/CardConfigModal";

afterEach(() => {
  cleanup();
  mockUpdateCardConfig.mockReset();
});

describe("CardConfigModal — severity legend", () => {
  it("does NOT show the legend before alerts_events is selected", () => {
    render(<CardConfigModal card={mockCards[0]} open onOpenChange={() => {}} />);
    expect(screen.queryByText("Alert severity colors")).toBeNull();
  });

  it("shows the severity legend when alerts_events is selected as data source", () => {
    render(<CardConfigModal card={mockCards[0]} open onOpenChange={() => {}} />);

    // Simulate the user selecting "alerts_events" in the data-source select.
    const select = screen.getByTestId("mock-select") as unknown as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "alerts_events" } });

    // The legend should now render with all three severity badges.
    expect(screen.getByText("Alert severity colors")).toBeTruthy();
    expect(screen.getByText("Critical")).toBeTruthy();
    expect(screen.getByText("Warning")).toBeTruthy();
    expect(screen.getByText("Info")).toBeTruthy();

    // And the canonical SeverityBadge component should be present.
    const badges = document.querySelectorAll('[data-slot="severity-badge"]');
    expect(badges.length).toBe(3);
  });
});
