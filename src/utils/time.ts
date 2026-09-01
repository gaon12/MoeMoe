import type { AppSettings } from "../types/settings.ts";

interface FormattedTimeParts {
  time: string;
  ampmText: string | null;
  ampmPosition: "before" | "after";
}

function getFormattedTimeParts(
  date: Date,
  settings: AppSettings,
  language: string,
): FormattedTimeParts {
  const rawHours = date.getHours();
  let hours = rawHours;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  if (!settings.use24Hour) {
    hours = hours % 12 || 12;
  }

  const hoursStr = hours.toString().padStart(2, "0");
  const timeBase = `${hoursStr}:${minutes}`;
  const time = settings.showSeconds ? `${timeBase}:${seconds}` : timeBase;

  let ampmText: string | null = null;
  if (!settings.use24Hour && settings.showAmPm) {
    const isPm = rawHours >= 12;
    const latinAmPm = isPm ? "PM" : "AM";
    if (language === "ko") {
      const localizedAmPm = isPm ? "오후" : "오전";
      ampmText = settings.amPmStyle === "latin" ? latinAmPm : localizedAmPm;
    } else if (language === "ja") {
      const localizedAmPm = isPm ? "午後" : "午前";
      ampmText = settings.amPmStyle === "latin" ? latinAmPm : localizedAmPm;
    } else {
      ampmText = latinAmPm;
    }
  }

  return {
    time,
    ampmText,
    ampmPosition: settings.amPmPosition,
  };
}

function getFullDateString(date: Date, language: string): string {
  const locale = resolveLocale(language);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(locale, options);
}

function getDateParts(date: Date, language: string) {
  const locale = resolveLocale(language);
  const weekday = date.toLocaleDateString(locale, { weekday: "long" });
  const monthDay = date.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
  });
  const year = date.toLocaleDateString(locale, { year: "numeric" });
  return { weekday, monthDay, year };
}

function resolveLocale(language: string): string {
  if (language === "ko") {
    return "ko-KR";
  }
  if (language === "ja") {
    return "ja-JP";
  }
  return "en-US";
}

export { getDateParts, getFormattedTimeParts, getFullDateString };
export type { FormattedTimeParts };
