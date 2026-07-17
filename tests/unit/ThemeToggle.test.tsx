// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// next-themes: provide a controllable mock so we can simulate the no-localStorage / system-default scenario
const mockSetTheme = vi.fn();
let mockResolvedTheme: string | undefined = "light";
let mockTheme: string | undefined = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
    themes: ["light", "dark", "system"],
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockResolvedTheme = "light";
    mockTheme = "light";
  });

  afterEach(() => {
    cleanup();
  });

  it("toggles to dark when current resolved theme is light", () => {
    mockResolvedTheme = "light";
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles to light when current resolved theme is dark", () => {
    mockResolvedTheme = "dark";
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  // Regression: when defaultTheme="system" and no localStorage key exists,
  // theme === "system" but resolvedTheme is the actual applied theme (light/dark).
  // Toggling based on `theme` would set to "dark" on first click without flipping
  // the visual theme if the OS is already dark. Using `resolvedTheme` fixes this.
  it("toggles correctly on first click when theme is system (no localStorage)", () => {
    mockTheme = "system"; // first-load state, no localStorage key
    mockResolvedTheme = "dark"; // OS is in dark mode
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(button);
    // Must flip the visual theme (system-dark → light), not just resolve "system"
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("toggles correctly on first click when system is light (no localStorage)", () => {
    mockTheme = "system";
    mockResolvedTheme = "light"; // OS is in light mode
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("renders the SunIcon when resolved theme is dark (suggests switching to light)", () => {
    mockResolvedTheme = "dark";
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    // The button should contain the Sun icon (lucide-sun class)
    expect(button.querySelector(".lucide-sun")).not.toBeNull();
  });
});
