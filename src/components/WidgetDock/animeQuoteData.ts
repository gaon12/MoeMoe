import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimeQuoteState } from "./widgetTypes";

export function useAnimeQuoteData(shouldFetch: boolean) {
  // 명대사 위젯의 상태를 관리한다.
  const [state, setState] = useState<AnimeQuoteState>({
    status: shouldFetch ? "loading" : "idle",
  });

  // 컴포넌트 마운트 여부를 추적하기 위한 ref
  const mountedRef = useRef(false);

  // 환경 변수에서 API URL을 읽어온다.
  const apiUrl = (
    import.meta.env.VITE_ANIME_QUOTE_API_URL as string | undefined
  )?.trim();

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
        status: "error",
        error: "Anime quote API not configured",
      });
      return;
    }

    // 요청을 시작했으므로 loading 상태로 설정한다.
    setState({ status: "loading" });

    try {
      const response = await fetch(apiUrl, {
        cache: "no-store",
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
        status: "ready",
        data: {
          content: entry?.quote ?? "",
          character: entry?.character ?? "Unknown",
          show: entry?.show ?? "",
        },
      });
    } catch (error) {
      // 에러 처리 중에도 언마운트되었으면 setState를 호출하지 않는다.
      if (!mountedRef.current) {
        return;
      }

      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Anime quote error",
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
      setState({ status: "idle" });
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
