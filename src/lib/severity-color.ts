/**
 * Canonical severity color tokens and helpers.
 *
 * The single source of truth for severity styling is the `SeverityBadge`
 * component at `src/components/ui/severity-badge.tsx`, which renders text labels
 * with the colors below. This module re-exports the same CSS variable names so
 * other components (chart bars, line series, legends, etc.) can pull from the
 * same tokens and stay in lockstep with the badge.
 *
 * The CSS variables themselves are defined in `src/app/globals.css`:
 *   :root { --color-severity-critical: #ef4444; ... }
 *   .dark { --color-severity-critical: oklch(...); ... }
 *
 * Per the data dictionary (data/DATA_DICTIONARY.md line 120):
 *   "severity" determines UI color: Critical → red, Warning → orange, Info → blue
 *
 * The values are exposed as `var(--color-severity-*)` so they automatically
 * adapt to light/dark mode without any extra Tailwind classes. Recharts (which
 * requires concrete color strings for `fill`/`stroke`) and inline SVG elements
 * both accept these CSS-var strings, so this is the lowest-friction way to
 * share tokens across CSS and JS consumers.
 */

export type SeverityLevel = "critical" | "warning" | "info";

/** Canonical display order — Critical first (worst), Info last. */
export const SEVERITY_LEVELS: readonly SeverityLevel[] = [
  "critical",
  "warning",
  "info",
] as const;

/**
 * Map a severity level to its canonical CSS color variable.
 * Resolves at paint time in the browser, so light/dark mode is automatic.
 */
export const SEVERITY_COLOR_VAR: Record<SeverityLevel, string> = {
  critical: "var(--color-severity-critical)",
  warning: "var(--color-severity-warning)",
  info: "var(--color-severity-info)",
};

/**
 * Friendly capitalized label for each severity level — matches the strings
 * produced by the `alerts_events.severity` column and the data dictionary
 * (e.g. "Critical", "Warning", "Info").
 */
export const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

/**
 * Normalize an unknown value (typically a row's `severity` field) to a
 * canonical severity level. Returns `null` for any value that does not match
 * one of the three known severities (case-insensitive, tolerant of stray
 * whitespace).
 */
export function normalizeSeverity(value: unknown): SeverityLevel | null {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  if (lower === "critical") return "critical";
  if (lower === "warning") return "warning";
  if (lower === "info") return "info";
  return null;
}

/**
 * Resolve a severity value to its canonical CSS color variable string.
 * Returns `null` for unknown values so callers can fall back to a default
 * palette (rather than rendering an undefined color).
 */
export function getSeverityColor(value: unknown): string | null {
  const level = normalizeSeverity(value);
  return level ? SEVERITY_COLOR_VAR[level] : null;
}
