import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithTimeout } from "../../utils/fetchWithTimeout";
import type { AnimeQuoteData, AnimeQuoteState } from "./widgetTypes";

const MAX_QUOTE_LENGTH = 500;
const MAX_LABEL_LENGTH = 120;

const BUILT_IN_QUOTES: readonly AnimeQuoteData[] = [
  {
    content: "A lesson without pain is meaningless.",
    character: "Edward Elric",
    show: "Fullmetal Alchemist",
  },
  {
    content: "If you don't take risks, you can't create a future.",
    character: "Monkey D. Luffy",
    show: "One Piece",
  },
  {
    content:
      "Hard work is worthless for those that don't believe in themselves.",
    character: "Naruto Uzumaki",
    show: "Naruto",
  },
  {
    content: "The world is not perfect, but it is there for us.",
    character: "Roy Mustang",
    show: "Fullmetal Alchemist",
  },
] as const;

const cleanText = (value: unknown, maximum: number): string =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";

export function parseAnimeQuoteResponse(value: unknown): AnimeQuoteData | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  const entry = candidate as Record<string, unknown>;
  const content = cleanText(entry.quote ?? entry.content, MAX_QUOTE_LENGTH);
  if (!content) return null;
  return {
    content,
    character:
      cleanText(entry.character ?? entry.author, MAX_LABEL_LENGTH) || "Unknown",
    show: cleanText(entry.show ?? entry.anime, MAX_LABEL_LENGTH),
  };
}

export function getBuiltInAnimeQuote(
  previousContent?: string,
  random = Math.random,
): AnimeQuoteData {
  const choices = BUILT_IN_QUOTES.filter(
    (quote) => quote.content !== previousContent,
  );
  const pool = choices.length > 0 ? choices : BUILT_IN_QUOTES;
  return pool[
    Math.floor(Math.min(0.999999999, Math.max(0, random())) * pool.length)
  ];
}

function getConfiguredApiUrl(): string | undefined {
  const value = (
    import.meta.env.VITE_ANIME_QUOTE_API_URL as string | undefined
  )?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function useAnimeQuoteData(shouldFetch: boolean) {
  const [state, setState] = useState<AnimeQuoteState>({
    status: shouldFetch ? "loading" : "idle",
  });
  const mountedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const previousContentRef = useRef<string | undefined>(undefined);
  const apiUrl = getConfiguredApiUrl();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const showFallback = useCallback(() => {
    const quote = getBuiltInAnimeQuote(previousContentRef.current);
    previousContentRef.current = quote.content;
    if (mountedRef.current) setState({ status: "ready", data: quote });
  }, []);

  const fetchQuote = useCallback(async () => {
    if (!shouldFetch || !mountedRef.current) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading" });

    if (!apiUrl) {
      showFallback();
      return;
    }

    try {
      const response = await fetchWithTimeout(
        apiUrl,
        { cache: "no-store", signal: controller.signal },
        8_000,
      );
      if (!response.ok) {
        throw new Error(`Anime quote API error: ${response.status}`);
      }
      const quote = parseAnimeQuoteResponse(await response.json());
      if (!quote) throw new Error("Anime quote API returned invalid data");
      if (!mountedRef.current || controller.signal.aborted) return;
      previousContentRef.current = quote.content;
      setState({ status: "ready", data: quote });
    } catch {
      if (!mountedRef.current || controller.signal.aborted) return;
      showFallback();
    }
  }, [apiUrl, shouldFetch, showFallback]);

  useEffect(() => {
    if (!shouldFetch) {
      controllerRef.current?.abort();
      if (mountedRef.current) setState({ status: "idle" });
      return;
    }
    fetchQuote();
    return () => controllerRef.current?.abort();
  }, [fetchQuote, shouldFetch]);

  return { state, refresh: fetchQuote };
}
