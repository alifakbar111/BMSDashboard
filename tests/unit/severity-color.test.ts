import { describe, it, expect } from "vitest";
import {
  SEVERITY_LEVELS,
  SEVERITY_COLOR_VAR,
  SEVERITY_LABEL,
  normalizeSeverity,
  getSeverityColor,
} from "@/lib/severity-color";

describe("severity-color — canonical mapping", () => {
  it("exposes the three severity levels in worst→best order", () => {
    expect(SEVERITY_LEVELS).toEqual(["critical", "warning", "info"]);
  });

  it("maps each level to a CSS variable string (var(--color-severity-*))", () => {
    expect(SEVERITY_COLOR_VAR.critical).toBe("var(--color-severity-critical)");
    expect(SEVERITY_COLOR_VAR.warning).toBe("var(--color-severity-warning)");
    expect(SEVERITY_COLOR_VAR.info).toBe("var(--color-severity-info)");
  });

  it("exposes friendly capitalized labels matching the data dictionary", () => {
    expect(SEVERITY_LABEL).toEqual({
      critical: "Critical",
      warning: "Warning",
      info: "Info",
    });
  });
});

describe("normalizeSeverity", () => {
  it("returns the canonical level for exact lowercase matches", () => {
    expect(normalizeSeverity("critical")).toBe("critical");
    expect(normalizeSeverity("warning")).toBe("warning");
    expect(normalizeSeverity("info")).toBe("info");
  });

  it("normalizes capitalized and mixed-case inputs from the seed CSV", () => {
    // The data/alerts_events.csv file stores severity as "Critical", "Warning", "Info"
    expect(normalizeSeverity("Critical")).toBe("critical");
    expect(normalizeSeverity("Warning")).toBe("warning");
    expect(normalizeSeverity("Info")).toBe("info");
    expect(normalizeSeverity("WARNING")).toBe("warning");
    expect(normalizeSeverity("CrItIcAl")).toBe("critical");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeSeverity("  Critical  ")).toBe("critical");
    expect(normalizeSeverity("\tInfo\n")).toBe("info");
  });

  it("returns null for unknown strings", () => {
    expect(normalizeSeverity("error")).toBeNull();
    expect(normalizeSeverity("")).toBeNull();
    expect(normalizeSeverity("low")).toBeNull();
    expect(normalizeSeverity("high")).toBeNull();
  });

  it("returns null for non-string inputs", () => {
    expect(normalizeSeverity(null)).toBeNull();
    expect(normalizeSeverity(undefined)).toBeNull();
    expect(normalizeSeverity(42)).toBeNull();
    expect(normalizeSeverity({})).toBeNull();
    expect(normalizeSeverity([])).toBeNull();
  });
});

describe("getSeverityColor", () => {
  it("returns the CSS variable for canonical severities", () => {
    expect(getSeverityColor("critical")).toBe(SEVERITY_COLOR_VAR.critical);
    expect(getSeverityColor("warning")).toBe(SEVERITY_COLOR_VAR.warning);
    expect(getSeverityColor("info")).toBe(SEVERITY_COLOR_VAR.info);
  });

  it("normalizes mixed-case before resolving the color", () => {
    expect(getSeverityColor("Critical")).toBe(SEVERITY_COLOR_VAR.critical);
    expect(getSeverityColor("WARNING")).toBe(SEVERITY_COLOR_VAR.warning);
  });

  it("returns null for unknown values so callers can fall back gracefully", () => {
    expect(getSeverityColor("unknown")).toBeNull();
    expect(getSeverityColor(null)).toBeNull();
    expect(getSeverityColor(undefined)).toBeNull();
  });
});
