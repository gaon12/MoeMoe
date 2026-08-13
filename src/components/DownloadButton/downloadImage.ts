export async function fetchImageBlobWithFallback(
  primaryUrl: string,
  fallbackUrl: string | null | undefined,
  signal: AbortSignal,
): Promise<Blob> {
  const candidates = [...new Set([primaryUrl, fallbackUrl].filter(Boolean))] as
    [string] | [string, string];
  const failures: Error[] = [];

  for (const [index, candidate] of candidates.entries()) {
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
    }
  }

  throw new AggregateError(
    failures,
    "Image download failed from every available source.",
  );
}
