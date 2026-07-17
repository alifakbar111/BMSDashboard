import { describe, it, expect } from "vitest";

// These imports work because we exported the helpers from prisma/seed.ts
import { safeInt, safeFloat, nullableDate, nullableString } from "../../prisma/seed";

describe("safeInt", () => {
  it("parses valid integer string", () => {
    expect(safeInt("42")).toBe(42);
  });

  it("returns fallback for invalid input", () => {
    expect(safeInt("abc")).toBe(0);
  });

  it("uses custom fallback", () => {
    expect(safeInt("abc", -1)).toBe(-1);
  });

  it("parses zero correctly", () => {
    expect(safeInt("0")).toBe(0);
  });
});

describe("safeFloat", () => {
  it("parses valid float string", () => {
    expect(safeFloat("3.14")).toBeCloseTo(3.14);
  });

  it("returns fallback for invalid input", () => {
    expect(safeFloat("abc")).toBe(0);
  });

  it("parses integer as float", () => {
    expect(safeFloat("42")).toBe(42);
  });
});

describe("nullableString", () => {
  it("returns null for empty string", () => {
    expect(nullableString("")).toBeNull();
  });

  it("returns the string for non-empty", () => {
    expect(nullableString("hello")).toBe("hello");
  });
});

describe("nullableDate", () => {
  it("returns null for empty string", () => {
    expect(nullableDate("")).toBeNull();
  });

  it("returns Date for valid ISO string", () => {
    const result = nullableDate("2024-01-15T10:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2024-01-15T10:00:00.000Z");
  });

  it("returns null for invalid date string", () => {
    expect(nullableDate("not-a-date")).toBeNull();
  });
});
