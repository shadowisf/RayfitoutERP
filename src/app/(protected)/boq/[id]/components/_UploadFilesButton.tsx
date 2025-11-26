"use client";

import { useState, useRef } from "react";
import Button from "@/app/components/Button";

type UploadedFile = {
  file: File;
  preview: string;
};

type UploadFilesButtonProps = {
  onFilesChange?: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string;
  /* storeInState: React.Dispatch<React.SetStateAction<[]>>; */
};

export default function UploadFilesButton({
  onFilesChange,
  maxFiles = 10,
  acceptedTypes = "image/*,.pdf,.doc,.docx",
  /* storeInState, */
}: UploadFilesButtonProps) {
  const uploadIcon = "/icons/upload.svg";

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];

    Array.from(files).forEach((file) => {
      if (uploadedFiles.length + newFiles.length >= maxFiles) return;

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

  const removeFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);

    if (onFilesChange) {
      onFilesChange(updatedFiles.map((f) => f.file));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="upload-files-container">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedTypes}
        multiple
        style={{ display: "none" }}
      />

      {/* File previews */}
      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-grid">
          {uploadedFiles.map((uploadedFile, index) => (
            <div key={index} className="uploaded-file-item">
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
                  onClick={() => removeFile(index)}
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
                <span className="file-size">
                  {formatFileSize(uploadedFile.file.size)}
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

          <span>UPLOAD FILES</span>
        </>
      </Button>
    </div>
  );
}
