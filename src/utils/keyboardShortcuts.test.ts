// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  isInteractiveShortcutTarget,
  shouldIgnoreGlobalShortcut,
} from "./keyboardShortcuts";

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
