"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import SupplierDetailsPopUp from "@/app/(protected)/mr/[id]/components/SupplierDetailsPopUp";
import { SupplierQuotation } from "@/app/(protected)/mr/[id]/types/supplierQuotation";
import { useAuth } from "@/app/context/AuthContext";
import BoqReferencePopUp from "@/app/(protected)/mr/[id]/components/BoqReferencePopUp";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";

type MrHeaderData = {
  id: number;
  type: string;
  project_id: number;
  project_name: string;
  requested_by: string;
  department_id: number;
  department_name: string;
  required_date: string;
  progress_id: number;
  progress_name: string;
  date_requested: string;
  purpose_name: string;
};

type MrLineData = {
  id: number;
  material_category: string;
  material_subcategory: string;
  material_description: string;
  quantity: number;
  unit: string;
  specification: string;
  brand: string;
  approved_supplier_id: number;
  approved_supplier_name: string;
  approved_unit_price: number;
  approved_total_price: number;
  attachment: string;
  boq_line_ids: string;
};

type DurationInfo = {
  duration: string;
  hoursDecimal: number;
};

type LineStatus = {
  status: "approved" | "rejected";
  supplierName?: string;
  rejectComment?: string;
};

// ─── Priority / Duration helpers ───
const getFlagColor = (hours: number, progress_id: number): string => {
  if (hours == null || isNaN(hours) || hours < 0) return "#ECCF28";
  if (progress_id === 7) {
    if (hours <= 1) return "#ECCF28";
    if (hours <= 3) return "rgba(255, 153, 36, 1)";
    return "rgba(250, 52, 52, 1)";
  }
  if (progress_id === 14) {
    if (hours <= 0.333) return "#ECCF28";
    if (hours <= 1) return "rgba(255, 153, 36, 1)";
    return "rgba(250, 52, 52, 1)";
  }
  if (hours <= 2) return "#ECCF28";
  if (hours <= 6) return "rgba(255, 153, 36, 1)";
  return "rgba(250, 52, 52, 1)";
};

function computeDuration(hoursDecimal: number): DurationInfo {
  const totalMinutes = Math.round(hoursDecimal * 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return {
    duration: `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    hoursDecimal,
  };
}

function FlagIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.33301 8.75008C2.33301 8.75008 2.91634 8.16675 4.66634 8.16675C6.41634 8.16675 7.58301 9.33341 9.33301 9.33341C11.083 9.33341 11.6663 8.75008 11.6663 8.75008V1.75008C11.6663 1.75008 11.083 2.33341 9.33301 2.33341C7.58301 2.33341 6.41634 1.16675 4.66634 1.16675C2.91634 1.16675 2.33301 1.75008 2.33301 1.75008V8.75008Z"
        fill={color}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.33301 12.8333V8.75"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: "rgba(89, 89, 89, 1)" }}
    >
      <path
        d="M5.5 2.5V5.5H8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 10.5C8.2615 10.5 10.5 8.2615 10.5 5.5C10.5 2.7385 8.2615 0.5 5.5 0.5C2.7385 0.5 0.5 2.7385 0.5 5.5C0.5 8.2615 2.7385 10.5 5.5 10.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function QuickPriceApprovalWidget() {
  const router = useRouter();
  const { userInfo } = useAuth();

  const diamondIcon = "/icons/diamond.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const crossSmallIcon = "/icons/cross-small.svg";

  const [mrHeaders, setMrHeaders] = useState<MrHeaderData[]>([]);
  const [currentMrIndex, setCurrentMrIndex] = useState(0);
  const [flatLines, setFlatLines] = useState<MrLineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinesLoading, setIsLinesLoading] = useState(false);
  const [durationInfo, setDurationInfo] = useState<DurationInfo | null>(null);

  // Per-line status tracking
  const [lineStatuses, setLineStatuses] = useState<Record<number, LineStatus>>(
    {},
  );

  // Popup state for vendor selection
  const [selectingLine, setSelectingLine] = useState<MrLineData | null>(null);
  const [quotations, setQuotations] = useState<SupplierQuotation[]>([]);
  const [isQuotationsLoading, setIsQuotationsLoading] = useState(false);
  const [selectedQuotationID, setSelectedQuotationID] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");

  // Smart select
  const [isSmartSelecting, setIsSmartSelecting] = useState(false);

  // Submit popups
  const [isSubmitLpoOpen, setIsSubmitLpoOpen] = useState(false);
  const [isSubmitRevisionOpen, setIsSubmitRevisionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch MR headers at progress_id = 10
  useEffect(() => {
    async function fetchMrs() {
      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`);
        const data = await res.json();
        const filtered = data
          .filter((mr: any) => mr.progress_id === 10)
          .sort(
            (a: any, b: any) =>
              new Date(b.date_requested).getTime() -
              new Date(a.date_requested).getTime(),
          );
        setMrHeaders(filtered);
      } catch (err) {
        console.error("Error fetching MRs for price approval:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMrs();
  }, []);

  // Fetch lines + duration for current MR
  useEffect(() => {
    if (mrHeaders.length === 0) return;
    const currentMr = mrHeaders[currentMrIndex];
    if (!currentMr) return;

    async function fetchLines() {
      setIsLinesLoading(true);
      setLineStatuses({});
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrLinesByMrHeaderID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: currentMr.id }),
          },
        );
        const grouped = await res.json();
        const lines: MrLineData[] = [];
        for (const category in grouped) {
          for (const subCategory in grouped[category]) {
            for (const supplier in grouped[category][subCategory]) {
              lines.push(...grouped[category][subCategory][supplier]);
            }
          }
        }
        setFlatLines(lines);

        // Check existing approval statuses via quotations for each line
        for (const line of lines) {
          try {
            const qRes = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: line.id }),
              },
            );
            const qData = await qRes.json();
            if (Array.isArray(qData)) {
              const approved = qData.find(
                (q: SupplierQuotation) => q.approval_status === "Approved",
              );
              if (approved) {
                setLineStatuses((prev) => ({
                  ...prev,
                  [line.id]: {
                    status: "approved",
                    supplierName: approved.supplier_name,
                  },
                }));
              }
              const allRejected =
                qData.length > 0 &&
                qData.every(
                  (q: SupplierQuotation) => q.approval_status === "Rejected",
                );
              if (allRejected) {
                setLineStatuses((prev) => ({
                  ...prev,
                  [line.id]: {
                    status: "rejected",
                    rejectComment: qData[0]?.reject_comment,
                  },
                }));
              }
            }
          } catch {
            // skip
          }
        }
      } catch (err) {
        console.error("Error fetching MR lines:", err);
      } finally {
        setIsLinesLoading(false);
      }
    }

    async function fetchDuration() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getProgressDuration`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mr_header_id: currentMr.id,
              progress_id: currentMr.progress_id,
            }),
          },
        );
        const data = await res.json();
        if (data && data.hours_in_stage != null) {
          const hoursDecimal =
            Number(data.hours_in_stage) +
            Number(data.minutes_in_stage || 0) / 60;
          setDurationInfo(computeDuration(hoursDecimal));
        } else {
          setDurationInfo(null);
        }
      } catch {
        setDurationInfo(null);
      }
    }

    fetchLines();
    fetchDuration();
  }, [mrHeaders, currentMrIndex]);

  // When popup opens for a line, fetch its quotations
  useEffect(() => {
    if (!selectingLine) return;

    async function fetchQuotations() {
      setIsQuotationsLoading(true);
      setSelectedQuotationID("");
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectingLine!.id }),
          },
        );
        const data = await res.json();
        setQuotations(Array.isArray(data) ? data : []);
      } catch {
        setQuotations([]);
      } finally {
        setIsQuotationsLoading(false);
      }
    }
    fetchQuotations();
  }, [selectingLine]);

  const currentMr = mrHeaders[currentMrIndex];

  // Derived status
  const allReviewed =
    !isLinesLoading &&
    flatLines.length > 0 &&
    flatLines.every((l) => lineStatuses[l.id]);
  const hasRejected = flatLines.some(
    (l) => lineStatuses[l.id]?.status === "rejected",
  );
  const allApproved =
    allReviewed &&
    flatLines.every((l) => lineStatuses[l.id]?.status === "approved");
  const pendingLines = flatLines.filter((l) => !lineStatuses[l.id]);

  const getDaysLeftText = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 0) return `${diffDays}d left`;
    if (diffDays === 0) return "Due today";
    return `${Math.abs(diffDays)}d overdue`;
  };

  const getDaysLeftStyle = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) {
      return {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    }
    return {
      backgroundColor: "rgba(255, 250, 189, 1)",
      color: "rgba(134, 83, 47, 1)",
    };
  };

  const formatQuantity = (qty: number) => {
    if (qty == null) return "-";
    const n = Number(qty);
    return n % 1 === 0 ? n.toFixed(0) : n.toString();
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0.00";
    return num.toFixed(2);
  };

  async function handleApproveQuotation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectingLine) return;

    const selected = quotations.find(
      (q) => q.id === Number(selectedQuotationID),
    );
    if (!selected) {
      toast("Please select a vendor", "error");
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approveSupplierAndQuotation",
          quotation_id: selected.id,
          mr_line_id: selectingLine.id,
          supplier_id: selected.supplier_id,
        }),
      },
    );

    if (res.ok) {
      toast(
        `Vendor approved for ${selectingLine.material_description}`,
        "success",
      );
      setLineStatuses((prev) => ({
        ...prev,
        [selectingLine.id]: {
          status: "approved",
          supplierName: selected.supplier_name,
        },
      }));
      setSelectingLine(null);
      setSelectedQuotationID("");
    } else {
      toast("Failed to approve vendor", "error");
    }
  }

  async function handleRejectAll(e: React.FormEvent) {
    e.preventDefault();
    if (!selectingLine) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rejectAllSupplierAndQuotation",
          reject_comment: rejectText,
          mr_line_id: selectingLine.id,
        }),
      },
    );

    if (res.ok) {
      toast("All vendors rejected", "success");
      setLineStatuses((prev) => ({
        ...prev,
        [selectingLine.id]: {
          status: "rejected",
          rejectComment: rejectText,
        },
      }));
      setRejectText("");
      setIsRejectOpen(false);
      setSelectingLine(null);
    } else {
      toast("Failed to reject vendors", "error");
    }
  }

  async function handleResetLine(lineId: number) {
    const lineStatus = lineStatuses[lineId];
    if (!lineStatus) return;

    if (lineStatus.status === "approved") {
      // Reset via the supplier API
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resetSupplierAndQuotation",
            mr_line_id: lineId,
            supplier_id: flatLines.find((l) => l.id === lineId)
              ?.approved_supplier_id,
          }),
        },
      );

      if (res.ok) {
        setLineStatuses((prev) => {
          const next = { ...prev };
          delete next[lineId];
          return next;
        });
      } else {
        toast("Failed to reset vendor selection", "error");
      }
    } else {
      // For rejected, reset all quotation statuses
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resetSupplierAndQuotation",
            mr_line_id: lineId,
          }),
        },
      );

      if (res.ok) {
        setLineStatuses((prev) => {
          const next = { ...prev };
          delete next[lineId];
          return next;
        });
      } else {
        toast("Failed to reset vendor selection", "error");
      }
    }
  }

  async function handleSmartSelectAll() {
    if (pendingLines.length === 0) return;
    setIsSmartSelecting(true);

    let successful = 0;
    let failed = 0;

    for (const line of pendingLines) {
      try {
        const qRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: line.id }),
          },
        );
        const qData = await qRes.json();
        if (!qData || qData.length === 0) {
          failed++;
          continue;
        }

        const lowest = qData.reduce((prev: any, curr: any) =>
          Number(curr.total_price) < Number(prev.total_price) ? curr : prev,
        );

        const approveRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "approveSupplierAndQuotation",
              quotation_id: lowest.id,
              mr_line_id: line.id,
              supplier_id: lowest.supplier_id,
            }),
          },
        );

        if (approveRes.ok) {
          successful++;
          setLineStatuses((prev) => ({
            ...prev,
            [line.id]: {
              status: "approved",
              supplierName: lowest.supplier_name,
            },
          }));
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setIsSmartSelecting(false);

    if (successful > 0 && failed === 0) {
      toast(
        `Smart Select: ${successful} vendor${successful > 1 ? "s" : ""} approved`,
        "success",
      );
    } else if (successful > 0) {
      toast(
        `Smart Select: ${successful} approved, ${failed} failed`,
        "warning",
      );
    } else {
      toast("Smart Select failed", "error");
    }
  }

  async function handleSubmitForLPO() {
    if (!currentMr) return;
    setIsSubmitting(true);

    try {
      // Get all MR line IDs and fetch approved suppliers
      const approvedSuppliers: { mr_line_id: number; quotation_id: number }[] =
        [];

      for (const line of flatLines) {
        try {
          const qRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: line.id }),
            },
          );
          const qData = await qRes.json();
          const approved = qData?.find(
            (q: any) => q.approval_status === "Approved",
          );
          if (approved) {
            approvedSuppliers.push({
              mr_line_id: line.id,
              quotation_id: approved.quotation_id || approved.id,
            });
          }
        } catch {
          // skip
        }
      }

      // Delete non-approved quotation files
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteNonApprovedQuotationFiles",
          approved_suppliers: approvedSuppliers,
        }),
      });

      // Submit for LPO
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitForLPO",
          id: currentMr.id,
          changed_by: userInfo?.name,
        }),
      });

      if (res.ok) {
        toast("Material request submitted for LPO", "success");
        setIsSubmitLpoOpen(false);
        setMrHeaders((prev) => prev.filter((_, i) => i !== currentMrIndex));
        if (currentMrIndex >= mrHeaders.length - 1) {
          setCurrentMrIndex(Math.max(0, currentMrIndex - 1));
        }
      } else {
        toast("Failed to submit material request", "error");
      }
    } catch {
      toast("Failed to submit material request", "error");
    }
    setIsSubmitting(false);
  }

  async function handleSubmitForRevision() {
    if (!currentMr) return;
    setIsSubmitting(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForPricingResubmission",
        id: currentMr.id,
        changed_by: userInfo?.name,
        user_name: userInfo?.name,
        user_role: userInfo?.role,
      }),
    });

    if (res.ok) {
      toast("Material request returned for revision", "success");
      setIsSubmitRevisionOpen(false);
      setMrHeaders((prev) => prev.filter((_, i) => i !== currentMrIndex));
      if (currentMrIndex >= mrHeaders.length - 1) {
        setCurrentMrIndex(Math.max(0, currentMrIndex - 1));
      }
    } else {
      toast("Failed to submit material request", "error");
    }
    setIsSubmitting(false);
  }

  // Build a compatible MrHeader for BoqReferencePopUp
  function buildMrHeaderForBoq(): MrHeader {
    return {
      mrHeader: currentMr.id,
      id: currentMr.id,
      type: currentMr.type as "material" | "job",
      project_id: currentMr.project_id,
      project_name: currentMr.project_name,
      department_id: currentMr.department_id,
      department_name: currentMr.department_name,
      requested_by: currentMr.requested_by,
      required_date: currentMr.required_date,
      priority: "",
      purpose_id: 0,
      purpose_name: currentMr.purpose_name,
      progress_id: currentMr.progress_id,
      progress_name: currentMr.progress_name,
      date_requested: currentMr.date_requested,
      delivery_date: "",
      jo_invoice_file: "",
      jo_payment_receipt: "",
    };
  }

  if (isLoading) {
    return (
      <div className="widget-container">
        <h3 style={{ color: "rgba(92, 92, 92, 1)", marginBottom: "15px" }}>
          Price Approval
        </h3>
        <p style={{ color: "gray", textAlign: "center", padding: "40px 0" }}>
          Loading...
        </p>
      </div>
    );
  }

  if (mrHeaders.length === 0) {
    return (
      <div className="widget-container">
        <h3 style={{ marginBottom: "15px" }}>Price Approval</h3>
        <p
          style={{
            color: "gray",
            textAlign: "center",
            padding: "40px 0",
            fontSize: "14px",
          }}
        >
          No MRs pending price approval
        </p>
      </div>
    );
  }

  return (
    <div className="widget-container">
      <div style={{ display: "flex", gap: "10px" }}>
        <h3>Price Approval</h3>

        <span
          style={{
            padding: "2px 10px",
            backgroundColor: "rgba(234, 234, 234, 1)",
            color: "rgba(89, 89, 89, 1)",
            borderRadius: "50px",
            fontSize: "10px",
            fontWeight: "800",
          }}
        >
          {mrHeaders.length} MRs
        </span>
      </div>

      <br />

      {currentMr && (
        <>
          {/* MR Header Info - same card style as initial approval */}
          <div
            style={{
              backgroundColor: "rgba(248, 249, 251, 1)",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "15px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "10px",
                  }}
                >
                  <div>
                    <small>
                      {currentMr.type === "job" ? "JOB NUMBER" : "MR NUMBER"}
                    </small>
                    <h4>
                      {currentMr.type === "job" ? "JO" : "MR"}-
                      {String(currentMr.id).padStart(5, "0")}
                    </h4>
                  </div>

                  <Button
                    componentType={"link"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"rgba(223, 223, 223, 1)"}
                    textColor={"black"}
                    style={{ padding: "7px 7px" }}
                    href={`/mr/${currentMr.id}`}
                  >
                    <img src={externalLinkIcon} alt="external link" />
                  </Button>
                </div>

                {currentMr.required_date && (
                  <div
                    style={{
                      ...getDaysLeftStyle(currentMr.required_date),
                      padding: "4px 10px",
                      borderRadius: "50px",
                      fontSize: "11px",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getDaysLeftText(currentMr.required_date)}
                  </div>
                )}

                {durationInfo && (
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "50px",
                      fontSize: "11px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "rgba(234, 234, 234, 1)",
                      color: "rgba(89, 89, 89, 1)",
                    }}
                  >
                    <ClockIcon />
                    {durationInfo.duration}
                  </div>
                )}
              </div>

              <div>
                {durationInfo && (
                  <FlagIcon
                    color={getFlagColor(
                      durationInfo.hoursDecimal,
                      currentMr.progress_id,
                    )}
                  />
                )}
              </div>
            </div>

            <br />

            <div>
              <small>PROJECT</small>
              <h4>{currentMr.project_name || "-"}</h4>
            </div>

            <br />

            <div>
              <small>REQUESTER</small>
              <div
                style={{
                  display: "flex",
                  gap: "5px",
                  alignItems: "center",
                }}
              >
                <h4
                  style={{
                    backgroundColor: "black",
                    color: "white",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {currentMr.requested_by
                    ? currentMr.requested_by
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "?"}
                </h4>
                <h4>
                  {currentMr.requested_by || "-"},{" "}
                  {currentMr.department_name || "-"}
                </h4>
              </div>
            </div>
          </div>

          {/* Material items list */}
          {isLinesLoading ? (
            <p
              style={{
                color: "gray",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              Loading items...
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  Material
                  <span
                    style={{
                      padding: "2px 10px",
                      backgroundColor: "rgba(234, 234, 234, 1)",
                      color: "rgba(89, 89, 89, 1)",
                      borderRadius: "50px",
                      fontSize: "10px",
                      fontWeight: "800",
                    }}
                  >
                    {flatLines.length} ITEMS
                  </span>
                </div>

                {pendingLines.length > 0 && (
                  <Button
                    componentType={"button"}
                    bgColor={"black"}
                    borderColor={"black"}
                    textColor={"white"}
                    onClick={handleSmartSelectAll}
                    disabled={isSmartSelecting}
                    style={{
                      padding: "5px 15px",
                      borderRadius: "25px",
                      fontSize: "12px",
                      opacity: isSmartSelecting ? 0.5 : 1,
                      cursor: isSmartSelecting ? "not-allowed" : "pointer",
                    }}
                  >
                    Smart Select
                    <img
                      src={diamondIcon}
                      alt="diamond"
                      style={{ filter: "invert(1)" }}
                    />
                  </Button>
                )}
              </div>

              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  paddingRight: "5px",
                }}
              >
                {flatLines.map((line) => {
                  const lineStatus = lineStatuses[line.id];
                  const isApproved = lineStatus?.status === "approved";
                  const isRejected = lineStatus?.status === "rejected";
                  const isPending = !lineStatus;

                  return (
                    <div
                      key={line.id}
                      style={{
                        border: "1px solid rgba(230, 230, 230, 1)",
                        borderRadius: "10px",
                        padding: "15px",
                      }}
                    >
                      <div>
                        <small>ITEM</small>
                        <h4>{line.material_description || "-"}</h4>
                      </div>

                      <br />

                      <div style={{ display: "flex", gap: "50px" }}>
                        <div>
                          <small>QTY</small>
                          <h4>
                            {formatQuantity(line.quantity)} {line.unit || ""}
                          </h4>
                        </div>

                        <div>
                          <small>BOQ REF</small>
                          <h4>
                            {line.boq_line_ids ? (
                              <BoqReferencePopUp
                                mrHeader={buildMrHeaderForBoq()}
                                item={line as any}
                              />
                            ) : (
                              "-"
                            )}
                          </h4>
                        </div>

                        <div>
                          <small>BRAND & SPECS</small>
                          <h4>
                            {line.brand || line.specification ? (
                              <InfoPopUpButton
                                header={"BRAND & SPECIFICATION"}
                                text={
                                  <>
                                    <small>BRAND</small>
                                    <h2>{line.brand || "-"}</h2>
                                    <br />
                                    <small>SPECIFICATION</small>
                                    <h2>{line.specification || "-"}</h2>
                                  </>
                                }
                              />
                            ) : (
                              "-"
                            )}
                          </h4>
                        </div>

                        <div>
                          <small>ATTACHMENT</small>
                          <h4>
                            {line.attachment ? (
                              <Button
                                componentType={"link"}
                                bgColor={"rgba(239, 239, 239, 1)"}
                                borderColor={"rgba(223, 223, 223, 1)"}
                                textColor={"black"}
                                style={{ padding: "7px 7px" }}
                                href={line.attachment}
                                target="_blank"
                              >
                                <img
                                  src={externalLinkIcon}
                                  alt="external link"
                                />
                              </Button>
                            ) : (
                              "-"
                            )}
                          </h4>
                        </div>
                      </div>

                      <br />

                      {/* Status / Action buttons */}
                      {isPending ? (
                        <Button
                          componentType={"button"}
                          bgColor={"transparent"}
                          borderColor={"rgba(207, 207, 207, 1)"}
                          textColor={"black"}
                          onClick={() => setSelectingLine(line)}
                          full
                          style={{
                            borderRadius: "50px",
                            padding: "8px 20px",
                          }}
                        >
                          Manually Select{" "}
                          <img src={externalLinkIcon} alt="external link" />
                        </Button>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "10px",
                              padding: "8px 15px",
                              borderRadius: "50px",
                              flexGrow: 1,
                              backgroundColor: isApproved
                                ? "rgba(34, 150, 100, 1)"
                                : "rgba(185, 28, 28, 1)",
                              color: "white",
                              fontSize: "12px",
                            }}
                          >
                            <span>
                              {isApproved
                                ? `${lineStatus.supplierName}`
                                : "All Vendors Rejected"}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              {isRejected && lineStatus.rejectComment && (
                                <InfoPopUpButton
                                  header={
                                    <span style={{ color: "black" }}>
                                      REJECT COMMENT
                                    </span>
                                  }
                                  text={
                                    <span style={{ color: "black" }}>
                                      {lineStatus.rejectComment}
                                    </span>
                                  }
                                  style={{
                                    filter: "invert(1)",
                                    padding: "0",
                                    backgroundColor: "transparent",
                                    borderColor: "transparent",
                                  }}
                                />
                              )}
                              <img
                                src={crossSmallIcon}
                                alt="reset"
                                style={{
                                  filter: "invert(1)",
                                  cursor: "pointer",
                                  width: "12px",
                                }}
                                onClick={() => handleResetLine(line.id)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit buttons when all lines reviewed */}
              {allReviewed && (
                <div
                  style={{
                    marginTop: "15px",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  {hasRejected ? (
                    <Button
                      componentType={"button"}
                      bgColor={"black"}
                      borderColor={"black"}
                      textColor={"white"}
                      onClick={() => setIsSubmitRevisionOpen(true)}
                      style={{
                        borderRadius: "50px",
                        padding: "10px 25px",
                      }}
                    >
                      RETURN FOR REVISION
                    </Button>
                  ) : (
                    <Button
                      componentType={"button"}
                      bgColor={"black"}
                      borderColor={"black"}
                      textColor={"white"}
                      onClick={() => setIsSubmitLpoOpen(true)}
                      style={{
                        borderRadius: "50px",
                        padding: "10px 25px",
                      }}
                    >
                      SUBMIT FOR LOCAL PURCHASE ORDER
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Vendor selection popup */}
      {selectingLine && (
        <FormPopUp
          header={"CHOOSE VENDOR AND QUOTATION"}
          setIsOpen={() => setSelectingLine(null)}
          handleSubmit={(e) => handleApproveQuotation(e)}
          addButtonLabel={"CONFIRM"}
          secondButton={
            <Button
              componentType={"button"}
              bgColor={"white"}
              borderColor={"black"}
              textColor={"black"}
              onClick={(e) => {
                e.preventDefault();
                setIsRejectOpen(true);
              }}
            >
              REJECT
            </Button>
          }
        >
          {isQuotationsLoading ? (
            <p
              style={{ textAlign: "center", padding: "20px 0", color: "gray" }}
            >
              Loading quotations...
            </p>
          ) : quotations.length === 0 ? (
            <p
              style={{ textAlign: "center", padding: "20px 0", color: "gray" }}
            >
              No quotations found
            </p>
          ) : (
            <table className="items-table">
              <thead>
                <tr>
                  <th></th>
                  <th>VENDOR</th>
                  <th>QUOTATION</th>
                  <th>QTY FOR USE</th>
                  <th>QTY FOR STOCKS</th>
                  <th>UNIT PRICE</th>
                  <th>TOTAL PRICE</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q, index) => {
                  const requestedQty = Number(selectingLine.quantity) || 0;
                  const proposedQty = Number(q.proposed_quantity) || 0;
                  const stockQty =
                    proposedQty > requestedQty ? proposedQty - requestedQty : 0;
                  return (
                    <tr key={index}>
                      <td>
                        <input
                          type="radio"
                          name="supplier"
                          value={q.id}
                          onChange={(e) =>
                            setSelectedQuotationID(e.target.value)
                          }
                          required
                        />
                      </td>
                      <td>
                        <SupplierDetailsPopUp
                          item={q as unknown as SupplierQuotation}
                          style={{
                            padding: "7px 20px",
                            textWrap: "nowrap",
                            minWidth: "300px",
                            display: "flex",
                            justifyContent: "space-between",
                            borderRadius: "25px",
                          }}
                        >
                          {q.supplier_name}
                          <img
                            src={externalLinkIcon}
                            alt="external link icon"
                          />
                        </SupplierDetailsPopUp>
                      </td>
                      <td>
                        {q.quotation_file && q.quotation_file.length > 0 ? (
                          <Button
                            componentType={"link"}
                            bgColor={"white"}
                            borderColor={"rgba(207, 207, 207, 1)"}
                            textColor={"black"}
                            href={q.quotation_file[0]}
                            target="_blank"
                            style={{
                              padding: "7px 20px",
                              borderRadius: "25px",
                            }}
                          >
                            Quotation
                            <img src={externalLinkIcon} alt="link" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {formatQuantity(requestedQty)} {selectingLine.unit}
                      </td>
                      <td>
                        {stockQty > 0
                          ? `${formatQuantity(stockQty)} ${selectingLine.unit}`
                          : "-"}
                      </td>
                      <td>{formatCurrency(q.unit_price)} AED</td>
                      <td>{formatCurrency(q.total_price)} AED</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </FormPopUp>
      )}

      {/* Reject popup */}
      {isRejectOpen && (
        <FormPopUp
          header={"REJECT ALL VENDORS"}
          setIsOpen={setIsRejectOpen}
          handleSubmit={(e) => handleRejectAll(e)}
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

      {/* Submit for LPO confirmation */}
      {isSubmitLpoOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsSubmitLpoOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            handleSubmitForLPO();
          }}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this material request?</p>
        </FormPopUp>
      )}

      {/* Submit for revision confirmation */}
      {isSubmitRevisionOpen && (
        <FormPopUp
          header={"RETURN FOR REVISION"}
          setIsOpen={setIsSubmitRevisionOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            handleSubmitForRevision();
          }}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this material request?</p>
        </FormPopUp>
      )}
    </div>
  );
}
