import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import type { AnimeImage } from "../../types/image";
import "./SpotlightActions.css";

interface SpotlightActionsProps {
  currentImage: AnimeImage | null;
  favorites: AnimeImage[];
  isFavorite: boolean;
  onToggleFavorite: (image: AnimeImage) => void;
  onRemoveFavorite: (url: string) => void;
  onDismiss: (image: AnimeImage) => void;
  isChangePending?: boolean;
}

export function SpotlightActions({
  currentImage,
  favorites,
  isFavorite,
  onToggleFavorite,
  onRemoveFavorite,
  onDismiss,
  isChangePending = false,
}: SpotlightActionsProps) {
  const { t } = useTranslation();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const closeGallery = useCallback(() => setIsGalleryOpen(false), []);
  useModalAccessibility(isGalleryOpen, galleryRef, closeGallery);
  const canStoreFeedback = Boolean(
    currentImage && !currentImage.isLocal && !isChangePending,
  );

  return (
    <>
      <button
        type="button"
        className={`spotlight-action${isFavorite ? " active" : ""}`}
        disabled={!canStoreFeedback}
        onClick={() => currentImage && onToggleFavorite(currentImage)}
        aria-label={t("spotlight.favorite")}
        title={t("spotlight.favorite")}
      >
        {isFavorite ? "♥" : "♡"}
      </button>
      <button
        type="button"
        className="spotlight-action"
        onClick={() => setIsGalleryOpen(true)}
        aria-label={t("spotlight.gallery")}
        title={t("spotlight.gallery")}
      >
        ★<span className="spotlight-count">{favorites.length}</span>
      </button>
      <button
        type="button"
        className="spotlight-action"
        disabled={!canStoreFeedback}
        onClick={() => currentImage && onDismiss(currentImage)}
        aria-label={t("spotlight.notForMe")}
        title={t("spotlight.notForMe")}
      >
        ⊘
      </button>
      {isGalleryOpen &&
        createPortal(
          <div className="spotlight-gallery-overlay" onClick={closeGallery}>
            <div
              ref={galleryRef}
              className="spotlight-gallery"
              role="dialog"
              aria-modal="true"
              aria-labelledby="spotlight-gallery-title"
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="spotlight-gallery-header">
                <h2 id="spotlight-gallery-title">{t("spotlight.gallery")}</h2>
                <button type="button" onClick={closeGallery}>
                  {t("spotlight.close")}
                </button>
              </div>
              {favorites.length === 0 ? (
                <p>{t("spotlight.empty")}</p>
              ) : (
                <div className="spotlight-gallery-grid">
                  {favorites.map((image) => (
                    <article key={image.url} className="spotlight-gallery-item">
                      <a
                        href={image.sourceUrl || image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img src={image.url} alt={image.animeName || ""} />
                      </a>
                      <button
                        type="button"
                        onClick={() => onRemoveFavorite(image.url)}
                      >
                        {t("spotlight.remove")}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
