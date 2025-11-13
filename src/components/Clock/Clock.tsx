import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../contexts/AppContext';
import './Clock.css';

interface ClockProps {
  className?: string;
}

export const Clock: React.FC<ClockProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const { settings } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const offsetRef = useRef<number>(0); // server-client time offset in ms
  const syncTimerRef = useRef<number | null>(null);

  // Tick every second using current offset
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now() + offsetRef.current;
      setCurrentTime(new Date(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch server time and compute offset using round-trip midpoint
  const fetchServerTime = async () => {
    try {
      const baseUrl = import.meta.env.VITE_SERVER_TIME_API_URL as string | undefined;
      if (!baseUrl) return; // no API configured
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}${encodeURIComponent(tz)}`, { cache: 'no-store' });
      const t3 = Date.now();
      if (!res.ok) throw new Error('Failed to fetch server time');
      const data = await res.json();
      // Prefer timestamp (seconds with fraction), else iso8601, else datetime
      let serverMs: number | null = null;
      if (data && typeof data.timestamp === 'string') {
        const sec = parseFloat(data.timestamp);
        if (!Number.isNaN(sec)) serverMs = Math.round(sec * 1000);
      }
      if (serverMs == null && typeof data?.iso8601 === 'string') {
        const parsed = Date.parse(data.iso8601);
        if (!Number.isNaN(parsed)) serverMs = parsed;
      }
      if (serverMs == null && typeof data?.datetime === 'string') {
        const parsed = Date.parse(data.datetime.replace(' ', 'T'));
        if (!Number.isNaN(parsed)) serverMs = parsed;
      }
      if (serverMs == null) throw new Error('No valid time in response');
      const midpoint = (t0 + t3) / 2;
      offsetRef.current = serverMs - midpoint;
    } catch (err) {
      // On failure, fall back to local time (offset 0)
      console.error('Server time sync failed:', err);
      offsetRef.current = 0;
    }
  };

  // Manage server-time sync lifecycle
  useEffect(() => {
    // Clear previous sync timer if any
    if (syncTimerRef.current) {
      window.clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    // If using server time, sync now and schedule periodic resync
    if (settings.useServerTime) {
      fetchServerTime();
      const intervalMs = Math.max(5, settings.serverTimeUpdateIntervalSec) * 1000;
      syncTimerRef.current = window.setInterval(fetchServerTime, intervalMs);
    } else {
      offsetRef.current = 0;
    }
    return () => {
      if (syncTimerRef.current) {
        window.clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [settings.useServerTime, settings.serverTimeUpdateIntervalSec]);

  const formatTime = (date: Date): React.ReactNode => {
    const rawHours = date.getHours();
    let hours = rawHours;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    if (!settings.use24Hour) {
      hours = hours % 12 || 12;
    }

    const hoursStr = hours.toString().padStart(2, '0');
    const timeStrBase = `${hoursStr}:${minutes}`;
    const timeStr = settings.showSeconds ? `${timeStrBase}:${seconds}` : timeStrBase;

    // Build AM/PM label if needed
    let ampmEl: React.ReactNode | null = null;
    if (!settings.use24Hour && settings.showAmPm) {
      const isPM = rawHours >= 12;
      const lang = i18n.language;
      let period = 'AM';
      if (lang === 'ko') {
        period = settings.amPmStyle === 'latin' ? (isPM ? 'PM' : 'AM') : isPM ? '오후' : '오전';
      } else if (lang === 'ja') {
        period = settings.amPmStyle === 'latin' ? (isPM ? 'PM' : 'AM') : isPM ? '午後' : '午前';
      } else {
        // English and other languages default to AM/PM
        period = isPM ? 'PM' : 'AM';
      }
      ampmEl = <span className="ampm" aria-hidden="true">{period}</span>;
    }

    return (
      <>
        {ampmEl && settings.amPmPosition === 'before' ? <>{ampmEl} </> : null}
        {timeStr}
        {ampmEl && settings.amPmPosition === 'after' ? <> {ampmEl}</> : null}
      </>
    );
  };

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : 'en-US';
    return date.toLocaleDateString(locale, options);
  };

  return (
    <div className={`clock-container ${className}`}>
      <div className="clock-time">{formatTime(currentTime)}</div>
      <div className="clock-date">{formatDate(currentTime)}</div>
    </div>
  );
};
