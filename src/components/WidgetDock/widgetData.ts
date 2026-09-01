import { useEffect, useState } from "react";
import { fetchWithTimeout } from "../../utils/fetchWithTimeout.ts";
import { getSafeHttpsUrl } from "../../utils/safeUrl.ts";
import type {
  LocationData,
  LocationState,
  WeatherConditionKey,
  WeatherData,
  WeatherState,
} from "./widgetTypes.ts";

interface Coordinates {
  latitude: number;
  longitude: number;
}
type ReverseGeocodeResult = {
  name?: string;
  region: string;
  country: string;
} | null;

type JsonRecord = Record<string, unknown>;

const MIN_TEMPERATURE_C = -100;
const MAX_TEMPERATURE_C = 70;
const MAX_TEXT_LENGTH = 200;

let coordinatesRequest: Promise<Coordinates> | null = null;
const reverseGeocodeRequests = new Map<string, Promise<ReverseGeocodeResult>>();

function useWeatherData(shouldFetch: boolean, apiKey: string): WeatherState {
  // 현재 날씨 위젯의 상태를 관리한다.
  const [state, setState] = useState<WeatherState>({
    status: shouldFetch ? "loading" : "idle",
  });

  useEffect(() => {
    // 데이터를 가져올 필요가 없는 경우 → idle 상태로 전환
    if (!shouldFetch) {
      setState({ status: "idle" });
      return;
    }

    // API 키가 없으면 에러 상태로 전환
    if (!apiKey) {
      setState({
        status: "error",
        error: "WeatherAPI key missing",
      });
      return;
    }

    let cancelled = false;

    // 실제 날씨 데이터를 가져오는 비동기 함수
    const fetchWeather = async () => {
      // 로딩 상태로 설정
      setState({ status: "loading" });

      try {
        // 브라우저의 위치 정보를 가져온다. 실패 시 DEFAULT_COORDS를 사용한다.
        const coords = await getCoordinates();
        if (cancelled) {
          return;
        }

        // 날씨 API와 역지오코딩 API를 병렬로 호출한다.
        const [weatherData, reverseInfo] = await Promise.all([
          fetchWeatherApi(coords, apiKey),
          reverseGeocode(coords),
        ]);
        if (cancelled) {
          return;
        }

        // 역지오코딩 정보가 있으면 날씨 데이터의 location 정보를 보완한다.
        const mergedLocation = weatherData.location;
        if (mergedLocation && reverseInfo) {
          mergedLocation.name = reverseInfo.name ?? mergedLocation.name;
          mergedLocation.region = reverseInfo.region ?? mergedLocation.region;
          mergedLocation.country =
            reverseInfo.country ?? mergedLocation.country;
        }

        // 최종적으로 ready 상태와 데이터를 설정한다.
        setState({ status: "ready", data: weatherData });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          error: error instanceof Error ? error.message : "Weather error",
        });
      }
    };

    // 비동기 함수 실행
    fetchWeather();

    // 이 이펙트가 정리될 때(의존성이 바뀌거나 언마운트될 때) cancel 플래그를 세팅한다.
    return () => {
      cancelled = true;
    };
  }, [shouldFetch, apiKey]);

  return state;
}

/**
 * 현재 위치 정보를 가져오는 커스텀 훅
 * - WeatherAPI 키 없이도 동작하며, 브라우저 위치 권한 → IP 기반 → 기본 좌표 순으로 시도한다.
 */
function useLocationData(shouldFetch: boolean): LocationState {
  const [state, setState] = useState<LocationState>({
    status: shouldFetch ? "loading" : "idle",
  });

  useEffect(() => {
    if (!shouldFetch) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;

    const fetchLocation = async () => {
      setState({ status: "loading" });

      try {
        const coords = await getCoordinates();
        if (cancelled) {
          return;
        }

        const reverseInfo = await reverseGeocode(coords);
        if (cancelled) {
          return;
        }

        const resolvedTimeZone =
          typeof Intl === "undefined"
            ? ""
            : (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");

        const data: LocationData = {
          name: reverseInfo?.name ?? "Location",
          region: reverseInfo?.region ?? "",
          country: reverseInfo?.country ?? "",
          tzId: resolvedTimeZone,
          lat: coords.latitude,
          lon: coords.longitude,
          timezoneLabel: resolvedTimeZone || "Local time",
        };

        setState({ status: "ready", data });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          error: error instanceof Error ? error.message : "Location error",
        });
      }
    };

    fetchLocation();
    return () => {
      cancelled = true;
    };
  }, [shouldFetch]);

  return state;
}

/**
 * WeatherAPI.com에서 현재 날씨 데이터를 가져오는 함수
 */
async function fetchWeatherApi(
  coords: { latitude: number; longitude: number },
  apiKey: string,
): Promise<WeatherData> {
  const query = `${coords.latitude},${coords.longitude}`;
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    aqi: "no",
  });

  const response = await fetchWithTimeout(
    `https://api.weatherapi.com/v1/current.json?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`WeatherAPI error: ${response.status}`);
  }

  const data: unknown = await response.json();
  return parseWeatherApiResponse(data, new Date());
}

function parseWeatherApiResponse(value: unknown, updatedAt: Date): WeatherData {
  const data = requireRecord(value, "WeatherAPI response");
  const current = requireRecord(data.current, "WeatherAPI current data");
  const condition = requireRecord(
    current.condition,
    "WeatherAPI condition data",
  );
  const apiLocation = requireRecord(data.location, "WeatherAPI location data");

  const temperature = requireNumber(current.temp_c, "Weather temperature");
  if (temperature < MIN_TEMPERATURE_C || temperature > MAX_TEMPERATURE_C) {
    throw new Error("Weather temperature is outside the supported range");
  }

  const conditionCode = requireInteger(
    condition.code,
    "Weather condition code",
  );
  if (conditionCode < 0 || conditionCode > 9999) {
    throw new Error("Weather condition code is outside the supported range");
  }

  const coordinates = parseCoordinatePair(apiLocation.lat, apiLocation.lon);
  if (!coordinates) {
    throw new Error("Weather location coordinates are invalid");
  }

  const conditionKey = mapWeatherCode(conditionCode);
  const icon = WEATHER_ICONS[conditionKey] ?? WEATHER_ICONS.unknown;
  const tzId = readOptionalString(apiLocation.tz_id, "Weather timezone");
  const localTimeEpoch = readOptionalNumber(
    apiLocation.localtime_epoch,
    "Weather local time",
  );
  const localTime = parseEpochSeconds(localTimeEpoch);

  if (!Number.isFinite(updatedAt.getTime())) {
    throw new Error("Weather update time is invalid");
  }

  return {
    temperature,
    conditionKey,
    icon,
    timezoneLabel: formatTimezoneLabel(tzId),
    updatedAt,
    location: {
      name:
        readOptionalString(apiLocation.name, "Weather location name") ||
        "Location",
      region: readOptionalString(apiLocation.region, "Weather region"),
      country: readOptionalString(apiLocation.country, "Weather country"),
      tzId,
      localTime,
      lat: coordinates.latitude,
      lon: coordinates.longitude,
    },
  };
}

/**
 * OpenStreetMap Nominatim API를 사용하여 위도/경도로부터 대략적인 주소를 가져오는 함수
 * - name, region, country 정도만 사용한다.
 */
function reverseGeocode(coords: Coordinates) {
  const validCoordinates = parseCoordinatePair(
    coords.latitude,
    coords.longitude,
  );
  if (!validCoordinates) {
    return Promise.resolve(null);
  }

  const cacheKey = `${validCoordinates.latitude.toFixed(4)},${validCoordinates.longitude.toFixed(4)}`;
  const cachedRequest = reverseGeocodeRequests.get(cacheKey);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = requestReverseGeocode(validCoordinates).catch(() => null);
  reverseGeocodeRequests.set(cacheKey, request);
  request.then((result) => {
    if (result === null && reverseGeocodeRequests.get(cacheKey) === request) {
      reverseGeocodeRequests.delete(cacheKey);
    }
  });
  return request;
}

async function requestReverseGeocode(
  coords: Coordinates,
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: coords.latitude.toString(),
    lon: coords.longitude.toString(),
    zoom: "10",
    addressdetails: "1",
    email: "support@moemoe.app",
  });

  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Reverse geocode error: ${response.status}`);
  }

  const data: unknown = await response.json();
  return parseReverseGeocodeResponse(data);
}

function parseReverseGeocodeResponse(
  value: unknown,
): Exclude<ReverseGeocodeResult, null> {
  const data = requireRecord(value, "Reverse geocode response");
  const coordinates = parseCoordinatePair(
    parseNumericValue(data.lat),
    parseNumericValue(data.lon),
  );
  if (!coordinates) {
    throw new Error("Reverse geocode coordinates are invalid");
  }
  const address = requireRecord(data.address, "Reverse geocode address");
  const displayName = readOptionalString(
    data.display_name,
    "Reverse geocode display name",
  );

  const primaryName = firstNonEmptyString([
    readOptionalString(data.name, "Reverse geocode name"),
    readOptionalString(address.city, "Reverse geocode city"),
    readOptionalString(address.town, "Reverse geocode town"),
    readOptionalString(address.village, "Reverse geocode village"),
    readOptionalString(address.hamlet, "Reverse geocode hamlet"),
    readOptionalString(address.suburb, "Reverse geocode suburb"),
    displayName.split(",")[0]?.trim() ?? "",
  ]);
  const region = firstNonEmptyString([
    readOptionalString(address.state, "Reverse geocode state"),
    readOptionalString(address.county, "Reverse geocode county"),
  ]);
  const country = readOptionalString(
    address.country,
    "Reverse geocode country",
  );

  if (!(primaryName || region || country)) {
    throw new Error("Reverse geocode response did not include an address");
  }

  return {
    name: primaryName || undefined,
    region,
    country,
  };
}

/** WeatherAPI condition code를 UI에서 사용하는 상태 키로 변환한다. */
function mapWeatherCode(code: number): WeatherConditionKey {
  if (code === 1000) {
    return "clear";
  }
  if (code === 1003) {
    return "partlyCloudy";
  }
  if ([1006, 1009].includes(code)) {
    return "cloudy";
  }
  if ([1030, 1135, 1147].includes(code)) {
    return "fog";
  }
  if ([1150, 1153, 1168, 1171, 1180, 1183].includes(code)) {
    return "drizzle";
  }
  if ([1063, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
    return "rain";
  }
  if ([1069, 1072, 1198, 1201, 1204, 1207, 1249, 1252].includes(code)) {
    return "freezingRain";
  }
  if (
    [
      1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1255, 1258,
      1261, 1264,
    ].includes(code)
  ) {
    return "snow";
  }
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
    return "thunderstorm";
  }
  return "unknown";
}

/**
 * 날씨 상태에 사용할 간단한 이모지 아이콘 매핑
 */
const WEATHER_ICONS: Record<WeatherConditionKey, string> = {
  clear: "☀️",
  partlyCloudy: "🌤️",
  cloudy: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  freezingRain: "🌧️",
  snow: "❄️",
  thunderstorm: "⛈️",
  unknown: "❔",
};

/**
 * 타임존 문자열을 좀 더 보기 좋은 형태로 변환하는 함수
 * 예: "Asia/Seoul" → "Asia · Seoul"
 */
function formatTimezoneLabel(tz?: string) {
  if (!tz || typeof tz !== "string") {
    return "UTC";
  }
  return tz.replace(/_/g, " ").replace(/\//g, " · ");
}

function formatLocationLocalTime(
  currentTime: Date,
  language: string,
  timeZone: string,
): string {
  if (!Number.isFinite(currentTime.getTime())) {
    return "";
  }

  const normalizedLanguage = language.toLowerCase();
  let locale = "en-US";
  if (normalizedLanguage.startsWith("ko")) {
    locale = "ko-KR";
  } else if (normalizedLanguage.startsWith("ja")) {
    locale = "ja-JP";
  }
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };

  try {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    }).format(currentTime);
  } catch {
    return new Intl.DateTimeFormat(locale, options).format(currentTime);
  }
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  const number = requireNumber(value, label);
  if (!Number.isInteger(number)) {
    throw new Error(`${label} must be an integer`);
  }
  return number;
}

function readOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return requireNumber(value, label);
}

function readOptionalString(value: unknown, label: string): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

function firstNonEmptyString(values: readonly string[]): string {
  return values.find(Boolean) ?? "";
}

function parseEpochSeconds(value: number | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Weather local time must be a positive Unix timestamp");
  }

  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Weather local time is outside the supported range");
  }
  return date;
}

function parseCoordinatePair(
  latitudeValue: unknown,
  longitudeValue: unknown,
): Coordinates | null {
  if (
    typeof latitudeValue !== "number" ||
    typeof longitudeValue !== "number" ||
    !Number.isFinite(latitudeValue) ||
    !Number.isFinite(longitudeValue) ||
    latitudeValue < -90 ||
    latitudeValue > 90 ||
    longitudeValue < -180 ||
    longitudeValue > 180
  ) {
    return null;
  }
  return { latitude: latitudeValue, longitude: longitudeValue };
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseIpCoordinates(value: unknown): Coordinates | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const data = value as JsonRecord;

  if (typeof data.loc === "string") {
    const parts = data.loc.split(",");
    if (parts.length === 2) {
      const latitude = parseNumericValue(parts[0]);
      const longitude = parseNumericValue(parts[1]);
      const coordinates = parseCoordinatePair(latitude, longitude);
      if (coordinates) {
        return coordinates;
      }
    }
  }

  const latitude = parseNumericValue(data.latitude ?? data.lat);
  const longitude = parseNumericValue(data.longitude ?? data.lon);
  return parseCoordinatePair(latitude, longitude);
}

/**
 * 브라우저의 Geolocation API를 사용하여 현재 좌표를 가져온다.
 * - 우선 사용자에게 권한을 요청하여 실제 위치를 사용한다.
 * - 권한을 얻지 못하거나 실패한 경우, IP 기반 역지오코딩 API를 사용해 대략적인 위치를 얻는다.
 * - 둘 다 실패하면 잘못된 기본 위치를 보여 주지 않고 원인을 포함한 오류를 반환한다.
 */
function getCoordinates(): Promise<Coordinates> {
  if (!coordinatesRequest) {
    coordinatesRequest = resolveCoordinates().catch((error) => {
      coordinatesRequest = null;
      throw error;
    });
  }
  return coordinatesRequest;
}

async function resolveCoordinates(): Promise<Coordinates> {
  // 1) Geolocation API 시도
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const geoPosition = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            { enableHighAccuracy: false, timeout: 5000 },
          );
        },
      );

      const coordinates = parseCoordinatePair(
        geoPosition.coords.latitude,
        geoPosition.coords.longitude,
      );
      if (!coordinates) {
        throw new Error("Browser location is invalid");
      }
      return coordinates;
    } catch {
      // 무시하고 다음 단계(IP 기반)로 진행
    }
  }

  // 2) IP 기반 역지오코딩 API 시도
  try {
    const rawIpApiBase = getSafeHttpsUrl(
      import.meta.env.VITE_IP_REVERSE_GEOCODING_API_URL,
    );

    if (rawIpApiBase) {
      // .env에는 https://ipinfo.io/ 와 같이 기본 URL만 넣고,
      // 실제 요청은 /json을 붙여서 보낸다.
      let ipApiUrl = rawIpApiBase;
      // 끝에 /가 여러 개 붙어 있어도 하나만 제거
      while (ipApiUrl.endsWith("/")) {
        ipApiUrl = ipApiUrl.slice(0, -1);
      }
      if (!ipApiUrl.toLowerCase().endsWith("/json")) {
        ipApiUrl = `${ipApiUrl}/json`;
      }

      const response = await fetchWithTimeout(ipApiUrl, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`IP geolocation error: ${response.status}`);
      }

      const data: unknown = await response.json();
      const coordinates = parseIpCoordinates(data);
      if (coordinates) {
        return coordinates;
      }

      throw new Error("IP geolocation response did not include coordinates");
    }
  } catch {
    // 실제 위치나 IP 조회 실패는 호출자에게 통합된 오류로 전달한다.
  }

  throw new Error(
    "Location unavailable: allow browser location access or configure VITE_IP_REVERSE_GEOCODING_API_URL",
  );
}

export {
  formatLocationLocalTime,
  parseIpCoordinates,
  parseReverseGeocodeResponse,
  parseWeatherApiResponse,
  reverseGeocode,
  useLocationData,
  useWeatherData,
};
export type { Coordinates };
