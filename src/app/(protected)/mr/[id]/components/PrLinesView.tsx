"use client";

import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import React, { useState, useEffect, useRef } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import BoqReferencePopUp from "../../components/BoqReferencePopUp";
import InputItem from "@/app/components/InputItem";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import CommentsSection from "@/app/components/CommentsSection";
import { formatPriceAED } from "@/lib/formatPrice";

type BoqLineDetail = {
  boq_line_id: number;
  item_name: string;
  item_description?: string;
  category: string;
  sub_category: string;
  boq_qty: number;
  unit: string;
  rate_per_quantity: number;
  total_cost: number;
  subcontracted_qty: number;
};

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
  contract_type?: string | null;
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

  // Collapsible cards
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [boqLinesByJoLine, setBoqLinesByJoLine] = useState<
    Record<number, BoqLineDetail[]>
  >({});
  const [loadingBoqLines, setLoadingBoqLines] = useState<
    Record<number, boolean>
  >({});

  // Per-BOQ-line editable fields (SQL revision pending)
  const [editedBoqLines, setEditedBoqLines] = useState<
    Record<number, { completed_qty: string; retention: string }>
  >({});
  const [boqLineAttachments, setBoqLineAttachments] = useState<
    Record<number, string[]>
  >({});
  const boqLineUploadRefs = useRef<Record<number, HTMLInputElement | null>>({});

  async function fetchBoqLinesForJoLine(joLineId: number) {
    if (boqLinesByJoLine[joLineId] !== undefined) return; // already loaded
    setLoadingBoqLines((prev) => ({ ...prev, [joLineId]: true }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getBoqLinesWithDetailsByJoLineID",
          jo_line_id: joLineId,
        }),
      });
      const data: BoqLineDetail[] = await res.json();
      setBoqLinesByJoLine((prev) => ({ ...prev, [joLineId]: data || [] }));
      // Init per-BOQ-line editable state
      setEditedBoqLines((prev) => {
        const next = { ...prev };
        for (const b of data || []) {
          if (!(b.boq_line_id in next)) {
            next[b.boq_line_id] = { completed_qty: "0", retention: "0" };
          }
        }
        return next;
      });
    } catch {
      setBoqLinesByJoLine((prev) => ({ ...prev, [joLineId]: [] }));
    } finally {
      setLoadingBoqLines((prev) => ({ ...prev, [joLineId]: false }));
    }
  }

  const toggleExpanded = (id: number, joLineId: number) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        fetchBoqLinesForJoLine(joLineId);
      }
      return next;
    });
  };

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

  async function handleUploadBoqLineAttachment(boqLineId: number, file: File) {
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
      setBoqLineAttachments((prev) => ({
        ...prev,
        [boqLineId]: [...(prev[boqLineId] || []), url],
      }));
      toast("Attachment uploaded", "success");
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
          <div />

          <div
            className="right"
            style={{ display: "flex", gap: "10px", alignItems: "center" }}
          >
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
          <>
            {/* ── Collapsible JO line cards ── */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {prLines.map((line, index) => {
                const isExpanded = expandedLines.has(line.id);
                const edited = editedLines[line.id] || { completed_qty: "0" };
                const completedQty = parseFloat(edited.completed_qty || "0");
                const orderedQty = line.quantity || 0;
                const retention =
                  orderedQty > 0
                    ? Math.min((completedQty / orderedQty) * 100, 100)
                    : 0;
                const lineAttachments = parseAttachments(line.attachment);
                const hasInvoice = lineAttachments.length > 0;

                const joLineForBoqRef = {
                  id: line.jo_line_id,
                  boq_line_ids: line.boq_line_ids,
                  boq_line_names: line.boq_line_names,
                  boq_item_numbers: line.boq_item_numbers,
                } as any;

                const infoLabelStyle: React.CSSProperties = {
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "rgba(150,150,150,1)",
                  marginBottom: "4px",
                  letterSpacing: "0.3px",
                  whiteSpace: "nowrap",
                };

                return (
                  <React.Fragment key={line.id}>
                  <div className="mr-with-id">
                      {/* ── Card Header ── */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          gap: "20px",
                        }}
                        onClick={() => toggleExpanded(line.id, line.jo_line_id)}
                      >
                        {/* Left: chevron + # + info columns */}
                        <div
                          style={{
                            display: "flex",
                            gap: "15px",
                            alignItems: "center",
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          {/* Chevron */}
                          <div
                            style={{
                              flexShrink: 0,
                              width: "28px",
                              height: "28px",
                              borderRadius: "8px",
                              backgroundColor: "rgba(239,239,239,1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              style={{
                                transform: isExpanded
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                              }}
                            >
                              <path
                                d="M2.5 5L7 9.5L11.5 5"
                                stroke="black"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>

                          {/* Info columns */}
                          <div
                            style={{
                              display: "flex",
                              gap: "40px",
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                            }}
                          >
                            {/* JOB SCOPE */}
                            <div>
                              <small>SCOPE</small>
                              <h2>{line.job_scope_name || "-"}</h2>
                            </div>

                            {/* CONTRACT TYPE */}
                            <div>
                              <small>CONTRACT TYPE</small>
                              <h2>{line.contract_type || "-"}</h2>
                            </div>

                            {/* DESCRIPTION */}
                            <div>
                              <small>DESCRIPTION</small>
                              <div onClick={(e) => e.stopPropagation()}>
                                {line.job_description ? (
                                  <InfoPopUpButton
                                    text={line.job_description}
                                    header="DESCRIPTION"
                                  />
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>

                            {/* BOQ REF */}
                            <div>
                              <small>BOQ REF.</small>
                              <div onClick={(e) => e.stopPropagation()}>
                                {line.boq_line_ids ? (
                                  <BoqReferencePopUp
                                    item={joLineForBoqRef}
                                    mrHeader={mrHeader}
                                  />
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>

                            {/* TOTAL PRICE */}
                            <div>
                              <small>TOTAL PRICE</small>
                              <h2>
                                {Number(line.approved_total_price) > 0
                                  ? formatPriceAED(line.approved_total_price)
                                  : "-"}
                              </h2>
                            </div>
                          </div>
                        </div>

                        {/* Right: approval status + invoice button */}
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* QS status pill */}
                          {showQsApproval &&
                            line.qs_approval_status === "Approved" && (
                              <div
                                className="approval-pill"
                                style={{
                                  backgroundColor: "rgba(34,150,100,1)",
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
                            )}
                          {showQsApproval &&
                            line.qs_approval_status === "Rejected" && (
                              <div
                                className="approval-pill"
                                style={{
                                  backgroundColor: "rgba(185,28,28,1)",
                                  color: "white",
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
                            )}
                          {showQsApproval &&
                            !line.qs_approval_status &&
                            !isQsDept && (
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

                          {/* Manager status pill */}
                          {showManagerApproval &&
                            line.approval_status === "Approved" && (
                              <div
                                className="approval-pill"
                                style={{
                                  backgroundColor: "rgba(34,150,100,1)",
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
                            )}
                          {showManagerApproval &&
                            line.approval_status === "Rejected" && (
                              <div
                                className="approval-pill"
                                style={{
                                  backgroundColor: "rgba(185,28,28,1)",
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
                            )}
                          {showManagerApproval &&
                            !line.approval_status &&
                            !isManagerDept && (
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
                        </div>
                      </div>

                      <br />

                      {/* ── Card Body (expanded) ── */}
                      {isExpanded && (
                        <div
                          style={{
                            borderTop: "1px solid rgba(239,239,239,1)",
                            backgroundColor: "rgba(248,249,251,0.6)",
                          }}
                        >
                          {/* Approval action buttons strip (only shown when actions are available) */}
                          {((showQsApproval &&
                            isQsDept &&
                            isQsReview &&
                            !line.qs_approval_status) ||
                            (showManagerApproval &&
                              isManagerDept &&
                              isManagerApproval &&
                              !line.approval_status)) && (
                            <div
                              style={{
                                display: "flex",
                                gap: "30px",
                                alignItems: "flex-start",
                                flexWrap: "wrap",
                                padding: "16px 25px",
                                borderBottom: "1px solid rgba(239,239,239,1)",
                              }}
                            >
                              {showQsApproval &&
                                isQsDept &&
                                isQsReview &&
                                !line.qs_approval_status && (
                                  <div>
                                    <div style={infoLabelStyle}>
                                      QS APPROVAL
                                    </div>
                                    <div
                                      style={{ display: "flex", gap: "10px" }}
                                    >
                                      <Button
                                        componentType="button"
                                        bgColor="white"
                                        borderColor="rgba(207,207,207,1)"
                                        textColor="black"
                                        onClick={() =>
                                          handleApproveLineQS(line.id)
                                        }
                                        style={{
                                          borderRadius: "20px",
                                          padding: "5px 20px",
                                        }}
                                      >
                                        <img src={checkIcon} alt="approve" />
                                      </Button>
                                      <Button
                                        componentType="button"
                                        bgColor="white"
                                        borderColor="rgba(207,207,207,1)"
                                        textColor="black"
                                        onClick={() => {
                                          setRejectLineId(line.id);
                                          setRejectType("qs");
                                        }}
                                        style={{
                                          borderRadius: "20px",
                                          padding: "5px 20px",
                                        }}
                                      >
                                        <img src={crossIcon} alt="reject" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              {showManagerApproval &&
                                isManagerDept &&
                                isManagerApproval &&
                                !line.approval_status && (
                                  <div>
                                    <div style={infoLabelStyle}>
                                      MANAGER APPROVAL
                                    </div>
                                    <div
                                      style={{ display: "flex", gap: "10px" }}
                                    >
                                      <Button
                                        componentType="button"
                                        bgColor="white"
                                        borderColor="rgba(207,207,207,1)"
                                        textColor="black"
                                        onClick={() =>
                                          handleApproveLine(line.id)
                                        }
                                        style={{
                                          borderRadius: "20px",
                                          padding: "5px 20px",
                                        }}
                                      >
                                        <img src={checkIcon} alt="approve" />
                                      </Button>
                                      <Button
                                        componentType="button"
                                        bgColor="white"
                                        borderColor="rgba(207,207,207,1)"
                                        textColor="black"
                                        onClick={() => {
                                          setRejectLineId(line.id);
                                          setRejectType("manager");
                                        }}
                                        style={{
                                          borderRadius: "20px",
                                          padding: "5px 20px",
                                        }}
                                      >
                                        <img src={crossIcon} alt="reject" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          {/* BOQ lines table */}
                          {loadingBoqLines[line.jo_line_id] ? (
                            <div
                              style={{
                                padding: "20px 25px",
                                color: "rgba(150,150,150,1)",
                                fontSize: "13px",
                              }}
                            >
                              Loading BOQ lines...
                            </div>
                          ) : (boqLinesByJoLine[line.jo_line_id] || [])
                              .length === 0 ? (
                            <div
                              style={{
                                padding: "20px 25px",
                                color: "rgba(150,150,150,1)",
                                fontSize: "13px",
                              }}
                            >
                              No BOQ lines referenced.
                            </div>
                          ) : (
                            <table
                              className="items-table"
                              style={{
                                borderRadius: 0,
                                border: "none",
                                borderTop: "1px solid rgba(239,239,239,1)",
                              }}
                            >
                              <thead>
                                <tr>
                                  <th style={{ width: "40px" }}>#</th>
                                  <th>ITEM</th>
                                  <th>BOQ RATE</th>
                                  <th>SUBCONTRACTED QTY</th>
                                  <th style={{ minWidth: "160px" }}>
                                    COMPLETED QTY
                                  </th>
                                  <th style={{ minWidth: "130px" }}>
                                    RETENTION
                                  </th>
                                  <th>ATTACHMENT(S)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(boqLinesByJoLine[line.jo_line_id] || []).map(
                                  (boqLine, bIdx) => {
                                    const boqEdited = editedBoqLines[
                                      boqLine.boq_line_id
                                    ] || { completed_qty: "0", retention: "0" };
                                    const completedQtyVal =
                                      parseFloat(
                                        boqEdited.completed_qty || "0",
                                      ) || 0;
                                    const retentionVal =
                                      parseFloat(boqEdited.retention || "0") ||
                                      0;
                                    const subcontractorPrice =
                                      completedQtyVal *
                                      (Number(boqLine.rate_per_quantity) || 0);
                                    const attachments =
                                      boqLineAttachments[boqLine.boq_line_id] ||
                                      [];

                                    return (
                                      <tr key={boqLine.boq_line_id}>
                                        <td>{bIdx + 1}</td>
                                        <td>
                                          <div style={{ fontWeight: 600 }}>
                                            {boqLine.item_name}
                                          </div>
                                          {boqLine.item_description && (
                                            <div
                                              style={{
                                                fontSize: "11px",
                                                color: "rgba(120,120,120,1)",
                                                marginTop: "2px",
                                              }}
                                            >
                                              {boqLine.item_description}
                                            </div>
                                          )}
                                        </td>
                                        <td>
                                          {formatPriceAED(
                                            boqLine.rate_per_quantity,
                                          )}
                                        </td>
                                        <td>
                                          {formatNumber(
                                            boqLine.subcontracted_qty,
                                          )}{" "}
                                          {boqLine.unit}
                                        </td>
                                        <td>
                                          {canEdit ? (
                                            <InputItem
                                              style={{ width: "140px" }}
                                              label=""
                                              value={boqEdited.completed_qty}
                                              type="text postfix"
                                              postfixText={boqLine.unit}
                                              placeholder="0"
                                              noOptionalLabel
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (
                                                  val === "" ||
                                                  /^\d*\.?\d*$/.test(val)
                                                ) {
                                                  setEditedBoqLines((prev) => ({
                                                    ...prev,
                                                    [boqLine.boq_line_id]: {
                                                      ...prev[
                                                        boqLine.boq_line_id
                                                      ],
                                                      completed_qty: val,
                                                    },
                                                  }));
                                                }
                                              }}
                                              required
                                            />
                                          ) : (
                                            <span style={{ fontWeight: 600 }}>
                                              {formatNumber(completedQtyVal)}{" "}
                                              {boqLine.unit}
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          {canEdit ? (
                                            <InputItem
                                              style={{ width: "110px" }}
                                              label=""
                                              value={boqEdited.retention}
                                              type="text postfix"
                                              postfixText="%"
                                              placeholder="0"
                                              noOptionalLabel
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (
                                                  val === "" ||
                                                  /^\d*\.?\d*$/.test(val)
                                                ) {
                                                  setEditedBoqLines((prev) => ({
                                                    ...prev,
                                                    [boqLine.boq_line_id]: {
                                                      ...prev[
                                                        boqLine.boq_line_id
                                                      ],
                                                      retention: val,
                                                    },
                                                  }));
                                                }
                                              }}
                                              required
                                            />
                                          ) : (
                                            <span style={{ fontWeight: 600 }}>
                                              {retentionVal.toFixed(1)}%
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          <input
                                            ref={(el) => {
                                              boqLineUploadRefs.current[
                                                boqLine.boq_line_id
                                              ] = el;
                                            }}
                                            type="file"
                                            style={{ display: "none" }}
                                            accept=".pdf,.jpeg,.jpg,.png,.webp"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file)
                                                handleUploadBoqLineAttachment(
                                                  boqLine.boq_line_id,
                                                  file,
                                                );
                                              e.target.value = "";
                                            }}
                                          />
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "6px",
                                              alignItems: "center",
                                              flexWrap: "wrap",
                                            }}
                                          >
                                            {attachments.map((url, aIdx) => (
                                              <Button
                                                key={aIdx}
                                                componentType="button"
                                                bgColor="white"
                                                borderColor="rgba(223,223,223,1)"
                                                textColor="black"
                                                style={{
                                                  borderRadius: "25px",
                                                  padding: "5px 12px",
                                                  whiteSpace: "nowrap",
                                                  fontSize: "12px",
                                                }}
                                                onClick={() =>
                                                  downloadFile(url)
                                                }
                                              >
                                                {aIdx + 1}{" "}
                                                <img
                                                  src={downloadIcon}
                                                  alt="download"
                                                />
                                              </Button>
                                            ))}
                                            {canEdit && (
                                              <Button
                                                componentType="button"
                                                bgColor={
                                                  attachments.length === 0
                                                    ? "black"
                                                    : "rgba(239,239,239,1)"
                                                }
                                                borderColor={
                                                  attachments.length === 0
                                                    ? "black"
                                                    : "rgba(223,223,223,1)"
                                                }
                                                textColor={
                                                  attachments.length === 0
                                                    ? "white"
                                                    : "black"
                                                }
                                                style={{
                                                  padding: "5px 10px",
                                                  whiteSpace: "nowrap",
                                                }}
                                                onClick={() =>
                                                  boqLineUploadRefs.current[
                                                    boqLine.boq_line_id
                                                  ]?.click()
                                                }
                                              >
                                                <img
                                                  src={uploadIcon}
                                                  alt="upload"
                                                  style={
                                                    attachments.length === 0
                                                      ? { filter: "invert(1)" }
                                                      : {}
                                                  }
                                                />
                                              </Button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  },
                                )}
                              </tbody>
                              <tfoot style={{ pointerEvents: "none" }}>
                                {(() => {
                                  const boqRows =
                                    boqLinesByJoLine[line.jo_line_id] || [];
                                  const totalSubcontractorPrice =
                                    boqRows.reduce((sum, b) => {
                                      const bEdited = editedBoqLines[
                                        b.boq_line_id
                                      ] || {
                                        completed_qty: "0",
                                        retention: "0",
                                      };
                                      const cQty =
                                        parseFloat(
                                          bEdited.completed_qty || "0",
                                        ) || 0;
                                      return (
                                        sum +
                                        cQty *
                                          (Number(b.rate_per_quantity) || 0)
                                      );
                                    }, 0);
                                  const totalRetentionAmt = boqRows.reduce(
                                    (sum, b) => {
                                      const bEdited = editedBoqLines[
                                        b.boq_line_id
                                      ] || {
                                        completed_qty: "0",
                                        retention: "0",
                                      };
                                      const cQty =
                                        parseFloat(
                                          bEdited.completed_qty || "0",
                                        ) || 0;
                                      const retPct =
                                        parseFloat(bEdited.retention || "0") ||
                                        0;
                                      const price =
                                        cQty *
                                        (Number(b.rate_per_quantity) || 0);
                                      return sum + price * (retPct / 100);
                                    },
                                    0,
                                  );
                                  const totalAfterRetention =
                                    totalSubcontractorPrice - totalRetentionAmt;
                                  return (
                                    <>
                                      <tr>
                                        <td colSpan={5} />
                                        <td style={{ color: "rgba(146,146,146,1)" }}>BEFORE RETENTION</td>
                                        <td style={{ color: "rgba(146,146,146,1)" }}>
                                          {formatPriceAED(
                                            totalSubcontractorPrice,
                                          )}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colSpan={5} />
                                        <td style={{ color: "rgba(146,146,146,1)" }}>RETENTION</td>
                                        <td style={{ color: "rgba(146,146,146,1)" }}>
                                          − {formatPriceAED(totalRetentionAmt)}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colSpan={5} />
                                        <td style={{ fontWeight: 600 }}>
                                          AFTER RETENTION
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                          {formatPriceAED(totalAfterRetention)}
                                        </td>
                                      </tr>
                                    </>
                                  );
                                })()}
                              </tfoot>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                    <br />
                    <br />
                  </React.Fragment>
                );
              })}
            </div>
          </>
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
            const allLinesHaveInvoice = prLines.every(
              (l) => parseAttachments(l.attachment).length > 0,
            );
            const canSubmit = allLinesHaveInvoice && allLinesHaveCompletedQty;

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
