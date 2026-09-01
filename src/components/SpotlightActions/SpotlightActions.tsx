import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useModalAccessibility } from "../../hooks/useModalAccessibility.ts";
import type { AnimeImage } from "../../types/image.ts";
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
  const galleryTitleId = useId();
  const closeGallery = useCallback(() => setIsGalleryOpen(false), []);
  const openGallery = useCallback(() => setIsGalleryOpen(true), []);
  const handleToggleFavorite = useCallback(() => {
    if (currentImage) {
      onToggleFavorite(currentImage);
    }
  }, [currentImage, onToggleFavorite]);
  const handleDismiss = useCallback(() => {
    if (currentImage) {
      onDismiss(currentImage);
    }
  }, [currentImage, onDismiss]);
  const handleRemoveFavorite = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { imageUrl } = event.currentTarget.dataset;
      if (imageUrl) {
        onRemoveFavorite(imageUrl);
      }
    },
    [onRemoveFavorite],
  );
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
        onClick={handleToggleFavorite}
        aria-label={t("spotlight.favorite")}
        title={t("spotlight.favorite")}
      >
        {isFavorite ? "♥" : "♡"}
      </button>
      <button
        type="button"
        className="spotlight-action"
        onClick={openGallery}
        aria-label={t("spotlight.gallery")}
        title={t("spotlight.gallery")}
      >
        {"★"}
        <span className="spotlight-count">{favorites.length}</span>
      </button>
      <button
        type="button"
        className="spotlight-action"
        disabled={!canStoreFeedback}
        onClick={handleDismiss}
        aria-label={t("spotlight.notForMe")}
        title={t("spotlight.notForMe")}
      >
        {"⊘"}
      </button>
      {isGalleryOpen
        ? createPortal(
            <div className="spotlight-gallery-overlay">
              <button
                type="button"
                className="spotlight-gallery-dismiss"
                onClick={closeGallery}
                aria-label={t("spotlight.close")}
              />
              <div
                ref={galleryRef}
                className="spotlight-gallery"
                role="dialog"
                aria-modal="true"
                aria-labelledby={galleryTitleId}
                tabIndex={-1}
              >
                <div className="spotlight-gallery-header">
                  <h2 id={galleryTitleId}>{t("spotlight.gallery")}</h2>
                  <button type="button" onClick={closeGallery}>
                    {t("spotlight.close")}
                  </button>
                </div>
                {favorites.length === 0 ? (
                  <p>{t("spotlight.empty")}</p>
                ) : (
                  <div className="spotlight-gallery-grid">
                    {favorites.map((image) => (
                      <article
                        key={image.url}
                        className="spotlight-gallery-item"
                      >
                        <a
                          href={image.sourceUrl || image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img src={image.url} alt={image.animeName || ""} />
                        </a>
                        <button
                          type="button"
                          data-image-url={image.url}
                          onClick={handleRemoveFavorite}
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
          )
        : null}
    </>
  );
}
