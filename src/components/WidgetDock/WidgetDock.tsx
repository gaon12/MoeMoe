import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/useApp.ts";
import type { AppSettings, Widget } from "../../types/settings.ts";
import { getFormattedTimeParts, getFullDateString } from "../../utils/time.ts";
import { useAnimeQuoteData } from "./animeQuoteData.ts";
import {
  formatLocationLocalTime,
  useLocationData,
  useWeatherData,
} from "./widgetData.ts";
import type {
  AnimeQuoteState,
  LocationState,
  WeatherState,
} from "./widgetTypes.ts";
import "./WidgetDock.css";

interface WidgetDockProps {
  currentTime: Date;
}

const MAX_WIDGETS = 4;
const MOBILE_QUERY = "(max-width: 640px)";

function getStackPositionClass(index: number, activeIndex: number): string {
  if (index === activeIndex) {
    return "widget-card-wrapper active";
  }
  if (index < activeIndex) {
    return "widget-card-wrapper above";
  }
  return "widget-card-wrapper below";
}

/**
 * 위젯 도크 전체 컨테이너 컴포넌트
 * - 활성화된 위젯 목록을 계산한다.
 * - 날씨/위치/애니 명대사 API 훅을 호출한다.
 * - 모바일/데스크탑 레이아웃을 나누어 렌더링한다.
 */
const WidgetDock = ({ currentTime }: WidgetDockProps) => {
  const { settings } = useApp();
  const { t } = useTranslation();

  // 설정에서 활성화된 위젯만 추려서 최대 MAX_WIDGETS개까지 사용한다.
  const activeWidgets = useMemo(
    () =>
      settings.widgets.filter((widget) => widget.enabled).slice(0, MAX_WIDGETS),
    [settings.widgets],
  );

  // 날씨 위젯이 하나라도 있으면 날씨 데이터를 가져와야 한다.
  const needsWeatherData = activeWidgets.some(
    (widget) => widget.type === "weather",
  );

  // 위치 위젯이 하나라도 있으면 위치 데이터를 가져와야 한다.
  const needsLocationData = activeWidgets.some(
    (widget) => widget.type === "location",
  );

  // 애니 명대사 위젯이 하나라도 있으면 애니 명대사 데이터를 가져와야 한다.
  const needsAnimeQuote = activeWidgets.some(
    (widget) => widget.type === "animeQuote",
  );

  // WeatherAPI 키
  const weatherApiKey = settings.weatherApiKey?.trim() ?? "";

  // 날씨 데이터 훅
  const weatherState = useWeatherData(
    needsWeatherData && Boolean(weatherApiKey),
    weatherApiKey,
  );

  // 위치 데이터 훅 (WeatherAPI 키 없이도 동작)
  const locationState = useLocationData(needsLocationData);

  // 애니 명대사 데이터 훅
  const { state: animeQuoteState, refresh: refreshAnimeQuote } =
    useAnimeQuoteData(needsAnimeQuote);

  // 화면 크기에 따른 모바일 여부 상태
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof globalThis.matchMedia !== "function") {
      return false;
    }
    return globalThis.matchMedia(MOBILE_QUERY).matches;
  });

  // 리사이즈/미디어쿼리 변경 시 모바일 여부 갱신
  useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") {
      return;
    }
    const mediaQuery = globalThis.matchMedia(MOBILE_QUERY);
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handler);
    setIsMobile(mediaQuery.matches);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // 모바일에서 스택 형태로 보여줄 때, 어떤 카드가 활성 카드인지 인덱스로 관리한다.
  const [activeIndex, setActiveIndex] = useState(0);
  const handlePaginationClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      if (Number.isInteger(index)) {
        setActiveIndex(index);
      }
    },
    [],
  );

  // 활성 위젯 개수가 줄어들었을 때, activeIndex가 범위를 벗어나지 않도록 보정한다.
  useEffect(() => {
    if (activeIndex > activeWidgets.length - 1) {
      setActiveIndex(Math.max(0, activeWidgets.length - 1));
    }
  }, [activeIndex, activeWidgets.length]);

  // 데스크탑 모드로 변경되면 첫 번째 카드가 보이도록 인덱스를 0으로 초기화한다.
  useEffect(() => {
    if (!isMobile) {
      setActiveIndex(0);
    }
  }, [isMobile]);

  // 모바일에서 위/아래 스와이프 제스처를 처리하기 위한 터치 시작 위치
  const startYRef = useRef<number | null>(null);

  // 터치 시작 시 Y 좌표를 기록한다.
  const handleTouchStart = (event: React.TouchEvent) => {
    if (!isMobile || activeWidgets.length <= 1) {
      return;
    }
    startYRef.current = event.touches[0]?.clientY ?? null;
  };

  // 터치 종료 시 스와이프 방향을 계산하여 activeIndex를 변경한다.
  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!isMobile || activeWidgets.length <= 1) {
      return;
    }
    if (startYRef.current === null) {
      return;
    }
    const delta = event.changedTouches[0]?.clientY ?? startYRef.current;
    const diff = delta - startYRef.current;
    const threshold = 40; // 이 값 이상으로 움직였을 때만 스와이프 처리
    if (Math.abs(diff) > threshold) {
      if (diff < 0 && activeIndex < activeWidgets.length - 1) {
        // 위로 스와이프 → 다음 카드
        setActiveIndex((prev) => Math.min(activeWidgets.length - 1, prev + 1));
      } else if (diff > 0 && activeIndex > 0) {
        // 아래로 스와이프 → 이전 카드
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
    }
    startYRef.current = null;
  };

  // 활성화된 위젯이 없으면 아무것도 렌더링하지 않는다.
  if (activeWidgets.length === 0) {
    return null;
  }

  return (
    <div className={`widget-dock${isMobile ? " widget-dock-mobile" : ""}`}>
      {isMobile ? (
        // 모바일 레이아웃: 스택 형태의 카드 + 스와이프 지원
        <div
          className="widget-cards widget-cards-stack"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {activeWidgets.map((widget, index) => (
            <div
              key={widget.id}
              className={getStackPositionClass(index, activeIndex)}
            >
              <WidgetCard
                widget={widget}
                currentTime={currentTime}
                settings={settings}
                weatherState={weatherState}
                locationState={locationState}
                animeQuoteState={animeQuoteState}
                onRefreshAnimeQuote={refreshAnimeQuote}
                weatherApiKey={weatherApiKey}
              />
            </div>
          ))}
        </div>
      ) : (
        // 데스크탑 레이아웃: 카드들을 가로로 나란히 표시
        <div className="widget-cards">
          {activeWidgets.map((widget) => (
            <div
              key={widget.id}
              className="widget-card-positioner"
              style={{
                transform: `translate(${widget.position.x}px, ${widget.position.y}px)`,
              }}
            >
              <WidgetCard
                widget={widget}
                currentTime={currentTime}
                settings={settings}
                weatherState={weatherState}
                locationState={locationState}
                animeQuoteState={animeQuoteState}
                onRefreshAnimeQuote={refreshAnimeQuote}
                weatherApiKey={weatherApiKey}
              />
            </div>
          ))}
        </div>
      )}

      {/* 모바일에서 여러 위젯이 있을 때, 페이지네이션 점(도트)을 표시한다. */}
      {isMobile && activeWidgets.length > 1 && (
        <nav
          className="widget-pagination"
          aria-label={t("settings.widgets.title")}
        >
          {activeWidgets.map((widget, index) => (
            <button
              key={widget.id}
              type="button"
              data-index={index}
              className={`widget-pagination-dot${index === activeIndex ? " active" : ""}`}
              aria-label={`${t("settings.widgets.title")} ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={handlePaginationClick}
            />
          ))}
        </nav>
      )}
    </div>
  );
};

/**
 * 각 위젯 타입별로 알맞은 카드 UI를 렌더링하는 컴포넌트
 */
const WidgetCard = ({
  widget,
  currentTime,
  settings,
  weatherState,
  locationState,
  animeQuoteState,
  onRefreshAnimeQuote,
  weatherApiKey,
}: {
  widget: Widget;
  currentTime: Date;
  settings: AppSettings;
  weatherState: WeatherState;
  locationState: LocationState;
  animeQuoteState: AnimeQuoteState;
  onRefreshAnimeQuote: () => void;
  weatherApiKey: string;
}) => {
  const {
    t,
    i18n: { language },
  } = useTranslation();

  // 시계 위젯
  if (widget.type === "clock") {
    const { time, ampmPosition, ampmText } = getFormattedTimeParts(
      currentTime,
      settings,
      language,
    );
    const dateString = getFullDateString(currentTime, language);
    return (
      <article className="widget-card widget-card-clock">
        <header className="widget-card-header">
          <span className="widget-card-title">
            {t("settings.widgets.clock")}
          </span>
          <span className="widget-card-chip">{t("widgets.common.live")}</span>
        </header>
        <div className="widget-card-body">
          <div className="widget-clock-time">
            {ampmText && ampmPosition === "before" ? (
              <span className="widget-clock-ampm">{ampmText}</span>
            ) : null}
            <span>{time}</span>
            {ampmText && ampmPosition === "after" ? (
              <span className="widget-clock-ampm">{ampmText}</span>
            ) : null}
          </div>
          <p className="widget-card-subtext">{dateString}</p>
        </div>
      </article>
    );
  }

  // 날씨 위젯
  if (widget.type === "weather") {
    // WeatherAPI 키가 없을 때 안내 문구
    if (!weatherApiKey) {
      return (
        <article className="widget-card widget-card-weather">
          <header className="widget-card-header">
            <span className="widget-card-title">
              {t("widgets.weather.title")}
            </span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">
              {t("widgets.weather.missingKey")}
            </p>
          </div>
        </article>
      );
    }

    // 날씨 데이터 로딩 중 또는 초기 상태
    if (weatherState.status === "loading" || weatherState.status === "idle") {
      return (
        <article className="widget-card widget-card-weather">
          <header className="widget-card-header">
            <span className="widget-card-title">
              {t("widgets.weather.title")}
            </span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t("widgets.weather.loading")}</p>
          </div>
        </article>
      );
    }

    // 날씨 데이터 로딩 실패
    if (weatherState.status === "error") {
      return (
        <article className="widget-card widget-card-weather">
          <header className="widget-card-header">
            <span className="widget-card-title">
              {t("widgets.weather.title")}
            </span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t("widgets.weather.error")}</p>
          </div>
        </article>
      );
    }

    const { data } = weatherState;
    if (!data) {
      return null;
    }

    return (
      <article className="widget-card widget-card-weather">
        <header className="widget-card-header">
          <span className="widget-card-title">
            {t("widgets.weather.title")}
          </span>
          <span className="widget-card-chip">{data.icon}</span>
        </header>
        <div className="widget-card-body">
          <div className="widget-weather-temp">
            {Math.round(data.temperature)}
            <span className="widget-weather-unit">°C</span>
          </div>
          <p className="widget-card-subtext">
            {t(`widgets.weather.conditions.${data.conditionKey}`)}
          </p>
          <p className="widget-card-muted">{data.timezoneLabel}</p>
        </div>
      </article>
    );
  }

  // 위치 위젯
  if (widget.type === "location") {
    // 위치 정보 로딩 중 또는 초기 상태
    if (locationState.status === "loading" || locationState.status === "idle") {
      return (
        <article className="widget-card widget-card-location">
          <header className="widget-card-header">
            <span className="widget-card-title">
              {t("widgets.location.title")}
            </span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t("widgets.location.loading")}</p>
          </div>
        </article>
      );
    }

    // 위치 정보 로딩 실패
    if (locationState.status === "error") {
      return (
        <article className="widget-card widget-card-location">
          <header className="widget-card-header">
            <span className="widget-card-title">
              {t("widgets.location.title")}
            </span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t("widgets.location.error")}</p>
          </div>
        </article>
      );
    }

    const location = locationState.data;
    if (!location) {
      return (
        <article className="widget-card widget-card-location">
          <header className="widget-card-header">
            <span className="widget-card-title">
              {t("widgets.location.title")}
            </span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t("widgets.location.error")}</p>
          </div>
        </article>
      );
    }

    const subtitleParts = [location.region, location.country].filter(Boolean);
    const timezoneText = location.timezoneLabel || location.tzId;

    const localTime = formatLocationLocalTime(
      currentTime,
      language,
      location.tzId,
    );

    return (
      <article className="widget-card widget-card-location">
        <header className="widget-card-header">
          <span className="widget-card-title">{location.name}</span>
          <span className="widget-card-chip">
            {t("widgets.location.title")}
          </span>
        </header>
        <div className="widget-card-body widget-location-grid">
          {subtitleParts.length > 0 && (
            <p className="widget-card-subtext">{subtitleParts.join(", ")}</p>
          )}
          <div className="widget-location-row">
            <span className="widget-location-label">
              {t("widgets.location.coordsLabel")}
            </span>
            <span className="widget-location-value">
              {t("widgets.location.coords", {
                lat: location.lat.toFixed(2),
                lon: location.lon.toFixed(2),
              })}
            </span>
          </div>
          <div className="widget-location-row">
            <span className="widget-location-label">
              {t("widgets.location.timezone")}
            </span>
            <span className="widget-location-value">{timezoneText}</span>
          </div>
          {localTime && (
            <div className="widget-location-row">
              <span className="widget-location-label">
                {t("widgets.location.localTime")}
              </span>
              <span className="widget-location-value">{localTime}</span>
            </div>
          )}
        </div>
      </article>
    );
  }

  // 애니 명대사 위젯
  if (widget.type === "animeQuote") {
    // 로딩 중 또는 초기 상태일 때
    if (
      animeQuoteState.status === "loading" ||
      animeQuoteState.status === "idle"
    ) {
      return (
        <article className="widget-card widget-card-quote">
          <header className="widget-card-header">
            <span className="widget-card-title">
              {t("widgets.animeQuote.title")}
            </span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">
              {t("widgets.animeQuote.loading")}
            </p>
          </div>
        </article>
      );
    }

    // 에러 상태일 때
    if (animeQuoteState.status === "error") {
      return (
        <article className="widget-card widget-card-quote">
          <header className="widget-card-header">
            <span className="widget-card-title">
              {t("widgets.animeQuote.title")}
            </span>
            <button
              type="button"
              className="widget-card-action"
              onClick={onRefreshAnimeQuote}
            >
              {t("widgets.animeQuote.refresh")}
            </button>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t("widgets.animeQuote.error")}</p>
          </div>
        </article>
      );
    }

    // 정상적으로 데이터를 받아온 경우
    const { data } = animeQuoteState;
    if (!data) {
      return null;
    }

    return (
      <article className="widget-card widget-card-quote">
        <header className="widget-card-header">
          <span className="widget-card-title">
            {t("widgets.animeQuote.title")}
          </span>
          <button
            type="button"
            className="widget-card-action"
            onClick={onRefreshAnimeQuote}
          >
            {t("widgets.animeQuote.refresh")}
          </button>
        </header>
        <div className="widget-card-body">
          <p className="widget-quote-text">“{data.content}”</p>
          <p className="widget-anime-quote-character">{data.character}</p>
          <p className="widget-anime-quote-show">
            {t("widgets.animeQuote.from", { show: data.show })}
          </p>
        </div>
      </article>
    );
  }

  // 사용자 정의 텍스트 위젯
  if (widget.type === "customText") {
    const customText =
      typeof widget.data?.text === "string" ? widget.data.text.trim() : "";
    return (
      <article className="widget-card widget-card-custom">
        <header className="widget-card-header">
          <span className="widget-card-title">
            {t("settings.widgets.customText")}
          </span>
        </header>
        <div className="widget-card-body">
          <p
            className={`widget-custom-text${customText ? "" : " placeholder"}`}
          >
            {customText || t("widgets.customText.placeholder")}
          </p>
        </div>
      </article>
    );
  }

  return null;
};

export { WidgetDock };

/**
 * 날씨 데이터를 가져오는 커스텀 훅
 * - shouldFetch: 날씨/위치 위젯이 활성화되어 실제로 데이터를 가져와야 하는지 여부
 * - apiKey: WeatherAPI.com API 키
 *
 * React 18 StrictMode에서도 안전하게 동작하도록
 * mountedRef를 마운트/언마운트 시점에 정확히 설정한다.
 */
