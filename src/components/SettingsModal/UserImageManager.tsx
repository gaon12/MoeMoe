import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ACCEPTED_USER_IMAGE_TYPES,
  MAX_USER_IMAGE_BYTES,
  UserImageStoreError,
  addUserImages,
  deleteUserImage,
  getUserImageObjectUrl,
  listUserImages,
  type StoredUserImage,
} from "../../services/userImageStore.ts";

interface UserImageManagerProps {
  onCountChange: (count: number) => void;
  onImagesAdded: () => void;
  onLastImageRemoved: () => void;
}

type ManagerStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; added: number; duplicates: number }
  | { type: "error"; message: string };

const BYTES_PER_KIBIBYTE = 1024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;

const formatBytes = (bytes: number): string =>
  `${(bytes / BYTES_PER_MEBIBYTE).toFixed(bytes >= 10 * BYTES_PER_MEBIBYTE ? 0 : 1)} MB`;

export function UserImageManager({
  onCountChange,
  onImagesAdded,
  onLastImageRemoved,
}: UserImageManagerProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<StoredUserImage[]>([]);
  const [status, setStatus] = useState<ManagerStatus>({ type: "loading" });

  const refreshImages = useCallback(async () => {
    const stored = await listUserImages();
    setImages(stored);
    onCountChange(stored.length);
    return stored;
  }, [onCountChange]);

  useEffect(() => {
    let active = true;
    listUserImages()
      .then((stored) => {
        if (!active) {
          return;
        }
        setImages(stored);
        onCountChange(stored.length);
        setStatus({ type: "idle" });
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setStatus({
          type: "error",
          message: t("settings.userImages.errors.unavailable"),
        });
      });
    return () => {
      active = false;
    };
  }, [onCountChange, t]);

  const errorMessage = useCallback(
    (error: unknown): string => {
      if (!(error instanceof UserImageStoreError)) {
        return t("settings.userImages.errors.unknown");
      }
      return t(`settings.userImages.errors.${error.code}`);
    },
    [t],
  );

  const handleFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (files.length === 0) {
        return;
      }

      setStatus({ type: "loading" });
      try {
        const result = await addUserImages(files);
        await refreshImages();
        if (result.added.length > 0) {
          onImagesAdded();
        }
        setStatus({
          type: "success",
          added: result.added.length,
          duplicates: result.skippedDuplicates,
        });
      } catch (error) {
        setStatus({ type: "error", message: errorMessage(error) });
      }
    },
    [errorMessage, onImagesAdded, refreshImages],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      setStatus({ type: "loading" });
      try {
        await deleteUserImage(id);
        const remaining = await refreshImages();
        if (remaining.length === 0) {
          onLastImageRemoved();
        }
        setStatus({ type: "idle" });
      } catch (error) {
        setStatus({ type: "error", message: errorMessage(error) });
      }
    },
    [errorMessage, onLastImageRemoved, refreshImages],
  );

  const openFilePicker = useCallback(() => inputRef.current?.click(), []);
  const handleRemoveClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { imageId } = event.currentTarget.dataset;
      if (imageId) {
        return handleRemove(imageId);
      }
    },
    [handleRemove],
  );

  const isBusy = status.type === "loading";

  return (
    <div className="settings-option user-image-manager">
      <label className="settings-label" htmlFor={inputId}>
        {t("settings.userImages.title")}
      </label>
      <p className="settings-description">
        {t("settings.userImages.description", {
          maxSize: formatBytes(MAX_USER_IMAGE_BYTES),
        })}
      </p>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="settings-file-input"
        accept={ACCEPTED_USER_IMAGE_TYPES.join(",")}
        multiple={true}
        onChange={handleFiles}
      />
      <div className="user-image-summary">
        <button
          type="button"
          className="settings-button settings-button-secondary"
          disabled={isBusy}
          onClick={openFilePicker}
        >
          {isBusy
            ? t("settings.userImages.processing")
            : t("settings.userImages.add")}
        </button>
        <span aria-live="polite">
          {t("settings.userImages.count", { count: images.length })}
        </span>
      </div>

      {status.type === "success" && (
        <p className="settings-status-success" role="status">
          {t("settings.userImages.added", {
            count: status.added,
            duplicates: status.duplicates,
          })}
        </p>
      )}
      {status.type === "error" && (
        <p className="settings-status-error" role="alert">
          {status.message}
        </p>
      )}

      {images.length > 0 && (
        <ul className="user-image-grid">
          {images.map((image) => (
            <li key={image.id} className="user-image-card">
              <img src={getUserImageObjectUrl(image)} alt="" />
              <div className="user-image-details">
                <strong title={image.name}>{image.name}</strong>
                <span>
                  {image.width}
                  {"×"}
                  {image.height}
                  {"·"}
                  {formatBytes(image.size)}
                </span>
              </div>
              <button
                type="button"
                className="settings-button settings-button-danger"
                disabled={isBusy}
                data-image-id={image.id}
                onClick={handleRemoveClick}
                aria-label={t("settings.userImages.removeNamed", {
                  name: image.name,
                })}
              >
                {t("settings.userImages.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
