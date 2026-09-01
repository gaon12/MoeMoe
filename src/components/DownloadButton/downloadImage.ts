export async function fetchImageBlobWithFallback(
  primaryUrl: string,
  fallbackUrl: string | null | undefined,
  signal: AbortSignal,
): Promise<Blob> {
  const candidates: string[] = [
    ...new Set(
      [primaryUrl, fallbackUrl].filter((url): url is string => Boolean(url)),
    ),
  ];
  const failures: Error[] = [];

  const fetchCandidate = async (index: number): Promise<Blob> => {
    const candidate = candidates[index];
    if (!candidate) {
      throw new AggregateError(
        failures,
        "Image download failed from every available source.",
      );
    }

    try {
      const response = await fetch(candidate, { signal });
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
        );
      }
      return await response.blob();
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(
        new Error(`Download source ${index + 1} failed: ${reason}`, {
          cause: error,
        }),
      );
      return fetchCandidate(index + 1);
    }
  };

  // Awaited rather than returned directly so this frame stays on the stack
  // when a candidate rejects, which keeps the AggregateError traceable.
  return await fetchCandidate(0);
}
