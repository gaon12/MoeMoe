import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";

type CopyState = "idle" | "copied" | "failed";

interface ImageErrorDialogProps {
  isOpen: boolean;
  errorMessage: string | null;
  copyState: CopyState;
  githubIssueUrl: string | null;
  onCopy: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export function ImageErrorDialog({
  isOpen,
  errorMessage,
  copyState,
  githubIssueUrl,
  onCopy,
  onRetry,
  onClose,
}: ImageErrorDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAccessibility(isOpen, dialogRef, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className="error-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="error-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-error-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="image-error-title" className="error-modal-title">
          {t("image.error.title")}
        </h2>
        <div className="error-modal-content">
          <p className="error-modal-text">{t("image.error.description")}</p>
          <textarea
            className="error-modal-message"
            value={errorMessage ?? t("image.error.unknown")}
            readOnly
          />
          <div className="error-modal-actions">
            <button
              type="button"
              className="error-modal-button"
              onClick={onCopy}
            >
              {copyState === "copied"
                ? t("image.error.copied")
                : t("image.error.copy")}
            </button>
            {githubIssueUrl && (
              <a
                href={githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="error-modal-button error-modal-link"
              >
                {t("image.error.openIssue")}
              </a>
            )}
          </div>
          {copyState === "failed" && (
            <p className="error-modal-copy-hint">
              {t("image.error.copyFailed")}
            </p>
          )}
        </div>
        <div className="error-modal-footer">
          <button
            type="button"
            className="error-modal-button secondary"
            onClick={onClose}
          >
            {t("image.metadata.close")}
          </button>
          <button
            type="button"
            className="error-modal-button secondary"
            onClick={onRetry}
          >
            {t("image.error.retry")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface ImageMetadataDialogProps {
  isOpen: boolean;
  metadataText: string;
  copyState: CopyState;
  onCopy: () => void;
  onClose: () => void;
}

export function ImageMetadataDialog({
  isOpen,
  metadataText,
  copyState,
  onCopy,
  onClose,
}: ImageMetadataDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAccessibility(isOpen, dialogRef, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className="error-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="error-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-metadata-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="image-metadata-title" className="error-modal-title">
          {t("image.metadata.title")}
        </h2>
        <div className="error-modal-content">
          <p className="error-modal-text">{t("image.metadata.description")}</p>
          <textarea
            className="error-modal-message"
            value={metadataText}
            readOnly
          />
          <div className="error-modal-actions">
            <button
              type="button"
              className="error-modal-button"
              onClick={onCopy}
            >
              {copyState === "copied"
                ? t("image.metadata.copied")
                : t("image.metadata.copy")}
            </button>
          </div>
          {copyState === "failed" && (
            <p className="error-modal-copy-hint">
              {t("image.error.copyFailed")}
            </p>
          )}
        </div>
        <div className="error-modal-footer">
          <button
            type="button"
            className="error-modal-button secondary"
            onClick={onClose}
          >
            {t("image.metadata.close")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
