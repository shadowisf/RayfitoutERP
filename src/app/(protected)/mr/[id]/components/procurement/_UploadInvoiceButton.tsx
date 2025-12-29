"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { MrHeader } from "../../types/mrHeader";
import { MrLine } from "../../types/mrLine";

type UploadInvoiceButtonProps = {
  mrHeader: MrHeader;
  mrLine: MrLine;
  LpoID: number;
  supplierId: number;
  invoiceFiles: string[];
  onFilesUpdate: (files: string[]) => void;
  canDelete?: boolean;
};

export default function UploadInvoiceButton({
  mrHeader,
  mrLine,
  LpoID,
  supplierId,
  invoiceFiles,
  onFilesUpdate,
  canDelete = false,
}: UploadInvoiceButtonProps) {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);

  const closeIcon = "/icons/cross-small.svg";
  const downloadIcon = "/icons/download.svg";
  const uploadIcon = "/icons/upload.svg";

  function handleUploadClick() {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }

  function getFileName(url: string): string {
    const urlParts = url.split("/");
    const fileName = urlParts[urlParts.length - 1];
    return decodeURIComponent(fileName) || "View File";
  }

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
      // Custom name with MR info
      link.download = `Invoice-${String(LpoID).padStart(5, "0")}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast("Failed to download signed LPO", "error");
    }
  }

  async function uploadFile(file: File) {
    setIsUploading(true);

    try {
      // Upload to S3
      const formData = new FormData();
      formData.append("folder", "lpo-invoices");
      formData.append("files", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const uploadedUrl = data.urls[0];

      // Update database with new invoice file
      const updatedInvoiceFiles = [...invoiceFiles, uploadedUrl];

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateLPOInvoice",
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
            invoice_file: JSON.stringify(updatedInvoiceFiles),
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast(`Invoice uploaded for ${mrLine.approved_supplier_name}`, "success");

      // Update parent state
      onFilesUpdate(updatedInvoiceFiles);

      router.refresh();
    } catch (error) {
      console.error("Error uploading invoice:", error);
      toast("Failed to upload invoice", "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>
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
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

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
    setIsUploading(true);

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
        }
      );

      if (!deleteRes.ok) {
        throw new Error("Failed to delete file from S3");
      }

      // Update database
      const updatedInvoiceFiles = invoiceFiles.filter((file) => file !== url);

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateLPOInvoice",
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
            invoice_file: JSON.stringify(updatedInvoiceFiles),
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast(`Invoice deleted for ${mrLine.approved_supplier_name}`, "success");

      // Update parent state
      onFilesUpdate(updatedInvoiceFiles);

      router.refresh();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast("Failed to delete invoice", "error");
    } finally {
      setIsUploading(false);
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
              {/* {getFileName(fileUrl)} */}
              Invoice
              {/* <a style={{ display: "flex" }} href={fileUrl} target="_blank">
                <img src={externalLinkIcon} alt="external link" />
              </a> */}
              <img
                src={downloadIcon}
                alt="download"
                onClick={(e) => handleDownload(fileUrl, e)}
              />
              {canDelete && (
                <img
                  src={closeIcon}
                  alt="remove"
                  onClick={(e) => handleRemoveFile(fileUrl, e)}
                  style={{
                    cursor: "pointer",
                  }}
                />
              )}
            </Button>
          ))}
        </>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            borderRadius: "25px",
          }}
        >
          <Button
            componentType={"button"}
            onClick={handleUploadClick}
            bgColor={"black"}
            borderColor={"black"}
            textColor={"white"}
            style={{
              padding: "7px 20px",
              borderRadius: "25px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: isUploading ? "not-allowed" : "pointer",
            }}
            disabled={isUploading}
          >
            Select or Drop Invoice
            <img src={uploadIcon} alt="upload icon" />
          </Button>
        </div>
      )}
    </>
  );
}
