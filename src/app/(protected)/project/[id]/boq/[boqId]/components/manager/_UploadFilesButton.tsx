"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";

type UploadedFile = {
  file: File;
  preview: string;
};

type UploadFilesButtonProps = {
  onFilesChange?: (files: File[]) => void;
  onExistingFilesChange?: (urls: string[]) => void;
  onFilesToDeleteChange?: (urls: string[]) => void;
  existingFiles?: string[];
  maxFiles?: number;
  acceptedTypes?: string;
  itemId?: number;
  updateEndpoint?: string;
  stageDeletion?: boolean; // New prop to control deletion behavior
};

export default function UploadFilesButton({
  onFilesChange,
  onExistingFilesChange,
  onFilesToDeleteChange,
  existingFiles = [],
  maxFiles = 10,
  acceptedTypes = "image/*,.pdf,.doc,.docx",
  itemId,
  updateEndpoint,
  stageDeletion = false, // Default to immediate deletion for backward compatibility
}: UploadFilesButtonProps) {
  const router = useRouter();

  const uploadIcon = "/icons/upload.svg";

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [existingFilesList, setExistingFilesList] = useState<string[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only update if the arrays are actually different
    const currentJson = JSON.stringify(existingFilesList);
    const newJson = JSON.stringify(existingFiles);

    if (currentJson !== newJson) {
      setExistingFilesList(existingFiles);
    }
  }, [existingFiles, existingFilesList]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];

    Array.from(files).forEach((file) => {
      const totalFiles =
        uploadedFiles.length + existingFilesList.length + newFiles.length;
      if (totalFiles >= maxFiles) return;

      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";

      newFiles.push({ file, preview });
    });

    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);

    if (onFilesChange) {
      onFilesChange(updatedFiles.map((f) => f.file));
    }

    e.target.value = "";
  };

  const removeNewFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);

    if (onFilesChange) {
      onFilesChange(updatedFiles.map((f) => f.file));
    }
  };

  const removeExistingFile = async (index: number) => {
    const urlToDelete = existingFilesList[index];

    // If staging deletions, just mark for deletion
    if (stageDeletion) {
      // Mark file for deletion
      const updatedFilesToDelete = [...filesToDelete, urlToDelete];
      setFilesToDelete(updatedFilesToDelete);

      // Remove from UI immediately
      const updatedExisting = existingFilesList.filter((_, i) => i !== index);
      setExistingFilesList(updatedExisting);

      if (onExistingFilesChange) {
        onExistingFilesChange(updatedExisting);
      }

      if (onFilesToDeleteChange) {
        onFilesToDeleteChange(updatedFilesToDelete);
      }

      return;
    }

    // Otherwise, delete immediately (original behavior)
    setIsDeleting(true);

    try {
      // Step 1: Delete from S3
      const s3Response = await fetch("/api/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          url: urlToDelete,
        }),
      });

      if (!s3Response.ok) {
        const errorData = await s3Response.json();
        throw new Error(errorData.error || "Failed to delete file from S3");
      }

      console.log("File deleted from S3:", urlToDelete);

      // Step 2: Update database if itemId and endpoint are provided
      const updatedExisting = existingFilesList.filter((_, i) => i !== index);

      if (itemId && updateEndpoint) {
        const dbResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}${updateEndpoint}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "updateAttachments",
              id: itemId,
              attachments: JSON.stringify(updatedExisting),
            }),
          }
        );

        if (!dbResponse.ok) {
          throw new Error("Failed to update database");
        }

        console.log("Database updated with new attachments list");
      }

      // Step 3: Update local state
      setExistingFilesList(updatedExisting);

      if (onExistingFilesChange) {
        onExistingFilesChange(updatedExisting);
      }

      toast("Attachment deleted", "success");

      router.refresh();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast("Failed to delete attachment. Something went wrong", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileNameFromUrl = (url: string) => {
    const urlParts = url.split("/");
    return urlParts[urlParts.length - 1] || "file";
  };

  const getFileExtension = (fileName: string) => {
    return fileName.split(".").pop()?.toUpperCase() || "FILE";
  };

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const totalFiles = uploadedFiles.length + existingFilesList.length;

  return (
    <div className="upload-files-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedTypes}
        multiple
        style={{ display: "none" }}
        disabled={isDeleting}
      />

      {totalFiles > 0 && (
        <div className="uploaded-files-grid">
          {/* Existing files */}
          {existingFilesList.map((url, index) => {
            const fileName = getFileNameFromUrl(url);
            const fileExtension = getFileExtension(fileName);
            const isImage = isImageFile(url);

            return (
              <div key={`existing-${index}`} className="uploaded-file-item">
                <div className="file-preview-wrapper">
                  {isImage ? (
                    <img
                      src={url}
                      alt={fileName}
                      className="file-preview-image"
                      onError={(e) => {
                        console.error("Failed to load image:", url);
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="file-preview-placeholder">
                      <span className="file-extension">{fileExtension}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      removeExistingFile(index);
                    }}
                    disabled={isDeleting}
                  >
                    ×
                  </button>
                </div>

                <div className="file-info">
                  <span className="file-name" title={fileName}>
                    {fileName.length > 15
                      ? fileName.substring(0, 12) + "..."
                      : fileName}
                  </span>
                </div>
              </div>
            );
          })}

          {/* New uploaded files */}
          {uploadedFiles.map((uploadedFile, index) => (
            <div key={`new-${index}`} className="uploaded-file-item">
              <div className="file-preview-wrapper">
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="file-preview-image"
                  />
                ) : (
                  <div className="file-preview-placeholder">
                    <span className="file-extension">
                      {uploadedFile.file.name.split(".").pop()?.toUpperCase()}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => removeNewFile(index)}
                  disabled={isDeleting}
                >
                  ×
                </button>
              </div>

              <div className="file-info">
                <span className="file-name" title={uploadedFile.file.name}>
                  {uploadedFile.file.name.length > 15
                    ? uploadedFile.file.name.substring(0, 12) + "..."
                    : uploadedFile.file.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={handleButtonClick}
        type="button"
      >
        <>
          <img src={uploadIcon} alt="upload icon" />
          <span>SELECT FILES</span>
        </>
      </Button>
    </div>
  );
}