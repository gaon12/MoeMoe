import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useTranslation } from "react-i18next";
import { fetchRandomImage } from "../../services/imageApi";
import { type AnimeImage, type ImageSource } from "../../types/image";
import {
  type ImageAspectPreference,
  type ImageFitMode,
  type LetterboxFillMode,
} from "../../types/settings";
import { ImageErrorDialog, ImageMetadataDialog } from "./ImageDialogs";
import { extractEdgeColor } from "./imageProcessing";
import {
  chooseWeightedImageSource,
  shouldAcceptWallpaperCandidate,
  type WallpaperFeedback,
} from "../../utils/wallpaperPreferences";
import {
  capWallpaperAttemptBudget,
  getRemainingWallpaperLoadBudget,
  WALLPAPER_PRELOAD_BUDGET_MS,
  WALLPAPER_PROVIDER_BUDGET_MS,
} from "../../utils/wallpaperLoadBudget";
import { getSafeHttpsUrl } from "../../utils/safeUrl";
import "./ImageBackground.css";

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
}

export const ImageBackground = forwardRef<
  ImageBackgroundHandle,
  ImageBackgroundProps
>(
  (
    {
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
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const [currentImage, setCurrentImage] = useState<AnimeImage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
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
    const imageRef = useRef<HTMLImageElement>(null);
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

    const getViewportDimensions = useCallback(
      () => ({
        width: window.innerWidth || document.documentElement.clientWidth || 1,
        height:
          window.innerHeight || document.documentElement.clientHeight || 1,
      }),
      [],
    );

    const matchesAspectPreference = useCallback(
      (img: HTMLImageElement) => {
        if (imageAspectPreference === "any") return true;

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (width <= 0 || height <= 0) return true;

        const ratio = width / height;
        if (imageAspectPreference === "landscape") return ratio > 1.05;
        if (imageAspectPreference === "portrait") return ratio < 0.95;
        if (imageAspectPreference === "square")
          return Math.abs(ratio - 1) <= 0.12;

        const viewport = getViewportDimensions();
        const targetRatio = viewport.width / viewport.height;
        return Math.abs(ratio - targetRatio) <= 0.24;
      },
      [getViewportDimensions, imageAspectPreference],
    );

    const loadNewImage = useCallback(async () => {
      const loadStartedAt = Date.now();
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestSequence = ++requestSequenceRef.current;
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
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (isStale()) return;

        setIsLoading(true);

        // Step 2: Fetch and preload new image
        const previousUrl = currentImageRef.current?.url;
        const viewport = getViewportDimensions();
        let image: AnimeImage | null = null;
        let loadedImg: HTMLImageElement | null = null;
        let randomSource: ImageSource = imageSources[0] ?? "pic_re";
        const maxAttempts = 3;
        const attemptErrors: Error[] = [];

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          try {
            const providerBudget = capWallpaperAttemptBudget(
              getRemainingWallpaperLoadBudget(loadStartedAt),
              WALLPAPER_PROVIDER_BUDGET_MS,
            );
            if (providerBudget === 0) {
              throw new Error("Wallpaper load time budget was exhausted.");
            }

            randomSource = chooseWeightedImageSource(
              imageSources,
              feedbackRef.current,
            );
            const attemptController = new AbortController();
            const handleRequestAbort = () =>
              attemptController.abort(controller.signal.reason);
            controller.signal.addEventListener("abort", handleRequestAbort, {
              once: true,
            });
            const providerTimeoutId = window.setTimeout(
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
              window.clearTimeout(providerTimeoutId);
              controller.signal.removeEventListener(
                "abort",
                handleRequestAbort,
              );
            }
            if (isStale()) return;
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
                window.clearTimeout(timeoutId);
                controller.signal.removeEventListener("abort", handleAbort);
                img.onload = null;
                img.onerror = null;
              };
              const handleAbort = () => {
                cleanup();
                img.src = "";
                reject(new DOMException("Image load aborted", "AbortError"));
              };
              timeoutId = window.setTimeout(() => {
                cleanup();
                img.src = "";
                reject(new Error(`Image preload timed out: ${candidate.url}`));
              }, preloadBudget);
              controller.signal.addEventListener("abort", handleAbort, {
                once: true,
              });
              img.onload = () => {
                cleanup();
                if (img.src && img.src !== candidate.url)
                  candidate.url = img.src;
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
            if (isStale()) return;

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
              break;
            }
          } catch (error) {
            if (isStale()) return;
            attemptErrors.push(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
        }

        if (!image || !loadedImg) {
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
        setCurrentImage(image);
        setIsLoading(false);
        setIsTransitioning(false);
        onImageLoad?.(image);
      } catch (error) {
        if (isStale()) return;
        console.error("Failed to load image:", error);
        const lines: string[] = [
          "Failed to load image.",
          `imageSources: ${imageSources.join(", ")}`,
          `allowNSFW: ${allowNSFW}`,
        ];
        if (error instanceof Error && error.message) {
          lines.push("--- inner error ---", error.message);
        }
        setErrorMessage(lines.join("\n"));
        setIsLoading(false);
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

    useImperativeHandle(
      ref,
      () => ({
        refresh: loadNewImage,
      }),
      [loadNewImage],
    );

    const handleImageLoad = () => {
      if (!isLoading) return;
      setIsLoading(false);
      setHasError(false);

      // Extract edge color if needed
      if (
        imageFitMode === "contain" &&
        letterboxFillMode === "edge-color" &&
        imageRef.current
      ) {
        const color = extractEdgeColor(imageRef.current);
        setLetterboxColor(color);
      }
    };

    const handleImageError = () => {
      setIsLoading(false);
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
      if (!errorMessage) return;
      try {
        await navigator.clipboard.writeText(errorMessage);
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 2000);
      } catch {
        setCopyState("failed");
      }
    };

    const handleShowMetadata = () => {
      if (!currentImage) return;
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
        string | undefined;
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
      if (!currentImage) return;
      const text = buildMetadataText(currentImage);
      try {
        await navigator.clipboard.writeText(text);
        setMetadataCopyState("copied");
        setTimeout(() => setMetadataCopyState("idle"), 2000);
      } catch {
        setMetadataCopyState("failed");
      }
    };

    const githubRepoUrl = getSafeHttpsUrl(import.meta.env.VITE_GITHUB_REPO_URL);
    const normalizedRepoUrl = githubRepoUrl?.replace(/\/$/, "");
    const githubIssueUrl = normalizedRepoUrl
      ? `${normalizedRepoUrl}/issues/new?title=${encodeURIComponent(
          t("image.error.issueTitle"),
        )}&body=${encodeURIComponent(
          `${t("image.error.issueBodyLabel")}:\n\n${errorMessage ?? t("image.error.unknown")}`,
        )}`
      : null;
    return (
      <>
        <div className="image-background">
          {/* Background overlay - rendered first with pointer-events: none */}
          <div className="background-overlay"></div>

          {/* Initial demo image from public/demo while API image loads */}
          {!currentImage && (
            <picture>
              <source srcSet="/demo/demo.avif" type="image/avif" />
              <img
                src="/demo/demo.webp"
                alt="Demo background"
                className="background-image"
                style={{ objectFit: imageFitMode }}
              />
            </picture>
          )}

          {currentImage && (
            <>
              {/* Letterbox background layer for 'contain' mode */}
              {imageFitMode === "contain" && (
                <div
                  className="letterbox-background"
                  style={{
                    backgroundColor:
                      letterboxFillMode === "custom"
                        ? letterboxCustomColor
                        : letterboxFillMode === "edge-color"
                          ? letterboxColor
                          : letterboxFillMode === "solid"
                            ? "#000000"
                            : "transparent",
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
                ref={imageRef}
                src={currentImage.url}
                alt="Anime Background"
                className={`background-image ${isTransitioning ? "transitioning" : ""}`}
                style={{ objectFit: imageFitMode }}
                onLoad={handleImageLoad}
                onError={handleImageError}
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
                {!currentImage.animeName && !currentImage.artistName && (
                  <button
                    type="button"
                    className="metadata-link-button"
                    onClick={handleShowMetadata}
                    aria-label={t("image.metadata.title")}
                  />
                )}
              </div>
            </>
          )}
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
  },
);
