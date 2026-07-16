import { describe, it, expect } from "vitest";
import { parse } from "csv-parse/sync";

// Test the CSV parsing approach used in seed.ts
describe("CSV parser (csv-parse)", () => {
  it("parses simple CSV", () => {
    const input = "a,b\n1,2\n3,4";
    const result = parse(input, { columns: true, skip_empty_lines: true, trim: true });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ a: "1", b: "2" });
  });

  it("handles quoted fields with commas", () => {
    const input = 'a,b\n1,"hello,world"\n3,4';
    const result = parse(input, { columns: true, skip_empty_lines: true, trim: true });
    expect(result).toHaveLength(2);
    expect(result[0].b).toBe("hello,world");
  });

  it("skips empty lines", () => {
    const input = "a,b\n1,2\n\n3,4\n";
    const result = parse(input, { columns: true, skip_empty_lines: true, trim: true });
    expect(result).toHaveLength(2);
  });

  it("handles quoted fields with escaped quotes", () => {
    const input = 'a,b\n1,"say ""hello"""\n3,4';
    const result = parse(input, { columns: true, skip_empty_lines: true, trim: true });
    expect(result[0].b).toBe('say "hello"');
  });
});

// Test safeInt and safeFloat logic (replicate from seed.ts)
function safeInt(val: string, fallback = 0): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}
function safeFloat(val: string, fallback = 0): number {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

describe("safe number helpers", () => {
  it("safeInt parses valid integers", () => {
    expect(safeInt("42")).toBe(42);
    expect(safeInt("0")).toBe(0);
    expect(safeInt("-5")).toBe(-5);
  });

  it("safeInt returns fallback for invalid input", () => {
    expect(safeInt("")).toBe(0);
    expect(safeInt("abc")).toBe(0);
    expect(safeInt("   ")).toBe(0);
  });

  it("safeInt uses custom fallback", () => {
    expect(safeInt("abc", -1)).toBe(-1);
  });

  it("safeFloat parses valid floats", () => {
    expect(safeFloat("3.14")).toBe(3.14);
    expect(safeFloat("0.5")).toBe(0.5);
    expect(safeFloat("-2.5")).toBe(-2.5);
  });

  it("safeFloat returns fallback for invalid input", () => {
    expect(safeFloat("")).toBe(0);
    expect(safeFloat("abc")).toBe(0);
  });
});

// Test nullableDate fix
function nullableDate(val: string): Date | null {
  if (val === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

describe("nullableDate", () => {
  it("returns null for empty string", () => {
    expect(nullableDate("")).toBeNull();
  });

  it("returns null for invalid date string", () => {
    expect(nullableDate("not-a-date")).toBeNull();
  });

  it("returns Date for valid date string", () => {
    const result = nullableDate("2024-01-15T10:30:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2024-01-15T10:30:00.000Z");
  });
});
