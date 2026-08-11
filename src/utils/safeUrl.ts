export function getSafeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function isSafeHttpsUrl(value: unknown): value is string {
  return getSafeHttpsUrl(value) !== undefined;
}

export function isSafeImageUrl(
  value: unknown,
  isLocal = false,
): value is string {
  if (typeof value !== "string") return false;
  if (isLocal) return value.startsWith("blob:");
  return isSafeHttpsUrl(value);
}
