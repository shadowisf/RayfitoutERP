"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { MrHeader } from "../../types/mrHeader";

type UploadInvoiceButtonProps = {
  mrHeader: MrHeader;
  supplierId: number;
  invoiceFiles: string[];
  onFilesUpdate: (files: string[]) => void;
  canDelete?: boolean;
};

export default function UploadInvoiceButton({
  mrHeader,
  supplierId,
  invoiceFiles,
  onFilesUpdate,
  canDelete = false,
}: UploadInvoiceButtonProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const closeIcon = "/icons/cross-small.svg";
  const externalLinkIcon = "/icons/external-link.svg";
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

  async function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
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

      toast("Invoice uploaded", "success");

      // Update parent state
      onFilesUpdate(updatedInvoiceFiles);

      router.refresh();
    } catch (error) {
      console.error("Error uploading invoice:", error);
      toast("Failed to upload invoice", "error");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

      toast("Invoice deleted", "success");

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
              style={{ padding: "5px 20px", borderRadius: "25px" }}
              key={fileUrl}
            >
              {/* {getFileName(fileUrl)} */}
              Invoice
              <a style={{ display: "flex" }} href={fileUrl} target="_blank">
                <img src={externalLinkIcon} alt="external link" />
              </a>
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
          }}
        >
          Upload Invoice
          <img src={uploadIcon} alt="upload icon" />
        </Button>
      )}
    </>
  );
}
