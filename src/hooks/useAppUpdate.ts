import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildLatestCommitUrl,
  decideUpdateAction,
  parseGithubRepository,
  parseLatestCommitSha,
  parseUpdateReloadAttempt,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_FIRST_CHECK_DELAY_MS,
  UPDATE_RELOAD_DELAY_MS,
  UPDATE_STORAGE_KEY,
} from "../utils/appUpdate.ts";
import { fetchWithTimeout } from "../utils/fetchWithTimeout.ts";

/** Injected by Vite; an empty string when the build has no known commit. */
declare const __APP_COMMIT__: string;

const COUNTDOWN_TICK_MS = 1000;

function readLastAttempt() {
  try {
    return parseUpdateReloadAttempt(localStorage.getItem(UPDATE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function recordReloadAttempt(sha: string) {
  try {
    localStorage.setItem(
      UPDATE_STORAGE_KEY,
      JSON.stringify({ sha, reloadedAt: Date.now() }),
    );
  } catch {
    // Without storage the cooldown cannot be remembered, and the check simply
    // behaves as it would have before the cooldown existed.
  }
}

/**
 * Watches the repository for a commit newer than the one this bundle was built
 * from, then reloads after a notice period.
 *
 * The build's commit is compiled in by Vite. When it is unavailable -- a build
 * from a source tarball, or one made outside a git checkout -- the check stays
 * off rather than comparing against a value it had to invent.
 */
export function useAppUpdate(enabled: boolean) {
  // Fixed instant the reload happens at, or null while none is scheduled.
  // Storing the deadline rather than the remaining time keeps the countdown
  // effect from restarting itself on every tick.
  const [reloadDeadline, setReloadDeadline] = useState<number | null>(null);
  const [msRemaining, setMsRemaining] = useState(UPDATE_RELOAD_DELAY_MS);
  const pendingShaRef = useRef<string | null>(null);

  const applyUpdate = useCallback(() => {
    const sha = pendingShaRef.current;
    // biome-ignore lint/suspicious/noUnnecessaryConditions: Biome does not track writes through ref.current, so it reads this as always set; it is null when the user reloads before any update is detected.
    if (sha) {
      // Recorded before reloading, so a deployment that has not caught up
      // cannot put the page into a reload loop.
      recordReloadAttempt(sha);
    }

    const reload = () => globalThis.location.reload();

    // Have the worker re-check itself first. Navigations are network-first so
    // the reload gets fresh HTML either way, but this picks up a new worker in
    // the same pass rather than the one after.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => registration.update())
        .then(reload, reload);
      return;
    }
    reload();
  }, []);

  // `import.meta.env` is fixed at build time, so this is resolved once. A
  // fresh object each render would restart the polling effect every render.
  const repository = useMemo(
    () => parseGithubRepository(import.meta.env.VITE_GITHUB_REPO_URL),
    [],
  );
  const isCheckable = enabled && Boolean(repository) && Boolean(__APP_COMMIT__);

  useEffect(() => {
    if (!(isCheckable && repository)) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const check = async () => {
      // Nothing to do while the tab is hidden: the notice would go unseen, and
      // checking again once it is visible costs one request.
      if (document.visibilityState !== "visible" || pendingShaRef.current) {
        return;
      }

      try {
        const response = await fetchWithTimeout(
          buildLatestCommitUrl(repository),
          {
            headers: { Accept: "application/vnd.github+json" },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          return;
        }

        const remoteCommit = parseLatestCommitSha(await response.json());
        if (cancelled) {
          return;
        }

        const decision = decideUpdateAction({
          localCommit: __APP_COMMIT__,
          remoteCommit,
          lastAttempt: readLastAttempt(),
        });
        if (decision !== "reload" || !remoteCommit) {
          return;
        }

        pendingShaRef.current = remoteCommit;
        setMsRemaining(UPDATE_RELOAD_DELAY_MS);
        setReloadDeadline(Date.now() + UPDATE_RELOAD_DELAY_MS);
      } catch {
        // An unreachable or rate-limited API is not worth surfacing. The next
        // check tries again.
      }
    };

    const firstCheck = setTimeout(() => {
      check().catch(() => undefined);
    }, UPDATE_FIRST_CHECK_DELAY_MS);
    const interval = setInterval(() => {
      check().catch(() => undefined);
    }, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(firstCheck);
      clearInterval(interval);
    };
  }, [isCheckable, repository]);

  useEffect(() => {
    if (reloadDeadline === null) {
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, reloadDeadline - Date.now());
      setMsRemaining(remaining);
      if (remaining === 0) {
        applyUpdate();
      }
    };

    // Driven off wall-clock time rather than counted down, so a laptop that
    // slept through the notice period reloads on wake instead of resuming a
    // stale count.
    const timer = setInterval(tick, COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [reloadDeadline, applyUpdate]);

  return {
    isUpdatePending: reloadDeadline !== null,
    msRemaining,
    applyUpdate,
  };
}
