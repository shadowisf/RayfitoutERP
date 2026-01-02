"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import FormPopUp from "@/app/components/FormPopup";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";

type UploadSignedTSCButtonProps = {
  transactionID: number;
};

export default function UploadSignedTSCButton({
  transactionID,
}: UploadSignedTSCButtonProps) {
  const router = useRouter();

  const uploadIcon = "/icons/upload.svg";

  const [isUploading, setIsUploading] = useState(false);
  const [tscFiles, setTscFiles] = useState<string[]>([]);
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);

  const [signedDN, setSignedDN] = useState<File | null>(null);

  const closeIcon = "/icons/cross-small.svg";
  const downloadIcon = "/icons/download.svg";

  // Fetch existing TSC files on mount using getStockTransferByID
  useEffect(() => {
    async function fetchExistingTSC() {
      try {
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
      }
    }

    fetchExistingTSC();
  }, [transactionID]);

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
      link.download = `Signed-DN-${String(transactionID).padStart(5, "0")}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast("Failed to download signed DN", "error");
    }
  }

  async function handleSubmit() {
    if (!signedDN) {
      toast("Please select a file to upload", "error");
      return;
    }

    setIsUploading(true);

    try {
      // Upload to S3
      const formData = new FormData();
      formData.append("folder", "signed-dn");
      formData.append("files", signedDN);

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
          method: "PUT",
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

      toast("Signed DN uploaded successfully", "success");

      // Update local state
      setTscFiles(updatedTscFiles);

      // Reset form
      setSignedDN(null);
      setIsUploadFormOpen(false);

      router.refresh();
    } catch (error) {
      console.error("Error uploading DN:", error);
      toast("Failed to upload signed DN", "error");
    } finally {
      setIsUploading(false);
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
      const updatedTscFiles = tscFiles.filter((file) => file !== url);

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deleteSignedTSC",
            transaction_id: transactionID,
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast("Signed DN deleted", "success");

      // Update local state
      setTscFiles(updatedTscFiles);

      router.refresh();
    } catch (error) {
      console.error("Error deleting DN:", error);
      toast("Failed to delete signed DN", "error");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
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
              DN (SIGNED)
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
        <Button
          componentType={"button"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          style={{
            padding: "7px 20px",
            borderRadius: "25px",
            textTransform: "none",
          }}
          disabled={isUploading}
          onClick={() => setIsUploadFormOpen(true)}
        >
          <div
            style={{
              backgroundColor: "rgba(248, 77, 77, 1)",
              padding: "1px 8px",
              borderRadius: "25px",
            }}
          >
            !
          </div>
          Upload Signed DN
          <img src={uploadIcon} alt="upload" />
        </Button>
      )}

      {/* Upload Form Popup */}
      {isUploadFormOpen && (
        <FormPopUp
          header={"UPLOAD SIGNED DELIVERY NOTE"}
          setIsOpen={setIsUploadFormOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={handleSubmit}
        >
          <div className="input-row full">
            <SingleUploadFileBox
              fileState={signedDN}
              setFileState={setSignedDN}
              label={"SIGNED DELIVERY NOTE"}
              acceptedFileTypes={".pdf,.jpg,.jpeg,.png"}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
