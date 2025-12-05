"use client";

import { useRef } from "react";
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      console.log("No file selected");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast("Please upload PDF, Excel, or image files only", "error");
      e.target.value = "";
      return;
    }

    onFileSelect(file);
    console.log("File selected:", file.name);

    // Reset input
    e.target.value = "";
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={handleButtonClick}
        full
        style={{
          padding: "5px 20px",
          borderRadius: "25px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          textWrap: "nowrap",
          opacity: isUploading ? 0.5 : 1,
          cursor: isUploading ? "not-allowed" : "pointer",
          pointerEvents: isUploading ? "none" : "auto",
        }}
      >
        Attach Quotation
        <img src={uploadIcon} alt="upload icon" />
      </Button>
    </>
  );
}
