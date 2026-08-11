import { useEffect, useRef, useState } from "react";
import { fetchWithTimeout } from "../../utils/fetchWithTimeout";
import { getSafeHttpsUrl } from "../../utils/safeUrl";
import type {
  LocationData,
  LocationState,
  WeatherConditionKey,
  WeatherData,
  WeatherState,
} from "./widgetTypes";

type Coordinates = { latitude: number; longitude: number };
type ReverseGeocodeResult = {
  name?: string;
  region: string;
  country: string;
} | null;

let coordinatesRequest: Promise<Coordinates> | null = null;
const reverseGeocodeRequests = new Map<string, Promise<ReverseGeocodeResult>>();

export function useWeatherData(
  shouldFetch: boolean,
  apiKey: string,
): WeatherState {
  // 현재 날씨 위젯의 상태를 관리한다.
  const [state, setState] = useState<WeatherState>({
    status: shouldFetch ? "loading" : "idle",
  });

  // 컴포넌트가 마운트되어 있는지 추적하기 위한 ref
  const mountedRef = useRef(false);

  // 마운트 시 true, 언마운트 시 false로 설정하여 StrictMode에서도 정확한 상태를 유지한다.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // 데이터를 가져올 필요가 없는 경우 → idle 상태로 전환
    if (!shouldFetch) {
      if (!mountedRef.current) return;
      setState({ status: "idle" });
      return;
    }

    // API 키가 없으면 에러 상태로 전환
    if (!apiKey) {
      if (!mountedRef.current) return;
      setState({
        status: "error",
        error: "WeatherAPI key missing",
      });
      return;
    }

    let cancelled = false;

    // 실제 날씨 데이터를 가져오는 비동기 함수
    const fetchWeather = async () => {
      // 언마운트된 경우에는 setState를 호출하지 않도록 방지
      if (!mountedRef.current) return;

      // 로딩 상태로 설정
      setState({ status: "loading" });

      try {
        // 브라우저의 위치 정보를 가져온다. 실패 시 DEFAULT_COORDS를 사용한다.
        const coords = await getCoordinates();
        if (cancelled || !mountedRef.current) return;

        // 날씨 API와 역지오코딩 API를 병렬로 호출한다.
        const [weatherData, reverseInfo] = await Promise.all([
          fetchWeatherApi(coords, apiKey),
          reverseGeocode(coords),
        ]);
        if (cancelled || !mountedRef.current) return;

        // 역지오코딩 정보가 있으면 날씨 데이터의 location 정보를 보완한다.
        const mergedLocation = weatherData.location;
        if (mergedLocation && reverseInfo) {
          mergedLocation.name = reverseInfo.name ?? mergedLocation.name;
          mergedLocation.region = reverseInfo.region ?? mergedLocation.region;
          mergedLocation.country =
            reverseInfo.country ?? mergedLocation.country;
        }

        if (!mountedRef.current) return;

        // 최종적으로 ready 상태와 데이터를 설정한다.
        setState({ status: "ready", data: weatherData });
      } catch (error) {
        if (cancelled || !mountedRef.current) return;
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
export function useLocationData(shouldFetch: boolean): LocationState {
  const [state, setState] = useState<LocationState>({
    status: shouldFetch ? "loading" : "idle",
  });

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldFetch) {
      if (!mountedRef.current) return;
      setState({ status: "idle" });
      return;
    }

    const fetchLocation = async () => {
      if (!mountedRef.current) return;
      setState({ status: "loading" });

      try {
        const coords = await getCoordinates();
        if (!mountedRef.current) return;

        const reverseInfo = await reverseGeocode(coords);

        const resolvedTimeZone =
          typeof Intl !== "undefined"
            ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "")
            : "";

        const now = new Date();

        const data: LocationData = {
          name: reverseInfo?.name ?? "Location",
          region: reverseInfo?.region ?? "",
          country: reverseInfo?.country ?? "",
          tzId: resolvedTimeZone,
          localTime: now,
          lat: coords.latitude,
          lon: coords.longitude,
          timezoneLabel: resolvedTimeZone || "Local time",
        };

        if (!mountedRef.current) return;
        setState({ status: "ready", data });
      } catch (error) {
        if (!mountedRef.current) return;
        setState({
          status: "error",
          error: error instanceof Error ? error.message : "Location error",
        });
      }
    };

    fetchLocation();
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

  const data = await response.json();

  const conditionCode: number = data?.current?.condition?.code ?? 1000;
  const conditionKey = mapWeatherCode(conditionCode);
  const icon = WEATHER_ICONS[conditionKey] ?? WEATHER_ICONS.unknown;
  const timezoneLabel = formatTimezoneLabel(data?.location?.tz_id);

  const location = data?.location
    ? {
        name: data.location.name ?? "Location",
        region: data.location.region ?? "",
        country: data.location.country ?? "",
        tzId: data.location.tz_id ?? "",
        localTime: data.location.localtime_epoch
          ? new Date(data.location.localtime_epoch * 1000)
          : undefined,
        lat:
          typeof data.location.lat === "number"
            ? data.location.lat
            : coords.latitude,
        lon:
          typeof data.location.lon === "number"
            ? data.location.lon
            : coords.longitude,
      }
    : {
        name: "Location",
        region: "",
        country: "",
        tzId: "",
        localTime: undefined,
        lat: coords.latitude,
        lon: coords.longitude,
      };

  return {
    temperature:
      typeof data?.current?.temp_c === "number" ? data.current.temp_c : 0,
    conditionKey,
    icon,
    timezoneLabel,
    updatedAt: new Date(),
    location,
  };
}

/**
 * OpenStreetMap Nominatim API를 사용하여 위도/경도로부터 대략적인 주소를 가져오는 함수
 * - name, region, country 정도만 사용한다.
 */
function reverseGeocode(coords: Coordinates) {
  const cacheKey = `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;
  const cachedRequest = reverseGeocodeRequests.get(cacheKey);
  if (cachedRequest) return cachedRequest;

  const request = requestReverseGeocode(coords).catch((error) => {
    reverseGeocodeRequests.delete(cacheKey);
    throw error;
  });
  reverseGeocodeRequests.set(cacheKey, request);
  return request;
}

async function requestReverseGeocode(
  coords: Coordinates,
): Promise<ReverseGeocodeResult> {
  try {
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

    const data = await response.json();
    const address = data?.address ?? {};

    // 도시/마을/동 등 적당한 이름을 하나 골라서 name으로 사용한다.
    const primaryName =
      data?.name ||
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.suburb ||
      (typeof data?.display_name === "string"
        ? data.display_name.split(",")[0]?.trim()
        : undefined);

    return {
      name: primaryName,
      region: address.state || address.county || "",
      country: address.country || "",
    };
  } catch (error) {
    // 역지오코딩은 부가 정보이므로 실패해도 치명적이지 않다. 콘솔 경고만 남기고 null을 반환한다.
    console.warn("Reverse geocoding failed:", error);
    return null;
  }
}

/**
 * 애니 명대사(quote)를 가져오는 커스텀 훅
 * - shouldFetch: 애니 명대사 위젯이 실제로 활성화되어 있어 데이터를 가져올지 여부
 *
 * React 18 StrictMode에서도 안전하게 동작하도록 mountedRef를 정확히 관리한다.
 */
function mapWeatherCode(code: number): WeatherConditionKey {
  if (code === 1000) return "clear";
  if (code === 1003) return "partlyCloudy";
  if ([1006, 1009].includes(code)) return "cloudy";
  if ([1030, 1135, 1147].includes(code)) return "fog";
  if ([1150, 1153, 1168, 1171, 1180, 1183].includes(code)) return "drizzle";
  if ([1063, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
    return "rain";
  }
  if ([1069, 1072, 1198, 1201, 1204, 1207, 1249, 1252].includes(code))
    return "freezingRain";
  if (
    [
      1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1255, 1258,
      1261, 1264,
    ].includes(code)
  ) {
    return "snow";
  }
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return "thunderstorm";
  // 알 수 없는 코드는 기본적으로 흐림으로 처리한다.
  return "cloudy";
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
  if (!tz || typeof tz !== "string") return "UTC";
  return tz.replace(/_/g, " ").replace(/\//g, " · ");
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

      return {
        latitude: geoPosition.coords.latitude,
        longitude: geoPosition.coords.longitude,
      };
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

      const data = await response.json();
      // ipinfo.io 형식(lat, lon이 있는 loc 문자열 등)을 가정하되,
      // 안전하게 파싱하여 lat/lon을 얻는다.
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (typeof data?.loc === "string") {
        const [latStr, lonStr] = data.loc.split(",");
        const lat = Number(latStr);
        const lon = Number(lonStr);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          latitude = lat;
          longitude = lon;
        }
      }

      if (
        latitude == null ||
        longitude == null ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        // 다른 구조를 가진 API를 사용할 수도 있으니, 일반적인 lat/lon 필드도 시도한다.
        const lat =
          typeof data?.latitude === "number"
            ? data.latitude
            : Number(data?.latitude);
        const lon =
          typeof data?.longitude === "number"
            ? data.longitude
            : Number(data?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          latitude = lat;
          longitude = lon;
        }
      }

      if (
        latitude != null &&
        longitude != null &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        return { latitude, longitude };
      }

      throw new Error("IP geolocation response did not include coordinates");
    }
  } catch (error) {
    console.warn("IP-based reverse geocoding failed:", error);
  }

  throw new Error(
    "Location unavailable: allow browser location access or configure VITE_IP_REVERSE_GEOCODING_API_URL",
  );
}
