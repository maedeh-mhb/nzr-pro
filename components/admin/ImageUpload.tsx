"use client";

import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiUpload, FiX, FiImage } from "react-icons/fi";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import styles from "@/styles/components/_imageUpload.module.scss";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onDelete?: () => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  showAltText?: boolean;
  altText?: string;
  onAltTextChange?: (altText: string) => void;
}

export default function ImageUpload({
  value,
  onChange,
  onDelete,
  label,
  accept = "image/*",
  maxSizeMB = 5,
  showAltText = false,
  altText = "",
  onAltTextChange,
}: ImageUploadProps) {
  const { t, language } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(
          language === "fa"
            ? `حجم فایل باید کمتر از ${maxSizeMB} مگابایت باشد`
            : `File size must be less than ${maxSizeMB}MB`
        );
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert(
          language === "fa"
            ? "لطفاً یک فایل تصویری انتخاب کنید"
            : "Please select an image file"
        );
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            onChange(response.url);
            setUploadProgress(0);
          } else {
            alert(
              language === "fa"
                ? "خطا در آپلود تصویر"
                : "Error uploading image"
            );
          }
          setIsUploading(false);
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          alert(
            language === "fa"
              ? "خطا در آپلود تصویر"
              : "Error uploading image"
          );
          setIsUploading(false);
          setUploadProgress(0);
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      } catch (error) {
        console.error("Error uploading image:", error);
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [maxSizeMB, language, onChange]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className={styles.imageUpload}>
      {label && <label className={styles.label}>{label}</label>}

      {value ? (
        <div className={styles.imagePreview}>
          <img src={value} alt={altText || "Preview"} className={styles.previewImage} />
          <div className={styles.imageActions}>
            {showDeleteConfirm ? (
              <div className={styles.deleteConfirm}>
                <span className={styles.confirmText}>
                  {t("Delete image?", "حذف تصویر؟")}
                </span>
                <button
                  type="button"
                  className={styles.confirmButton}
                  onClick={handleDelete}
                >
                  {t("Yes", "بله")}
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancelDelete}
                >
                  {t("Cancel", "لغو")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.deleteButton}
                onClick={handleDelete}
                aria-label={t("Delete image", "حذف تصویر")}
              >
                <FiX />
              </button>
            )}
          </div>
          {showAltText && (
            <div className={styles.altTextInput}>
              <input
                type="text"
                placeholder={t("Alt text", "متن جایگزین")}
                value={altText}
                onChange={(e) => onAltTextChange?.(e.target.value)}
                className={styles.altInput}
              />
            </div>
          )}
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ""} ${isUploading ? styles.uploading : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className={styles.fileInput}
            disabled={isUploading}
          />
          {isUploading ? (
            <div className={styles.uploadProgress}>
              <LoadingSpinner size="md" color="primary" />
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className={styles.progressText}>
                {Math.round(uploadProgress)}%
              </span>
            </div>
          ) : (
            <>
              <FiImage className={styles.uploadIcon} />
              <p className={styles.uploadText}>
                {t(
                  "Click to upload or drag and drop",
                  "برای آپلود کلیک کنید یا فایل را بکشید"
                )}
              </p>
              <p className={styles.uploadHint}>
                {t(
                  `Max size: ${maxSizeMB}MB`,
                  `حداکثر حجم: ${maxSizeMB} مگابایت`
                )}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

