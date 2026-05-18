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
  id: number | null;
  mr_header_id: number;
  boq_line_id: number;
  jo_line_id: number;
  completed_qty: number;
  retention: number;
  subcontracted_qty: number;
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
  // boq_item_numbers: string; // column not in vw_jo_lines
  quantity: number;
  unit: string;
  budget_estimate: number;
  approved_total_price: number;
  // BOQ item fields
  item_name: string | null;
  item_description: string | null;
  boq_qty: number | null;
  boq_unit: string | null;
  rate_per_quantity: number | null;
  // Approved quotation price for this specific BOQ line item
  boq_approved_price: number | null;
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
    Record<number, { completed_qty: string; retention: string }>
  >({});

  // // Invoice upload — moved to Payments tab
  // const invoiceInputRef = useRef<HTMLInputElement>(null);
  // const [invoiceFile, setInvoiceFile] = useState<string | null>(
  //   mrHeader.jo_invoice_file || null,
  // );
  // const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  // // Payment receipt — moved to Payments tab
  // const [paymentReceipt, setPaymentReceipt] = useState<string | null>(
  //   mrHeader.pr_payment_receipt || null,
  // );
  // const [selectedPaymentFile, setSelectedPaymentFile] = useState<File | null>(
  //   null,
  // );
  // const [prPaymentStatus, setPrPaymentStatus] = useState<
  //   "pending" | "paid" | "rejected"
  // >(
  //   mrHeader.progress_id === 25
  //     ? "paid"
  //     : mrHeader.progress_id === 5 && mrHeader.pr_payment_receipt
  //       ? "rejected"
  //       : mrHeader.pr_payment_receipt
  //         ? "paid"
  //         : "pending",
  // );

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
  // const [isProceedPaymentOpen, setIsProceedPaymentOpen] = useState(false); // moved to Payments tab
  // const [isSubmitCompletionOpen, setIsSubmitCompletionOpen] = useState(false); // moved to Payments tab

  // // Payment reject popup — moved to Payments tab
  // const [isPaymentRejectOpen, setIsPaymentRejectOpen] = useState(false);
  // const [paymentRejectReason, setPaymentRejectReason] = useState("");

  // Per-line attachment upload
  const lineAttachmentRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  );

  // Collapsible cards — all expanded by default
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

  // Upload popup state for BOQ line attachments
  const [uploadPopupBoqLineId, setUploadPopupBoqLineId] = useState<
    number | null
  >(null);
  const [uploadPopupFile, setUploadPopupFile] = useState<File | null>(null);

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
            next[b.boq_line_id] = { completed_qty: "", retention: "" };
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

  const toggleExpanded = (joLineId: number) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(joLineId)) {
        next.delete(joLineId);
      } else {
        next.add(joLineId);
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

      // Key by boq_line_id — stable before and after DB rows exist
      const initial: Record<
        number,
        { completed_qty: string; retention: string }
      > = {};
      for (const line of data) {
        initial[line.boq_line_id] = {
          completed_qty:
            Number(line.completed_qty) > 0 ? String(line.completed_qty) : "",
          retention: Number(line.retention) > 0 ? String(line.retention) : "",
        };
      }
      setEditedLines(initial);

      // Derive unique jo_line_ids for expansion (one card per JO line)
      const uniqueJoLineIds: number[] = [
        ...new Set<number>(
          (data as PrLine[])
            .map((l) => l.jo_line_id)
            .filter((id): id is number => id != null),
        ),
      ];
      setExpandedLines(new Set(uniqueJoLineIds));
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

  // async function handleUploadInvoice(file: File) { // moved to Payments tab
  //   setIsUploadingInvoice(true);
  //   try {
  //     const formData = new FormData();
  //     formData.append("folder", "pr-invoices");
  //     formData.append("files", file);
  //     const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, { method: "POST", body: formData });
  //     if (!uploadRes.ok) { toast("Failed to upload invoice", "error"); return; }
  //     const uploadData = await uploadRes.json();
  //     const url = uploadData.url || uploadData.urls?.[0];
  //     const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
  //       method: "POST", headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ action: "updateInvoiceFile", mr_header_id: mrHeader.id, invoice_file: url }),
  //     });
  //     if (res.ok) { setInvoiceFile(url); toast("Invoice uploaded", "success"); router.refresh(); }
  //     else { toast("Failed to save invoice", "error"); }
  //   } catch { toast("Failed to upload invoice", "error"); }
  //   finally { setIsUploadingInvoice(false); }
  // }

  // async function handleProceedPayment(e: React.FormEvent) { // moved to Payments tab
  //   e.preventDefault();
  //   if (!selectedPaymentFile) { toast("Please upload a payment receipt", "error"); return; }
  //   setIsSubmitting(true);
  //   try {
  //     const formData = new FormData();
  //     formData.append("folder", "pr-payment-receipts");
  //     formData.append("files", selectedPaymentFile);
  //     const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, { method: "POST", body: formData });
  //     if (!uploadRes.ok) { toast("Failed to upload payment receipt", "error"); return; }
  //     const uploadData = await uploadRes.json();
  //     const url = uploadData.url || uploadData.urls?.[0];
  //     const saveRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
  //       method: "POST", headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ action: "updatePaymentReceipt", mr_header_id: mrHeader.id, payment_receipt: url }),
  //     });
  //     if (!saveRes.ok) { toast("Failed to save payment receipt", "error"); return; }
  //     setPaymentReceipt(url); setPrPaymentStatus("paid"); setSelectedPaymentFile(null);
  //     setIsProceedPaymentOpen(false); toast("Payment approved", "success"); router.refresh();
  //   } catch { toast("Failed to process payment", "error"); }
  //   finally { setIsSubmitting(false); }
  // }

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
  const isManagerApproval = mrHeader.progress_id === 10;
  // const isPaymentStage = mrHeader.progress_id === 14; // moved to Payments tab
  const isCompleted = mrHeader.progress_id === 25;
  const canEdit =
    (isDraft || isRejected) &&
    userInfo?.departmentID === mrHeader.department_id;
  const isQsDept = userInfo?.departmentID === 16;
  const isManagerDept = userInfo?.departmentID === 8;
  // const isFinanceDept = userInfo?.departmentID === 10; // moved to Payments tab

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
            {/* Payment Receipt download + Payment stage UI — moved to Payments tab */}
            {/* {(isCompleted || prPaymentStatus === "paid") && paymentReceipt && ( ... )} */}
            {/* {isPaymentStage && ( ... )} */}

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
              {(() => {
                // Deduplicate: one card per jo_line_id
                const seenJoLineIds = new Set<number>();
                const uniqueLines = prLines.filter((l) => {
                  if (seenJoLineIds.has(l.jo_line_id)) return false;
                  seenJoLineIds.add(l.jo_line_id);
                  return true;
                });
                return uniqueLines;
              })().map((line, index) => {
                const isExpanded = expandedLines.has(line.jo_line_id);
                const edited = editedLines[line.boq_line_id] || {
                  completed_qty: "",
                  retention: "",
                };
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
                  <React.Fragment key={line.jo_line_id}>
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
                        onClick={() => toggleExpanded(line.jo_line_id)}
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
                            {/* <div>
                              <small>TOTAL PRICE</small>
                              <h2>
                                {Number(line.approved_total_price) > 0
                                  ? formatPriceAED(line.approved_total_price)
                                  : "-"}
                              </h2>
                            </div> */}
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
                        ></div>
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
                          {/* BOQ lines table */}
                          {prLines.filter(
                            (b) => b.jo_line_id === line.jo_line_id,
                          ).length === 0 ? (
                            <div>No BOQ lines referenced.</div>
                          ) : (
                            <table
                              className="items-table fixed-layout"
                              style={{
                                borderRadius: 0,
                                border: "none",
                                borderTop: "1px solid rgba(239,239,239,1)",
                              }}
                            >
                              <thead>
                                <tr>
                                  <th style={{ width: "40px" }}>#</th>
                                  <th>BOQ ITEM</th>
                                  <th style={{ width: "160px" }}>
                                    SUBCONTRACTED QTY
                                  </th>
                                  <th style={{ width: "180px" }}>
                                    SUBCONTRACTOR PRICE
                                  </th>
                                  <th
                                    style={{
                                      width: canEdit ? "275px" : "160px",
                                    }}
                                  >
                                    COMPLETED QTY
                                  </th>
                                  <th
                                    style={{
                                      width: canEdit ? "225px" : "160px",
                                    }}
                                  >
                                    RETENTION
                                  </th>
                                  <th style={{ width: "160px" }}>AMOUNT</th>
                                  <th style={{ width: "160px" }}>
                                    ATTACHMENT(S)
                                  </th>
                                  {showManagerApproval && (
                                    <th style={{ width: "200px" }}>
                                      MANAGER PRICE APPROVAL
                                    </th>
                                  )}
                                  {showQsApproval && (
                                    <th style={{ width: "200px" }}>
                                      QS APPROVAL
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {prLines
                                  .filter(
                                    (b) => b.jo_line_id === line.jo_line_id,
                                  )
                                  .map((boqLine, bIdx) => {
                                    const boqEdited = editedLines[
                                      boqLine.boq_line_id
                                    ] || { completed_qty: "", retention: "" };
                                    const completedQtyVal =
                                      parseFloat(
                                        boqEdited.completed_qty || "0",
                                      ) || 0;
                                    const retentionVal =
                                      parseFloat(boqEdited.retention || "0") ||
                                      0;
                                    const attachments =
                                      boqLineAttachments[boqLine.boq_line_id] ||
                                      [];

                                    return (
                                      <tr key={boqLine.boq_line_id}>
                                        <td>{bIdx + 1}</td>
                                        <td>
                                          <strong>{boqLine.item_name}</strong>
                                          {boqLine.item_description && (
                                            <>
                                              <br />
                                              <br />
                                              {boqLine.item_description}
                                            </>
                                          )}
                                        </td>
                                        <td>
                                          {formatNumber(
                                            boqLine.subcontracted_qty,
                                          )}{" "}
                                          {boqLine.boq_unit}
                                        </td>
                                        <td>
                                          {boqLine.boq_approved_price != null &&
                                          Number(boqLine.boq_approved_price) > 0
                                            ? formatPriceAED(
                                                boqLine.boq_approved_price,
                                              )
                                            : "-"}
                                        </td>
                                        <td>
                                          {canEdit ? (
                                            <div
                                              style={{ position: "relative" }}
                                            >
                                              <InputItem
                                                label=""
                                                value={boqEdited.completed_qty}
                                                type="text postfix"
                                                postfixText={
                                                  boqLine.boq_unit || ""
                                                }
                                                placeholder="ENTER COMPLETED QTY"
                                                noOptionalLabel
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (
                                                    val === "" ||
                                                    /^\d*\.?\d*$/.test(val)
                                                  ) {
                                                    setEditedLines((prev) => ({
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
                                              {completedQtyVal >
                                                Number(
                                                  boqLine.subcontracted_qty,
                                                ) && (
                                                <div
                                                  style={{
                                                    position: "absolute",
                                                    top: "100%",
                                                    left: 0,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    marginTop: "4px",
                                                    whiteSpace: "nowrap",
                                                  }}
                                                >
                                                  <img
                                                    src="/icons/warning.svg"
                                                    alt="warning"
                                                    style={{ width: "14px" }}
                                                  />
                                                  <small
                                                    style={{
                                                      color:
                                                        "rgba(175, 61, 61, 1)",
                                                    }}
                                                  >
                                                    Exceeds subcontracted
                                                    quantity
                                                  </small>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <span>
                                              {formatNumber(completedQtyVal)}{" "}
                                              {boqLine.boq_unit}
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          {canEdit ? (
                                            <InputItem
                                              label=""
                                              value={boqEdited.retention}
                                              type="text postfix"
                                              postfixText="%"
                                              placeholder="ENTER RETENTION"
                                              noOptionalLabel
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (
                                                  val === "" ||
                                                  /^\d*\.?\d*$/.test(val)
                                                ) {
                                                  setEditedLines((prev) => ({
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
                                            <span>
                                              {retentionVal.toFixed(1)}%
                                            </span>
                                          )}
                                        </td>
                                        {/* AMOUNT column — proportion of approved price after retention */}
                                        <td>
                                          {(() => {
                                            const subQty =
                                              Number(
                                                boqLine.subcontracted_qty,
                                              ) || 0;
                                            const approvedPrice =
                                              Number(
                                                boqLine.boq_approved_price,
                                              ) || 0;
                                            if (
                                              completedQtyVal <= 0 ||
                                              subQty === 0 ||
                                              approvedPrice === 0
                                            )
                                              return "N/A";
                                            const proportion =
                                              completedQtyVal / subQty;
                                            const amount =
                                              proportion *
                                              approvedPrice *
                                              (1 - retentionVal / 100);
                                            return formatPriceAED(amount);
                                          })()}
                                        </td>

                                        <td>
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
                                                bgColor="rgba(239, 239, 239, 1)"
                                                borderColor="rgba(223, 223, 223, 1)"
                                                textColor="black"
                                                style={{ padding: "7px 7px" }}
                                                onClick={() =>
                                                  setUploadPopupBoqLineId(
                                                    boqLine.boq_line_id,
                                                  )
                                                }
                                              >
                                                <img
                                                  src={uploadIcon}
                                                  alt="upload"
                                                  style={{
                                                    filter: "invert(1)",
                                                  }}
                                                />
                                              </Button>
                                            )}
                                          </div>
                                        </td>

                                        {/* Manager Price Approval column — per BOQ item row */}
                                        {showManagerApproval && (
                                          <td>
                                            {isManagerDept ? (
                                              boqLine.approval_status ===
                                              "Approved" ? (
                                                <div
                                                  className="approval-pill"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(34,150,100,1)",
                                                    color: "white",
                                                  }}
                                                >
                                                  <span>Approved</span>
                                                  <img
                                                    src={crossIcon}
                                                    alt="reset"
                                                    style={{
                                                      filter: "invert(1)",
                                                      cursor: "pointer",
                                                      width: "10px",
                                                    }}
                                                    onClick={() =>
                                                      handleResetLine(
                                                        boqLine.id!,
                                                      )
                                                    }
                                                  />
                                                </div>
                                              ) : boqLine.approval_status ===
                                                "Rejected" ? (
                                                <div
                                                  className="approval-pill"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(185,28,28,1)",
                                                    color: "white",
                                                  }}
                                                >
                                                  <span>Rejected</span>
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      gap: "8px",
                                                      alignItems: "center",
                                                    }}
                                                  >
                                                    {boqLine.reject_comment && (
                                                      <InfoPopUpButton
                                                        text={
                                                          boqLine.reject_comment
                                                        }
                                                        header="REJECTION COMMENT"
                                                        bgColor="transparent"
                                                        borderColor="transparent"
                                                        style={{
                                                          filter: "invert(1)",
                                                          padding: "0px",
                                                        }}
                                                      />
                                                    )}
                                                    <img
                                                      src={crossIcon}
                                                      alt="reset"
                                                      style={{
                                                        filter: "invert(1)",
                                                        cursor: "pointer",
                                                        width: "10px",
                                                      }}
                                                      onClick={() =>
                                                        handleResetLine(
                                                          boqLine.id!,
                                                        )
                                                      }
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    gap: "8px",
                                                  }}
                                                >
                                                  <Button
                                                    componentType="button"
                                                    bgColor="white"
                                                    borderColor="rgba(207,207,207,1)"
                                                    textColor="black"
                                                    onClick={() =>
                                                      handleApproveLine(
                                                        boqLine.id!,
                                                      )
                                                    }
                                                    style={{
                                                      borderRadius: "20px",
                                                      padding: "5px 16px",
                                                    }}
                                                  >
                                                    <img
                                                      src={checkIcon}
                                                      alt="approve"
                                                    />
                                                  </Button>
                                                  <Button
                                                    componentType="button"
                                                    bgColor="white"
                                                    borderColor="rgba(207,207,207,1)"
                                                    textColor="black"
                                                    onClick={() => {
                                                      setRejectLineId(
                                                        boqLine.id!,
                                                      );
                                                      setRejectType("manager");
                                                    }}
                                                    style={{
                                                      borderRadius: "20px",
                                                      padding: "5px 16px",
                                                    }}
                                                  >
                                                    <img
                                                      src={crossIcon}
                                                      alt="reject"
                                                    />
                                                  </Button>
                                                </div>
                                              )
                                            ) : boqLine.approval_status ===
                                              "Approved" ? (
                                              <div
                                                className="approval-pill"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(34,150,100,1)",
                                                  color: "white",
                                                }}
                                              >
                                                <span>Approved</span>
                                              </div>
                                            ) : boqLine.approval_status ===
                                              "Rejected" ? (
                                              <div
                                                className="approval-pill"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(185,28,28,1)",
                                                  color: "white",
                                                }}
                                              >
                                                <span>Rejected</span>
                                                {boqLine.reject_comment && (
                                                  <InfoPopUpButton
                                                    text={
                                                      boqLine.reject_comment
                                                    }
                                                    header="REJECTION COMMENT"
                                                    bgColor="transparent"
                                                    borderColor="transparent"
                                                    style={{
                                                      filter: "invert(1)",
                                                      padding: "0px",
                                                    }}
                                                  />
                                                )}
                                              </div>
                                            ) : (
                                              <div
                                                className="approval-pill"
                                                style={{
                                                  backgroundColor: "gray",
                                                  color: "white",
                                                }}
                                              >
                                                <span>Pending</span>
                                              </div>
                                            )}
                                          </td>
                                        )}

                                        {/* QS Approval column — per BOQ item row */}
                                        {showQsApproval && (
                                          <td>
                                            {isQsDept ? (
                                              boqLine.qs_approval_status ===
                                              "Approved" ? (
                                                <div
                                                  className="approval-pill"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(34,150,100,1)",
                                                    color: "white",
                                                  }}
                                                >
                                                  <span>Approved</span>
                                                  <img
                                                    src={crossIcon}
                                                    alt="reset"
                                                    style={{
                                                      filter: "invert(1)",
                                                      cursor: "pointer",
                                                      width: "10px",
                                                    }}
                                                    onClick={() =>
                                                      handleResetLineQS(
                                                        boqLine.id!,
                                                      )
                                                    }
                                                  />
                                                </div>
                                              ) : boqLine.qs_approval_status ===
                                                "Rejected" ? (
                                                <div
                                                  className="approval-pill"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(185,28,28,1)",
                                                    color: "white",
                                                  }}
                                                >
                                                  <span>Rejected</span>
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      gap: "8px",
                                                      alignItems: "center",
                                                    }}
                                                  >
                                                    {boqLine.qs_reject_comment && (
                                                      <InfoPopUpButton
                                                        text={
                                                          boqLine.qs_reject_comment
                                                        }
                                                        header="REJECTION COMMENT"
                                                        bgColor="transparent"
                                                        borderColor="transparent"
                                                        style={{
                                                          filter: "invert(1)",
                                                          padding: "0px",
                                                        }}
                                                      />
                                                    )}
                                                    <img
                                                      src={crossIcon}
                                                      alt="reset"
                                                      style={{
                                                        filter: "invert(1)",
                                                        cursor: "pointer",
                                                        width: "10px",
                                                      }}
                                                      onClick={() =>
                                                        handleResetLineQS(
                                                          boqLine.id!,
                                                        )
                                                      }
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    gap: "8px",
                                                  }}
                                                >
                                                  <Button
                                                    componentType="button"
                                                    bgColor="white"
                                                    borderColor="rgba(207,207,207,1)"
                                                    textColor="black"
                                                    onClick={() =>
                                                      handleApproveLineQS(
                                                        boqLine.id!,
                                                      )
                                                    }
                                                    style={{
                                                      borderRadius: "20px",
                                                      padding: "5px 16px",
                                                    }}
                                                  >
                                                    <img
                                                      src={checkIcon}
                                                      alt="approve"
                                                    />
                                                  </Button>
                                                  <Button
                                                    componentType="button"
                                                    bgColor="white"
                                                    borderColor="rgba(207,207,207,1)"
                                                    textColor="black"
                                                    onClick={() => {
                                                      setRejectLineId(
                                                        boqLine.id!,
                                                      );
                                                      setRejectType("qs");
                                                    }}
                                                    style={{
                                                      borderRadius: "20px",
                                                      padding: "5px 16px",
                                                    }}
                                                  >
                                                    <img
                                                      src={crossIcon}
                                                      alt="reject"
                                                    />
                                                  </Button>
                                                </div>
                                              )
                                            ) : boqLine.qs_approval_status ===
                                              "Approved" ? (
                                              <div
                                                className="approval-pill"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(34,150,100,1)",
                                                  color: "white",
                                                }}
                                              >
                                                <span>Approved</span>
                                              </div>
                                            ) : boqLine.qs_approval_status ===
                                              "Rejected" ? (
                                              <div
                                                className="approval-pill"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(185,28,28,1)",
                                                  color: "white",
                                                }}
                                              >
                                                <span>Rejected</span>
                                                {boqLine.qs_reject_comment && (
                                                  <InfoPopUpButton
                                                    text={
                                                      boqLine.qs_reject_comment
                                                    }
                                                    header="REJECTION COMMENT"
                                                    bgColor="transparent"
                                                    borderColor="transparent"
                                                    style={{
                                                      filter: "invert(1)",
                                                      padding: "0px",
                                                    }}
                                                  />
                                                )}
                                              </div>
                                            ) : (
                                              <div
                                                className="approval-pill"
                                                style={{
                                                  backgroundColor: "gray",
                                                  color: "white",
                                                }}
                                              >
                                                <span>Pending</span>
                                              </div>
                                            )}
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                              </tbody>
                              <tfoot style={{ pointerEvents: "none" }}>
                                {(() => {
                                  const boqRows = prLines.filter(
                                    (b) => b.jo_line_id === line.jo_line_id,
                                  );
                                  const totalSubcontractorPrice =
                                    boqRows.reduce((sum, b) => {
                                      const bEdited = editedLines[
                                        b.boq_line_id
                                      ] || {
                                        completed_qty: "",
                                        retention: "",
                                      };
                                      const cQty =
                                        parseFloat(
                                          bEdited.completed_qty || "0",
                                        ) || 0;
                                      const subQty =
                                        Number(b.subcontracted_qty) || 0;
                                      const approvedPrice =
                                        Number(b.boq_approved_price) || 0;
                                      if (subQty === 0 || approvedPrice === 0)
                                        return sum;
                                      return (
                                        sum + (cQty / subQty) * approvedPrice
                                      );
                                    }, 0);
                                  const totalRetentionAmt = boqRows.reduce(
                                    (sum, b) => {
                                      const bEdited = editedLines[
                                        b.boq_line_id
                                      ] || {
                                        completed_qty: "",
                                        retention: "",
                                      };
                                      const cQty =
                                        parseFloat(
                                          bEdited.completed_qty || "0",
                                        ) || 0;
                                      const retPct =
                                        parseFloat(bEdited.retention || "0") ||
                                        0;
                                      const subQty =
                                        Number(b.subcontracted_qty) || 0;
                                      const approvedPrice =
                                        Number(b.boq_approved_price) || 0;
                                      if (subQty === 0 || approvedPrice === 0)
                                        return sum;
                                      const price =
                                        (cQty / subQty) * approvedPrice;
                                      return sum + price * (retPct / 100);
                                    },
                                    0,
                                  );
                                  const totalAfterRetention =
                                    totalSubcontractorPrice - totalRetentionAmt;
                                  const hasAnyQty = totalSubcontractorPrice > 0;
                                  // Sum of full approved prices (not proportional)
                                  const totalApprovedPrice = boqRows.reduce(
                                    (sum, b) =>
                                      sum + (Number(b.boq_approved_price) || 0),
                                    0,
                                  );
                                  // Total columns: 8 base (#, BOQ ITEM, SUBCONTRACTED QTY,
                                  // SUBCONTRACTOR PRICE, COMPLETED QTY, RETENTION, AMOUNT, ATTACHMENT(S))
                                  // + 1 if MANAGER PRICE APPROVAL shown
                                  // + 1 if QS APPROVAL shown
                                  // Label + value are always pinned to the last two columns.
                                  const totalCols =
                                    8 +
                                    (showManagerApproval ? 1 : 0) +
                                    (showQsApproval ? 1 : 0);
                                  const leadSpan = totalCols - 2;
                                  // cols 5 → (totalCols-2): middle gap between
                                  // SUBTOTAL value (col 4) and AFTER RETENTION label
                                  const middleSpan = totalCols - 6;
                                  return (
                                    <>
                                      <tr>
                                        <td colSpan={leadSpan} />
                                        <td
                                          style={{
                                            color: "rgba(146,146,146,1)",
                                          }}
                                        >
                                          BEFORE RETENTION
                                        </td>
                                        <td
                                          style={{
                                            color: "rgba(146,146,146,1)",
                                          }}
                                        >
                                          {hasAnyQty
                                            ? formatPriceAED(
                                                totalSubcontractorPrice,
                                              )
                                            : "N/A"}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td colSpan={leadSpan} />
                                        <td
                                          style={{
                                            color: "rgba(146,146,146,1)",
                                          }}
                                        >
                                          RETENTION
                                        </td>
                                        <td
                                          style={{
                                            color: "rgba(146,146,146,1)",
                                          }}
                                        >
                                          {hasAnyQty
                                            ? `− ${formatPriceAED(totalRetentionAmt)}`
                                            : "N/A"}
                                        </td>
                                      </tr>
                                      {/* SUBTOTAL (col 3–4) + AFTER RETENTION (last 2 cols) on one row */}
                                      <tr style={{ fontWeight: 600 }}>
                                        <td colSpan={2} />
                                        <td>SUBTOTAL</td>
                                        <td>
                                          {totalApprovedPrice > 0
                                            ? formatPriceAED(totalApprovedPrice)
                                            : "N/A"}
                                        </td>
                                        {middleSpan > 0 && (
                                          <td colSpan={middleSpan} />
                                        )}
                                        <td>AFTER RETENTION</td>
                                        <td>
                                          {hasAnyQty
                                            ? formatPriceAED(
                                                totalAfterRetention,
                                              )
                                            : "N/A"}
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

      {/* BOQ line attachment upload popup */}
      {uploadPopupBoqLineId !== null && (
        <FormPopUp
          header="UPLOAD ATTACHMENT"
          setIsOpen={() => {
            setUploadPopupBoqLineId(null);
            setUploadPopupFile(null);
          }}
          handleSubmit={async (e) => {
            e.preventDefault();
            if (!uploadPopupFile) {
              toast("Please select a file to upload", "error");
              return;
            }
            await handleUploadBoqLineAttachment(
              uploadPopupBoqLineId,
              uploadPopupFile,
            );
            setUploadPopupBoqLineId(null);
            setUploadPopupFile(null);
          }}
          addButtonLabel="UPLOAD"
        >
          <UploadFileBox
            fileState={uploadPopupFile}
            setFileState={setUploadPopupFile}
            label="ATTACHMENT"
            acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp"
            placeholder=""
            buttonLabel="SELECT FILE"
          />
        </FormPopUp>
      )}

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
            const canSubmit =
              prLines.length > 0 &&
              prLines.every((b) => {
                const edited = editedLines[b.boq_line_id];
                return (
                  edited?.completed_qty?.trim() !== "" &&
                  edited?.completed_qty !== undefined &&
                  edited?.retention?.trim() !== "" &&
                  edited?.retention !== undefined
                );
              });

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
                        pr_line_data: prLines.map((l) => ({
                          pr_line_id: l.id,
                          completed_qty: parseFloat(
                            editedLines[l.boq_line_id]?.completed_qty || "0",
                          ),
                          retention: parseFloat(
                            editedLines[l.boq_line_id]?.retention || "0",
                          ),
                          attachment: boqLineAttachments[l.boq_line_id]?.length
                            ? JSON.stringify(boqLineAttachments[l.boq_line_id])
                            : null,
                        })),
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
              <p>Are you sure you want to submit this payment request?</p>
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
                SUBMIT FOR MANAGER PRICE APPROVAL
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
              header="SUBMIT PAYMENT REQUEST"
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
                  toast("Payment request submitted", "success");
                  setIsQsSubmitManagerOpen(false);
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

      {/* Manager Price Approval: Approve (→ Payment) or Reject */}
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
                  SUBMIT FOR COMPLETION
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
                        from_progress_id: 10,
                      }),
                    },
                  );
                  if (res.ok) {
                    toast("Payment request submitted", "success");
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
                    toast("Payment request completed", "success");
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

      {/* Payment Stage: Submit for Completion — moved to Payments tab */}
      {/* {isPaymentStage && isFinanceDept && prPaymentStatus === "paid" && ( ... )} */}

      {/* Proceed to Payment popup — moved to Payments tab */}
      {/* {isProceedPaymentOpen && ( ... )} */}

      {/* Reject Payment popup — moved to Payments tab */}
      {/* {isPaymentRejectOpen && (
      )} */}
    </>
  );
}
