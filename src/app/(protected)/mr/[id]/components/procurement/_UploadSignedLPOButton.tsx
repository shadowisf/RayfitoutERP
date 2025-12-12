"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { MrHeader } from "../../types/mrHeader";

type UploadSignedLPOButtonProps = {
  mrHeader: MrHeader;
  supplierId: number;
  signedLpoFiles: string[];
  onFilesUpdate: (files: string[]) => void;
  canDelete?: boolean;
};

export default function UploadSignedLPOButton({
  mrHeader,
  supplierId,
  signedLpoFiles,
  onFilesUpdate,
  canDelete = false,
}: UploadSignedLPOButtonProps) {
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
      formData.append("folder", "lpo-signed");
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

      // Update database with new signed LPO file
      const updatedSignedLpoFiles = [...signedLpoFiles, uploadedUrl];

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateLPOSignedLpo",
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
            signed_lpo_file: JSON.stringify(updatedSignedLpoFiles),
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast("Signed local purchase order uploaded", "success");

      // Update parent state
      onFilesUpdate(updatedSignedLpoFiles);

      router.refresh();
    } catch (error) {
      console.error("Error uploading signed LPO:", error);
      toast("Failed to upload signed local purchase order", "error");
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
      const updatedSignedLpoFiles = signedLpoFiles.filter(
        (file) => file !== url
      );

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateLPOSignedLpo",
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
            signed_file: JSON.stringify(updatedSignedLpoFiles),
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast("Signed local purchase order deleted", "success");

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
            <div
              key={fileUrl}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "7px 20px",
                borderRadius: "25px",
                border: "1px rgba(207, 207, 207, 1) solid",
                backgroundColor: "white",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  maxWidth: "120px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {getFileName(fileUrl)}
              </span>

              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex" }}
              >
                <img src={externalLinkIcon} alt="external link" height={11} />
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
            </div>
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
            minWidth: "150px",
          }}
        >
          Upload Signed LPO
          <img src={uploadIcon} alt="upload icon" />
        </Button>
      )}
    </>
  );
}
