import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { fetchRandomImage } from "../../services/imageProviders.ts";
import type { AnimeImage, ImageSource } from "../../types/image.ts";
import type {
  ImageAspectPreference,
  ImageFitMode,
  LetterboxFillMode,
} from "../../types/settings.ts";
import { ImageErrorDialog, ImageMetadataDialog } from "./ImageDialogs.tsx";
import { extractEdgeColor, loadReadableImage } from "./imageProcessing.ts";
import {
  chooseWeightedImageSource,
  shouldAcceptWallpaperCandidate,
  type WallpaperFeedback,
} from "../../utils/wallpaperPreferences.ts";
import {
  capWallpaperAttemptBudget,
  getRemainingWallpaperLoadBudget,
  WALLPAPER_PRELOAD_BUDGET_MS,
  WALLPAPER_PROVIDER_BUDGET_MS,
} from "../../utils/wallpaperLoadBudget.ts";
import { getSafeHttpsUrl } from "../../utils/safeUrl.ts";
import "./ImageBackground.css";

const TRAILING_SLASH_PATTERN = /\/$/;
const LANDSCAPE_MINIMUM_RATIO = 1.05;
const PORTRAIT_MAXIMUM_RATIO = 0.95;
const SQUARE_RATIO_TOLERANCE = 0.12;
const SCREEN_RATIO_TOLERANCE = 0.24;
const TRANSITION_DELAY_MS = 300;
const MIN_WALLPAPER_ATTEMPTS = 3;
const MAX_WALLPAPER_ATTEMPTS = 6;
const COPY_STATE_RESET_DELAY_MS = 2000;

interface ImageBackgroundProps {
  imageSources?: ImageSource[];
  allowNSFW?: boolean;
  imageFitMode?: ImageFitMode;
  imageAspectPreference?: ImageAspectPreference;
  letterboxFillMode?: LetterboxFillMode;
  letterboxCustomColor?: string;
  onImageLoad?: (image: AnimeImage) => void;
  onImageError?: (error: Error) => void;
  excludedUrls?: string[];
  feedback?: WallpaperFeedback[];
}

export interface ImageBackgroundHandle {
  refresh: () => void;
  /** Re-display an already seen wallpaper without contacting a provider. */
  showImage: (image: AnimeImage) => void;
}

export const ImageBackground = ({
  imageSources = ["pic_re"],
  allowNSFW = false,
  imageFitMode = "contain",
  imageAspectPreference = "screen",
  letterboxFillMode = "blur",
  letterboxCustomColor = "#1a1a1a",
  onImageLoad,
  onImageError,
  excludedUrls = [],
  feedback = [],
  ref,
}: ImageBackgroundProps & {
  ref?: RefObject<ImageBackgroundHandle | null>;
}) => {
  const { t } = useTranslation();
  const [currentImage, setCurrentImage] = useState<AnimeImage | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [letterboxColor, setLetterboxColor] = useState<string>("#1a1a1a");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [metadataCopyState, setMetadataCopyState] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  const preloadedImageRef = useRef<HTMLImageElement | null>(null);
  const currentImageRef = useRef<AnimeImage | null>(null);
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const excludedUrlsRef = useRef(excludedUrls);
  const feedbackRef = useRef(feedback);

  useEffect(() => {
    currentImageRef.current = currentImage;
  }, [currentImage]);

  useEffect(() => {
    excludedUrlsRef.current = excludedUrls;
  }, [excludedUrls]);

  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  useEffect(() => {
    if (
      imageFitMode !== "contain" ||
      letterboxFillMode !== "edge-color" ||
      !currentImage
    ) {
      return;
    }

    const controller = new AbortController();
    const updateEdgeColor = async () => {
      try {
        let readableImage = preloadedImageRef.current;
        if (
          !readableImage ||
          (!currentImage.isLocal && readableImage.crossOrigin !== "anonymous")
        ) {
          readableImage = await loadReadableImage(
            currentImage.proxiedUrl ?? currentImage.url,
            controller.signal,
          );
        }
        if (!controller.signal.aborted) {
          setLetterboxColor(extractEdgeColor(readableImage));
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setLetterboxColor("#1a1a1a");
      }
    };

    updateEdgeColor();
    return () => controller.abort();
  }, [currentImage, imageFitMode, letterboxFillMode]);

  const getViewportDimensions = useCallback(
    () => ({
      width: globalThis.innerWidth || document.documentElement.clientWidth || 1,
      height:
        globalThis.innerHeight || document.documentElement.clientHeight || 1,
    }),
    [],
  );

  const matchesAspectPreference = useCallback(
    (img: HTMLImageElement) => {
      if (imageAspectPreference === "any") {
        return true;
      }

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (width <= 0 || height <= 0) {
        return true;
      }

      const ratio = width / height;
      if (imageAspectPreference === "landscape") {
        return ratio > LANDSCAPE_MINIMUM_RATIO;
      }
      if (imageAspectPreference === "portrait") {
        return ratio < PORTRAIT_MAXIMUM_RATIO;
      }
      if (imageAspectPreference === "square") {
        return Math.abs(ratio - 1) <= SQUARE_RATIO_TOLERANCE;
      }

      const viewport = getViewportDimensions();
      const targetRatio = viewport.width / viewport.height;
      return Math.abs(ratio - targetRatio) <= SCREEN_RATIO_TOLERANCE;
    },
    [getViewportDimensions, imageAspectPreference],
  );

  const loadNewImage = useCallback(async () => {
    const loadStartedAt = Date.now();
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    requestSequenceRef.current += 1;
    const requestSequence = requestSequenceRef.current;
    const isStale = () =>
      controller.signal.aborted ||
      requestSequence !== requestSequenceRef.current;

    setHasError(false);
    setErrorMessage(null);
    setCopyState("idle");
    setIsMetadataOpen(false);
    setMetadataCopyState("idle");

    try {
      // Step 1: Start transition - blur current image if one exists
      setIsTransitioning(true);
      await new Promise((resolve) => setTimeout(resolve, TRANSITION_DELAY_MS));
      if (isStale()) {
        return;
      }

      // Step 2: Fetch and preload new image
      const previousUrl = currentImageRef.current?.url;
      const viewport = getViewportDimensions();
      let image: AnimeImage | null = null;
      let loadedImg: HTMLImageElement | null = null;
      let randomSource: ImageSource = imageSources[0] ?? "pic_re";
      // Providers that already failed this load. A provider that is down --
      // blocked by CORS, or simply unreachable -- fails for every attempt, so
      // re-drawing from the full list wasted retries on a known-dead source.
      const failedSources = new Set<ImageSource>();
      // Enough attempts to walk a meaningful part of the enabled list rather
      // than a third of it. The 10s load budget still bounds the wall time,
      // and network failures return immediately, so the extra attempts cost
      // nothing in exactly the case they are there for.
      const maxAttempts = Math.max(
        MIN_WALLPAPER_ATTEMPTS,
        Math.min(MAX_WALLPAPER_ATTEMPTS, imageSources.length),
      );
      const attemptErrors: Error[] = [];

      const runAttempt = async (
        attempt: number,
      ): Promise<"accepted" | "exhausted" | "stale"> => {
        if (attempt >= maxAttempts) {
          return "exhausted";
        }

        let attemptSource: ImageSource | null = null;
        try {
          const providerBudget = capWallpaperAttemptBudget(
            getRemainingWallpaperLoadBudget(loadStartedAt),
            WALLPAPER_PROVIDER_BUDGET_MS,
          );
          if (providerBudget === 0) {
            throw new Error("Wallpaper load time budget was exhausted.");
          }

          const untriedSources = imageSources.filter(
            (source) => !failedSources.has(source),
          );
          randomSource = chooseWeightedImageSource(
            // Falling back to the full list keeps a single-source setup, or
            // one where everything has failed once, retrying rather than
            // giving up early on a transient blip.
            untriedSources.length > 0 ? untriedSources : imageSources,
            feedbackRef.current,
          );
          attemptSource = randomSource;
          const attemptController = new AbortController();
          const handleRequestAbort = () =>
            attemptController.abort(controller.signal.reason);
          controller.signal.addEventListener("abort", handleRequestAbort, {
            once: true,
          });
          const providerTimeoutId = globalThis.setTimeout(
            () =>
              attemptController.abort(
                new Error(
                  `Wallpaper provider timed out after ${providerBudget}ms`,
                ),
              ),
            providerBudget,
          );
          let candidate: AnimeImage;
          try {
            candidate = await fetchRandomImage({
              source: randomSource,
              allowNSFW,
              aspectPreference: imageAspectPreference,
              viewport,
              signal: attemptController.signal,
            });
          } finally {
            globalThis.clearTimeout(providerTimeoutId);
            controller.signal.removeEventListener("abort", handleRequestAbort);
          }
          if (isStale()) {
            return "stale";
          }
          if (excludedUrlsRef.current.includes(candidate.url)) {
            throw new Error(`Wallpaper is excluded: ${candidate.url}`);
          }

          const preloadBudget = capWallpaperAttemptBudget(
            getRemainingWallpaperLoadBudget(loadStartedAt),
            WALLPAPER_PRELOAD_BUDGET_MS,
          );
          if (preloadBudget === 0) {
            throw new Error("Wallpaper load time budget was exhausted.");
          }

          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            let triedProxy = false;
            let timeoutId = 0;
            const cleanup = () => {
              globalThis.clearTimeout(timeoutId);
              controller.signal.removeEventListener("abort", handleAbort);
              img.onload = null;
              img.onerror = null;
            };
            const handleAbort = () => {
              cleanup();
              img.src = "";
              reject(new DOMException("Image load aborted", "AbortError"));
            };
            timeoutId = globalThis.setTimeout(() => {
              cleanup();
              img.src = "";
              reject(new Error(`Image preload timed out: ${candidate.url}`));
            }, preloadBudget);
            controller.signal.addEventListener("abort", handleAbort, {
              once: true,
            });
            img.onload = () => {
              cleanup();
              if (img.src && img.src !== candidate.url) {
                candidate.url = img.src;
              }
              resolve();
            };
            img.onerror = () => {
              if (
                !triedProxy &&
                candidate.proxiedUrl &&
                candidate.proxiedUrl !== candidate.url
              ) {
                triedProxy = true;
                img.crossOrigin = "anonymous";
                img.src = candidate.proxiedUrl;
                return;
              }
              cleanup();
              reject(
                new Error(
                  [
                    "Failed to preload image.",
                    `source: ${randomSource}`,
                    `directUrl: ${candidate.url}`,
                    candidate.proxiedUrl
                      ? `proxiedUrl: ${candidate.proxiedUrl}`
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                ),
              );
            };
            img.src = candidate.url;
          });
          if (isStale()) {
            return "stale";
          }

          image = candidate;
          loadedImg = img;
          const preferenceAccepted = shouldAcceptWallpaperCandidate(
            candidate,
            feedbackRef.current,
            {
              hasPreviousImage: Boolean(previousUrl),
              isFinalAttempt: attempt === maxAttempts - 1,
            },
          );
          if (
            candidate.url !== previousUrl &&
            (candidate.isLocal || matchesAspectPreference(img)) &&
            preferenceAccepted
          ) {
            return "accepted";
          }
        } catch (error) {
          if (isStale()) {
            return "stale";
          }
          if (attemptSource) {
            failedSources.add(attemptSource);
          }
          const reason = error instanceof Error ? error.message : String(error);
          // Naming the provider is what makes a repeated failure diagnosable;
          // three identical "Failed to fetch" lines said nothing about which
          // source was refusing the request.
          attemptErrors.push(
            new Error(`[${attemptSource ?? "unknown"}] ${reason}`, {
              cause: error,
            }),
          );
        }

        return runAttempt(attempt + 1);
      };

      const attemptResult = await runAttempt(0);
      if (attemptResult === "stale") {
        return;
      }

      if (!(image && loadedImg)) {
        throw new AggregateError(
          attemptErrors,
          [
            `No image could be loaded after ${maxAttempts} attempts.`,
            ...attemptErrors.map(
              (attemptError, index) =>
                `Attempt ${index + 1}: ${attemptError.message}`,
            ),
          ].join("\n"),
        );
      }

      // Step 3: Fade to the already preloaded image without an artificial wait.
      preloadedImageRef.current = loadedImg;
      setCurrentImage(image);
      setIsTransitioning(false);
      onImageLoad?.(image);
    } catch (error) {
      if (isStale()) {
        return;
      }
      const lines: string[] = [
        "Failed to load image.",
        `imageSources: ${imageSources.join(", ")}`,
        `allowNSFW: ${allowNSFW}`,
      ];
      if (error instanceof Error && error.message) {
        lines.push("--- inner error ---", error.message);
      }
      setErrorMessage(lines.join("\n"));
      setHasError(true);
      setIsTransitioning(false);
      onImageError?.(error as Error);
    }
  }, [
    imageSources,
    allowNSFW,
    imageAspectPreference,
    onImageLoad,
    onImageError,
    getViewportDimensions,
    matchesAspectPreference,
  ]);

  // Load image on mount and when dependencies change (e.g. sources, NSFW)
  useEffect(() => {
    loadNewImage();
    return () => abortControllerRef.current?.abort();
  }, [loadNewImage]);

  /**
   * Shows a wallpaper the user has already seen, for history navigation.
   *
   * No provider request and no preload: the image was displayed moments ago,
   * so the browser still holds it, and going back should feel instant rather
   * than replay a three-attempt fetch. If the cache has dropped it, the
   * element's own error handler surfaces the usual failure dialog.
   */
  const showImage = useCallback(
    (image: AnimeImage) => {
      // Cancel any in-flight random load so its result cannot land on top of
      // the entry the user just navigated to.
      abortControllerRef.current?.abort();
      requestSequenceRef.current += 1;

      setHasError(false);
      setErrorMessage(null);
      setCopyState("idle");
      setIsMetadataOpen(false);
      setMetadataCopyState("idle");
      // The preloaded element belongs to the outgoing image; edge-colour
      // extraction re-reads the incoming one on demand.
      preloadedImageRef.current = null;
      setIsTransitioning(false);
      setCurrentImage(image);
      onImageLoad?.(image);
    },
    [onImageLoad],
  );

  useImperativeHandle(
    ref,
    () => ({
      refresh: loadNewImage,
      showImage,
    }),
    [loadNewImage, showImage],
  );

  const handleImageLoad = () => {
    setHasError(false);
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    // The preload path already walks direct URL then proxy, but an image put
    // on screen without preloading -- history navigation, or applying a
    // favourite whose provider has since dropped the original -- gets its one
    // retry here.
    const element = event.currentTarget;
    const fallbackUrl = currentImage?.proxiedUrl;
    if (fallbackUrl && element.src !== fallbackUrl) {
      element.crossOrigin = "anonymous";
      element.src = fallbackUrl;
      return;
    }

    setHasError(true);
    const lines: string[] = ["Failed to display image element."];
    if (currentImage) {
      lines.push(`imageUrl: ${currentImage.url}`);
      if (currentImage.sourceUrl) {
        lines.push(`sourceUrl: ${currentImage.sourceUrl}`);
      }
      if (currentImage.animeName) {
        lines.push(`animeName: ${currentImage.animeName}`);
      }
    }
    const error = new Error(lines.join("\n"));
    setErrorMessage(error.message);
    onImageError?.(error);
  };

  const handleCopyError = async () => {
    if (!errorMessage) {
      return;
    }
    try {
      await navigator.clipboard.writeText(errorMessage);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), COPY_STATE_RESET_DELAY_MS);
    } catch {
      setCopyState("failed");
    }
  };

  const handleShowMetadata = () => {
    if (!currentImage) {
      return;
    }
    setMetadataCopyState("idle");
    setIsMetadataOpen(true);
  };
  const handleCloseError = useCallback(() => setHasError(false), []);
  const handleCloseMetadata = useCallback(() => setIsMetadataOpen(false), []);

  const getOriginalUrl = (image: AnimeImage): string =>
    image.sourceUrl || image.artistHref || image.url;

  const getArtworkTitle = (image: AnimeImage): string =>
    image.animeName?.trim() || t("image.attribution.untitled");

  const getArtistName = (image: AnimeImage): string =>
    image.artistName?.trim() || t("image.attribution.unknownArtist");

  const buildMetadataText = (image: AnimeImage): string => {
    const proxyUrl = import.meta.env.VITE_FIX_CORS_API_URL as
      | string
      | undefined;
    let displayUrl = image.url;
    if (proxyUrl && displayUrl.startsWith(proxyUrl)) {
      const encoded = displayUrl.slice(proxyUrl.length);
      try {
        const decoded = decodeURIComponent(encoded);
        if (decoded) {
          displayUrl = decoded;
        }
      } catch {
        // If decode fails, fall back to original value
      }
    }

    const lines: string[] = [
      `url: ${displayUrl}`,
      `animeName: ${image.animeName ?? "N/A"}`,
      `artistName: ${image.artistName ?? "N/A"}`,
      `artistHref: ${image.artistHref ?? "N/A"}`,
      `sourceUrl: ${image.sourceUrl ?? "N/A"}`,
      `dimensions: ${
        image.dimensions
          ? `${image.dimensions.width}x${image.dimensions.height}`
          : "N/A"
      }`,
    ];
    return lines.join("\n");
  };

  const handleCopyMetadata = async () => {
    if (!currentImage) {
      return;
    }
    const text = buildMetadataText(currentImage);
    try {
      await navigator.clipboard.writeText(text);
      setMetadataCopyState("copied");
      setTimeout(() => setMetadataCopyState("idle"), COPY_STATE_RESET_DELAY_MS);
    } catch {
      setMetadataCopyState("failed");
    }
  };

  const githubRepoUrl = getSafeHttpsUrl(import.meta.env.VITE_GITHUB_REPO_URL);
  const normalizedRepoUrl = githubRepoUrl?.replace(TRAILING_SLASH_PATTERN, "");
  const githubIssueUrl = normalizedRepoUrl
    ? `${normalizedRepoUrl}/issues/new?title=${encodeURIComponent(
        t("image.error.issueTitle"),
      )}&body=${encodeURIComponent(
        `${t("image.error.issueBodyLabel")}:\n\n${errorMessage ?? t("image.error.unknown")}`,
      )}`
    : null;

  let letterboxBackgroundColor = "transparent";
  if (letterboxFillMode === "custom") {
    letterboxBackgroundColor = letterboxCustomColor;
  } else if (letterboxFillMode === "edge-color") {
    letterboxBackgroundColor = letterboxColor;
  } else if (letterboxFillMode === "solid") {
    letterboxBackgroundColor = "#000000";
  }

  /**
   * `cover` fills the viewport by cropping, and anchoring to the top keeps
   * subjects -- which in this artwork sit near the top -- in frame. `contain`
   * fits the whole image and letterboxes the remainder, so it has to be
   * centred: anchoring to the top puts the entire bar along the bottom edge.
   */
  const objectPosition =
    imageFitMode === "cover" ? "center top" : "center center";

  return (
    <>
      <div className="image-background">
        {/* Background overlay - rendered first with pointer-events: none */}
        <div className="background-overlay" />

        {/* Initial demo image from public/demo while API image loads */}
        {currentImage ? null : (
          <picture>
            <source srcSet="/demo/demo.avif" type="image/avif" />
            <img
              src="/demo/demo.webp"
              alt="Demo background"
              className="background-image"
              style={{ objectFit: imageFitMode, objectPosition }}
            />
          </picture>
        )}

        {currentImage ? (
          <>
            {/* Letterbox background layer for 'contain' mode */}
            {imageFitMode === "contain" && (
              <div
                className="letterbox-background"
                style={{
                  backgroundColor: letterboxBackgroundColor,
                  backgroundImage:
                    letterboxFillMode === "blur"
                      ? `url(${currentImage.url})`
                      : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter:
                    letterboxFillMode === "blur"
                      ? "blur(50px) brightness(0.5)"
                      : "none",
                }}
              />
            )}

            <img
              src={currentImage.url}
              alt="Anime Background"
              className={`background-image ${isTransitioning ? "transitioning" : ""}`}
              style={{ objectFit: imageFitMode, objectPosition }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              aria-hidden="true"
            />
            <div className="image-attribution">
              {currentImage.isLocal ? (
                <span className="artwork-link">
                  <span className="artwork-title">
                    {getArtworkTitle(currentImage)}
                  </span>
                  <span className="artwork-separator"> - </span>
                  <span className="artwork-artist">
                    {getArtistName(currentImage)}
                  </span>
                </span>
              ) : (
                <a
                  href={getOriginalUrl(currentImage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="artwork-link"
                  title={t("image.attribution.openOriginal")}
                  aria-label={t("image.attribution.openOriginal")}
                >
                  <span className="artwork-title">
                    {getArtworkTitle(currentImage)}
                  </span>
                  <span className="artwork-separator"> - </span>
                  <span className="artwork-artist">
                    {getArtistName(currentImage)}
                  </span>
                </a>
              )}
              {!(currentImage.animeName || currentImage.artistName) && (
                <button
                  type="button"
                  className="metadata-link-button"
                  onClick={handleShowMetadata}
                  aria-label={t("image.metadata.title")}
                />
              )}
            </div>
          </>
        ) : null}
      </div>
      <ImageErrorDialog
        isOpen={hasError}
        errorMessage={errorMessage}
        copyState={copyState}
        githubIssueUrl={githubIssueUrl}
        onCopy={handleCopyError}
        onRetry={loadNewImage}
        onClose={handleCloseError}
      />
      <ImageMetadataDialog
        isOpen={isMetadataOpen && Boolean(currentImage)}
        metadataText={currentImage ? buildMetadataText(currentImage) : ""}
        copyState={metadataCopyState}
        onCopy={handleCopyMetadata}
        onClose={handleCloseMetadata}
      />
    </>
  );
};
