import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatLocationLocalTime,
  parseIpCoordinates,
  parseReverseGeocodeResponse,
  parseWeatherApiResponse,
  reverseGeocode,
} from "./widgetData.ts";

const VALID_WEATHER_RESPONSE = {
  current: {
    condition: { code: 1000 },
    temp_c: 21.5,
  },
  location: {
    country: "South Korea",
    lat: 37.57,
    localtime_epoch: 1_775_000_000,
    lon: 126.98,
    name: "Seoul",
    region: "Seoul",
    tz_id: "Asia/Seoul",
  },
};

const VALID_REVERSE_RESPONSE = {
  address: {
    city: "Seoul",
    country: "South Korea",
    state: "Seoul",
  },
  display_name: "Seoul, South Korea",
  lat: "37.57",
  lon: "126.98",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("parseWeatherApiResponse", () => {
  it("parses a structurally valid weather payload", () => {
    const updatedAt = new Date("2026-08-13T00:00:00.000Z");

    expect(parseWeatherApiResponse(VALID_WEATHER_RESPONSE, updatedAt)).toEqual({
      conditionKey: "clear",
      icon: "☀️",
      location: {
        country: "South Korea",
        lat: 37.57,
        localTime: new Date(1_775_000_000_000),
        lon: 126.98,
        name: "Seoul",
        region: "Seoul",
        tzId: "Asia/Seoul",
      },
      temperature: 21.5,
      timezoneLabel: "Asia · Seoul",
      updatedAt,
    });
  });

  it.each([
    ["an empty response", {}],
    [
      "a missing temperature",
      { ...VALID_WEATHER_RESPONSE, current: { condition: { code: 1000 } } },
    ],
    [
      "an impossible temperature",
      {
        ...VALID_WEATHER_RESPONSE,
        current: { condition: { code: 1000 }, temp_c: 500 },
      },
    ],
    [
      "out-of-range coordinates",
      {
        ...VALID_WEATHER_RESPONSE,
        location: { ...VALID_WEATHER_RESPONSE.location, lat: 91 },
      },
    ],
  ])("rejects %s instead of displaying fallback weather", (_name, value) => {
    expect(() =>
      parseWeatherApiResponse(value, new Date("2026-08-13T00:00:00.000Z")),
    ).toThrow();
  });
});

describe("external location response parsing", () => {
  it("accepts bounded coordinates from supported IP response shapes", () => {
    expect(parseIpCoordinates({ loc: "37.57,126.98" })).toEqual({
      latitude: 37.57,
      longitude: 126.98,
    });
    expect(
      parseIpCoordinates({ latitude: "35.18", longitude: 129.08 }),
    ).toEqual({
      latitude: 35.18,
      longitude: 129.08,
    });
  });

  it.each([
    {},
    { loc: "," },
    { loc: "91,126.98" },
    { latitude: 37.57, longitude: -181 },
    { latitude: Number.NaN, longitude: 126.98 },
  ])("rejects malformed or out-of-range IP coordinates", (value) => {
    expect(parseIpCoordinates(value)).toBeNull();
  });

  it("validates and normalizes reverse-geocode address data", () => {
    expect(parseReverseGeocodeResponse(VALID_REVERSE_RESPONSE)).toEqual({
      country: "South Korea",
      name: "Seoul",
      region: "Seoul",
    });
    expect(() => parseReverseGeocodeResponse({})).toThrow(
      "Reverse geocode coordinates are invalid",
    );
    expect(() =>
      parseReverseGeocodeResponse({
        address: { city: 123 },
        lat: "37.57",
        lon: "126.98",
      }),
    ).toThrow("Reverse geocode city must be a string");
    expect(() =>
      parseReverseGeocodeResponse({
        ...VALID_REVERSE_RESPONSE,
        lat: "91",
      }),
    ).toThrow("Reverse geocode coordinates are invalid");
  });
});

describe("reverse-geocode request cache", () => {
  it("evicts a null result so a later request can recover", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(VALID_REVERSE_RESPONSE), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const coordinates = { latitude: 37.5712, longitude: 126.9912 };

    await expect(reverseGeocode(coordinates)).resolves.toBeNull();
    await expect(reverseGeocode(coordinates)).resolves.toMatchObject({
      country: "South Korea",
      name: "Seoul",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent successful requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(VALID_REVERSE_RESPONSE), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const coordinates = { latitude: 35.1812, longitude: 129.0812 };

    const [first, second] = await Promise.all([
      reverseGeocode(coordinates),
      reverseGeocode(coordinates),
    ]);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("formatLocationLocalTime", () => {
  it("formats the supplied live clock value instead of a location snapshot", () => {
    const first = formatLocationLocalTime(
      new Date("2026-08-13T00:00:00.000Z"),
      "en",
      "UTC",
    );
    const second = formatLocationLocalTime(
      new Date("2026-08-13T00:01:00.000Z"),
      "en",
      "UTC",
    );

    expect(first).not.toBe(second);
  });
});
