// tests/unit/get-query-client.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("getQueryClient — server branch (isServer=true)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a new QueryClient on every call", async () => {
    vi.doMock("@tanstack/react-query", async () => {
      const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
        "@tanstack/react-query",
      );
      return { ...actual, isServer: true };
    });
    const { getQueryClient } = await import("../../src/lib/get-query-client");
    const a = getQueryClient();
    const b = getQueryClient();
    expect(a).not.toBe(b);
    expect(a).toBeInstanceOf(QueryClient);
  });
});

describe("getQueryClient — client branch (isServer=false)", () => {
  it("returns the same QueryClient on every call (singleton)", async () => {
    vi.resetModules();
    vi.doMock("@tanstack/react-query", async () => {
      const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
        "@tanstack/react-query",
      );
      return { ...actual, isServer: false };
    });
    const { getQueryClient } = await import("../../src/lib/get-query-client");
    const a = getQueryClient();
    const b = getQueryClient();
    expect(a).toBe(b); // singleton — same reference on repeated calls
  });
});

describe("getQueryClient — module shape (universal, no server-only guard)", () => {
  it("module has no `import 'server-only'` (universal module)", () => {
    // Static check: the file should NOT begin with `import "server-only"`.
    // This module is imported by BOTH server components and client
    // components (QueryProvider), so a `server-only` guard would break
    // the client build. The isolation is enforced at runtime by the
    // `isServer` branch inside getQueryClient() instead.
    const src = readFileSync(
      path.resolve(process.cwd(), "src/lib/get-query-client.ts"),
      "utf8",
    );
    expect(src.startsWith('import "server-only"')).toBe(false);
  });
});
