"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/_DownloadLPOButton";
import DownloadNCRButton from "../../components/_DownloadNCRButton";
import AddConditionalStockButton from "../../components/_AddConditionalStockButton";
import CreateCAQCChecklistButton from "../../components/_CreateCAQCChecklistButton";
import QCResolutionTimeline from "../../components/QCResolutionTimeline";
import { toast } from "@/app/components/Toast";
import Link from "next/link";
import FormPopUp from "@/app/components/FormPopup";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import Image from "next/image";

type ConditionallyAcceptedDetail = {
  id: number;
  qc_mr_line_id: number;
  progress_id: number;
  conditionally_accepted_quantity: number;
  reason: string;
  penalty_type: string | null;
  penalty_value: number | null;
  deviation_type: string | null;
  deviation_description: string | null;
  requires_name_change: string | null;
  approval_source: string | null;
  warranty_type: string | null;
  remarks: string | null;
  attachment: any;
  created_by: string | null;
  created_at: string;
  lpo_id: number;
  lpo_mr_line_id: number;
  accepted_quantity: number;
  received_quantity: number;
  failed_quantity: number;
  checked_by: string;
  mr_line_id: number;
  unit_price: number;
  material_category: string;
  material_subcategory: string;
  material_description: string;
  boq_line_ids: string | null;
  unit: string;
  supplier_name: string;
  lpo_table_id: number;
  invoice_file: any;
  mr_header_id: number;
  project_id: number;
};

// Progress stages per reason
const STAGES_BY_REASON: {
  [key: string]: { id: number; label: string }[];
} = {
  "Deviation approval": [
    { id: 1, label: "QC" },
    { id: 2, label: "STOCK ENTRY" },
    { id: 3, label: "COMPLETED" },
  ],
  "Client/consultant approval": [
    { id: 1, label: "MANAGER APPROVAL" },
    { id: 2, label: "STOCK ENTRY" },
    { id: 3, label: "COMPLETED" },
  ],
  "Commercial deduction/penalty": [
    { id: 1, label: "VERIFICATION" },
    { id: 2, label: "STOCK ENTRY" },
    { id: 3, label: "COMPLETED" },
  ],
  "Extended warranty/guarantees": [
    { id: 1, label: "MANAGER APPROVAL" },
    { id: 2, label: "STOCK ENTRY" },
    { id: 3, label: "COMPLETED" },
  ],
};

// Breadcrumb labels per reason
const BREADCRUMB_BY_REASON: { [key: string]: string[] } = {
  "Deviation approval": ["CONDITIONALLY ACCEPTED", "DEVIATION APPROVAL", "QC"],
  "Client/consultant approval": [
    "ACCEPT CONDITIONALLY",
    "CLIENT/CONSULTANT APPROVAL",
    "MANAGER APPROVAL",
  ],
  "Commercial deduction/penalty": [
    "ACCEPT CONDITIONALLY",
    "COMMERCIAL DEDUCTION/PENALTY",
    "VERIFICATION",
  ],
  "Extended warranty/guarantees": [
    "ACCEPT CONDITIONALLY",
    "EXTENDED WARRANTY/GUARANTEES",
    "MANAGER APPROVAL",
  ],
};

// Dynamic badge colors based on stage position
function getStatusBadge(
  progressId: number,
  stages: { id: number; label: string }[],
): { label: string; bg: string; color: string } {
  const stage = stages.find((s) => s.id === progressId);
  const maxStageId = Math.max(...stages.map((s) => s.id));
  const label = stage?.label || "UNKNOWN";

  if (progressId === maxStageId) {
    // Completed — green
    return {
      label,
      bg: "rgba(87, 244, 176, 1)",
      color: "rgba(31, 101, 71, 1)",
    };
  } else {
    // First stage — yellow
    return {
      label,
      bg: "rgba(255, 250, 189, 1)",
      color: "rgba(134, 83, 47, 1)",
    };
  }
}

export default function AcceptConditionallyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userInfo } = useAuth();
  const resolutionId = params.id as string;

  const downloadIcon = "/icons/download.svg";
  const materialIcon = "/icons/qc-resolution-material.svg";

  const [detail, setDetail] = useState<ConditionallyAcceptedDetail | null>(
    null,
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hasStock, setHasStock] = useState(false);
  const [hasQCChecklist, setHasQCChecklist] = useState(false);

  function parseFileUrl(raw: any): string | null {
    if (!raw) return null;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed[0] || null;
      return parsed;
    } catch {
      return typeof raw === "string" ? raw : null;
    }
  }

  const formatNumber = (value: unknown): string => {
    const num = Number(value);
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
  };

  async function handleDownload(url: string, fileName: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, "_blank");
    }
  }

  async function fetchDetail() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution?id=${resolutionId}&type=accept_conditionally`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDetail(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching resolution detail:", error);
    }
  }

  useEffect(() => {
    fetchDetail();
  }, [resolutionId]);

  // Check if stock exists for this mr_line (for stock entry stage)
  useEffect(() => {
    if (!detail?.mr_line_id) return;
    async function checkStock() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockByMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mr_line_id: detail!.mr_line_id }),
          },
        );
        const data = await res.json();
        setHasStock(!!(data.success && data.data));
      } catch {
        setHasStock(false);
      }
    }
    checkStock();
  }, [detail?.mr_line_id, detail?.progress_id]);

  // Check if QC checklist exists (for deviation approval QC stage)
  useEffect(() => {
    if (!detail?.lpo_mr_line_id) return;
    async function checkQC() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_mr_line_id: detail!.lpo_mr_line_id }),
          },
        );
        const data = await res.json();
        setHasQCChecklist(!!(data.success && data.data));
      } catch {
        setHasQCChecklist(false);
      }
    }
    checkQC();
  }, [detail?.lpo_mr_line_id, detail?.progress_id]);

  async function handleProgressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;

    const newProgressId = detail.progress_id + 1;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProgress",
          resolution_id: detail.id,
          resolution_type: "accept_conditionally",
          new_progress_id: newProgressId,
          from_progress_id: detail.progress_id,
          changed_by: userInfo?.name || "Unknown",
        }),
      },
    );

    if (res.ok) {
      toast("Progress updated", "success");
      setIsConfirmOpen(false);
      fetchDetail();
    } else {
      const data = await res.json();
      toast(data.message || "Failed to update progress", "error");
    }
  }

  if (!detail) {
    return null;
  }

  const stages =
    STAGES_BY_REASON[detail.reason] || STAGES_BY_REASON["Deviation approval"];
  const breadcrumbs = BREADCRUMB_BY_REASON[detail.reason] || [
    "ACCEPT CONDITIONALLY",
  ];
  const statusBadge = getStatusBadge(detail.progress_id, stages);
  const qcNumber = `QC-AC-${String(detail.id).padStart(5, "0")}`;
  const invoiceUrl = parseFileUrl(detail.invoice_file);
  const attachmentUrl = parseFileUrl(detail.attachment);

  const departmentID = userInfo?.departmentID;

  // Determine next stage for the bottom "SUBMIT FOR ..." button
  const nextStage = stages.find((s) => s.id === detail.progress_id + 1);
  const maxStageId = Math.max(...stages.map((s) => s.id));
  const isCompleted = detail.progress_id === maxStageId;

  // Map stage labels to proper submit button labels
  const getSubmitLabel = (label: string) => {
    const map: { [key: string]: string } = {
      COMPLETED: "COMPLETION",
      QC: "QUALITY CONTROL",
    };
    return map[label] || label;
  };

  // Determine who can submit at each stage based on reason & department
  let showActionButton = false;
  let actionLabel = nextStage
    ? `SUBMIT FOR ${getSubmitLabel(nextStage.label)}`
    : "";

  if (!isCompleted && nextStage) {
    if (detail.reason === "Deviation approval") {
      // Stage 1: QC (dept 12 = QC)
      if (detail.progress_id === 1 && departmentID === 12) {
        showActionButton = true;
      }
      // Stage 2: Stock Entry (dept 11 = Storekeeper)
      if (detail.progress_id === 2 && departmentID === 11) {
        showActionButton = true;
      }
    } else if (detail.reason === "Client/consultant approval") {
      // Stage 1: Manager Approval (dept 8 = Management)
      if (detail.progress_id === 1 && departmentID === 8) {
        showActionButton = true;
      }
      // Stage 2: Stock Entry (dept 11 = Storekeeper)
      if (detail.progress_id === 2 && departmentID === 11) {
        showActionButton = true;
      }
    } else if (detail.reason === "Commercial deduction/penalty") {
      // Stage 1: Verification (dept 10 = Finance)
      if (detail.progress_id === 1 && departmentID === 10) {
        showActionButton = true;
      }
      // Stage 2: Stock Entry (dept 11 = Storekeeper)
      if (detail.progress_id === 2 && departmentID === 11) {
        showActionButton = true;
      }
    } else if (detail.reason === "Extended warranty/guarantees") {
      // Stage 1: Manager Approval (dept 8 = Management)
      if (detail.progress_id === 1 && departmentID === 8) {
        showActionButton = true;
      }
      // Stage 2: Stock Entry (dept 11 = Storekeeper)
      if (detail.progress_id === 2 && departmentID === 11) {
        showActionButton = true;
      }
    }
  }

  // Determine if we're at the Stock Entry stage (progress_id 2 for all reasons)
  const isStockEntryStage = detail.progress_id === 2 && !isCompleted;

  // Determine if we're at the QC stage (Deviation approval, progress_id 1)
  const isQCStage =
    detail.reason === "Deviation approval" && detail.progress_id === 1;

  // Determine if submit button should be disabled based on prerequisites
  const isSubmitDisabled =
    (isQCStage && !hasQCChecklist) || (isStockEntryStage && !hasStock);

  // Get the current stage label for breadcrumb
  const currentStage = stages.find((s) => s.id === detail.progress_id);
  const currentStageLabel = currentStage?.label || "";

  // Attachment label per reason
  const getAttachmentLabel = () => {
    switch (detail.reason) {
      case "Commercial deduction/penalty":
        return "Commercial Agreement Evidence";
      case "Deviation approval":
        return "Supporting Documentation";
      case "Client/consultant approval":
        return "Approval Document";
      case "Extended warranty/guarantees":
        return "Supporting Documents";
      default:
        return "Attachment";
    }
  };

  return (
    <div className="dashboard">
      {/* Breadcrumb */}
      <h1>
        <Link href="/resolution">RESOLUTION CENTER</Link> &gt; {qcNumber}
      </h1>

      <br />

      {/* Header Card */}
      <div className="mr-with-id">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "20px",
            }}
          >
            <div>
              <small>QC NUMBER</small>
              <h2>{qcNumber}</h2>
            </div>
            <div
              className="approval-pill normal-text"
              style={{
                backgroundColor: statusBadge.bg,
                color: statusBadge.color,
              }}
            >
              {statusBadge.label}
            </div>
          </div>

          {/* Download buttons */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            {isQCStage && (
              <CreateCAQCChecklistButton
                lpoMrLineId={detail.lpo_mr_line_id}
                lpoId={detail.lpo_id}
                materialDescription={detail.material_description}
                acceptedQuantity={detail.conditionally_accepted_quantity}
                receivedQuantity={detail.received_quantity}
                orderedQuantity={detail.accepted_quantity}
              />
            )}

            {isStockEntryStage && <AddConditionalStockButton detail={detail} />}

            <DownloadNCRButton
              qcId={detail.qc_mr_line_id}
              style={{ padding: "7px 20px", borderRadius: "50px" }}
              bgColor="transparent"
            />

            <Button
              componentType={"none"}
              bgColor={"transparent"}
              borderColor={"rgba(223, 223, 223, 1)"}
              textColor={"black"}
              style={{ padding: "7px 20px", borderRadius: "50px" }}
            >
              LPO{" "}
              <DownloadLPOButton
                lpoID={detail.lpo_id}
                bgColor="white"
                borderColor="rgba(223, 223, 223, 1)"
                textColor="black"
              />
            </Button>

            {invoiceUrl && (
              <Button
                componentType="none"
                bgColor="white"
                borderColor="rgba(223, 223, 223, 1)"
                textColor="black"
                style={{
                  padding: "7px 20px",
                  borderRadius: "50px",
                  textTransform: "none",
                }}
              >
                Invoice
                <img
                  src={downloadIcon}
                  alt="download"
                  onClick={() =>
                    handleDownload(
                      invoiceUrl,
                      `INVOICE-${String(detail.lpo_id).padStart(5, "0")}`,
                    )
                  }
                />
              </Button>
            )}
          </div>
        </div>

        <br />

        {/* Detail fields based on reason */}
        <div
          style={{
            display: "flex",
            gap: "40px",
          }}
        >
          {detail.reason === "Commercial deduction/penalty" && (
            <>
              <div>
                <small>REASON</small>
                <h2>{detail.reason?.toUpperCase()}</h2>
              </div>
              <div>
                <small>PENALTY TYPE</small>
                <h2>{detail.penalty_type?.toUpperCase() || "-"}</h2>
              </div>
              <div>
                <small>PENALTY VALUE</small>
                <h2>
                  {detail.penalty_value != null
                    ? `${detail.penalty_value} AED`
                    : "-"}
                </h2>
              </div>
              <div>
                <small>COMMERCIAL AGREEMENT EVIDENCE</small>
                {attachmentUrl ? (
                  <img
                    src="/icons/external-link.svg"
                    alt="view"
                    style={{
                      cursor: "pointer",
                      width: "20px",
                      height: "20px",
                      marginTop: "5px",
                    }}
                    onClick={() => window.open(attachmentUrl, "_blank")}
                  />
                ) : (
                  <h2>-</h2>
                )}
              </div>
            </>
          )}

          {detail.reason === "Deviation approval" && (
            <>
              <div>
                <small>DEVIATION TYPE</small>
                <h2>{detail.deviation_type?.toUpperCase() || "-"}</h2>
              </div>
              <div>
                <small>DEVIATION DESCRIPTION</small>
                {detail.deviation_description ? (
                  <InfoPopUpButton
                    text={detail.deviation_description}
                    header="DEVIATION DESCRIPTION"
                  />
                ) : (
                  <h2>-</h2>
                )}
              </div>
              <div>
                <small>DOES ITEM DESCRIPTION REQUIRE NAME CHANGE</small>
                <h2>{detail.requires_name_change?.toUpperCase() || "-"}</h2>
              </div>
            </>
          )}

          {detail.reason === "Client/consultant approval" && (
            <>
              <div>
                <small>APPROVAL SOURCE</small>
                <h2>{detail.approval_source?.toUpperCase() || "-"}</h2>
              </div>
              <div>
                <small>APPROVAL DOCUMENT</small>
                {attachmentUrl ? (
                  <Button
                    componentType={"button"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"rgba(223, 223, 223, 1)"}
                    textColor={"black"}
                    style={{ padding: "7px 7px" }}
                    onClick={() => window.open(attachmentUrl, "_blank")}
                  >
                    <img src="/icons/external-link.svg" alt="view" />
                  </Button>
                ) : (
                  <h2>-</h2>
                )}
              </div>
            </>
          )}

          {detail.reason === "Extended warranty/guarantees" && (
            <>
              <div>
                <small>TYPE</small>
                <h2>{detail.warranty_type?.toUpperCase() || "-"}</h2>
              </div>
              <div>
                <small>REMARKS</small>
                {detail.remarks ? (
                  <InfoPopUpButton text={detail.remarks} header="REMARKS" />
                ) : (
                  <h2>-</h2>
                )}
              </div>
              <div>
                <small>SUPPORTING DOCUMENTS</small>
                {attachmentUrl ? (
                  <img
                    src="/icons/external-link.svg"
                    alt="view"
                    style={{
                      cursor: "pointer",
                      width: "20px",
                      height: "20px",
                      marginTop: "5px",
                    }}
                    onClick={() => window.open(attachmentUrl, "_blank")}
                  />
                ) : (
                  <h2>-</h2>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <br />
      <br />

      {/* Resolution Timeline */}
      <QCResolutionTimeline
        resolutionId={detail.id}
        resolutionType="accept_conditionally"
        currentProgressId={detail.progress_id}
        stages={stages}
      />

      <br />
      <br />

      {/* Conditionally Accepted Item Section */}
      <h3 style={{ fontWeight: "600", marginBottom: "15px" }}>
        CONDITIONALLY ACCEPTED ITEM
      </h3>

      <div className="mr-with-id">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <Image
            src={materialIcon}
            alt="material icon"
            width={24}
            height={24}
          />
          <div>
            <small>ITEM</small>
            <h3 style={{ fontSize: "16px" }}>
              {detail.material_description.toUpperCase()}
            </h3>
          </div>
        </div>

        <br />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "15px",
            minHeight: "150px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(245, 245, 245, 1)",
              borderRadius: "15px",
              padding: "25px",
              display: "flex",
              justifyContent: "flex-end",
              flexDirection: "column",
            }}
          >
            <small>CATEGORY</small>
            <h3>{detail.material_category}</h3>
          </div>
          <div
            style={{
              backgroundColor: "rgba(245, 245, 245, 1)",
              borderRadius: "15px",
              padding: "25px",
              display: "flex",
              justifyContent: "flex-end",
              flexDirection: "column",
            }}
          >
            <small>FAILED QTY</small>
            <h3>
              {formatNumber(detail.failed_quantity)} {detail.unit}
            </h3>
          </div>
          <div
            style={{
              backgroundColor: "rgba(245, 245, 245, 1)",
              borderRadius: "15px",
              padding: "25px",
              display: "flex",
              justifyContent: "flex-end",
              flexDirection: "column",
            }}
          >
            <small>CONDITIONALLY ACCEPTED QTY</small>
            <h3>
              {formatNumber(detail.conditionally_accepted_quantity)}{" "}
              {detail.unit}
            </h3>
          </div>
        </div>
      </div>

      {/* Bottom Action Button */}
      {showActionButton && (
        <div className="bottom-nav">
          <div></div>
          <Button
            componentType="button"
            bgColor={"white"}
            borderColor={"white"}
            textColor={"black"}
            onClick={() => setIsConfirmOpen(true)}
            disabled={isSubmitDisabled}
            style={{
              opacity: isSubmitDisabled ? "0.5" : "1",
              cursor: isSubmitDisabled ? "not-allowed" : "pointer",
              pointerEvents: isSubmitDisabled ? "none" : "auto",
            }}
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {isConfirmOpen && (
        <FormPopUp
          header={"SUBMIT RESOLUTION"}
          setIsOpen={setIsConfirmOpen}
          handleSubmit={handleProgressSubmit}
          addButtonLabel="CONFIRM"
        >
          Are you sure you want to submit this resolution?
        </FormPopUp>
      )}
    </div>
  );
}
