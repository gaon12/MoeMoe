import { describe, expect, it } from "vitest";
import {
  convertFromCelsius,
  formatTemperature,
  TEMPERATURE_UNIT_SYMBOLS,
} from "./temperature.ts";

describe("convertFromCelsius", () => {
  it("passes Celsius through untouched", () => {
    expect(convertFromCelsius(21.4, "celsius")).toBe(21.4);
    expect(convertFromCelsius(-40, "celsius")).toBe(-40);
  });

  it("converts the reference points to Fahrenheit", () => {
    expect(convertFromCelsius(0, "fahrenheit")).toBe(32);
    expect(convertFromCelsius(100, "fahrenheit")).toBe(212);
    expect(convertFromCelsius(37, "fahrenheit")).toBeCloseTo(98.6);
  });

  it("agrees with Celsius at the crossover point", () => {
    expect(convertFromCelsius(-40, "fahrenheit")).toBe(-40);
  });
});

describe("formatTemperature", () => {
  it("rounds for display and reports the matching symbol", () => {
    expect(formatTemperature(21.4, "celsius")).toEqual({
      value: 21,
      symbol: TEMPERATURE_UNIT_SYMBOLS.celsius,
    });
    expect(formatTemperature(21.6, "celsius")).toEqual({
      value: 22,
      symbol: TEMPERATURE_UNIT_SYMBOLS.celsius,
    });
  });

  it("rounds after converting, not before", () => {
    // 21.4C is 70.52F. Rounding first would report 70F from 21C.
    expect(formatTemperature(21.4, "fahrenheit").value).toBe(71);
  });

  it("keeps negative temperatures on the right side of zero", () => {
    expect(formatTemperature(-17.8, "fahrenheit").value).toBe(0);
    expect(formatTemperature(-20, "fahrenheit").value).toBe(-4);
  });
});
