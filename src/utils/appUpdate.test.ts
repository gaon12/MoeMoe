import { describe, expect, it } from "vitest";
import {
  buildLatestCommitUrl,
  decideUpdateAction,
  isDifferentCommit,
  parseGithubRepository,
  parseLatestCommitSha,
  parseUpdateReloadAttempt,
  UPDATE_RELOAD_COOLDOWN_MS,
} from "./appUpdate.ts";

const LOCAL = "a".repeat(40);
const REMOTE = "b".repeat(40);

describe("parseGithubRepository", () => {
  it("reads the owner and repository name", () => {
    expect(parseGithubRepository("https://github.com/gaon12/MoeMoe")).toEqual({
      owner: "gaon12",
      name: "MoeMoe",
    });
  });

  it("tolerates a trailing slash and a .git suffix", () => {
    expect(parseGithubRepository("https://github.com/gaon12/MoeMoe/")).toEqual({
      owner: "gaon12",
      name: "MoeMoe",
    });
    expect(
      parseGithubRepository("https://github.com/gaon12/MoeMoe.git"),
    ).toEqual({ owner: "gaon12", name: "MoeMoe" });
  });

  it("rejects anything that is not an https github repository URL", () => {
    expect(parseGithubRepository("http://github.com/gaon12/MoeMoe")).toBeNull();
    expect(
      parseGithubRepository("https://gitlab.com/gaon12/MoeMoe"),
    ).toBeNull();
    expect(parseGithubRepository("https://github.com/gaon12")).toBeNull();
    expect(parseGithubRepository("not a url")).toBeNull();
    expect(parseGithubRepository(undefined)).toBeNull();
  });
});

describe("buildLatestCommitUrl", () => {
  it("asks for the newest commit on the default branch", () => {
    expect(buildLatestCommitUrl({ owner: "gaon12", name: "MoeMoe" })).toBe(
      "https://api.github.com/repos/gaon12/MoeMoe/commits?per_page=1",
    );
  });
});

describe("parseLatestCommitSha", () => {
  it("reads the sha of the first entry", () => {
    expect(parseLatestCommitSha([{ sha: LOCAL }, { sha: REMOTE }])).toBe(LOCAL);
  });

  it("rejects payloads that are not a commit list", () => {
    expect(parseLatestCommitSha([])).toBeNull();
    expect(parseLatestCommitSha({ sha: LOCAL })).toBeNull();
    expect(parseLatestCommitSha(null)).toBeNull();
    expect(parseLatestCommitSha([{ sha: "not-a-sha" }])).toBeNull();
    expect(parseLatestCommitSha([{}])).toBeNull();
  });
});

describe("isDifferentCommit", () => {
  it("compares two full shas", () => {
    expect(isDifferentCommit(LOCAL, REMOTE)).toBe(true);
    expect(isDifferentCommit(LOCAL, LOCAL)).toBe(false);
  });

  it("ignores case", () => {
    expect(isDifferentCommit(LOCAL.toUpperCase(), LOCAL)).toBe(false);
  });

  it("matches a short sha against a full one", () => {
    expect(isDifferentCommit(LOCAL.slice(0, 7), LOCAL)).toBe(false);
    expect(isDifferentCommit(REMOTE.slice(0, 7), LOCAL)).toBe(true);
  });

  it("treats unusable values as not different, never as an update", () => {
    expect(isDifferentCommit("", REMOTE)).toBe(false);
    expect(isDifferentCommit("unknown", REMOTE)).toBe(false);
  });
});

describe("decideUpdateAction", () => {
  it("does nothing without a usable pair of commits", () => {
    expect(
      decideUpdateAction({
        localCommit: "",
        remoteCommit: REMOTE,
        lastAttempt: null,
      }),
    ).toBe("unknown");
    expect(
      decideUpdateAction({
        localCommit: LOCAL,
        remoteCommit: null,
        lastAttempt: null,
      }),
    ).toBe("unknown");
  });

  it("reports a matching build as current", () => {
    expect(
      decideUpdateAction({
        localCommit: LOCAL,
        remoteCommit: LOCAL,
        lastAttempt: null,
      }),
    ).toBe("current");
  });

  it("schedules a reload when the repository has moved on", () => {
    expect(
      decideUpdateAction({
        localCommit: LOCAL,
        remoteCommit: REMOTE,
        lastAttempt: null,
      }),
    ).toBe("reload");
  });

  it("does not reload again for a commit a reload already failed to pick up", () => {
    // `dist` is uploaded by hand, so the repository can sit ahead of the
    // deployment indefinitely. Reloading again would just come back on the
    // same build and repeat, forever.
    expect(
      decideUpdateAction({
        localCommit: LOCAL,
        remoteCommit: REMOTE,
        lastAttempt: { sha: REMOTE, reloadedAt: 1000 },
        now: 1000 + UPDATE_RELOAD_COOLDOWN_MS - 1,
      }),
    ).toBe("cooling-down");
  });

  it("tries again once the cooldown has passed", () => {
    // The deployment may have caught up in the meantime.
    expect(
      decideUpdateAction({
        localCommit: LOCAL,
        remoteCommit: REMOTE,
        lastAttempt: { sha: REMOTE, reloadedAt: 1000 },
        now: 1000 + UPDATE_RELOAD_COOLDOWN_MS,
      }),
    ).toBe("reload");
  });

  it("reloads immediately for a commit newer than the failed one", () => {
    expect(
      decideUpdateAction({
        localCommit: LOCAL,
        remoteCommit: REMOTE,
        lastAttempt: { sha: "c".repeat(40), reloadedAt: Date.now() },
      }),
    ).toBe("reload");
  });
});

describe("parseUpdateReloadAttempt", () => {
  it("round-trips a stored attempt", () => {
    expect(
      parseUpdateReloadAttempt(
        JSON.stringify({ sha: REMOTE, reloadedAt: 1234 }),
      ),
    ).toEqual({ sha: REMOTE, reloadedAt: 1234 });
  });

  it("discards anything malformed", () => {
    expect(parseUpdateReloadAttempt(null)).toBeNull();
    expect(parseUpdateReloadAttempt("{")).toBeNull();
    expect(
      parseUpdateReloadAttempt(JSON.stringify({ sha: REMOTE })),
    ).toBeNull();
    expect(
      parseUpdateReloadAttempt(
        JSON.stringify({ sha: "nope", reloadedAt: 1234 }),
      ),
    ).toBeNull();
  });
});
