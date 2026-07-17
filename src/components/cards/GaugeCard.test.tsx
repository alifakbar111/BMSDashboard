// @vitest-environment jsdom
/* eslint-disable no-unused-vars -- vi/render/cleanup/QueryClient/QueryClientProvider
   are used by the rendering tests appended in Task 3 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { computeGaugeFractions } from "@/components/cards/GaugeCard";

describe("computeGaugeFractions", () => {
  it("maps a value at min to fraction 0", () => {
    const { fraction, targetFraction } = computeGaugeFractions({
      value: 0,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(0);
    expect(targetFraction).toBe(75);
  });

  it("maps a value at max to fraction 100", () => {
    const { fraction } = computeGaugeFractions({
      value: 100,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(100);
  });

  it("maps a midpoint value to 50", () => {
    const { fraction } = computeGaugeFractions({
      value: 50,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(50);
  });

  it("handles a non-zero min", () => {
    const { fraction, targetFraction } = computeGaugeFractions({
      value: 50,
      min: 20,
      max: 60,
      target: 40,
    });
    // (50-20)/(60-20) = 0.75 → 75
    expect(fraction).toBe(75);
    // (40-20)/(60-20) = 0.5 → 50
    expect(targetFraction).toBe(50);
  });

  it("clamps a value above max to 100", () => {
    const { fraction } = computeGaugeFractions({
      value: 9999,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(100);
  });

  it("clamps a value below min to 0", () => {
    const { fraction } = computeGaugeFractions({
      value: -50,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(0);
  });

  it("returns 0 for fraction when min === max (range guard)", () => {
    const { fraction, targetFraction } = computeGaugeFractions({
      value: 50,
      min: 50,
      max: 50,
      target: 50,
    });
    // NaN produced by (50-50)/(50-50) → both fall back to 0
    expect(fraction).toBe(0);
    expect(targetFraction).toBe(0);
  });

  it("returns 0 for fraction when value is non-finite", () => {
    const { fraction } = computeGaugeFractions({
      value: Number.NaN,
      min: 0,
      max: 100,
      target: 75,
    });
    expect(fraction).toBe(0);
  });
});
