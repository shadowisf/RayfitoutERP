"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { MrHeader } from "../../types/mrHeader";
import { MrLine } from "../../types/mrLine";

type UploadSignedLPOButtonProps = {
  mrHeader: MrHeader;
  mrLine: MrLine;
  LpoID: number;
  supplierId: number;
  supplierType: string;
  signedLpoFiles: string[];
  onFilesUpdate: (files: string[]) => void;
  canDelete?: boolean;
};

export default function UploadSignedLPOButton({
  mrHeader,
  mrLine,
  LpoID,
  supplierId,
  supplierType,
  signedLpoFiles,
  onFilesUpdate,
  canDelete = false,
}: UploadSignedLPOButtonProps) {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);

  const closeIcon = "/icons/cross-small.svg";
  const uploadIcon = "/icons/upload.svg";
  const downloadIcon = "/icons/download.svg";

  function handleUploadClick() {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
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
      link.download = `Signed-LPO-${String(LpoID).padStart(5, "0")}`;
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
      formData.append("folder", "lpo-signed");
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

      // Update database with new signed LPO file
      const updatedSignedLpoFiles = [...signedLpoFiles, uploadedUrl];

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateLPOSignedLpo",
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
            signed_lpo_file: JSON.stringify(updatedSignedLpoFiles),
          }),
        },
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast(
        `Signed local purchase order uploaded for ${mrLine.approved_supplier_name}`,
        "success",
      );

      // Update parent state
      onFilesUpdate(updatedSignedLpoFiles);

      router.refresh();
    } catch (error) {
      console.error("Error uploading signed LPO:", error);
      toast("Failed to upload signed local purchase order", "error");
    } finally {
      setIsUploading(false);
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
        },
      );

      if (!deleteRes.ok) {
        throw new Error("Failed to delete file from S3");
      }

      // Update database
      const updatedSignedLpoFiles = signedLpoFiles.filter(
        (file) => file !== url,
      );

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateLPOSignedLpo",
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
            signed_file: JSON.stringify(updatedSignedLpoFiles),
          }),
        },
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast(
        `Signed local purchase order deleted for ${mrLine.approved_supplier_name}`,
        "success",
      );

      // Update parent state
      onFilesUpdate(updatedSignedLpoFiles);

      router.refresh();
    } catch (error) {
      console.error("Error deleting signed LPO:", error);
      toast("Failed to delete signed local purchase order", "error");
    } finally {
      setIsUploading(false);
    }
  }

  if (supplierType.toLowerCase().includes("marketplace")) {
    return null;
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

      {/* Signed LPO Files */}
      {signedLpoFiles.length > 0 ? (
        <>
          {signedLpoFiles.map((fileUrl) => (
            <Button
              bgColor={"white"}
              borderColor={"rgba(207, 207, 207, 1)"}
              textColor={"black"}
              onClick={() => {}}
              componentType="none"
              style={{ padding: "7px 20px", borderRadius: "25px" }}
              key={fileUrl}
            >
              Signed LPO
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
              minWidth: "150px",
              cursor: isUploading ? "not-allowed" : "pointer",
            }}
            disabled={isUploading}
          >
            Upload Signed LPO <img src={uploadIcon} alt="upload icon" />
          </Button>
        </div>
      )}
    </>
  );
}
