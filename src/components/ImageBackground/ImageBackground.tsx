import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { createPortal } from 'react-dom';
import { rgbaToThumbHash, thumbHashToDataURL } from 'thumbhash';
import { fetchRandomImage } from '../../services/imageApi';
import { type AnimeImage, type ImageSource } from '../../types/image';
import { type ImageFitMode, type LetterboxFillMode } from '../../types/settings';
import './ImageBackground.css';

interface ImageBackgroundProps {
  imageSources?: ImageSource[];
  allowNSFW?: boolean;
  imageFitMode?: ImageFitMode;
  letterboxFillMode?: LetterboxFillMode;
  letterboxCustomColor?: string;
  onImageLoad?: (image: AnimeImage) => void;
  onImageError?: (error: Error) => void;
}

export interface ImageBackgroundHandle {
  refresh: () => void;
}

export const ImageBackground = forwardRef<ImageBackgroundHandle, ImageBackgroundProps>((
  {
    imageSources = ['nekos_best'],
    allowNSFW = false,
    imageFitMode = 'cover',
    letterboxFillMode = 'blur',
    letterboxCustomColor = '#1a1a1a',
    onImageLoad,
    onImageError,
  },
  ref,
) => {
  const [currentImage, setCurrentImage] = useState<AnimeImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [thumbhashDataUrl, setThumbhashDataUrl] = useState<string | null>(null);
  const [showThumbhash, setShowThumbhash] = useState(false);
  const [letterboxColor, setLetterboxColor] = useState<string>('#1a1a1a');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [metadataCopyState, setMetadataCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const [demoThumbhashDataUrl, setDemoThumbhashDataUrl] = useState<string | null>(null);
  const [showDemoThumbhash, setShowDemoThumbhash] = useState(false);
  const [showDemoImage, setShowDemoImage] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Generate thumbhash from image
  const generateThumbhash = useCallback((img: HTMLImageElement): string | null => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Resize to a smaller size for thumbhash (100px max dimension)
      const maxSize = 100;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Convert to thumbhash
      const hash = rgbaToThumbHash(canvas.width, canvas.height, imageData.data);
      return thumbHashToDataURL(hash);
    } catch (error) {
      console.error('Failed to generate thumbhash:', error);
      return null;
    }
  }, []);

  // Pre-generate thumbhash for local demo image
  useEffect(() => {
    let isMounted = true;
    let timeoutId: number | null = null;

    const demoImg = new Image();
    demoImg.crossOrigin = 'anonymous';
    demoImg.onload = () => {
      if (!isMounted) return;
      const thumb = generateThumbhash(demoImg);
      if (thumb) {
        setDemoThumbhashDataUrl(thumb);
        setShowDemoThumbhash(true);
        setShowDemoImage(false);
        timeoutId = window.setTimeout(() => {
          if (!isMounted) return;
          setShowDemoThumbhash(false);
          setShowDemoImage(true);
        }, 500);
      } else {
        setShowDemoImage(true);
      }
    };
    demoImg.onerror = () => {
      if (!isMounted) return;
      // If thumbhash generation fails, fall back to showing demo image directly
      setShowDemoImage(true);
    };
    demoImg.src = '/demo/demo.png';

    return () => {
      isMounted = false;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [generateThumbhash]);

  const loadNewImage = useCallback(async () => {
    setHasError(false);
    setErrorMessage(null);
    setCopyState('idle');
    setIsMetadataOpen(false);
    setMetadataCopyState('idle');

    try {
      // Step 1: Start transition - blur current image if one exists
      setIsTransitioning(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      setIsLoading(true);

      // Step 2: Fetch and preload new image
      const randomSource =
        imageSources[Math.floor(Math.random() * imageSources.length)];

      const image = await fetchRandomImage({
        source: randomSource,
        allowNSFW,
      });

      // Preload image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        let triedProxy = false;
        img.onload = () => {
          // If we successfully loaded via proxy, keep that URL on the image object
          if (image && img.src && img.src !== image.url) {
            image.url = img.src;
          }
          resolve();
        };
        img.onerror = () => {
          if (!triedProxy && 'proxiedUrl' in image && image.proxiedUrl && image.proxiedUrl !== image.url) {
            triedProxy = true;
            console.warn('Direct image load failed, retrying via CORS proxy', {
              directUrl: image.url,
              proxiedUrl: image.proxiedUrl,
              source: randomSource,
            });
            img.src = image.proxiedUrl;
            return;
          }

          const lines: string[] = [
            'Failed to preload image.',
            `source: ${randomSource}`,
            `directUrl: ${image.url}`,
          ];
          if ('proxiedUrl' in image && image.proxiedUrl) {
            lines.push(`proxiedUrl: ${image.proxiedUrl}`);
          }
          if (image.sourceUrl) {
            lines.push(`sourceUrl: ${image.sourceUrl}`);
          }
          if (image.animeName) {
            lines.push(`animeName: ${image.animeName}`);
          }
          reject(new Error(lines.join('\n')));
        };
        img.src = image.url;
      });

      // Step 3: Generate thumbhash from the loaded image
      const thumbhash = generateThumbhash(img);

      if (thumbhash) {
        setThumbhashDataUrl(thumbhash);
        setShowThumbhash(true);
        // Wait to show thumbhash
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 4: Fade to original image
      setShowThumbhash(false);
      setCurrentImage(image);
      setIsLoading(false);
      setIsTransitioning(false);
      onImageLoad?.(image);

    } catch (error) {
      console.error('Failed to load image:', error);
      const lines: string[] = [
        'Failed to load image.',
        `imageSources: ${imageSources.join(', ')}`,
        `allowNSFW: ${allowNSFW}`,
      ];
      if (error instanceof Error && error.message) {
        lines.push('--- inner error ---', error.message);
      }
      setErrorMessage(lines.join('\n'));
      setIsLoading(false);
      setHasError(true);
      setIsTransitioning(false);
      setShowThumbhash(false);
      onImageError?.(error as Error);
    }
  }, [imageSources, allowNSFW, onImageLoad, onImageError, generateThumbhash]);

  // Load image on mount and when dependencies change (e.g. sources, NSFW)
  useEffect(() => {
    loadNewImage();
  }, [loadNewImage]);

  useImperativeHandle(
    ref,
    () => ({
      refresh: loadNewImage,
    }),
    [loadNewImage],
  );

  // Extract edge color from image
  const extractEdgeColor = useCallback((img: HTMLImageElement) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '#1a1a1a';

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Sample colors from the edges
      const sampleSize = 10;
      const samples: number[][] = [];

      // Top and bottom edges
      const stepX = Math.max(1, Math.floor(canvas.width / sampleSize));
      for (let x = 0; x < canvas.width; x += stepX) {
        const topPixel = ctx.getImageData(x, 0, 1, 1).data;
        const bottomPixel = ctx.getImageData(x, canvas.height - 1, 1, 1).data;
        samples.push([topPixel[0], topPixel[1], topPixel[2]]);
        samples.push([bottomPixel[0], bottomPixel[1], bottomPixel[2]]);
      }

      // Left and right edges
      const stepY = Math.max(1, Math.floor(canvas.height / sampleSize));
      for (let y = 0; y < canvas.height; y += stepY) {
        const leftPixel = ctx.getImageData(0, y, 1, 1).data;
        const rightPixel = ctx.getImageData(canvas.width - 1, y, 1, 1).data;
        samples.push([leftPixel[0], leftPixel[1], leftPixel[2]]);
        samples.push([rightPixel[0], rightPixel[1], rightPixel[2]]);
      }

      if (samples.length === 0) {
        return '#1a1a1a';
      }

      // Calculate average color
      const avgR = Math.floor(samples.reduce((sum, s) => sum + s[0], 0) / samples.length);
      const avgG = Math.floor(samples.reduce((sum, s) => sum + s[1], 0) / samples.length);
      const avgB = Math.floor(samples.reduce((sum, s) => sum + s[2], 0) / samples.length);

      return `rgb(${avgR}, ${avgG}, ${avgB})`;
    } catch (error) {
      console.error('Failed to extract edge color:', error);
      return '#1a1a1a';
    }
  }, []);

  const handleImageLoad = () => {
    if (!isLoading) return;
    setIsLoading(false);
    setHasError(false);

    // Extract edge color if needed
    if (imageFitMode === 'contain' && letterboxFillMode === 'edge-color' && imageRef.current) {
      const color = extractEdgeColor(imageRef.current);
      setLetterboxColor(color);
    }
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    const lines: string[] = ['Failed to display image element.'];
    if (currentImage) {
      lines.push(`imageUrl: ${currentImage.url}`);
      if (currentImage.sourceUrl) {
        lines.push(`sourceUrl: ${currentImage.sourceUrl}`);
      }
      if (currentImage.animeName) {
        lines.push(`animeName: ${currentImage.animeName}`);
      }
    }
    const error = new Error(lines.join('\n'));
    setErrorMessage(error.message);
    onImageError?.(error);
  };

  const handleCopyError = async () => {
    if (!errorMessage) return;
    try {
      await navigator.clipboard.writeText(errorMessage);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
    }
  };

  const handleShowMetadata = () => {
    if (!currentImage) return;
    setMetadataCopyState('idle');
    setIsMetadataOpen(true);
  };

  const buildMetadataText = (image: AnimeImage): string => {
    const proxyUrl = import.meta.env.VITE_FIX_CORS_API_URL as string | undefined;
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
      `animeName: ${image.animeName ?? 'N/A'}`,
      `artistName: ${image.artistName ?? 'N/A'}`,
      `artistHref: ${image.artistHref ?? 'N/A'}`,
      `sourceUrl: ${image.sourceUrl ?? 'N/A'}`,
    ];
    return lines.join('\n');
  };

  const handleCopyMetadata = async () => {
    if (!currentImage) return;
    const text = buildMetadataText(currentImage);
    try {
      await navigator.clipboard.writeText(text);
      setMetadataCopyState('copied');
      setTimeout(() => setMetadataCopyState('idle'), 2000);
    } catch {
      setMetadataCopyState('failed');
    }
  };

  const githubRepoUrl = import.meta.env.VITE_GITHUB_REPO_URL as string | undefined;
  const normalizedRepoUrl = githubRepoUrl?.replace(/\/$/, '');
  const githubIssueUrl = normalizedRepoUrl
    ? `${normalizedRepoUrl}/issues/new?title=${encodeURIComponent(
        'Image load error',
      )}&body=${encodeURIComponent(
        `오류 메시지:\n\n${errorMessage ?? '알 수 없는 오류입니다.'}`,
      )}`
    : null;

  return (
    <>
      <div className="image-background">
      {/* Background overlay - rendered first with pointer-events: none */}
      <div className="background-overlay"></div>

      {/* Initial demo image from public/demo while API image loads */}
      {!currentImage && (
        <>
          {showDemoThumbhash && demoThumbhashDataUrl && (
            <img
              src={demoThumbhashDataUrl}
              alt="Demo preview"
              className="thumbhash-preview"
              style={{ objectFit: imageFitMode }}
            />
          )}
          <picture>
            <source srcSet="/demo/demo.avif" type="image/avif" />
            <source srcSet="/demo/demo.webp" type="image/webp" />
            <source srcSet="/demo/demo.jpg" type="image/jpeg" />
            <source srcSet="/demo/demo.png" type="image/png" />
            <img
              src="/demo/demo.png"
              alt="Demo background"
              className="background-image"
              style={{
                objectFit: imageFitMode,
                opacity: showDemoImage ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
            />
          </picture>
        </>
      )}

      {currentImage && (
        <>
          {/* Letterbox background layer for 'contain' mode */}
          {imageFitMode === 'contain' && (
            <div
              className="letterbox-background"
              style={{
                backgroundColor:
                  letterboxFillMode === 'custom'
                    ? letterboxCustomColor
                    : letterboxFillMode === 'edge-color'
                    ? letterboxColor
                    : letterboxFillMode === 'solid'
                    ? '#000000'
                    : 'transparent',
                backgroundImage:
                  letterboxFillMode === 'blur' ? `url(${currentImage.url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: letterboxFillMode === 'blur' ? 'blur(50px) brightness(0.5)' : 'none',
              }}
            />
          )}

          <img
            ref={imageRef}
            src={currentImage.url}
            alt="Anime Background"
            className={`background-image ${isTransitioning ? 'transitioning' : ''}`}
            style={{ objectFit: imageFitMode }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            crossOrigin="anonymous"
          />

          {/* Thumbhash preview during transition */}
          {showThumbhash && thumbhashDataUrl && (
            <img
              src={thumbhashDataUrl}
              alt="Loading preview"
              className="thumbhash-preview"
              style={{ objectFit: imageFitMode }}
            />
          )}

          {/* Artist attribution - always on top with z-index: 100 */}
          <div className="image-attribution">
            <span>Art by: </span>
            {currentImage.artistName ? (
              currentImage.artistHref ? (
                <a
                  href={currentImage.artistHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="artist-link"
                >
                  {currentImage.artistName}
                </a>
              ) : (
                <span>{currentImage.artistName}</span>
              )
            ) : (
              <button
                type="button"
                className="artist-link"
                onClick={handleShowMetadata}
              >
                N/A
              </button>
            )}
            {currentImage.animeName && (
              <span> • {currentImage.animeName}</span>
            )}
            {currentImage.sourceUrl && (
              <>
                <span> • </span>
                <a
                  href={currentImage.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                >
                  Source
                </a>
              </>
            )}
          </div>
        </>
      )}
      </div>
      {hasError &&
        createPortal(
          <div className="error-modal-overlay">
            <div className="error-modal">
              <h2 className="error-modal-title">이미지 로딩 중 오류가 발생했어요</h2>
              <div className="error-modal-content">
                <p className="error-modal-text">
                  아래 오류 메시지를 첨부해서 깃허브 이슈를 등록해 주세요.
                </p>
                <textarea
                  className="error-modal-message"
                  value={errorMessage ?? '알 수 없는 오류입니다.'}
                  readOnly
                />
                <div className="error-modal-actions">
                  <button
                    type="button"
                    className="error-modal-button"
                    onClick={handleCopyError}
                  >
                    {copyState === 'copied' ? '복사됨' : '오류 메시지 복사'}
                  </button>
                  {githubIssueUrl && (
                    <a
                      href={githubIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="error-modal-button error-modal-link"
                    >
                      깃허브 이슈 열기
                    </a>
                  )}
                </div>
                {copyState === 'failed' && (
                  <p className="error-modal-copy-hint">
                    클립보드 복사에 실패했어요. 직접 선택해서 복사해 주세요.
                  </p>
                )}
              </div>
              <div className="error-modal-footer">
                <button
                  type="button"
                  className="error-modal-button secondary"
                  onClick={loadNewImage}
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {isMetadataOpen &&
        currentImage &&
        createPortal(
          <div
            className="error-modal-overlay"
            onClick={() => setIsMetadataOpen(false)}
          >
            <div
              className="error-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="error-modal-title">이미지 메타데이터</h2>
              <div className="error-modal-content">
                <p className="error-modal-text">
                  현재 배경 이미지에 대해 API에서 받은 정보를 확인할 수 있어요.
                </p>
                <textarea
                  className="error-modal-message"
                  value={buildMetadataText(currentImage)}
                  readOnly
                />
                <div className="error-modal-actions">
                  <button
                    type="button"
                    className="error-modal-button"
                    onClick={handleCopyMetadata}
                  >
                    {metadataCopyState === 'copied' ? '복사됨' : '메타데이터 복사'}
                  </button>
                </div>
                {metadataCopyState === 'failed' && (
                  <p className="error-modal-copy-hint">
                    클립보드 복사에 실패했어요. 직접 선택해서 복사해 주세요.
                  </p>
                )}
              </div>
              <div className="error-modal-footer">
                <button
                  type="button"
                  className="error-modal-button secondary"
                  onClick={() => setIsMetadataOpen(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
});
