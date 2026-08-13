export type WeatherConditionKey =
  | "clear"
  | "partlyCloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "freezingRain"
  | "snow"
  | "thunderstorm"
  | "unknown";

export interface WeatherData {
  temperature: number;
  conditionKey: WeatherConditionKey;
  icon: string;
  timezoneLabel: string;
  updatedAt: Date;
  location?: {
    name: string;
    region: string;
    country: string;
    tzId: string;
    localTime?: Date;
    lat: number;
    lon: number;
  };
}

export interface WeatherState {
  status: "idle" | "loading" | "ready" | "error";
  data?: WeatherData;
  error?: string;
}

export interface LocationData {
  name: string;
  region: string;
  country: string;
  tzId: string;
  lat: number;
  lon: number;
  timezoneLabel?: string;
}

export interface LocationState {
  status: "idle" | "loading" | "ready" | "error";
  data?: LocationData;
  error?: string;
}

export interface AnimeQuoteData {
  content: string;
  character: string;
  show: string;
}

export interface AnimeQuoteState {
  status: "idle" | "loading" | "ready" | "error";
  data?: AnimeQuoteData;
  error?: string;
}
