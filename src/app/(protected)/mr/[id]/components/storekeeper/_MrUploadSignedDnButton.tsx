"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import FormPopUp from "@/app/components/FormPopup";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";

type Props = {
  transactionID: number;
  mrLineId: number;
  onSuccess?: () => void;
};

export default function MrUploadSignedDnButton({
  transactionID,
  mrLineId,
  onSuccess,
}: Props) {
  const router = useRouter();

  const uploadIcon = "/icons/upload.svg";
  const downloadIcon = "/icons/download.svg";

  const [isUploading, setIsUploading] = useState(false);
  const [tscFiles, setTscFiles] = useState<string[]>([]);
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
  const [signedDN, setSignedDN] = useState<File | null>(null);

  // Fetch existing TSC files
  useEffect(() => {
    async function fetchExistingTSC() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockDetailsByID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: transactionID }),
          },
        );

        if (!response.ok) return;

        const data = await response.json();
        if (data.success && data.data && data.data.signed_tsc_file) {
          try {
            const files =
              typeof data.data.signed_tsc_file === "string"
                ? JSON.parse(data.data.signed_tsc_file)
                : data.data.signed_tsc_file;
            setTscFiles(Array.isArray(files) ? files : []);
          } catch {
            setTscFiles([]);
          }
        }
      } catch {
        setTscFiles([]);
      }
    }

    if (transactionID) {
      fetchExistingTSC();
    }
  }, [transactionID]);

  async function handleDownload(url: string, event: React.MouseEvent) {
    event.stopPropagation();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Signed-DN-${String(transactionID).padStart(5, "0")}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
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
        { method: "POST", body: formData },
      );

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      const uploadedUrl = data.urls[0];

      // Update stocks_transfer_issue signed_tsc_file
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
        },
      );

      if (!updateRes.ok) throw new Error("Failed to update database");

      // Also save to mr_lines.signed_dn_file
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateMrLineSignedDn",
          id: mrLineId,
          signed_dn_file: JSON.stringify(updatedTscFiles),
        }),
      });

      toast("Signed DN uploaded", "success");
      setTscFiles(updatedTscFiles);
      setSignedDN(null);
      setIsUploadFormOpen(false);

      if (onSuccess) onSuccess();
      router.refresh();
    } catch {
      toast("Failed to upload signed DN", "error");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      {tscFiles.length > 0 ? (
        <>
          {tscFiles.map((fileUrl) => (
            <Button
              bgColor={"white"}
              borderColor={"rgba(207, 207, 207, 1)"}
              textColor={"black"}
              componentType="none"
              style={{
                padding: "7px 20px",
                borderRadius: "25px",
              }}
              key={fileUrl}
            >
              Signed DN
              <img
                src={downloadIcon}
                alt="download"
                onClick={(e) => handleDownload(fileUrl, e)}
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
          }}
          disabled={isUploading}
          onClick={(e) => {
            e.preventDefault();
            setIsUploadFormOpen(true);
          }}
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

      {isUploadFormOpen && (
        <FormPopUp
          header={"UPLOAD SIGNED DELIVERY NOTE"}
          setIsOpen={setIsUploadFormOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
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
