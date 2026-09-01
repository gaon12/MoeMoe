const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='option']",
].join(",");

/**
 * Keyed by `KeyboardEvent.key`, which respects the user's keyboard layout.
 * This is the primary lookup so a Dvorak or AZERTY user gets the shortcut
 * printed on the key they actually pressed.
 */
const SHORTCUTS_BY_KEY: Record<string, GlobalShortcut> = {
  " ": "refresh",
  r: "refresh",
  f: "fullscreen",
  p: "togglePause",
  s: "openSettings",
  arrowleft: "historyBack",
  arrowright: "historyForward",
};

/**
 * Keyed by `KeyboardEvent.code`, which reports the physical key regardless of
 * the active input method. Consulted only when `key` carries no Latin
 * meaning.
 */
const SHORTCUTS_BY_CODE: Record<string, GlobalShortcut> = {
  Space: "refresh",
  KeyR: "refresh",
  KeyF: "fullscreen",
  KeyP: "togglePause",
  KeyS: "openSettings",
  ArrowLeft: "historyBack",
  ArrowRight: "historyForward",
};

const LATIN_SHORTCUT_KEY_PATTERN = /^[a-z]$/i;

function carriesLatinMeaning(key: string): boolean {
  return key === " " || LATIN_SHORTCUT_KEY_PATTERN.test(key);
}

export function isInteractiveShortcutTarget(target: EventTarget | null) {
  return (
    target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR))
  );
}

export function shouldIgnoreGlobalShortcut(
  event: KeyboardEvent,
  isSettingsOpen: boolean,
) {
  return (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    isSettingsOpen ||
    document.querySelector('[aria-modal="true"]') !== null ||
    isInteractiveShortcutTarget(event.target)
  );
}

/**
 * Resolves a keypress to an action.
 *
 * With a Hangul, Kana or other non-Latin input method active, `key` reports
 * the composed character -- `ㄱ` rather than `r` -- so a `key`-only binding
 * silently stops working for exactly the users this interface is translated
 * for. Falling back to the physical `code` restores it.
 *
 * The fallback is deliberately not consulted first. On a non-QWERTY Latin
 * layout `code` names the QWERTY position rather than the printed legend, so
 * preferring it would fire the wrong action for a key the user can read.
 */
export function resolveGlobalShortcut(
  event: Pick<KeyboardEvent, "key" | "code">,
): GlobalShortcut | null {
  const byKey = SHORTCUTS_BY_KEY[event.key.toLowerCase()];
  if (byKey) {
    return byKey;
  }
  if (carriesLatinMeaning(event.key)) {
    return null;
  }
  return SHORTCUTS_BY_CODE[event.code] ?? null;
}

/** Actions the application binds to a bare keypress. */
export type GlobalShortcut =
  | "refresh"
  | "fullscreen"
  | "togglePause"
  | "openSettings"
  | "historyBack"
  | "historyForward";
