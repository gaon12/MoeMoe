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
