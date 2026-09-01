const FAHRENHEIT_RATIO = 9 / 5;
const FAHRENHEIT_OFFSET = 32;

/**
 * Weather providers are read in Celsius and stored that way throughout the
 * application, so this is the only place a display unit is applied.
 */
export function convertFromCelsius(
  celsius: number,
  unit: TemperatureUnit,
): number {
  return unit === "fahrenheit"
    ? celsius * FAHRENHEIT_RATIO + FAHRENHEIT_OFFSET
    : celsius;
}

export function formatTemperature(
  celsius: number,
  unit: TemperatureUnit,
): { value: number; symbol: string } {
  const rounded = Math.round(convertFromCelsius(celsius, unit));
  return {
    // Rounding a small negative value yields -0. It stringifies as "0" so
    // nothing is shown wrong, but returning it would leak an oddity into
    // every equality check downstream.
    value: rounded === 0 ? 0 : rounded,
    symbol: TEMPERATURE_UNIT_SYMBOLS[unit],
  };
}

/** Display units offered for the weather widget. */
export const TEMPERATURE_UNITS = ["celsius", "fahrenheit"] as const;

export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];

export const TEMPERATURE_UNIT_SYMBOLS: Record<TemperatureUnit, string> = {
  celsius: "°C",
  fahrenheit: "°F",
};
