import { useCallback, useEffect, useRef, useState } from "react";
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
} from "../../services/userImageStore";

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

const formatBytes = (bytes: number): string =>
  `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;

export function UserImageManager({
  onCountChange,
  onImagesAdded,
  onLastImageRemoved,
}: UserImageManagerProps) {
  const { t } = useTranslation();
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
        if (!active) return;
        setImages(stored);
        onCountChange(stored.length);
        setStatus({ type: "idle" });
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load user images:", error);
        setStatus({
          type: "error",
          message: t("settings.userImages.errors.unavailable"),
        });
      });
    return () => {
      active = false;
    };
  }, [onCountChange, t]);

  const errorMessage = (error: unknown): string => {
    if (!(error instanceof UserImageStoreError)) {
      return t("settings.userImages.errors.unknown");
    }
    return t(`settings.userImages.errors.${error.code}`);
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setStatus({ type: "loading" });
    try {
      const result = await addUserImages(files);
      await refreshImages();
      if (result.added.length > 0) onImagesAdded();
      setStatus({
        type: "success",
        added: result.added.length,
        duplicates: result.skippedDuplicates,
      });
    } catch (error) {
      console.error("Failed to add user images:", error);
      setStatus({ type: "error", message: errorMessage(error) });
    }
  };

  const handleRemove = async (id: string) => {
    setStatus({ type: "loading" });
    try {
      await deleteUserImage(id);
      const remaining = await refreshImages();
      if (remaining.length === 0) onLastImageRemoved();
      setStatus({ type: "idle" });
    } catch (error) {
      console.error("Failed to delete user image:", error);
      setStatus({ type: "error", message: errorMessage(error) });
    }
  };

  const isBusy = status.type === "loading";

  return (
    <div className="settings-option user-image-manager">
      <label className="settings-label">{t("settings.userImages.title")}</label>
      <p className="settings-description">
        {t("settings.userImages.description", {
          maxSize: formatBytes(MAX_USER_IMAGE_BYTES),
        })}
      </p>
      <input
        ref={inputRef}
        type="file"
        className="settings-file-input"
        accept={ACCEPTED_USER_IMAGE_TYPES.join(",")}
        multiple
        onChange={handleFiles}
      />
      <div className="user-image-summary">
        <button
          type="button"
          className="settings-button settings-button-secondary"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
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
                  {image.width}×{image.height} · {formatBytes(image.size)}
                </span>
              </div>
              <button
                type="button"
                className="settings-button settings-button-danger"
                disabled={isBusy}
                onClick={() => handleRemove(image.id)}
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
