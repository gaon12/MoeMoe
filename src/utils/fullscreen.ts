/**
 * Safari exposed the Fullscreen API under a `webkit` prefix until 16.4, and
 * iPhone Safari has never supported it on anything but a `<video>` element.
 * These declare the prefixed members so they can be used without casting at
 * every call site.
 */
interface PrefixedDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface PrefixedElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

/** iOS marks a home-screen launch here rather than through display-mode. */
interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

/**
 * What the fullscreen control can actually do here.
 *
 * - `native`: the Fullscreen API works.
 * - `installed`: already running without browser chrome, so there is nothing
 *   to toggle.
 * - `unavailable`: no API and not installed. This is an iPhone Safari tab,
 *   where a page cannot remove the address bar by any means.
 */
type FullscreenCapability = "native" | "installed" | "unavailable";

const STANDALONE_DISPLAY_QUERIES = [
  "(display-mode: fullscreen)",
  "(display-mode: standalone)",
  "(display-mode: minimal-ui)",
] as const;

/**
 * Both spellings of the change event. Safari below 16.4 emits only the
 * prefixed one, so a listener on the standard name alone never fires and the
 * button's icon silently stops reflecting reality.
 */
const FULLSCREEN_CHANGE_EVENTS = [
  "fullscreenchange",
  "webkitfullscreenchange",
] as const;

function getFullscreenElement(doc: Document = document): Element | null {
  const prefixed = doc as PrefixedDocument;
  return doc.fullscreenElement ?? prefixed.webkitFullscreenElement ?? null;
}

/**
 * Whether the browser will actually take this element fullscreen.
 *
 * Both halves matter. `fullscreenEnabled` is `false` on iPhone Safari even
 * though the document object has the property, and the request method is
 * missing entirely on older builds -- where calling it throws a `TypeError`
 * synchronously rather than returning a promise that can be caught.
 */
function isNativeFullscreenAvailable(
  element: HTMLElement,
  doc: Document = document,
): boolean {
  const prefixedDoc = doc as PrefixedDocument;
  const enabled =
    prefixedDoc.fullscreenEnabled ??
    prefixedDoc.webkitFullscreenEnabled ??
    false;
  const prefixedElement = element as PrefixedElement;
  const request =
    element.requestFullscreen ?? prefixedElement.webkitRequestFullscreen;
  return enabled && typeof request === "function";
}

/**
 * Asks for fullscreen, reporting whether the request was accepted rather than
 * throwing. `false` means the caller should fall back.
 *
 * The request is issued before the first `await`, so it stays inside the user
 * gesture that triggered it.
 */
async function requestFullscreen(element: HTMLElement): Promise<boolean> {
  const prefixedElement = element as PrefixedElement;
  const request =
    element.requestFullscreen ?? prefixedElement.webkitRequestFullscreen;
  if (typeof request !== "function") {
    return false;
  }

  try {
    await request.call(element);
    return true;
  } catch {
    return false;
  }
}

async function exitFullscreen(doc: Document = document): Promise<void> {
  const prefixed = doc as PrefixedDocument;
  const exit = doc.exitFullscreen ?? prefixed.webkitExitFullscreen;
  if (typeof exit === "function") {
    await exit.call(doc);
  }
}

/** Whether the page is running installed, outside a browser tab. */
function isStandaloneDisplay(view: Window = globalThis as unknown as Window) {
  if ((view.navigator as StandaloneNavigator | undefined)?.standalone) {
    return true;
  }
  return STANDALONE_DISPLAY_QUERIES.some(
    (query) => view.matchMedia?.(query).matches ?? false,
  );
}

function resolveFullscreenCapability(
  element: HTMLElement,
  doc: Document = document,
  view: Window = globalThis as unknown as Window,
): FullscreenCapability {
  if (isNativeFullscreenAvailable(element, doc)) {
    return "native";
  }
  // Checked second: an installed iPad app has both, and the real API is the
  // better answer there.
  return isStandaloneDisplay(view) ? "installed" : "unavailable";
}

export {
  exitFullscreen,
  FULLSCREEN_CHANGE_EVENTS,
  getFullscreenElement,
  isNativeFullscreenAvailable,
  isStandaloneDisplay,
  requestFullscreen,
  resolveFullscreenCapability,
};
export type { FullscreenCapability };
