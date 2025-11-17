import { type AppSettings } from '../types/settings';

export interface FormattedTimeParts {
  time: string;
  ampmText: string | null;
  ampmPosition: 'before' | 'after';
}

export function getFormattedTimeParts(date: Date, settings: AppSettings, language: string): FormattedTimeParts {
  const rawHours = date.getHours();
  let hours = rawHours;
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  if (!settings.use24Hour) {
    hours = hours % 12 || 12;
  }

  const hoursStr = hours.toString().padStart(2, '0');
  const timeBase = `${hoursStr}:${minutes}`;
  const time = settings.showSeconds ? `${timeBase}:${seconds}` : timeBase;

  let ampmText: string | null = null;
  if (!settings.use24Hour && settings.showAmPm) {
    const isPM = rawHours >= 12;
    if (language === 'ko') {
      ampmText = settings.amPmStyle === 'latin' ? (isPM ? 'PM' : 'AM') : isPM ? '오후' : '오전';
    } else if (language === 'ja') {
      ampmText = settings.amPmStyle === 'latin' ? (isPM ? 'PM' : 'AM') : isPM ? '午後' : '午前';
    } else {
      ampmText = isPM ? 'PM' : 'AM';
    }
  }

  return {
    time,
    ampmText,
    ampmPosition: settings.amPmPosition,
  };
}

export function getFullDateString(date: Date, language: string): string {
  const locale = language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : 'en-US';
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString(locale, options);
}

export function getDateParts(date: Date, language: string) {
  const locale = language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : 'en-US';
  const weekday = date.toLocaleDateString(locale, { weekday: 'long' });
  const monthDay = date.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
  const year = date.toLocaleDateString(locale, { year: 'numeric' });
  return { weekday, monthDay, year };
}
