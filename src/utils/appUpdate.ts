const GITHUB_REPOSITORY_PATH_PATTERN = /^\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

/** How long to leave the notice up before reloading. */
export const UPDATE_RELOAD_DELAY_MS = 10 * 60 * 1000;

/** Gap between checks. Well inside GitHub's unauthenticated hourly limit. */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** Delay before the first check, so it never races the first wallpaper. */
export const UPDATE_FIRST_CHECK_DELAY_MS = 60 * 1000;

/**
 * How long to wait before reloading again for a commit that a previous reload
 * failed to pick up.
 *
 * `dist` is uploaded by hand, so the repository legitimately runs ahead of
 * what is deployed. Without this, every check would find a difference, reload,
 * come back on the same build, and do it again -- a reload loop driven by a
 * state the viewer cannot fix. Waiting instead means a deployment that lands
 * mid-session is still picked up, just not immediately.
 */
export const UPDATE_RELOAD_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export const UPDATE_STORAGE_KEY = "moemoe-update-attempt";

export interface GithubRepository {
  owner: string;
  name: string;
}

export interface UpdateReloadAttempt {
  sha: string;
  reloadedAt: number;
}

export type UpdateDecision = "unknown" | "current" | "reload" | "cooling-down";

/** Extracts `owner/name` from a GitHub repository URL. */
export function parseGithubRepository(
  repositoryUrl: string | undefined,
): GithubRepository | null {
  if (!repositoryUrl) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(repositoryUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    return null;
  }

  const match = GITHUB_REPOSITORY_PATH_PATTERN.exec(url.pathname);
  const owner = match?.[1];
  const name = match?.[2];
  return owner && name ? { owner, name } : null;
}

/**
 * The default branch's newest commit. Asking for the commit list rather than a
 * named ref means the branch does not have to be known or kept in sync.
 */
export function buildLatestCommitUrl(repository: GithubRepository): string {
  return `https://api.github.com/repos/${encodeURIComponent(
    repository.owner,
  )}/${encodeURIComponent(repository.name)}/commits?per_page=1`;
}

export function parseLatestCommitSha(payload: unknown): string | null {
  const [entry] = Array.isArray(payload) ? payload : [];
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const { sha } = entry as { sha?: unknown };
  return typeof sha === "string" && COMMIT_SHA_PATTERN.test(sha) ? sha : null;
}

/**
 * True when two SHAs name different commits.
 *
 * Comparison is over the shorter of the two, so a short SHA supplied through
 * `VITE_APP_COMMIT` still matches the full one the API returns.
 */
export function isDifferentCommit(local: string, remote: string): boolean {
  if (!(COMMIT_SHA_PATTERN.test(local) && COMMIT_SHA_PATTERN.test(remote))) {
    return false;
  }
  const length = Math.min(local.length, remote.length);
  return (
    local.slice(0, length).toLowerCase() !==
    remote.slice(0, length).toLowerCase()
  );
}

export function decideUpdateAction(input: {
  localCommit: string;
  remoteCommit: string | null;
  lastAttempt: UpdateReloadAttempt | null;
  now?: number;
}): UpdateDecision {
  const { localCommit, remoteCommit, lastAttempt, now = Date.now() } = input;

  if (!(remoteCommit && COMMIT_SHA_PATTERN.test(localCommit))) {
    return "unknown";
  }
  if (!isDifferentCommit(localCommit, remoteCommit)) {
    return "current";
  }
  if (
    lastAttempt &&
    !isDifferentCommit(lastAttempt.sha, remoteCommit) &&
    now - lastAttempt.reloadedAt < UPDATE_RELOAD_COOLDOWN_MS
  ) {
    return "cooling-down";
  }
  return "reload";
}

export function parseUpdateReloadAttempt(
  raw: string | null,
): UpdateReloadAttempt | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const { sha, reloadedAt } = parsed as {
      sha?: unknown;
      reloadedAt?: unknown;
    };
    if (
      typeof sha !== "string" ||
      !COMMIT_SHA_PATTERN.test(sha) ||
      typeof reloadedAt !== "number" ||
      !Number.isFinite(reloadedAt)
    ) {
      return null;
    }
    return { sha, reloadedAt };
  } catch {
    return null;
  }
}
