"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import BoqReferencePopUp from "@/app/(protected)/mr/[id]/components/BoqReferencePopUp";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";

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
  approval_status: string;
  reject_comment: string;
  attachment: string;
  boq_line_ids: string;
};

type DurationInfo = {
  duration: string;
  hoursDecimal: number;
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
      width="15"
      height="17"
      viewBox="0 0 15 17"
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

export default function QuickInitialApprovalWidget() {
  const router = useRouter();
  const { userInfo } = useAuth();

  const checkIcon = "/icons/check.svg";
  const crossIcon = "/icons/cross.svg";
  const crossSmallIcon = "/icons/cross-small.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [mrHeaders, setMrHeaders] = useState<MrHeaderData[]>([]);
  const [currentMrIndex, setCurrentMrIndex] = useState(0);
  const [flatLines, setFlatLines] = useState<MrLineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinesLoading, setIsLinesLoading] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");
  const [rejectingLineId, setRejectingLineId] = useState<number | null>(null);
  const [durationInfo, setDurationInfo] = useState<DurationInfo | null>(null);

  // Submit popups
  const [isSubmitQuotationsOpen, setIsSubmitQuotationsOpen] = useState(false);
  const [isSubmitRevisionOpen, setIsSubmitRevisionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch MR headers at progress_id = 3
  useEffect(() => {
    async function fetchMrs() {
      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`);
        const data = await res.json();
        const filtered = data
          .filter((mr: any) => mr.progress_id === 3)
          .sort(
            (a: any, b: any) =>
              new Date(b.date_requested).getTime() -
              new Date(a.date_requested).getTime(),
          );
        setMrHeaders(filtered);
      } catch (err) {
        console.error("Error fetching MRs for initial approval:", err);
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

  const currentMr = mrHeaders[currentMrIndex];

  // Derived status
  const allReviewed =
    !isLinesLoading &&
    flatLines.length > 0 &&
    flatLines.every((l) => l.approval_status);
  const hasRejected = flatLines.some(
    (l) => l.approval_status?.toLowerCase() === "rejected",
  );
  const allApproved =
    allReviewed &&
    flatLines.every((l) => l.approval_status?.toLowerCase() === "approved");

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

  async function handleApprove(line: MrLineData) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approveItem", id: line.id }),
    });

    if (res.ok) {
      toast(`${line.material_description} approved`, "success");
      setFlatLines((prev) =>
        prev.map((l) =>
          l.id === line.id ? { ...l, approval_status: "Approved" } : l,
        ),
      );
    } else {
      toast("Failed to approve item", "error");
    }
  }

  async function handleReject() {
    if (!rejectingLineId) return;
    const line = flatLines.find((l) => l.id === rejectingLineId);
    if (!line) return;

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rejectItem",
        id: line.id,
        comment: rejectText,
      }),
    });

    if (res.ok) {
      toast(`${line.material_description} rejected`, "success");
      setFlatLines((prev) =>
        prev.map((l) =>
          l.id === line.id
            ? { ...l, approval_status: "Rejected", reject_comment: rejectText }
            : l,
        ),
      );
      setRejectText("");
      setIsRejectOpen(false);
      setRejectingLineId(null);
    } else {
      toast("Failed to reject item", "error");
    }
  }

  async function handleReset(line: MrLineData) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetItem", id: line.id }),
    });

    if (res.ok) {
      setFlatLines((prev) =>
        prev.map((l) =>
          l.id === line.id
            ? { ...l, approval_status: "", reject_comment: "" }
            : l,
        ),
      );
    } else {
      toast("Failed to reset item", "error");
    }
  }

  async function handleSubmitForQuotations() {
    if (!currentMr) return;
    setIsSubmitting(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForQuotations",
        id: currentMr.id,
        changed_by: userInfo?.name,
        department_id: currentMr.department_id,
        from_progress_id: currentMr.progress_id,
      }),
    });

    if (res.ok) {
      toast("Material request submitted for quotations", "success");
      setIsSubmitQuotationsOpen(false);
      setMrHeaders((prev) => prev.filter((_, i) => i !== currentMrIndex));
      if (currentMrIndex >= mrHeaders.length - 1) {
        setCurrentMrIndex(Math.max(0, currentMrIndex - 1));
      }
    } else {
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
        action: "submitForResubmission",
        id: currentMr.id,
        changed_by: userInfo?.name,
        department_id: currentMr.department_id,
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
      jo_contract_file: null,
      jo_other_docs_file: null,
    };
  }

  if (isLoading) {
    return (
      <div className="widget-container">
        <h3 style={{ marginBottom: "15px" }}>Initial Approval</h3>
        <p style={{ textAlign: "center", padding: "40px 0" }}>Loading...</p>
      </div>
    );
  }

  if (mrHeaders.length === 0) {
    return (
      <div className="widget-container">
        <h3 style={{ marginBottom: "15px" }}>Initial Approval</h3>
        <p
          style={{
            color: "gray",
            textAlign: "center",
            padding: "40px 0",
            fontSize: "14px",
          }}
        >
          No requests pending initial approval
        </p>
      </div>
    );
  }

  return (
    <div className="widget-container">
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <h3>Initial Approval</h3>

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
          {mrHeaders.length} REQUESTS
        </span>
      </div>

      <br />

      {currentMr && (
        <>
          {/* MR Header Info */}
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
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "10px",
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
                  const status = line.approval_status?.toLowerCase();
                  const isApproved = status === "approved";
                  const isRejected = status === "rejected";
                  const isPending = !line.approval_status;

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

                      {/* Approve / Reject / Status buttons */}
                      {isPending ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "5px",
                          }}
                        >
                          <Button
                            componentType={"button"}
                            bgColor={"rgba(34, 150, 100, 1)"}
                            borderColor={"rgba(34, 150, 100, 1)"}
                            textColor={"white"}
                            onClick={() => handleApprove(line)}
                            style={{
                              borderRadius: "50px",
                              padding: "8px 20px",
                              flexGrow: 1,
                            }}
                          >
                            <img
                              src={checkIcon}
                              alt="approve"
                              style={{ filter: "invert(1)" }}
                            />
                          </Button>
                          <Button
                            componentType={"button"}
                            bgColor={"rgba(185, 28, 28, 1)"}
                            borderColor={"rgba(185, 28, 28, 1)"}
                            textColor={"white"}
                            onClick={() => {
                              setRejectingLineId(line.id);
                              setIsRejectOpen(true);
                            }}
                            style={{
                              borderRadius: "50px",
                              padding: "8px 20px",
                              flexGrow: 1,
                            }}
                          >
                            <img
                              src={crossIcon}
                              alt="reject"
                              style={{ filter: "invert(1)" }}
                            />
                          </Button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "5px",
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
                            <span>{isApproved ? "Approved" : "Rejected"}</span>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              {isRejected && line.reject_comment && (
                                <InfoPopUpButton
                                  header={
                                    <span style={{ color: "black" }}>
                                      REJECT COMMENT
                                    </span>
                                  }
                                  text={
                                    <span style={{ color: "black" }}>
                                      {line.reject_comment}
                                    </span>
                                  }
                                  style={{
                                    filter: "invert(1)",
                                    padding: "0",
                                    backgroundColor: "transparent",
                                    borderColor: "transparent",
                                    color: "black",
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
                                onClick={() => handleReset(line)}
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
                      onClick={() => setIsSubmitQuotationsOpen(true)}
                      style={{
                        borderRadius: "50px",
                        padding: "10px 25px",
                      }}
                    >
                      SUBMIT FOR QUOTATIONS
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Reject comment popup */}
      {isRejectOpen && (
        <FormPopUp
          header="REJECT MATERIAL REQUEST ITEM"
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

      {/* Submit for quotations confirmation */}
      {isSubmitQuotationsOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsSubmitQuotationsOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            handleSubmitForQuotations();
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
