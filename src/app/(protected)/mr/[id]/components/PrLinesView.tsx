"use client";

import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import BoqReferencePopUp from "./BoqReferencePopUp";
import InputItem from "@/app/components/InputItem";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import CommentsSection from "@/app/components/CommentsSection";

type PrLine = {
  id: number;
  mr_header_id: number;
  boq_line_id: number;
  jo_line_id: number;
  completed_qty: number;
  retention: number;
  attachment: string | null;
  qs_approval_status: string | null;
  qs_reject_comment: string | null;
  approval_status: string | null;
  reject_comment: string | null;
  // JO line fields
  job_scope_name: string;
  job_description: string;
  boq_line_ids: string;
  boq_line_names: string;
  boq_item_numbers: string;
  quantity: number;
  unit: string;
  budget_estimate: number;
  approved_total_price: number;
};

type PrLinesViewProps = {
  mrHeader: MrHeader;
};

const parseAttachments = (attachment: any): string[] => {
  if (!attachment) return [];
  if (Array.isArray(attachment)) return attachment;
  if (typeof attachment === "string") {
    try {
      const parsed = JSON.parse(attachment);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const formatNumber = (value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return "";
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(3)).toString();
};

export default function PrLinesView({ mrHeader }: PrLinesViewProps) {
  const { userInfo } = useAuth();
  const router = useRouter();

  const uploadIcon = "/icons/upload.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const checkIcon = "/icons/check.svg";
  const crossIcon = "/icons/cross-small.svg";
  const downloadIcon = "/icons/download.svg";

  const [prLines, setPrLines] = useState<PrLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editedLines, setEditedLines] = useState<
    Record<number, { completed_qty: string }>
  >({});

  // Invoice upload
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [invoiceFile, setInvoiceFile] = useState<string | null>(
    mrHeader.jo_invoice_file || null,
  );
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  // Payment receipt
  const [paymentReceipt, setPaymentReceipt] = useState<string | null>(
    mrHeader.pr_payment_receipt || null,
  );
  const [selectedPaymentFile, setSelectedPaymentFile] = useState<File | null>(
    null,
  );
  const [prPaymentStatus, setPrPaymentStatus] = useState<
    "pending" | "paid" | "rejected"
  >(
    mrHeader.progress_id === 25
      ? "paid"
      : mrHeader.progress_id === 5 && mrHeader.pr_payment_receipt
        ? "rejected"
        : mrHeader.pr_payment_receipt
          ? "paid"
          : "pending",
  );

  // Popups
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectLineId, setRejectLineId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectType, setRejectType] = useState<"qs" | "manager">("qs");

  // Confirmation popups
  const [isQsReturnOpen, setIsQsReturnOpen] = useState(false);
  const [isQsSubmitManagerOpen, setIsQsSubmitManagerOpen] = useState(false);
  const [isManagerReturnOpen, setIsManagerReturnOpen] = useState(false);
  const [isManagerApproveOpen, setIsManagerApproveOpen] = useState(false);
  const [isProceedPaymentOpen, setIsProceedPaymentOpen] = useState(false);
  const [isSubmitCompletionOpen, setIsSubmitCompletionOpen] = useState(false);

  // Payment reject popup
  const [isPaymentRejectOpen, setIsPaymentRejectOpen] = useState(false);
  const [paymentRejectReason, setPaymentRejectReason] = useState("");

  // Per-line attachment upload
  const lineAttachmentRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  );

  useEffect(() => {
    fetchPrLines();
  }, [mrHeader.id]);

  async function fetchPrLines() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getPrLines",
          mr_header_id: mrHeader.id,
        }),
      });
      const data = await res.json();
      setPrLines(data);

      const initial: Record<number, { completed_qty: string }> = {};
      for (const line of data) {
        initial[line.id] = {
          completed_qty: String(line.completed_qty || 0),
        };
      }
      setEditedLines(initial);
    } catch (err) {
      console.error("Error fetching PR lines:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveLine(prLineId: number) {
    const edited = editedLines[prLineId];
    if (!edited) return;

    const line = prLines.find((l) => l.id === prLineId);
    const completedQty = parseFloat(edited.completed_qty) || 0;
    const orderedQty = line?.quantity || 0;
    const retention =
      orderedQty > 0 ? Math.min((completedQty / orderedQty) * 100, 100) : 0;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePrLine",
          pr_line_id: prLineId,
          completed_qty: completedQty,
          retention: parseFloat(retention.toFixed(2)),
          attachment: line?.attachment || null,
        }),
      });

      if (res.ok) {
        fetchPrLines();
      } else {
        toast("Failed to update line", "error");
      }
    } catch {
      toast("Failed to update line", "error");
    }
  }

  async function handleUploadInvoice(file: File) {
    setIsUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append("folder", "pr-invoices");
      formData.append("files", file);

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        { method: "POST", body: formData },
      );

      if (!uploadRes.ok) {
        toast("Failed to upload invoice", "error");
        return;
      }

      const uploadData = await uploadRes.json();
      const url = uploadData.url || uploadData.urls?.[0];

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateInvoiceFile",
          mr_header_id: mrHeader.id,
          invoice_file: url,
        }),
      });

      if (res.ok) {
        setInvoiceFile(url);
        toast("Invoice uploaded", "success");
        router.refresh();
      } else {
        toast("Failed to save invoice", "error");
      }
    } catch {
      toast("Failed to upload invoice", "error");
    } finally {
      setIsUploadingInvoice(false);
    }
  }

  async function handleProceedPayment(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPaymentFile) {
      toast("Please upload a payment receipt", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("folder", "pr-payment-receipts");
      formData.append("files", selectedPaymentFile);

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        { method: "POST", body: formData },
      );

      if (!uploadRes.ok) {
        toast("Failed to upload payment receipt", "error");
        return;
      }

      const uploadData = await uploadRes.json();
      const url = uploadData.url || uploadData.urls?.[0];

      // Save payment receipt to db
      const saveRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updatePaymentReceipt",
            mr_header_id: mrHeader.id,
            payment_receipt: url,
          }),
        },
      );

      if (!saveRes.ok) {
        toast("Failed to save payment receipt", "error");
        return;
      }

      setPaymentReceipt(url);
      setPrPaymentStatus("paid");
      setSelectedPaymentFile(null);
      setIsProceedPaymentOpen(false);
      toast("Payment approved", "success");
      router.refresh();
    } catch {
      toast("Failed to process payment", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUploadLineAttachment(prLineId: number, file: File) {
    try {
      const formData = new FormData();
      formData.append("folder", "pr-attachments");
      formData.append("files", file);

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        { method: "POST", body: formData },
      );

      if (!uploadRes.ok) {
        toast("Failed to upload attachment", "error");
        return;
      }

      const uploadData = await uploadRes.json();
      const url = uploadData.url || uploadData.urls?.[0];

      const line = prLines.find((l) => l.id === prLineId);
      const existingAttachments = parseAttachments(line?.attachment);
      const newAttachments = [...existingAttachments, url];

      const completedQty = parseFloat(
        editedLines[prLineId]?.completed_qty || "0",
      );
      const orderedQty = line?.quantity || 0;
      const retention =
        orderedQty > 0 ? Math.min((completedQty / orderedQty) * 100, 100) : 0;

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePrLine",
          pr_line_id: prLineId,
          completed_qty: completedQty,
          retention: parseFloat(retention.toFixed(2)),
          attachment: JSON.stringify(newAttachments),
        }),
      });

      if (res.ok) {
        toast("Attachment uploaded", "success");
        fetchPrLines();
      } else {
        toast("Failed to save attachment", "error");
      }
    } catch {
      toast("Failed to upload attachment", "error");
    }
  }

  // Approval handlers
  async function handleApproveLineQS(prLineId: number) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approvePrLineQS", pr_line_id: prLineId }),
    });
    if (res.ok) {
      toast("Line approved", "success");
      fetchPrLines();
    } else {
      toast("Failed to approve line", "error");
    }
  }

  async function handleRejectLineQS() {
    if (rejectLineId === null) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rejectPrLineQS",
        pr_line_id: rejectLineId,
        comment: rejectComment,
      }),
    });
    if (res.ok) {
      toast("Line rejected", "success");
      setRejectLineId(null);
      setRejectComment("");
      fetchPrLines();
    } else {
      toast("Failed to reject line", "error");
    }
  }

  async function handleResetLineQS(prLineId: number) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPrLineQS", pr_line_id: prLineId }),
    });
    if (res.ok) fetchPrLines();
  }

  async function handleApproveLine(prLineId: number) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approvePrLine", pr_line_id: prLineId }),
    });
    if (res.ok) {
      toast("Line approved", "success");
      fetchPrLines();
    } else {
      toast("Failed to approve line", "error");
    }
  }

  async function handleRejectLine() {
    if (rejectLineId === null) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rejectPrLine",
        pr_line_id: rejectLineId,
        comment: rejectComment,
      }),
    });
    if (res.ok) {
      toast("Line rejected", "success");
      setRejectLineId(null);
      setRejectComment("");
      fetchPrLines();
    } else {
      toast("Failed to reject line", "error");
    }
  }

  async function handleResetLine(prLineId: number) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPrLine", pr_line_id: prLineId }),
    });
    if (res.ok) fetchPrLines();
  }

  async function downloadFile(url: string, filename?: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const urlParts = url.split("/");
      a.download = filename || urlParts[urlParts.length - 1] || "file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast("Failed to download file", "error");
    }
  }

  const isDraft = mrHeader.progress_id === 1;
  const isRejected = mrHeader.progress_id === 5;
  const isQsReview = mrHeader.progress_id === 2;
  const isManagerApproval = mrHeader.progress_id === 3;
  const isPaymentStage = mrHeader.progress_id === 14;
  const isCompleted = mrHeader.progress_id === 25;
  const canEdit =
    (isDraft || isRejected) &&
    userInfo?.departmentID === mrHeader.department_id;
  const isQsDept = userInfo?.departmentID === 16;
  const isManagerDept = userInfo?.departmentID === 8;
  const isFinanceDept = userInfo?.departmentID === 10;

  // Show approval columns
  const showQsApproval = isQsReview;
  const showManagerApproval = isManagerApproval;

  // QS stage checks
  const allQsReviewed = prLines.every(
    (l) =>
      l.qs_approval_status === "Approved" ||
      l.qs_approval_status === "Rejected",
  );
  const hasQsRejected = prLines.some(
    (l) => l.qs_approval_status === "Rejected",
  );
  const allQsApproved = prLines.every(
    (l) => l.qs_approval_status === "Approved",
  );

  // Manager stage checks
  const allManagerReviewed = prLines.every(
    (l) => l.approval_status === "Approved" || l.approval_status === "Rejected",
  );
  const hasManagerRejected = prLines.some(
    (l) => l.approval_status === "Rejected",
  );
  const allManagerApproved = prLines.every(
    (l) => l.approval_status === "Approved",
  );

  if (isLoading) {
    return <div>Loading payment request lines...</div>;
  }

  return (
    <>
      <div className="mr-lines-view">
        <div className="subcategory-header">
          <h2 style={{ textTransform: "uppercase" }}>PAYMENT REQUEST ITEMS</h2>

          <div
            className="right"
            style={{ display: "flex", gap: "10px", alignItems: "center" }}
          >
            {/* Invoice */}
            <input
              ref={invoiceInputRef}
              type="file"
              style={{ display: "none" }}
              accept=".pdf,.jpeg,.jpg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadInvoice(file);
                e.target.value = "";
              }}
            />
            {invoiceFile ? (
              <Button
                componentType={"button"}
                bgColor={"white"}
                borderColor={"rgba(223, 223, 223, 1)"}
                textColor={"black"}
                style={{ borderRadius: "25px", padding: "7px 20px" }}
                onClick={() => downloadFile(invoiceFile)}
              >
                Invoice <img src={downloadIcon} alt="download" />
              </Button>
            ) : (
              canEdit && (
                <Button
                  componentType={"button"}
                  bgColor={"black"}
                  borderColor={"black"}
                  textColor={"white"}
                  onClick={() => invoiceInputRef.current?.click()}
                  disabled={isUploadingInvoice}
                >
                  Upload Invoice <img src={uploadIcon} alt="upload" />
                </Button>
              )
            )}

            {/* Payment Receipt download (completed or paid) */}
            {(isCompleted || prPaymentStatus === "paid") && paymentReceipt && (
              <Button
                componentType={"button"}
                bgColor={"white"}
                borderColor={"rgba(223, 223, 223, 1)"}
                textColor={"black"}
                style={{ borderRadius: "25px", padding: "7px 20px" }}
                onClick={() => downloadFile(paymentReceipt)}
              >
                Payment Receipt <img src={downloadIcon} alt="download" />
              </Button>
            )}

            {/* Payment stage: Proceed / Reject / Paid / Rejected */}
            {isPaymentStage &&
              prPaymentStatus === "pending" &&
              isFinanceDept && (
                <div style={{ display: "flex", gap: "5px" }}>
                  <Button
                    componentType={"button"}
                    bgColor={"rgba(34, 150, 100, 1)"}
                    borderColor={"rgba(34, 150, 100, 1)"}
                    textColor={"white"}
                    onClick={() => setIsProceedPaymentOpen(true)}
                    style={{
                      borderRadius: "25px",
                      padding: "7px 20px",
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
                    onClick={() => setIsPaymentRejectOpen(true)}
                    style={{
                      borderRadius: "25px",
                      padding: "7px 20px",
                      flexGrow: 1,
                      textWrap: "nowrap",
                    }}
                  >
                    Reject Payment
                  </Button>
                </div>
              )}

            {isPaymentStage &&
              prPaymentStatus === "pending" &&
              !isFinanceDept && (
                <div
                  className="approval-pill"
                  style={{
                    backgroundColor: "gray",
                    color: "white",
                    fontSize: "14.1px",
                  }}
                >
                  <span style={{ fontSize: "14.1px" }}>Payment Pending</span>
                </div>
              )}

            {isPaymentStage && prPaymentStatus === "paid" && (
              <div
                className="approval-pill"
                style={{
                  backgroundColor: "rgba(34, 150, 100, 1)",
                  color: "white",
                  minWidth: "200px",
                  fontSize: "14.1px",
                }}
              >
                <span style={{ fontSize: "14.1px" }}>Paid</span>
                {paymentReceipt && (
                  <Button
                    componentType={"link"}
                    bgColor={"transparent"}
                    borderColor={"transparent"}
                    textColor={"black"}
                    style={{ border: "none", padding: "0px" }}
                    href={paymentReceipt}
                    target="_blank"
                  >
                    <img
                      src={externalLinkIcon}
                      alt="view"
                      style={{ filter: "invert(1)", cursor: "pointer" }}
                    />
                  </Button>
                )}
              </div>
            )}

            {isPaymentStage && prPaymentStatus === "rejected" && (
              <div
                className="approval-pill"
                style={{
                  backgroundColor: "rgba(185, 28, 28, 1)",
                  color: "white",
                  minWidth: "200px",
                  fontSize: "14.1px",
                }}
              >
                <span style={{ fontSize: "14.1px" }}>Rejected</span>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  {paymentRejectReason && (
                    <InfoPopUpButton
                      text={paymentRejectReason}
                      header="REJECTION COMMENT"
                      bgColor="rgba(185, 28, 28, 1)"
                      borderColor="rgba(185, 28, 28, 1)"
                      textColor="white"
                    />
                  )}
                  {paymentReceipt && (
                    <Button
                      componentType={"link"}
                      bgColor={"transparent"}
                      borderColor={"transparent"}
                      textColor={"black"}
                      style={{ border: "none", padding: "0px" }}
                      href={paymentReceipt}
                      target="_blank"
                    >
                      <img
                        src={externalLinkIcon}
                        alt="view"
                        style={{ filter: "invert(1)", cursor: "pointer" }}
                      />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <br />

        {prLines.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "rgba(150, 150, 150, 1)",
            }}
          >
            <p>No job order lines found for the referenced job order.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SCOPE</th>
                  <th>DESCRIPTION</th>
                  <th>BOQ REF.</th>
                  <th>ORDERED QTY</th>
                  <th>COMPLETED QTY</th>
                  <th>RETENTION (%)</th>
                  <th>TOTAL PRICE</th>
                  <th>ATTACHMENT</th>
                  {showQsApproval && <th>QS APPROVAL</th>}
                  {showManagerApproval && <th>MANAGER APPROVAL</th>}
                </tr>
              </thead>
              <tbody>
                {prLines.map((line, index) => {
                  const edited = editedLines[line.id] || {
                    completed_qty: "0",
                  };
                  const completedQty = parseFloat(edited.completed_qty || "0");
                  const orderedQty = line.quantity || 0;
                  const retention =
                    orderedQty > 0
                      ? Math.min((completedQty / orderedQty) * 100, 100)
                      : 0;

                  const lineAttachments = parseAttachments(line.attachment);

                  const joLineForBoqRef = {
                    id: line.jo_line_id,
                    boq_line_ids: line.boq_line_ids,
                    boq_line_names: line.boq_line_names,
                    boq_item_numbers: line.boq_item_numbers,
                  } as any;

                  return (
                    <tr key={line.id}>
                      <td>{index + 1}</td>
                      <td>{line.job_scope_name || "-"}</td>
                      <td>
                        {line.job_description ? (
                          <InfoPopUpButton
                            text={line.job_description}
                            header="DESCRIPTION"
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {line.boq_line_ids ? (
                          <BoqReferencePopUp
                            item={joLineForBoqRef}
                            mrHeader={mrHeader}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {formatNumber(orderedQty)} {line.unit}
                      </td>
                      <td>
                        {canEdit ? (
                          <InputItem
                            style={{ width: "225px" }}
                            label={""}
                            value={edited.completed_qty}
                            type={"text postfix"}
                            postfixText={line.unit}
                            placeholder="ENTER COMPLETED QTY"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                setEditedLines((prev) => ({
                                  ...prev,
                                  [line.id]: {
                                    ...prev[line.id],
                                    completed_qty: val,
                                  },
                                }));
                              }
                            }}
                            onBlur={() => handleSaveLine(line.id)}
                            required
                          />
                        ) : (
                          <>
                            {formatNumber(completedQty)} {line.unit}
                          </>
                        )}
                      </td>
                      <td>{retention.toFixed(1)}%</td>
                      <td style={{ fontWeight: 600 }}>
                        {Number(line.approved_total_price) > 0
                          ? `AED ${Number(line.approved_total_price).toFixed(2)}`
                          : "-"}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            alignItems: "flex-start",
                          }}
                        >
                          {lineAttachments.map((url, i) => (
                            <div
                              key={`pr-${i}`}
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "rgba(100, 100, 100, 1)",
                                }}
                              >
                                {i + 1}
                              </span>
                              <Button
                                componentType={"button"}
                                bgColor={"rgba(239, 239, 239, 1)"}
                                borderColor={"rgba(223, 223, 223, 1)"}
                                textColor={"black"}
                                style={{ padding: "7px 7px" }}
                                onClick={() => downloadFile(url)}
                              >
                                <img src={externalLinkIcon} alt="attachment" />
                              </Button>
                            </div>
                          ))}
                          {canEdit && (
                            <>
                              <input
                                ref={(el) => {
                                  lineAttachmentRefs.current[line.id] = el;
                                }}
                                type="file"
                                style={{ display: "none" }}
                                accept=".pdf,.jpeg,.jpg,.png,.webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file)
                                    handleUploadLineAttachment(line.id, file);
                                  e.target.value = "";
                                }}
                              />
                              <Button
                                componentType={"button"}
                                bgColor={"rgba(239, 239, 239, 1)"}
                                borderColor={"rgba(223, 223, 223, 1)"}
                                textColor={"black"}
                                style={{ padding: "7px 7px" }}
                                onClick={() =>
                                  lineAttachmentRefs.current[line.id]?.click()
                                }
                              >
                                <img
                                  src={uploadIcon}
                                  alt="upload"
                                  style={{ filter: "invert(1)" }}
                                />
                              </Button>
                            </>
                          )}
                          {lineAttachments.length === 0 && !canEdit && "-"}
                        </div>
                      </td>

                      {/* QS Approval Column */}
                      {showQsApproval && (
                        <td>
                          {line.qs_approval_status === "Approved" ? (
                            <div
                              className="approval-pill"
                              style={{
                                backgroundColor: "rgba(34, 150, 100, 1)",
                                color: "white",
                              }}
                            >
                              <span>QS Approved</span>
                              {isQsDept && isQsReview && (
                                <img
                                  src={crossIcon}
                                  alt="reset"
                                  style={{
                                    filter: "invert(1)",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => handleResetLineQS(line.id)}
                                />
                              )}
                            </div>
                          ) : line.qs_approval_status === "Rejected" ? (
                            <div
                              className="approval-pill"
                              style={{
                                backgroundColor: "rgba(185, 28, 28, 1)",
                              }}
                            >
                              <span>QS Rejected</span>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                {line.qs_reject_comment && (
                                  <InfoPopUpButton
                                    text={line.qs_reject_comment}
                                    header="REJECTION COMMENT"
                                    bgColor="transparent"
                                    borderColor="transparent"
                                    style={{
                                      filter: "invert(1)",
                                      padding: "0px",
                                    }}
                                  />
                                )}
                                {isQsDept && isQsReview && (
                                  <img
                                    src={crossIcon}
                                    alt="reset"
                                    style={{
                                      filter: "invert(1)",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleResetLineQS(line.id)}
                                  />
                                )}
                              </div>
                            </div>
                          ) : isQsDept && isQsReview ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                width: "200px",
                              }}
                            >
                              <Button
                                componentType={"button"}
                                bgColor={"white"}
                                borderColor={"rgba(207, 207, 207, 1)"}
                                textColor={"black"}
                                onClick={() => handleApproveLineQS(line.id)}
                                style={{
                                  borderRadius: "20px",
                                  padding: "5px 20px",
                                  flexGrow: 1,
                                }}
                              >
                                <img src={checkIcon} alt="approve" />
                              </Button>
                              <Button
                                componentType={"button"}
                                bgColor={"white"}
                                borderColor={"rgba(207, 207, 207, 1)"}
                                textColor={"black"}
                                onClick={() => {
                                  setRejectLineId(line.id);
                                  setRejectType("qs");
                                }}
                                style={{
                                  borderRadius: "20px",
                                  padding: "5px 20px",
                                  flexGrow: 1,
                                }}
                              >
                                <img src={crossIcon} alt="reject" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="approval-pill"
                              style={{
                                backgroundColor: "gray",
                                color: "white",
                              }}
                            >
                              <span style={{ whiteSpace: "nowrap" }}>
                                Pending QS
                              </span>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Manager Approval Column */}
                      {showManagerApproval && (
                        <td>
                          {line.approval_status === "Approved" ? (
                            <div
                              className="approval-pill"
                              style={{
                                backgroundColor: "rgba(34, 150, 100, 1)",
                                color: "white",
                              }}
                            >
                              <span>Approved</span>
                              {isManagerDept && isManagerApproval && (
                                <img
                                  src={crossIcon}
                                  alt="reset"
                                  style={{
                                    filter: "invert(1)",
                                    cursor: "pointer",
                                    width: "12px",
                                  }}
                                  onClick={() => handleResetLine(line.id)}
                                />
                              )}
                            </div>
                          ) : line.approval_status === "Rejected" ? (
                            <div
                              className="approval-pill"
                              style={{
                                backgroundColor: "rgba(185, 28, 28, 1)",
                                color: "white",
                              }}
                            >
                              <span>Rejected</span>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                {line.reject_comment && (
                                  <InfoPopUpButton
                                    text={line.reject_comment}
                                    header="REJECTION COMMENT"
                                    bgColor="transparent"
                                    borderColor="transparent"
                                    textColor="white"
                                    style={{
                                      filter: "invert(1)",
                                      padding: "0px",
                                    }}
                                  />
                                )}
                                {isManagerDept && isManagerApproval && (
                                  <img
                                    src={crossIcon}
                                    alt="reset"
                                    style={{
                                      filter: "invert(1)",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleResetLine(line.id)}
                                  />
                                )}
                              </div>
                            </div>
                          ) : isManagerDept && isManagerApproval ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                width: "200px",
                              }}
                            >
                              <Button
                                componentType={"button"}
                                bgColor={"white"}
                                borderColor={"rgba(207, 207, 207, 1)"}
                                textColor={"black"}
                                onClick={() => handleApproveLine(line.id)}
                                style={{
                                  borderRadius: "20px",
                                  padding: "5px 20px",
                                  flexGrow: 1,
                                }}
                              >
                                <img src={checkIcon} alt="approve" />
                              </Button>
                              <Button
                                componentType={"button"}
                                bgColor={"white"}
                                borderColor={"rgba(207, 207, 207, 1)"}
                                textColor={"black"}
                                onClick={() => {
                                  setRejectLineId(line.id);
                                  setRejectType("manager");
                                }}
                                style={{
                                  borderRadius: "20px",
                                  padding: "5px 20px",
                                  flexGrow: 1,
                                }}
                              >
                                <img src={crossIcon} alt="reject" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="approval-pill"
                              style={{
                                backgroundColor: "gray",
                                color: "white",
                              }}
                            >
                              <span style={{ whiteSpace: "nowrap" }}>
                                Pending Manager
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals footer */}
              {(() => {
                const subtotalBeforeRetention = prLines.reduce(
                  (sum, l) => sum + (Number(l.approved_total_price) || 0),
                  0,
                );

                const totalRetention = prLines.reduce((sum, l) => {
                  const edited = editedLines[l.id];
                  const completedQty = parseFloat(edited?.completed_qty || "0");
                  const orderedQty = l.quantity || 0;
                  const retentionPct =
                    orderedQty > 0
                      ? Math.min((completedQty / orderedQty) * 100, 100)
                      : 0;
                  const lineTotal = Number(l.approved_total_price) || 0;
                  return sum + lineTotal * (retentionPct / 100);
                }, 0);

                const subtotalAfterRetention =
                  subtotalBeforeRetention - totalRetention;

                // Count trailing columns
                let trailingCols = 1; // ATTACHMENT
                if (showQsApproval) trailingCols += 1;
                if (showManagerApproval) trailingCols += 1;

                return (
                  <tfoot
                    style={{
                      borderTop: "1px solid rgba(239, 239, 239, 1)",
                    }}
                  >
                    <tr>
                      <td colSpan={6} />
                      <td style={{ fontWeight: 600 }}>
                        SUBTOTAL BEFORE RETENTION
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        AED {subtotalBeforeRetention.toFixed(2)}
                      </td>
                      <td colSpan={trailingCols} />
                    </tr>
                    <tr>
                      <td colSpan={6} />
                      <td style={{ fontWeight: 600 }}>RETENTION</td>
                      <td style={{ fontWeight: 600 }}>
                        - AED {totalRetention.toFixed(2)}
                      </td>
                      <td colSpan={trailingCols} />
                    </tr>
                    <tr>
                      <td colSpan={6} />
                      <td style={{ fontWeight: 600 }}>
                        SUBTOTAL AFTER RETENTION
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        AED {subtotalAfterRetention.toFixed(2)}
                      </td>
                      <td colSpan={trailingCols} />
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        )}
      </div>

      {/* Reject comment popup */}
      {rejectLineId !== null && (
        <FormPopUp
          header="REJECT PAYMENT REQUEST ITEM"
          setIsOpen={() => {
            setRejectLineId(null);
            setRejectComment("");
          }}
          handleSubmit={
            rejectType === "qs" ? handleRejectLineQS : handleRejectLine
          }
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"COMMENTS"}
              value={rejectComment}
              type={"textarea"}
              placeholder={"ENTER COMMENTS"}
              required
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}

      <CommentsSection
        mrHeaderId={mrHeader.id}
        stageName={mrHeader.progress_name || ""}
      />

      {/* ── Bottom Nav: Stage Transitions ── */}

      {/* Draft / Rejected: Submit for QS Review */}
      {canEdit && prLines.length > 0 && (
        <>
          {(() => {
            const allLinesHaveCompletedQty = prLines.every((l) => {
              const edited = editedLines[l.id];
              const qty = parseFloat(edited?.completed_qty || "0");
              return qty > 0;
            });
            const canSubmit = !!invoiceFile && allLinesHaveCompletedQty;

            return (
              <div className="bottom-nav">
                <div></div>
                <Button
                  componentType="button"
                  bgColor="white"
                  borderColor="white"
                  textColor="black"
                  onClick={() => setIsSubmitOpen(true)}
                  disabled={!canSubmit}
                  style={{
                    padding: "7px 20px",
                    opacity: canSubmit ? "1" : "0.5",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    pointerEvents: canSubmit ? "auto" : "none",
                  }}
                >
                  SUBMIT FOR QS REVIEW
                </Button>
              </div>
            );
          })()}

          {isSubmitOpen && (
            <FormPopUp
              header="SUBMIT PAYMENT REQUEST"
              setIsOpen={setIsSubmitOpen}
              handleSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "submitForQsReview",
                        id: mrHeader.id,
                        changed_by: userInfo?.name,
                        department_id: mrHeader.department_id,
                        from_progress_id: mrHeader.progress_id,
                      }),
                    },
                  );

                  if (res.ok) {
                    toast("Payment request submitted", "success");
                    setIsSubmitOpen(false);
                    router.refresh();
                    router.replace("/mr/");
                  } else {
                    toast("Failed to submit payment request", "error");
                  }
                } catch {
                  toast("Failed to submit payment request", "error");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              addButtonLabel="CONFIRM"
            >
              <p>
                Are you sure you want to submit this payment request for QS
                review?
              </p>
            </FormPopUp>
          )}
        </>
      )}

      {/* QS Review: Submit for Manager Approval or Reject */}
      {isQsReview && isQsDept && allQsReviewed && prLines.length > 0 && (
        <>
          <div className="bottom-nav">
            <div></div>
            {hasQsRejected ? (
              <Button
                componentType="button"
                bgColor="white"
                borderColor="white"
                textColor="black"
                onClick={() => setIsQsReturnOpen(true)}
              >
                RETURN FOR REVISION
              </Button>
            ) : (
              <Button
                componentType="button"
                bgColor="white"
                borderColor="white"
                textColor="black"
                onClick={() => setIsQsSubmitManagerOpen(true)}
              >
                SUBMIT FOR MANAGER APPROVAL
              </Button>
            )}
          </div>

          {isQsReturnOpen && (
            <FormPopUp
              header="RETURN FOR REVISION"
              setIsOpen={setIsQsReturnOpen}
              handleSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "submitPrQsRejection",
                      id: mrHeader.id,
                      changed_by: userInfo?.name,
                      department_id: mrHeader.department_id,
                    }),
                  },
                );
                if (res.ok) {
                  toast("Payment request returned for revision", "success");
                  setIsQsReturnOpen(false);
                  router.refresh();
                  router.replace("/mr/");
                } else {
                  toast("Failed to submit", "error");
                }
              }}
              addButtonLabel="CONFIRM"
            >
              <p>
                Are you sure you want to return this payment request for
                revision?
              </p>
            </FormPopUp>
          )}

          {isQsSubmitManagerOpen && (
            <FormPopUp
              header="SUBMIT FOR MANAGER APPROVAL"
              setIsOpen={setIsQsSubmitManagerOpen}
              handleSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "submitPrForManagerApproval",
                      id: mrHeader.id,
                      changed_by: userInfo?.name,
                      department_id: mrHeader.department_id,
                    }),
                  },
                );
                if (res.ok) {
                  toast("Submitted for manager approval", "success");
                  setIsQsSubmitManagerOpen(false);
                  router.refresh();
                  router.replace("/mr/");
                } else {
                  toast("Failed to submit", "error");
                }
              }}
              addButtonLabel="CONFIRM"
            >
              <p>
                Are you sure you want to submit this payment request for manager
                approval?
              </p>
            </FormPopUp>
          )}
        </>
      )}

      {/* Manager Approval: Approve (→ Payment) or Reject */}
      {isManagerApproval &&
        isManagerDept &&
        allManagerReviewed &&
        prLines.length > 0 && (
          <>
            <div className="bottom-nav">
              <div></div>
              {hasManagerRejected ? (
                <Button
                  componentType="button"
                  bgColor="white"
                  borderColor="white"
                  textColor="black"
                  onClick={() => setIsManagerReturnOpen(true)}
                >
                  RETURN FOR REVISION
                </Button>
              ) : (
                <Button
                  componentType="button"
                  bgColor="white"
                  borderColor="white"
                  textColor="black"
                  onClick={() => setIsManagerApproveOpen(true)}
                >
                  SUBMIT FOR PAYMENT
                </Button>
              )}
            </div>

            {isManagerReturnOpen && (
              <FormPopUp
                header="SUBMIT PAYMENT REQUEST"
                setIsOpen={setIsManagerReturnOpen}
                handleSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "submitPrForRejection",
                        id: mrHeader.id,
                        changed_by: userInfo?.name,
                        department_id: mrHeader.department_id,
                        from_progress_id: 3,
                      }),
                    },
                  );
                  if (res.ok) {
                    toast("Payment request returned for revision", "success");
                    setIsManagerReturnOpen(false);
                    router.refresh();
                    router.replace("/mr/");
                  } else {
                    toast("Failed to submit", "error");
                  }
                }}
                addButtonLabel="CONFIRM"
              >
                <p>Are you sure you want to submit this payment request?</p>
              </FormPopUp>
            )}

            {isManagerApproveOpen && (
              <FormPopUp
                header="SUBMIT PAYMENT REQUEST"
                setIsOpen={setIsManagerApproveOpen}
                handleSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "submitPrForPayment",
                        id: mrHeader.id,
                        changed_by: userInfo?.name,
                        department_id: mrHeader.department_id,
                      }),
                    },
                  );
                  if (res.ok) {
                    toast("Payment request submitted", "success");
                    setIsManagerApproveOpen(false);
                    router.refresh();
                    router.replace("/mr/");
                  } else {
                    toast("Failed to submit", "error");
                  }
                }}
                addButtonLabel="CONFIRM"
              >
                <p>Are you sure you want to submit this payment request?</p>
              </FormPopUp>
            )}
          </>
        )}

      {/* Payment Stage: Submit for Completion after paid */}
      {isPaymentStage &&
        isFinanceDept &&
        prPaymentStatus === "paid" &&
        prLines.length > 0 && (
          <>
            <div className="bottom-nav">
              <div></div>
              <Button
                componentType="button"
                bgColor="white"
                borderColor="white"
                textColor="black"
                onClick={() => setIsSubmitCompletionOpen(true)}
              >
                SUBMIT FOR COMPLETION
              </Button>
            </div>

            {isSubmitCompletionOpen && (
              <FormPopUp
                header="SUBMIT FOR COMPLETION"
                setIsOpen={setIsSubmitCompletionOpen}
                handleSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "completePrPayment",
                        id: mrHeader.id,
                        changed_by: userInfo?.name,
                        department_id: mrHeader.department_id,
                      }),
                    },
                  );
                  if (res.ok) {
                    toast("Payment request completed", "success");
                    setIsSubmitCompletionOpen(false);
                    router.refresh();
                    router.replace("/mr/");
                  } else {
                    toast("Failed to complete payment", "error");
                  }
                }}
                addButtonLabel="CONFIRM"
              >
                <p>
                  Are you sure you want to submit this payment request for
                  completion?
                </p>
              </FormPopUp>
            )}
          </>
        )}

      {/* Proceed to Payment popup (uploads payment receipt) */}
      {isProceedPaymentOpen && (
        <FormPopUp
          header="PROCEED PAYMENT"
          setIsOpen={setIsProceedPaymentOpen}
          handleSubmit={handleProceedPayment}
          addButtonLabel="CONFIRM"
        >
          <UploadFileBox
            fileState={selectedPaymentFile}
            setFileState={setSelectedPaymentFile}
            label=""
            acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp"
            required
            placeholder=""
            buttonLabel="UPLOAD PAYMENT RECEIPT"
          />
        </FormPopUp>
      )}

      {/* Reject Payment popup */}
      {isPaymentRejectOpen && (
        <FormPopUp
          header="REJECT PAYMENT"
          setIsOpen={setIsPaymentRejectOpen}
          handleSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "rejectPrPayment",
                  id: mrHeader.id,
                  changed_by: userInfo?.name,
                  department_id: mrHeader.department_id,
                  reject_reason: paymentRejectReason,
                }),
              },
            );
            if (res.ok) {
              toast("Payment rejected", "success");
              setPrPaymentStatus("rejected");
              setIsPaymentRejectOpen(false);
              router.refresh();
            } else {
              toast("Failed to reject payment", "error");
            }
          }}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"COMMENTS"}
              value={paymentRejectReason}
              type={"textarea"}
              placeholder={"ENTER COMMENTS"}
              required
              onChange={(e) => setPaymentRejectReason(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
