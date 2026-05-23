"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect } from "react";
import RejectCommentPopUp from "../../../../components/manager/RejectCommentPopUp";
import { useRouter } from "next/navigation";
import { LpoHeader } from "../../../../types/lpoHeader";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import { MrLine } from "../../../../types/mrLine";
import { MrHeader } from "../../../../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import { useRefresh } from "@/app/context/RefreshContext";

type PaymentButtonsProps = {
  mrHeader: MrHeader;
  mrLine: MrLine;
  supplierId: number;
};

type StatusType = "pending" | "approved" | "rejected";

export default function PaymentButtons({
  mrHeader,
  mrLine,
  supplierId,
}: PaymentButtonsProps) {
  const { userInfo } = useAuth();

  const router = useRouter();
  const { refresh } = useRefresh();


  const crossIcon = "/icons/cross-small.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const downloadIcon = "/icons/download.svg";

  const [lpo, setLpo] = useState<LpoHeader | null>(null);

  const [status, setStatus] = useState<StatusType>("pending");
  const [rejectComment, setRejectComment] = useState<string>("");
  const [lpoId, setLpoId] = useState<number | null>(null);
  const [paymentFileUrl, setPaymentFileUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const [isProceedOpen, setIsProceedOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const [rejectText, setRejectText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check if we're past the payment stage (progress_id > 14)
  const isPastPaymentStage = mrHeader.progress_id > 14;

  // Fetch LPO payment status on mount
  useEffect(() => {
    async function fetchLpoPaymentStatus() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mr_header_id: mrHeader.id,
              supplier_id: supplierId,
            }),
          },
        );

        if (res.ok) {
          const data = await res.json();

          if (data.success && data.data && data.data.length > 0) {
            const lpo = data.data[0];
            setLpoId(lpo.id);

            const paymentStatus = lpo.payment_status;
            const paymentRejectComment = lpo.payment_reject_comment;
            const paymentFile = lpo.payment_file;

            if (paymentFile) {
              // Handle if it's a JSON string or already parsed
              try {
                let fileUrl = paymentFile;

                // Check if it's a JSON string (starts with '[' or '{')
                if (
                  typeof paymentFile === "string" &&
                  (paymentFile.startsWith("[") || paymentFile.startsWith("{"))
                ) {
                  const parsedFile = JSON.parse(paymentFile);
                  // If it's an array, get the first file, otherwise use the file directly
                  fileUrl = Array.isArray(parsedFile)
                    ? parsedFile[0]
                    : parsedFile;
                }

                setPaymentFileUrl(fileUrl || "");
              } catch (error) {
                console.error("Error parsing payment file:", error);
                // If parsing fails, just use the original value as it's likely a plain URL
                setPaymentFileUrl(paymentFile || "");
              }
            }

            if (!paymentStatus) {
              setStatus("pending");
            } else if (paymentStatus.toLowerCase() === "approved") {
              setStatus("approved");
            } else if (paymentStatus.toLowerCase() === "rejected") {
              setStatus("rejected");
              setRejectComment(paymentRejectComment || "");
            }
          } else {
            setLpoId(null);
          }
        }
      } catch (error) {
        console.error("Error fetching LPO payment status:", error);
      }
    }

    fetchLpoPaymentStatus();
  }, [mrHeader.id, supplierId]);

  useEffect(() => {
    async function fetchLpo() {
      if (!lpoId) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );
        const data = await response.json();
        if (data.success && data.data) {
          setLpo(data.data);
        }
      } catch (error) {
        console.error("Error fetching LPO:", error);
      }
    }

    fetchLpo();
  }, [lpoId]);

  // Upload file to S3
  async function uploadFileToS3(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("folder", "lpo-payments");
    formData.append("files", file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.urls[0];
  }

  // Handle download payment receipt
  async function handleDownloadReceipt(event: React.MouseEvent) {
    event.stopPropagation();

    if (!paymentFileUrl) {
      toast("No payment receipt available", "error");
      return;
    }

    try {
      const response = await fetch(paymentFileUrl);
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Payment-Receipt-${String(lpoId).padStart(5, "0")}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast("Failed to download payment receipt", "error");
    }
  }

  // Handle proceed payment submission
  async function handleProceedPayment(e: React.FormEvent) {
    e.preventDefault();

    if (!lpoId) {
      toast("No LPO found for this supplier", "error");
      return;
    }

    if (!selectedFile) {
      toast("Please upload a payment receipt", "error");
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to S3
      const uploadedUrl = await uploadFileToS3(selectedFile);

      // Update database with payment file and approve status
      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approvePayment",
            lpo_id: lpoId,
            payment_file: JSON.stringify(uploadedUrl),
            from_lpo_workflow: true,
          }),
        },
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast(`Payment for ${mrLine.approved_supplier_name} approved`, "success");

      setStatus("approved");
      setPaymentFileUrl(uploadedUrl);
      setSelectedFile(null);
      setIsProceedOpen(false);

      await refresh();
    } catch (error) {
      console.error("Error approving payment:", error);
      toast("Failed to approve payment", "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleReject() {
    if (!lpoId) {
      toast("No LPO found for this supplier", "error");
      return;
    }

    setStatus("rejected");
    setRejectComment(rejectText);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rejectPayment",
        lpo_id: lpoId,
        reject_comment: rejectText,
      }),
    });

    if (res.ok) {
      toast(`Payment for ${mrLine.approved_supplier_name} rejected`, "success");

      setRejectText("");
      setIsRejectOpen(false);

      await refresh();
    } else {
      toast("Failed to reject payment", "error");
      setStatus("pending");
      setRejectComment("");
    }
  }

  async function handleReset() {
    if (!lpoId) {
      toast("No LPO found for this supplier", "error");
      return;
    }

    setIsUploading(true);

    try {
      // Delete from S3 if payment file exists
      if (paymentFileUrl) {
        const deleteRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete",
              url: paymentFileUrl,
            }),
          },
        );

        if (!deleteRes.ok) {
          throw new Error("Failed to delete file from S3");
        }
      }

      // Reset payment status in database
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetPayment",
          lpo_id: lpoId,
        }),
      });

      if (res.ok) {
        setStatus("pending");
        setRejectComment("");
        setPaymentFileUrl("");
        setIsRejectOpen(false);

        await refresh();
      } else {
        toast("Failed to reset payment approval", "error");
      }
    } catch (error) {
      console.error("Error resetting payment:", error);
      toast("Failed to reset payment approval", "error");
    } finally {
      setIsUploading(false);
    }
  }

  // If past payment stage, just show download button
  if (isPastPaymentStage && paymentFileUrl) {
    return (
      <Button
        bgColor={"white"}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        onClick={() => {}}
        componentType="none"
        style={{ padding: "7px 20px", borderRadius: "25px" }}
      >
        Payment Receipt
        <img
          src={downloadIcon}
          alt="download"
          onClick={handleDownloadReceipt}
          style={{ cursor: "pointer" }}
        />
      </Button>
    );
  }

  // If past payment stage but no payment file, don't show anything
  if (isPastPaymentStage) {
    return null;
  }

  // Original approval pill logic for payment stage (progress_id = 14)
  if (status === "approved") {
    return (
      <>
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(34, 150, 100, 1)",
            color: "white",
            minWidth: "350px",
            fontSize: "14.1px",
          }}
        >
          <span style={{ fontSize: "14.1px" }}>Paid</span>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Button
              componentType={"link"}
              bgColor={"transparent"}
              borderColor={"transparent"}
              textColor={"black"}
              style={{ border: "none", padding: "0px" }}
              href={paymentFileUrl}
              target="_blank"
            >
              <img
                src={externalLinkIcon}
                alt="view"
                style={{ filter: "invert(1)", cursor: "pointer" }}
              />
            </Button>

            {userInfo?.departmentID === 10 && (
              <img
                src={crossIcon}
                alt="close"
                style={{
                  filter: "invert(1)",
                  cursor: "pointer",
                  width: "12px",
                }}
                onClick={handleReset}
              />
            )}
          </div>
        </div>
      </>
    );
  }

  if (status === "rejected") {
    return (
      <>
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(185, 28, 28, 1)",
            color: "white",
            minWidth: "350px",
          }}
        >
          <span style={{ fontSize: "14.1px" }}>Rejected</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <RejectCommentPopUp text={rejectComment} />

            {userInfo?.departmentID === 10 && (
              <img
                src={crossIcon}
                alt="close"
                style={{
                  filter: "invert(1)",
                  cursor: "pointer",
                  width: "12px",
                }}
                onClick={handleReset}
              />
            )}
          </div>
        </div>
      </>
    );
  }

  if (status === "pending" && userInfo?.departmentID !== 10) {
    return (
      <>
        <div
          className="approval-pill"
          style={{
            backgroundColor: "gray",
            color: "white",
            minWidth: "350px",
          }}
        >
          <span style={{ fontSize: "14.1px" }}>Payment Pending</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: "5px" }}>
        <Button
          componentType={"button"}
          bgColor={"rgba(34, 150, 100, 1)"}
          borderColor={"rgba(34, 150, 100, 1)"}
          textColor={"white"}
          onClick={() => setIsProceedOpen(true)}
          style={{
            borderRadius: "25px",
            padding: "7px 20px",
            flexGrow: 1,
            textWrap: "nowrap",
          }}
          disabled={isUploading}
        >
          Proceed to Payment
        </Button>
        <Button
          componentType={"button"}
          bgColor={"rgba(185, 28, 28, 1)"}
          borderColor={"rgba(185, 28, 28, 1)"}
          textColor={"white"}
          onClick={() => setIsRejectOpen(true)}
          style={{
            borderRadius: "25px",
            padding: "7px 20px",
            flexGrow: 1,
            textWrap: "nowrap",
          }}
        >
          Reject Invoice
        </Button>
      </div>

      {isProceedOpen && (
        <FormPopUp
          header="PROCEED PAYMENT"
          setIsOpen={setIsProceedOpen}
          handleSubmit={handleProceedPayment}
          addButtonLabel="CONFIRM"
        >
          <UploadFileBox
            fileState={selectedFile}
            setFileState={setSelectedFile}
            label=""
            acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp"
            required
            placeholder=""
            buttonLabel="UPLOAD PAYMENT RECEIPT"
          />
        </FormPopUp>
      )}

      {isRejectOpen && (
        <FormPopUp
          header="REJECT PAYMENT"
          setIsOpen={setIsRejectOpen}
          handleSubmit={handleReject}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"COMMENTS"}
              value={rejectText}
              type={"textarea"}
              placeholder={"ENTER COMMENTS"}
              required
              onChange={(e) => setRejectText(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
