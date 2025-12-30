"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import RejectCommentPopUp from "../manager/RejectCommentPopUp";
import { useRouter } from "next/navigation";
import { LpoHeader } from "../../types/lpoHeader";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import { MrLine } from "../../types/mrLine";

type PaymentButtonsProps = {
  mrHeaderId: number;
  mrLine: MrLine;
  supplierId: number;
  portalTarget?: HTMLElement | null;
};

type StatusType = "pending" | "approved" | "rejected";

export default function PaymentButtons({
  mrHeaderId,
  mrLine,
  supplierId,
  portalTarget,
}: PaymentButtonsProps) {
  const router = useRouter();

  const crossIcon = "/icons/cross-small.svg";
  const externalLinkIcon = "/icons/external-link.svg";

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
            setLpoId(null);
          }
        }
      } catch (error) {
        console.error("Error fetching LPO payment status:", error);
      }
    }

    fetchLpoPaymentStatus();
  }, [mrHeaderId, supplierId]);

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
          }
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

      toast(`Payment for ${mrLine.approved_supplier_name} approved`, "success");

      setStatus("approved");
      setPaymentFileUrl(uploadedUrl);
      setSelectedFile(null);
      setIsProceedOpen(false);

      router.refresh();
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
      method: "POST",
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

  // Render total invoice section in portal
  const totalInvoiceSection =
    portalTarget && lpo ? (
      <>
        <br />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: "rgba(239, 239, 239, 1)",
            padding: "7px 20px",
            borderRadius: "25px",
          }}
        >
          <h4>TOTAL INVOICE</h4>
          <h4>{lpo.total} AED</h4>
        </div>
      </>
    ) : null;

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
          <span style={{ fontWeight: "bold" }}>Paid</span>
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
          </div>
        </div>
        {portalTarget &&
          totalInvoiceSection &&
          createPortal(totalInvoiceSection, portalTarget)}
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
            fontSize: "14.1px",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Rejected</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <RejectCommentPopUp text={rejectComment} />

            <img
              src={crossIcon}
              alt="close"
              style={{ filter: "invert(1)", cursor: "pointer", width: "12px" }}
              onClick={handleReset}
            />
          </div>
        </div>
        {portalTarget &&
          totalInvoiceSection &&
          createPortal(totalInvoiceSection, portalTarget)}
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: "10px" }}>
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

      {portalTarget &&
        totalInvoiceSection &&
        createPortal(totalInvoiceSection, portalTarget)}

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
