// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  isInteractiveShortcutTarget,
  resolveGlobalShortcut,
  shouldIgnoreGlobalShortcut,
} from "./keyboardShortcuts.ts";

describe("global keyboard shortcut guards", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("recognizes native and ARIA interactive controls", () => {
    const wrapper = document.createElement("div");
    const button = document.createElement("button");
    const buttonIcon = document.createElement("span");
    button.append(buttonIcon);
    wrapper.append(button);

    expect(isInteractiveShortcutTarget(buttonIcon)).toBe(true);

    const tab = document.createElement("div");
    tab.setAttribute("role", "tab");
    expect(isInteractiveShortcutTarget(tab)).toBe(true);
    expect(isInteractiveShortcutTarget(wrapper)).toBe(false);
  });

  it("ignores shortcuts while settings or another modal is open", () => {
    const event = new KeyboardEvent("keydown", { key: " " });
    expect(shouldIgnoreGlobalShortcut(event, true)).toBe(true);

    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.append(modal);
    expect(shouldIgnoreGlobalShortcut(event, false)).toBe(true);
  });

  it("ignores repeated, composing, and modified keystrokes", () => {
    expect(
      shouldIgnoreGlobalShortcut(
        new KeyboardEvent("keydown", { key: "r", repeat: true }),
        false,
      ),
    ).toBe(true);
    expect(
      shouldIgnoreGlobalShortcut(
        new KeyboardEvent("keydown", { key: "r", ctrlKey: true }),
        false,
      ),
    ).toBe(true);
    expect(
      shouldIgnoreGlobalShortcut(
        new KeyboardEvent("keydown", { key: "r", isComposing: true }),
        false,
      ),
    ).toBe(true);
  });

  it("allows unmodified shortcuts on the page surface", () => {
    expect(
      shouldIgnoreGlobalShortcut(
        new KeyboardEvent("keydown", { key: "r" }),
        false,
      ),
    ).toBe(false);
  });
});

describe("resolveGlobalShortcut", () => {
  it("maps the documented keys on a Latin layout", () => {
    expect(resolveGlobalShortcut({ key: "r", code: "KeyR" })).toBe("refresh");
    expect(resolveGlobalShortcut({ key: " ", code: "Space" })).toBe("refresh");
    expect(resolveGlobalShortcut({ key: "f", code: "KeyF" })).toBe(
      "fullscreen",
    );
    expect(resolveGlobalShortcut({ key: "p", code: "KeyP" })).toBe(
      "togglePause",
    );
    expect(resolveGlobalShortcut({ key: "s", code: "KeyS" })).toBe(
      "openSettings",
    );
  });

  it("accepts uppercase key values from a held shift", () => {
    expect(resolveGlobalShortcut({ key: "R", code: "KeyR" })).toBe("refresh");
    expect(resolveGlobalShortcut({ key: "S", code: "KeyS" })).toBe(
      "openSettings",
    );
  });

  it("maps the history arrows", () => {
    expect(resolveGlobalShortcut({ key: "ArrowLeft", code: "ArrowLeft" })).toBe(
      "historyBack",
    );
    expect(
      resolveGlobalShortcut({ key: "ArrowRight", code: "ArrowRight" }),
    ).toBe("historyForward");
  });

  it("falls back to the physical key under a Hangul input method", () => {
    expect(resolveGlobalShortcut({ key: "기", code: "KeyR" })).toBe("refresh");
    expect(resolveGlobalShortcut({ key: "ㄴ", code: "KeyS" })).toBe(
      "openSettings",
    );
  });

  it("falls back to the physical key under a Kana input method", () => {
    expect(resolveGlobalShortcut({ key: "す", code: "KeyR" })).toBe("refresh");
  });

  it("honours the printed legend rather than the position on Dvorak", () => {
    // The physically-R key on Dvorak produces "p", which the user reads as
    // pause. Preferring `code` here would have refreshed instead.
    expect(resolveGlobalShortcut({ key: "p", code: "KeyR" })).toBe(
      "togglePause",
    );
  });

  it("returns null for unbound keys", () => {
    expect(resolveGlobalShortcut({ key: "q", code: "KeyQ" })).toBeNull();
    expect(resolveGlobalShortcut({ key: "Enter", code: "Enter" })).toBeNull();
    expect(resolveGlobalShortcut({ key: "아", code: "KeyQ" })).toBeNull();
  });
});
