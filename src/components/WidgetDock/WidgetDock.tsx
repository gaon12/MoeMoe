import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../contexts/AppContext';
import { type AppSettings, type Widget } from '../../types/settings';
import { getFormattedTimeParts, getFullDateString } from '../../utils/time';
import './WidgetDock.css';

interface WidgetDockProps {
  currentTime: Date;
}

const MAX_WIDGETS = 4;
const MOBILE_QUERY = '(max-width: 640px)';

type WeatherConditionKey =
  | 'clear'
  | 'partlyCloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'freezingRain'
  | 'snow'
  | 'thunderstorm'
  | 'unknown';

interface WeatherData {
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

interface WeatherState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data?: WeatherData;
  error?: string;
}

interface LocationData {
  name: string;
  region: string;
  country: string;
  tzId: string;
  localTime?: Date;
  lat: number;
  lon: number;
  timezoneLabel?: string;
}

interface LocationState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data?: LocationData;
  error?: string;
}

interface AnimeQuoteData {
  content: string;
  character: string;
  show: string;
}

interface AnimeQuoteState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data?: AnimeQuoteData;
  error?: string;
}

const DEFAULT_COORDS = { latitude: 37.5665, longitude: 126.978 };

/**
 * 위젯 도크 전체 컨테이너 컴포넌트
 * - 활성화된 위젯 목록을 계산한다.
 * - 날씨/위치/애니 명대사 API 훅을 호출한다.
 * - 모바일/데스크탑 레이아웃을 나누어 렌더링한다.
 */
export const WidgetDock = ({ currentTime }: WidgetDockProps) => {
  const { settings } = useApp();
  const { t } = useTranslation();

  // 설정에서 활성화된 위젯만 추려서 최대 MAX_WIDGETS개까지 사용한다.
  const activeWidgets = useMemo(
    () => settings.widgets.filter((widget) => widget.enabled).slice(0, MAX_WIDGETS),
    [settings.widgets],
  );

  // 날씨 위젯이 하나라도 있으면 날씨 데이터를 가져와야 한다.
  const needsWeatherData = activeWidgets.some((widget) => widget.type === 'weather');

  // 위치 위젯이 하나라도 있으면 위치 데이터를 가져와야 한다.
  const needsLocationData = activeWidgets.some((widget) => widget.type === 'location');

  // 애니 명대사 위젯이 하나라도 있으면 애니 명대사 데이터를 가져와야 한다.
  const needsAnimeQuote = activeWidgets.some((widget) => widget.type === 'animeQuote');

  // WeatherAPI 키
  const weatherApiKey = settings.weatherApiKey?.trim() ?? '';

  // 날씨 데이터 훅
  const weatherState = useWeatherData(needsWeatherData && Boolean(weatherApiKey), weatherApiKey);

  // 위치 데이터 훅 (WeatherAPI 키 없이도 동작)
  const locationState = useLocationData(needsLocationData);

  // 애니 명대사 데이터 훅
  const { state: animeQuoteState, refresh: refreshAnimeQuote } = useAnimeQuoteData(needsAnimeQuote);

  // 화면 크기에 따른 모바일 여부 상태
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  // 리사이즈/미디어쿼리 변경 시 모바일 여부 갱신
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mediaQuery.addEventListener('change', handler);
    setIsMobile(mediaQuery.matches);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 모바일에서 스택 형태로 보여줄 때, 어떤 카드가 활성 카드인지 인덱스로 관리한다.
  const [activeIndex, setActiveIndex] = useState(0);

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
    if (!isMobile || activeWidgets.length <= 1) return;
    startYRef.current = event.touches[0]?.clientY ?? null;
  };

  // 터치 종료 시 스와이프 방향을 계산하여 activeIndex를 변경한다.
  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!isMobile || activeWidgets.length <= 1) return;
    if (startYRef.current == null) return;
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
    <div className={`widget-dock${isMobile ? ' widget-dock-mobile' : ''}`}>
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
              className={`widget-card-wrapper${
                index === activeIndex ? ' active' : index < activeIndex ? ' above' : ' below'
              }`}
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
            <WidgetCard
              key={widget.id}
              widget={widget}
              currentTime={currentTime}
              settings={settings}
              weatherState={weatherState}
              locationState={locationState}
              animeQuoteState={animeQuoteState}
              onRefreshAnimeQuote={refreshAnimeQuote}
              weatherApiKey={weatherApiKey}
            />
          ))}
        </div>
      )}

      {/* 모바일에서 여러 위젯이 있을 때, 페이지네이션 점(도트)을 표시한다. */}
      {isMobile && activeWidgets.length > 1 && (
        <div className="widget-pagination" role="tablist" aria-label={t('settings.widgets.title')}>
          {activeWidgets.map((widget, index) => (
            <button
              key={widget.id}
              type="button"
              className={`widget-pagination-dot${index === activeIndex ? ' active' : ''}`}
              aria-label={`${t('settings.widgets.title')} ${index + 1}`}
              aria-selected={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
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
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  // 시계 위젯
  if (widget.type === 'clock') {
    const { time, ampmPosition, ampmText } = getFormattedTimeParts(currentTime, settings, language);
    const dateString = getFullDateString(currentTime, language);
    return (
      <article className="widget-card widget-card-clock">
        <header className="widget-card-header">
          <span className="widget-card-title">{t('settings.widgets.clock')}</span>
          <span className="widget-card-chip">{t('widgets.common.live')}</span>
        </header>
        <div className="widget-card-body">
          <div className="widget-clock-time">
            {ampmText && ampmPosition === 'before' ? (
              <span className="widget-clock-ampm">{ampmText}</span>
            ) : null}
            <span>{time}</span>
            {ampmText && ampmPosition === 'after' ? (
              <span className="widget-clock-ampm">{ampmText}</span>
            ) : null}
          </div>
          <p className="widget-card-subtext">{dateString}</p>
        </div>
      </article>
    );
  }

  // 날씨 위젯
  if (widget.type === 'weather') {
    // WeatherAPI 키가 없을 때 안내 문구
    if (!weatherApiKey) {
      return (
        <article className="widget-card widget-card-weather">
          <header className="widget-card-header">
            <span className="widget-card-title">{t('widgets.weather.title')}</span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t('widgets.weather.missingKey')}</p>
          </div>
        </article>
      );
    }

    // 날씨 데이터 로딩 중 또는 초기 상태
    if (weatherState.status === 'loading' || weatherState.status === 'idle') {
      return (
        <article className="widget-card widget-card-weather">
          <header className="widget-card-header">
            <span className="widget-card-title">{t('widgets.weather.title')}</span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t('widgets.weather.loading')}</p>
          </div>
        </article>
      );
    }

    // 날씨 데이터 로딩 실패
    if (weatherState.status === 'error') {
      return (
        <article className="widget-card widget-card-weather">
          <header className="widget-card-header">
            <span className="widget-card-title">{t('widgets.weather.title')}</span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t('widgets.weather.error')}</p>
          </div>
        </article>
      );
    }

    const data = weatherState.data;
    if (!data) return null;

    return (
      <article className="widget-card widget-card-weather">
        <header className="widget-card-header">
          <span className="widget-card-title">{t('widgets.weather.title')}</span>
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
  if (widget.type === 'location') {
    // 위치 정보 로딩 중 또는 초기 상태
    if (locationState.status === 'loading' || locationState.status === 'idle') {
      return (
        <article className="widget-card widget-card-location">
          <header className="widget-card-header">
            <span className="widget-card-title">{t('widgets.location.title')}</span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t('widgets.location.loading')}</p>
          </div>
        </article>
      );
    }

    // 위치 정보 로딩 실패
    if (locationState.status === 'error') {
      return (
        <article className="widget-card widget-card-location">
          <header className="widget-card-header">
            <span className="widget-card-title">{t('widgets.location.title')}</span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t('widgets.location.error')}</p>
          </div>
        </article>
      );
    }

    const location = locationState.data;
    if (!location) {
      return (
        <article className="widget-card widget-card-location">
          <header className="widget-card-header">
            <span className="widget-card-title">{t('widgets.location.title')}</span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t('widgets.location.error')}</p>
          </div>
        </article>
      );
    }

    const subtitleParts = [location.region, location.country].filter(Boolean);
    const timezoneText = location.timezoneLabel || location.tzId;

    // 사용자의 언어 설정에 따라 현지 시간을 포맷팅한다.
    const localTime =
      location.localTime != null
        ? new Intl.DateTimeFormat(
            language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : 'en-US',
            {
              dateStyle: 'medium',
              timeStyle: 'short',
            },
          ).format(location.localTime)
        : null;

    return (
      <article className="widget-card widget-card-location">
        <header className="widget-card-header">
          <span className="widget-card-title">{location.name}</span>
          <span className="widget-card-chip">{t('widgets.location.title')}</span>
        </header>
        <div className="widget-card-body widget-location-grid">
          {subtitleParts.length > 0 && (
            <p className="widget-card-subtext">{subtitleParts.join(', ')}</p>
          )}
          <div className="widget-location-row">
            <span className="widget-location-label">{t('widgets.location.coordsLabel')}</span>
            <span className="widget-location-value">
              {t('widgets.location.coords', {
                lat: location.lat.toFixed(2),
                lon: location.lon.toFixed(2),
              })}
            </span>
          </div>
          <div className="widget-location-row">
            <span className="widget-location-label">{t('widgets.location.timezone')}</span>
            <span className="widget-location-value">{timezoneText}</span>
          </div>
          {localTime && (
            <div className="widget-location-row">
              <span className="widget-location-label">{t('widgets.location.localTime')}</span>
              <span className="widget-location-value">{localTime}</span>
            </div>
          )}
        </div>
      </article>
    );
  }

  // 애니 명대사 위젯
  if (widget.type === 'animeQuote') {
    // 로딩 중 또는 초기 상태일 때
    if (animeQuoteState.status === 'loading' || animeQuoteState.status === 'idle') {
      return (
        <article className="widget-card widget-card-quote">
          <header className="widget-card-header">
            <span className="widget-card-title">{t('widgets.animeQuote.title')}</span>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t('widgets.animeQuote.loading')}</p>
          </div>
        </article>
      );
    }

    // 에러 상태일 때
    if (animeQuoteState.status === 'error') {
      return (
        <article className="widget-card widget-card-quote">
          <header className="widget-card-header">
            <span className="widget-card-title">{t('widgets.animeQuote.title')}</span>
            <button className="widget-card-action" onClick={onRefreshAnimeQuote}>
              {t('widgets.animeQuote.refresh')}
            </button>
          </header>
          <div className="widget-card-body">
            <p className="widget-card-muted">{t('widgets.animeQuote.error')}</p>
          </div>
        </article>
      );
    }

    // 정상적으로 데이터를 받아온 경우
    const data = animeQuoteState.data;
    if (!data) return null;

    return (
      <article className="widget-card widget-card-quote">
        <header className="widget-card-header">
          <span className="widget-card-title">{t('widgets.animeQuote.title')}</span>
          <button className="widget-card-action" onClick={onRefreshAnimeQuote}>
            {t('widgets.animeQuote.refresh')}
          </button>
        </header>
        <div className="widget-card-body">
          <p className="widget-quote-text">“{data.content}”</p>
          <p className="widget-anime-quote-character">{data.character}</p>
          <p className="widget-anime-quote-show">
            {t('widgets.animeQuote.from', { show: data.show })}
          </p>
        </div>
      </article>
    );
  }

  // 사용자 정의 텍스트 위젯
  if (widget.type === 'customText') {
    const customText = typeof widget.data?.text === 'string' ? widget.data.text.trim() : '';
    return (
      <article className="widget-card widget-card-custom">
        <header className="widget-card-header">
          <span className="widget-card-title">{t('settings.widgets.customText')}</span>
        </header>
        <div className="widget-card-body">
          <p className={`widget-custom-text${customText ? '' : ' placeholder'}`}>
            {customText || t('widgets.customText.placeholder')}
          </p>
        </div>
      </article>
    );
  }

  return null;
};

/**
 * 날씨 데이터를 가져오는 커스텀 훅
 * - shouldFetch: 날씨/위치 위젯이 활성화되어 실제로 데이터를 가져와야 하는지 여부
 * - apiKey: WeatherAPI.com API 키
 *
 * React 18 StrictMode에서도 안전하게 동작하도록
 * mountedRef를 마운트/언마운트 시점에 정확히 설정한다.
 */
function useWeatherData(shouldFetch: boolean, apiKey: string): WeatherState {
  // 현재 날씨 위젯의 상태를 관리한다.
  const [state, setState] = useState<WeatherState>({
    status: shouldFetch ? 'loading' : 'idle',
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
      setState({ status: 'idle' });
      return;
    }

    // API 키가 없으면 에러 상태로 전환
    if (!apiKey) {
      if (!mountedRef.current) return;
      setState({
        status: 'error',
        error: 'WeatherAPI key missing',
      });
      return;
    }

    let cancelled = false;

    // 실제 날씨 데이터를 가져오는 비동기 함수
    const fetchWeather = async () => {
      // 언마운트된 경우에는 setState를 호출하지 않도록 방지
      if (!mountedRef.current) return;

      // 로딩 상태로 설정
      setState({ status: 'loading' });

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
          mergedLocation.country = reverseInfo.country ?? mergedLocation.country;
        }

        if (!mountedRef.current) return;

        // 최종적으로 ready 상태와 데이터를 설정한다.
        setState({ status: 'ready', data: weatherData });
      } catch (error) {
        if (cancelled || !mountedRef.current) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Weather error',
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
    status: shouldFetch ? 'loading' : 'idle',
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
      setState({ status: 'idle' });
      return;
    }

    const fetchLocation = async () => {
      if (!mountedRef.current) return;
      setState({ status: 'loading' });

      try {
        const coords = await getCoordinates();
        if (!mountedRef.current) return;

        const reverseInfo = await reverseGeocode(coords);

        const resolvedTimeZone =
          typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
            : '';

        const now = new Date();

        const data: LocationData = {
          name: reverseInfo?.name ?? 'Location',
          region: reverseInfo?.region ?? '',
          country: reverseInfo?.country ?? '',
          tzId: resolvedTimeZone,
          localTime: now,
          lat: coords.latitude,
          lon: coords.longitude,
          timezoneLabel: resolvedTimeZone || 'Local time',
        };

        if (!mountedRef.current) return;
        setState({ status: 'ready', data });
      } catch (error) {
        if (!mountedRef.current) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Location error',
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
    aqi: 'no',
  });

  const response = await fetch(`https://api.weatherapi.com/v1/current.json?${params.toString()}`, {
    cache: 'no-store',
  });

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
        name: data.location.name ?? 'Location',
        region: data.location.region ?? '',
        country: data.location.country ?? '',
        tzId: data.location.tz_id ?? '',
        localTime: data.location.localtime_epoch
          ? new Date(data.location.localtime_epoch * 1000)
          : undefined,
        lat: typeof data.location.lat === 'number' ? data.location.lat : coords.latitude,
        lon: typeof data.location.lon === 'number' ? data.location.lon : coords.longitude,
      }
    : {
        name: 'Location',
        region: '',
        country: '',
        tzId: '',
        localTime: undefined,
        lat: coords.latitude,
        lon: coords.longitude,
      };

  return {
    temperature: typeof data?.current?.temp_c === 'number' ? data.current.temp_c : 0,
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
async function reverseGeocode(coords: { latitude: number; longitude: number }) {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: coords.latitude.toString(),
      lon: coords.longitude.toString(),
      zoom: '10',
      addressdetails: '1',
      email: 'support@moemoe.app',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: { Accept: 'application/json' },
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
      (typeof data?.display_name === 'string' ? data.display_name.split(',')[0]?.trim() : undefined);

    return {
      name: primaryName,
      region: address.state || address.county || '',
      country: address.country || '',
    };
  } catch (error) {
    // 역지오코딩은 부가 정보이므로 실패해도 치명적이지 않다. 콘솔 경고만 남기고 null을 반환한다.
    console.warn('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * 애니 명대사(quote)를 가져오는 커스텀 훅
 * - shouldFetch: 애니 명대사 위젯이 실제로 활성화되어 있어 데이터를 가져올지 여부
 *
 * React 18 StrictMode에서도 안전하게 동작하도록 mountedRef를 정확히 관리한다.
 */
function useAnimeQuoteData(shouldFetch: boolean) {
  // 명대사 위젯의 상태를 관리한다.
  const [state, setState] = useState<AnimeQuoteState>({
    status: shouldFetch ? 'loading' : 'idle',
  });

  // 컴포넌트 마운트 여부를 추적하기 위한 ref
  const mountedRef = useRef(false);

  // 환경 변수에서 API URL을 읽어온다.
  const apiUrl = (import.meta.env.VITE_ANIME_QUOTE_API_URL as string | undefined)?.trim();

  // 마운트 시 mountedRef를 true, 언마운트 시 false로 설정한다.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * 실제로 애니 명대사를 가져오는 비동기 함수
   * - shouldFetch와 apiUrl이 변경될 때마다 새로 생성된다.
   */
  const fetchQuote = useCallback(async () => {
    // 위젯이 비활성화되어 있으면 아무 작업도 하지 않는다.
    if (!shouldFetch) {
      return;
    }

    // 언마운트된 상태에서는 setState를 호출하면 안 되므로 바로 종료한다.
    if (!mountedRef.current) {
      return;
    }

    // 환경 변수에 API URL이 설정되어 있지 않은 경우
    if (!apiUrl) {
      setState({
        status: 'error',
        error: 'Anime quote API not configured',
      });
      return;
    }

    // 요청을 시작했으므로 loading 상태로 설정한다.
    setState({ status: 'loading' });

    try {
      const response = await fetch(apiUrl, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Anime quote API error: ${response.status}`);
      }

      const data = await response.json();

      // 응답을 받는 동안 언마운트되었으면 상태를 업데이트하지 않는다.
      if (!mountedRef.current) {
        return;
      }

      // API가 배열이나 단일 객체를 반환할 수 있으므로 배열이면 첫 번째 요소를 사용한다.
      const entry = Array.isArray(data) ? data[0] : data;

      // 정상적으로 데이터를 받았으므로 ready 상태와 내용을 설정한다.
      setState({
        status: 'ready',
        data: {
          content: entry?.quote ?? '',
          character: entry?.character ?? 'Unknown',
          show: entry?.show ?? '',
        },
      });
    } catch (error) {
      // 에러 처리 중에도 언마운트되었으면 setState를 호출하지 않는다.
      if (!mountedRef.current) {
        return;
      }

      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Anime quote error',
      });
    }
  }, [shouldFetch, apiUrl]);

  /**
   * shouldFetch 값이 바뀔 때마다 동작하는 effect
   * - false이면 idle 상태로 되돌린다.
   * - true이면 fetchQuote를 호출하여 실제로 데이터를 가져온다.
   */
  useEffect(() => {
    if (!shouldFetch) {
      if (!mountedRef.current) {
        return;
      }
      setState({ status: 'idle' });
      return;
    }

    fetchQuote();
  }, [shouldFetch, fetchQuote]);

  // 현재 상태와, 버튼 클릭 시 명대사를 다시 가져오기 위한 refresh 함수를 반환한다.
  return { state, refresh: fetchQuote };
}

/**
 * WeatherAPI의 날씨 코드 → 내부에서 사용하는 날씨 키로 매핑
 */
function mapWeatherCode(code: number): WeatherConditionKey {
  if (code === 1000) return 'clear';
  if (code === 1003) return 'partlyCloudy';
  if ([1006, 1009].includes(code)) return 'cloudy';
  if ([1030, 1135, 1147].includes(code)) return 'fog';
  if ([1150, 1153, 1168, 1171, 1180, 1183].includes(code)) return 'drizzle';
  if ([1063, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
    return 'rain';
  }
  if ([1069, 1072, 1198, 1201, 1204, 1207, 1249, 1252].includes(code)) return 'freezingRain';
  if (
    [
      1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1255, 1258, 1261, 1264,
    ].includes(code)
  ) {
    return 'snow';
  }
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 'thunderstorm';
  // 알 수 없는 코드는 기본적으로 흐림으로 처리한다.
  return 'cloudy';
}

/**
 * 날씨 상태에 사용할 간단한 이모지 아이콘 매핑
 */
const WEATHER_ICONS: Record<WeatherConditionKey, string> = {
  clear: '☀️',
  partlyCloudy: '🌤️',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  freezingRain: '🌧️',
  snow: '❄️',
  thunderstorm: '⛈️',
  unknown: '❔',
};

/**
 * 타임존 문자열을 좀 더 보기 좋은 형태로 변환하는 함수
 * 예: "Asia/Seoul" → "Asia · Seoul"
 */
function formatTimezoneLabel(tz?: string) {
  if (!tz || typeof tz !== 'string') return 'UTC';
  return tz.replace(/_/g, ' ').replace(/\//g, ' · ');
}

/**
 * 브라우저의 Geolocation API를 사용하여 현재 좌표를 가져온다.
 * - 우선 사용자에게 권한을 요청하여 실제 위치를 사용한다.
 * - 권한을 얻지 못하거나 실패한 경우, IP 기반 역지오코딩 API를 사용해 대략적인 위치를 얻는다.
 * - 둘 다 실패하면 DEFAULT_COORDS(서울 좌표)를 반환한다.
 */
async function getCoordinates(): Promise<{ latitude: number; longitude: number }> {
  // 1) Geolocation API 시도
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const geoPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          { enableHighAccuracy: false, timeout: 5000 },
        );
      });

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
    const rawIpApiBase = (import.meta.env.VITE_IP_REVERSE_GEOCODING_API_URL as string | undefined)
      ?.trim() || '';

    if (rawIpApiBase) {
      // .env에는 https://ipinfo.io/ 와 같이 기본 URL만 넣고,
      // 실제 요청은 /json을 붙여서 보낸다.
      let ipApiUrl = rawIpApiBase;
      // 끝에 /가 여러 개 붙어 있어도 하나만 제거
      while (ipApiUrl.endsWith('/')) {
        ipApiUrl = ipApiUrl.slice(0, -1);
      }
      if (!ipApiUrl.toLowerCase().endsWith('/json')) {
        ipApiUrl = `${ipApiUrl}/json`;
      }

      const response = await fetch(ipApiUrl, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        // ipinfo.io 형식(lat, lon이 있는 loc 문자열 등)을 가정하되,
        // 안전하게 파싱하여 lat/lon을 얻는다.
        let latitude: number | null = null;
        let longitude: number | null = null;

        if (typeof data?.loc === 'string') {
          const [latStr, lonStr] = data.loc.split(',');
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
          const lat = typeof data?.latitude === 'number' ? data.latitude : Number(data?.latitude);
          const lon =
            typeof data?.longitude === 'number' ? data.longitude : Number(data?.longitude);
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
      }
    }
  } catch (error) {
    console.warn('IP-based reverse geocoding failed:', error);
  }

  // 3) 모든 시도가 실패한 경우 기본 좌표(서울) 사용
  return DEFAULT_COORDS;
}
