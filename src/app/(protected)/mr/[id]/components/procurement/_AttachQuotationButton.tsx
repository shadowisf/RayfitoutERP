"use client";

import { useRef, useState } from "react";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type AttachQuotationButtonProps = {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
};

export default function AttachQuotationButton({
  onFileSelect,
  isUploading = false,
}: AttachQuotationButtonProps) {
  const uploadIcon = "/icons/upload.svg";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  const validateAndSelectFile = (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      toast("Please upload PDF, Excel, or image files only", "error");
      return;
    }

    onFileSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    validateAndSelectFile(file);

    // reset input
    e.target.value = "";
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    validateAndSelectFile(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        disabled={isUploading}
        required
      />

      {/* DROP ZONE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: "100%",
          borderRadius: "25px",
          backgroundColor: isDragOver
            ? "rgba(169, 255, 218, 1)"
            : "transparent",
        }}
      >
        <Button
          componentType="button"
          bgColor="black"
          borderColor="black"
          textColor="white"
          onClick={handleButtonClick}
          full
          style={{
            padding: "7px 20px",
            borderRadius: "25px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            whiteSpace: "nowrap",
            opacity: isUploading ? 0.5 : 1,
            cursor: isUploading ? "not-allowed" : "pointer",
            pointerEvents: isUploading ? "none" : "auto",
          }}
        >
          Upload Quotation
          <img src={uploadIcon} alt="upload icon" />
        </Button>
      </div>
    </>
  );
}
