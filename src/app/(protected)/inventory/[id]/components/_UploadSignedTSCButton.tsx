"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type UploadSignedTSCButtonProps = {
  transactionID: number;
};

export default function UploadSignedTSCButton({
  transactionID,
}: UploadSignedTSCButtonProps) {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [tscFiles, setTscFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const closeIcon = "/icons/cross-small.svg";
  const downloadIcon = "/icons/download.svg";
  const uploadIcon = "/icons/upload.svg";

  // Fetch existing TSC files on mount using getStockTransferByID
  useEffect(() => {
    async function fetchExistingTSC() {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockDetailsByID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: transactionID }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch TSC files");
        }

        const data = await response.json();

        if (data.success && data.data && data.data.signed_tsc_file) {
          try {
            const files =
              typeof data.data.signed_tsc_file === "string"
                ? JSON.parse(data.data.signed_tsc_file)
                : data.data.signed_tsc_file;

            setTscFiles(Array.isArray(files) ? files : []);
          } catch (error) {
            console.error("Error parsing TSC files:", error);
            setTscFiles([]);
          }
        } else {
          setTscFiles([]);
        }
      } catch (error) {
        console.error("Error fetching existing TSC:", error);
        setTscFiles([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExistingTSC();
  }, [transactionID]);

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
      link.download = `TSC-${String(transactionID).padStart(5, "0")}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast("Failed to download signed TSC", "error");
    }
  }

  async function uploadFile(file: File) {
    setIsUploading(true);

    try {
      // Upload to S3
      const formData = new FormData();
      formData.append("folder", "signed-tsc");
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

      // Update database with new TSC file
      const updatedTscFiles = [...tscFiles, uploadedUrl];

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateSignedTSC",
            transaction_id: transactionID,
            signed_tsc_file: JSON.stringify(updatedTscFiles),
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast("Signed TSC uploaded successfully", "success");

      // Update local state
      setTscFiles(updatedTscFiles);

      router.refresh();
    } catch (error) {
      console.error("Error uploading TSC:", error);
      toast("Failed to upload signed TSC", "error");
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
      const updatedTscFiles = tscFiles.filter((file) => file !== url);

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateSignedTSC",
            transaction_id: transactionID,
            signed_tsc_file:
              updatedTscFiles.length > 0
                ? JSON.stringify(updatedTscFiles)
                : null,
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast("Signed TSC deleted successfully", "success");

      // Update local state
      setTscFiles(updatedTscFiles);

      router.refresh();
    } catch (error) {
      console.error("Error deleting TSC:", error);
      toast("Failed to delete signed TSC", "error");
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return (
      <Button
        componentType={"button"}
        onClick={() => {}}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        style={{
          padding: "7px 20px",
          borderRadius: "25px",
          cursor: "not-allowed",
        }}
        disabled
      >
        Loading...
      </Button>
    );
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

      {/* TSC Files */}
      {tscFiles.length > 0 ? (
        <>
          {tscFiles.map((fileUrl, index) => (
            <Button
              bgColor={"white"}
              borderColor={"rgba(207, 207, 207, 1)"}
              textColor={"black"}
              onClick={() => {}}
              componentType="none"
              style={{
                padding: "7px 20px",
                borderRadius: "25px",
                textTransform: "none",
              }}
              key={fileUrl}
            >
              Signed TSC
              <img
                src={downloadIcon}
                alt="download"
                onClick={(e) => handleDownload(fileUrl, e)}
              />
              <img
                src={closeIcon}
                alt="remove"
                onClick={(e) => handleRemoveFile(fileUrl, e)}
              />
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
            componentType={"none"}
            bgColor={"white"}
            borderColor={"rgba(207, 207, 207, 1)"}
            textColor={"black"}
            style={{
              padding: "7px 20px",
              borderRadius: "25px",
              textTransform: "none",
            }}
            disabled={isUploading}
          >
            Signed TSC
            <img
              src={uploadIcon}
              alt="upload icon"
              style={{ filter: "invert(1)" }}
              onClick={handleUploadClick}
            />
          </Button>
        </div>
      )}
    </>
  );
}
