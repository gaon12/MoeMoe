import { useState, useEffect, useCallback, useRef } from 'react';
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
  onRefreshRequest?: () => void;
}

export const ImageBackground: React.FC<ImageBackgroundProps> = ({
  imageSources = ['nekos_best'],
  allowNSFW = false,
  imageFitMode = 'cover',
  letterboxFillMode = 'blur',
  letterboxCustomColor = '#1a1a1a',
  onImageLoad,
  onImageError,
  onRefreshRequest,
}) => {
  const [currentImage, setCurrentImage] = useState<AnimeImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [thumbhashDataUrl, setThumbhashDataUrl] = useState<string | null>(null);
  const [showThumbhash, setShowThumbhash] = useState(false);
  const [letterboxColor, setLetterboxColor] = useState<string>('#1a1a1a');
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

  const loadNewImage = useCallback(async () => {
    setHasError(false);

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
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to preload image'));
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
      setIsLoading(false);
      setHasError(true);
      setIsTransitioning(false);
      setShowThumbhash(false);
      onImageError?.(error as Error);
    }
  }, [imageSources, allowNSFW, onImageLoad, onImageError, generateThumbhash]);

  // Load initial image on mount only
  useEffect(() => {
    loadNewImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose refresh function to parent via callback
  useEffect(() => {
    if (onRefreshRequest) {
      // Store the refresh function reference
      (window as any).__imageBackgroundRefresh = loadNewImage;
    }
  }, [loadNewImage, onRefreshRequest]);

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
      for (let x = 0; x < canvas.width; x += Math.floor(canvas.width / sampleSize)) {
        const topPixel = ctx.getImageData(x, 0, 1, 1).data;
        const bottomPixel = ctx.getImageData(x, canvas.height - 1, 1, 1).data;
        samples.push([topPixel[0], topPixel[1], topPixel[2]]);
        samples.push([bottomPixel[0], bottomPixel[1], bottomPixel[2]]);
      }

      // Left and right edges
      for (let y = 0; y < canvas.height; y += Math.floor(canvas.height / sampleSize)) {
        const leftPixel = ctx.getImageData(0, y, 1, 1).data;
        const rightPixel = ctx.getImageData(canvas.width - 1, y, 1, 1).data;
        samples.push([leftPixel[0], leftPixel[1], leftPixel[2]]);
        samples.push([rightPixel[0], rightPixel[1], rightPixel[2]]);
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
    onImageError?.(new Error('Failed to display image'));
  };

  return (
    <div className="image-background">
      {/* Background overlay - rendered first with pointer-events: none */}
      <div className="background-overlay"></div>

      {hasError && (
        <div className="image-error">
          <p>Failed to load image</p>
          <button onClick={loadNewImage} className="retry-button">
            Retry
          </button>
        </div>
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
          {(currentImage.artistName || currentImage.animeName) && (
            <div className="image-attribution">
              {currentImage.artistName && (
                <>
                  <span>Art by: </span>
                  {currentImage.artistHref ? (
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
                  )}
                </>
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
          )}
        </>
      )}
    </div>
  );
};
