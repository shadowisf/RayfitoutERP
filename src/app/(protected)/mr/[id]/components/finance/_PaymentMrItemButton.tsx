"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect, useRef } from "react";
import RejectCommentPopUp from "../manager/RejectCommentPopUp";
import { useRouter } from "next/navigation";

type PaymentMrItemButtonProps = {
  mrHeaderId: number;
  supplierId: number;
};

type StatusType = "pending" | "approved" | "rejected";

export default function PaymentMrItemButton({
  mrHeaderId,
  supplierId,
}: PaymentMrItemButtonProps) {
  const router = useRouter();

  const crossIcon = "/icons/cross-small.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [status, setStatus] = useState<StatusType>("pending");
  const [rejectComment, setRejectComment] = useState<string>("");
  const [lpoId, setLpoId] = useState<number | null>(null);
  const [paymentFileUrl, setPaymentFileUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const [rejectText, setRejectText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch LPO payment status on mount
  useEffect(() => {
    fetchLpoPaymentStatus();
  }, [mrHeaderId, supplierId]);

  async function fetchLpoPaymentStatus() {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_header_id: mrHeaderId,
            supplier_id: supplierId,
          }),
        }
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
            setPaymentFileUrl(paymentFile);
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
          // No LPO found
          setLpoId(null);
        }
      }
    } catch (error) {
      console.error("Error fetching LPO payment status:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle file upload button click
  function handleUploadClick() {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }

  // Get file name from URL
  function getFileName(url: string): string {
    const urlParts = url.split("/");
    const fileName = urlParts[urlParts.length - 1];
    return decodeURIComponent(fileName) || "View File";
  }

  // Handle file selection and automatic upload
  async function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!lpoId) {
      toast("No LPO found for this supplier", "error");
      return;
    }

    const file = files[0];
    setIsUploading(true);

    try {
      // Upload to S3
      const formData = new FormData();
      formData.append("folder", "lpo-payments");
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

      console.log("Uploaded payment file URL:", uploadedUrl);

      // Update database with payment file and approve status
      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approvePayment",
            lpo_id: lpoId,
            payment_file: JSON.stringify(uploadedUrl),
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Failed to update database");
      }

      toast("Payment file uploaded successfully", "success");

      // Update local state
      setPaymentFileUrl(uploadedUrl);
      setStatus("approved");

      router.refresh();
    } catch (error) {
      console.error("Error uploading payment file:", error);
      toast("Failed to upload payment file", "error");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rejectPayment",
        lpo_id: lpoId,
        reject_comment: rejectText,
      }),
    });

    if (res.ok) {
      toast(`Payment rejected`, "success");

      setRejectText("");
      setIsRejectOpen(false);

      router.refresh();
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
          }
        );

        if (!deleteRes.ok) {
          throw new Error("Failed to delete file from S3");
        }
      }

      // Reset payment status in database
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetPayment",
          lpo_id: lpoId,
        }),
      });

      if (res.ok) {
        toast("Payment approval reset", "success");

        setStatus("pending");
        setRejectComment("");
        setPaymentFileUrl("");
        setIsRejectOpen(false);

        router.refresh();
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

  if (status === "approved") {
    return (
      <div
        className="approval-pill"
        style={{
          backgroundColor: "rgba(34, 150, 100, 1)",
          color: "white",
          minWidth: "350px",
          padding: "5px 20px",
        }}
      >
        <span>Paid</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* {paymentFileUrl && (
            <a
              href={paymentFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "white",
                textDecoration: "underline",
                fontSize: "13px",
              }}
            >
              {getFileName(paymentFileUrl)}
            </a>
          )} */}
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
              alt="close"
              style={{ filter: "invert(1)", cursor: "pointer", width: "10px" }}
              onClick={handleReset}
            />
          </Button>
          <img
            src={crossIcon}
            alt="close"
            style={{
              filter: "invert(1)",
              cursor: "pointer",
              width: "10px",
            }}
            onClick={handleReset}
          />
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div
        className="approval-pill"
        style={{
          backgroundColor: "rgba(185, 28, 28, 1)",
          color: "white",
          minWidth: "350px",
          padding: "5px 20px",
        }}
      >
        <span>Rejected</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <RejectCommentPopUp text={rejectComment} />

          <img
            src={crossIcon}
            alt="close"
            style={{ filter: "invert(1)", cursor: "pointer", width: "10px" }}
            onClick={handleReset}
          />
        </div>
      </div>
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

      <div style={{ display: "flex", gap: "10px" }}>
        <Button
          componentType={"button"}
          bgColor={"rgba(34, 150, 100, 1)"}
          borderColor={"rgba(34, 150, 100, 1)"}
          textColor={"white"}
          onClick={handleUploadClick}
          style={{
            borderRadius: "20px",
            padding: "5px 20px",
            flexGrow: 1,
            textWrap: "nowrap",
          }}
        >
          Proceed to Payment
        </Button>
        <Button
          componentType={"button"}
          bgColor={"rgba(185, 28, 28, 1)"}
          borderColor={"rgba(185, 28, 28, 1)"}
          textColor={"white"}
          onClick={() => setIsRejectOpen(true)}
          style={{ borderRadius: "20px", padding: "5px 20px" }}
        >
          Reject Invoice
        </Button>
      </div>

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
