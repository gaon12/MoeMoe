import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./DownloadButton.css";

interface DownloadButtonProps {
  imageUrl: string | null;
  imageName?: string;
}

type ImageFormat = "jpg" | "png" | "webp" | "avif";

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  imageUrl,
  imageName = "anime-image",
}) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleDownload = async (format: ImageFormat) => {
    if (!imageUrl || isDownloading) return;

    setIsDownloading(true);
    setIsMenuOpen(false);
    setDownloadError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);
    let sourceObjectUrl: string | null = null;

    try {
      // Fetch the image
      const response = await fetch(imageUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(
          `Image download failed (${response.status} ${response.statusText})`,
        );
      }
      const blob = await response.blob();

      // Create an image element
      const img = new Image();
      img.crossOrigin = "anonymous";

      sourceObjectUrl = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = sourceObjectUrl!;
      });

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Draw image on canvas
      ctx.drawImage(img, 0, 0);

      // Convert to desired format
      let mimeType = "image/png";
      const quality = 0.95;

      switch (format) {
        case "jpg":
          mimeType = "image/jpeg";
          break;
        case "webp":
          mimeType = "image/webp";
          break;
        case "avif":
          mimeType = "image/avif";
          break;
        default:
          mimeType = "image/png";
      }

      // Convert canvas to blob
      const convertedBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(
                  new Error(
                    `${format.toUpperCase()} conversion is not supported by this browser`,
                  ),
                ),
          mimeType,
          quality,
        ),
      );

      const url = URL.createObjectURL(convertedBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${imageName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadError(
        error instanceof Error ? error.message : "Image download failed",
      );
    } finally {
      window.clearTimeout(timeoutId);
      if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
      setIsDownloading(false);
    }
  };

  const handleButtonClick = () => {
    if (!imageUrl) return;
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="download-button-container" ref={menuRef}>
      <button
        className={`download-button ${isDownloading ? "downloading" : ""}`}
        onClick={handleButtonClick}
        disabled={!imageUrl || isDownloading}
        aria-label={t("buttons.downloadImage")}
        title={t("buttons.downloadImage")}
      >
        {isDownloading ? (
          <svg
            className="download-icon downloading-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        ) : (
          <svg
            className="download-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
      </button>

      {isMenuOpen && (
        <div className="download-menu">
          <div className="download-menu-header">
            {t("buttons.selectFormat")}
          </div>
          <button
            className="download-menu-item"
            onClick={() => handleDownload("jpg")}
          >
            JPG
          </button>
          <button
            className="download-menu-item"
            onClick={() => handleDownload("png")}
          >
            PNG
          </button>
          <button
            className="download-menu-item"
            onClick={() => handleDownload("webp")}
          >
            WebP
          </button>
          <button
            className="download-menu-item"
            onClick={() => handleDownload("avif")}
          >
            AVIF
          </button>
        </div>
      )}
      {downloadError && (
        <div className="download-error" role="alert">
          {downloadError}
        </div>
      )}
    </div>
  );
};
