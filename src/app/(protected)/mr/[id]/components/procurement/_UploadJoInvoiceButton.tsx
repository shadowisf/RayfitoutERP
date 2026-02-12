"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { MrHeader } from "../../types/mrHeader";

type UploadJoInvoiceButtonProps = {
  mrHeader: MrHeader;
  invoiceFiles: string[];
  onFilesUpdate: (files: string[]) => void;
};

export default function UploadJoInvoiceButton({
  mrHeader,
  invoiceFiles,
  onFilesUpdate,
}: UploadJoInvoiceButtonProps) {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);

  const closeIcon = "/icons/cross-small.svg";
  const downloadIcon = "/icons/download.svg";
  const uploadIcon = "/icons/upload.svg";

  function handleUploadClick() {}

  async function handleDownload(url: string, event: React.MouseEvent) {
    event.stopPropagation();

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Invoice-JO-${String(mrHeader.id).padStart(5, "0")}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast("Failed to download invoice", "error");
    }
  }

  async function uploadFile(file: File) {
    try {
      // Upload to S3
      const formData = new FormData();
      formData.append("folder", "jo-invoices");
      formData.append("files", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const uploadedUrl = data.urls[0];

      // Since we allow ONLY ONE invoice, replace (don't append)
      const updatedInvoiceFiles = [uploadedUrl]; // ← overwrite with new one

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateJoInvoice",
            id: mrHeader.id,
            jo_invoice_file: JSON.stringify(updatedInvoiceFiles),
          }),
        },
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast("Invoice uploaded", "success");

      // Update parent state
      onFilesUpdate(updatedInvoiceFiles);

      router.refresh();
    } catch (error) {
      console.error("Error uploading invoice:", error);
      toast("Failed to upload invoice", "error");
    }
  }

  async function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await uploadFile(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast("Please upload a PDF, JPG, JPEG, or PNG file", "error");
      return;
    }

    await uploadFile(file);
  }

  async function handleRemoveFile(url: string, event: React.MouseEvent) {
    event.stopPropagation();

    try {
      // Delete from S3
      const deleteRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            url: url,
          }),
        },
      );

      if (!deleteRes.ok) {
        throw new Error("Failed to delete file from S3");
      }

      // Clear invoice files (since only one allowed)
      const updatedInvoiceFiles: string[] = [];

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateJoInvoice",
            id: mrHeader.id,
            jo_invoice_file: JSON.stringify(updatedInvoiceFiles),
          }),
        },
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast("Invoice deleted", "success");

      // Update parent state
      onFilesUpdate(updatedInvoiceFiles);

      router.refresh();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast("Failed to delete invoice", "error");
    }
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={handleFileSelection}
      />

      {/* Invoice Files */}
      {invoiceFiles.length > 0 ? (
        <>
          {invoiceFiles.map((fileUrl) => (
            <Button
              bgColor={"white"}
              borderColor={"rgba(207, 207, 207, 1)"}
              textColor={"black"}
              onClick={() => {}}
              componentType="none"
              style={{ padding: "7px 20px", borderRadius: "25px" }}
              key={fileUrl}
            >
              Invoice
              <img
                src={downloadIcon}
                alt="download"
                onClick={(e) => handleDownload(fileUrl, e)}
              />
              <img
                src={closeIcon}
                alt="remove"
                onClick={(e) => handleRemoveFile(fileUrl, e)}
                style={{
                  cursor: "pointer",
                }}
              />
            </Button>
          ))}
          {/* NO upload button shown when invoice already exists */}
        </>
      ) : (
        <Button
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          componentType={"button"}
          onClick={handleUploadClick}
          bgColor={"black"}
          borderColor={isDragOver ? "rgba(217, 217, 217, 1)" : "black"}
          textColor={"white"}
          style={{
            minWidth: "175px",
            padding: "7px 20px",
            borderRadius: "25px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: isDragOver ? "rgba(169, 255, 218, 1)" : "black",
            color: isDragOver ? "rgba(34, 150, 100, 1)" : "white",
            borderStyle: isDragOver ? "dashed" : "solid",
          }}
        >
          {isDragOver ? (
            "DROP HERE"
          ) : (
            <>
              Upload Invoice
              <img src={uploadIcon} alt="upload icon" />
            </>
          )}
        </Button>
      )}
    </>
  );
}
