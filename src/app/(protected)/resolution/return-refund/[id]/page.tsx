"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/_DownloadLPOButton";
import DownloadNCRButton from "../../components/_DownloadNCRButton";
import DownloadRTVButton from "../../components/_DownloadRTVButton";
import QCResolutionTimeline from "../../components/QCResolutionTimeline";
import { toast } from "@/app/components/Toast";
import Link from "next/link";
import InputItem from "@/app/components/InputItem";
import FormPopUp from "@/app/components/FormPopup";

type ResolutionDetail = {
  id: number;
  qc_mr_line_id: number;
  progress_id: number;
  return_required: string;
  pickup_type: string | null;
  return_quantity: number;
  expected_refund: number;
  actual_refund: number;
  variance_amount: number;
  reason_for_variance: string | null;
  eta_delivery_date: string | null;
  expected_settlement_date: string | null;
  refund_method: string | null;
  remarks: string | null;
  proof_of_payment: string | null;
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

// Return/Refund progress stages
const RETURN_REFUND_STAGES = [
  { id: 1, label: "REFUND CONFIRMATION" },
  { id: 2, label: "VERIFICATION" },
  { id: 3, label: "COMPLETED" },
];

const PROGRESS_LABELS: { [key: number]: string } = {
  1: "REFUND CONFIRMATION",
  2: "VERIFICATION",
  3: "COMPLETED",
};

const STATUS_BADGES: {
  [key: number]: { label: string; bg: string; color: string };
} = {
  1: {
    label: "REFUND CONFIRMATION",
    bg: "rgba(255, 250, 189, 1)",
    color: "rgba(134, 83, 47, 1)",
  },
  2: {
    label: "VERIFICATION",
    bg: "rgba(255, 250, 189, 1)",
    color: "rgba(134, 83, 47, 1)",
  },
  3: {
    label: "COMPLETED",
    bg: "rgba(87, 244, 176, 1)",
    color: "rgba(31, 101, 71, 1)",
  },
};

export default function ReturnRefundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userInfo } = useAuth();
  const resolutionId = params.id as string;

  const downloadIcon = "/icons/download.svg";

  const [detail, setDetail] = useState<ResolutionDetail | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  /* const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }; */

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution?id=${resolutionId}`,
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

    fetchDetail();
  }, [resolutionId]);

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
          resolution_type: "return_refund",
          new_progress_id: newProgressId,
          from_progress_id: detail.progress_id,
          changed_by: userInfo?.name || "Unknown",
        }),
      },
    );

    if (res.ok) {
      toast("Resolution submitted", "success");
      setIsConfirmOpen(false);
      router.refresh();
      router.replace("/resolution?tab=tracker");
    } else {
      const data = await res.json();
      toast(data.message || "Failed to submit resolution", "error");
    }
  }

  if (!detail) {
    return null;
  }

  const statusBadge = STATUS_BADGES[detail.progress_id] || STATUS_BADGES[1];
  const qcNumber = `QC-RR-${String(detail.id).padStart(5, "0")}`;
  const proofUrl = parseFileUrl(detail.proof_of_payment);

  // Determine which submit button to show based on progress and department
  const departmentID = userInfo?.departmentID;
  const showConfirmRefund = detail.progress_id === 1 && departmentID === 10; // Finance
  const showVerifyReturn = detail.progress_id === 2 && departmentID === 11; // Storekeeper

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
              alignItems: "center",
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

            {proofUrl && (
              <Button
                componentType="none"
                bgColor="white"
                borderColor="rgba(223, 223, 223, 1)"
                textColor="black"
                style={{
                  padding: "7px 20px",
                  borderRadius: "50px",
                }}
              >
                Invoice
                <img
                  src={downloadIcon}
                  alt="download"
                  onClick={async () => {
                    try {
                      const response = await fetch(proofUrl);
                      const blob = await response.blob();
                      const blobUrl = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = blobUrl;
                      link.download = `INVOICE-${String(detail.lpo_id).padStart(5, "0")}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (error) {
                      console.error("Download failed:", error);
                      window.open(proofUrl, "_blank");
                    }
                  }}
                />
              </Button>
            )}

            <DownloadNCRButton
              qcId={detail.qc_mr_line_id}
              style={{ padding: "7px 20px", borderRadius: "50px" }}
              bgColor="transparent"
            />

            <DownloadRTVButton
              resolutionId={detail.id}
              style={{ padding: "7px 20px", borderRadius: "50px" }}
              bgColor="transparent"
            />
          </div>
        </div>

        <br />

        <div style={{ display: "flex", gap: "40px" }}>
          <div>
            <small>RETURN REQUIRED?</small>
            <h2>{detail.return_required || "-"}</h2>
          </div>

          {detail.return_required === "Yes" && detail.pickup_type && (
            <div>
              <small>PICKUP TYPE</small>
              <h2>{detail.pickup_type}</h2>
            </div>
          )}

          {detail.eta_delivery_date && (
            <div>
              <small>EXPECTED RETURN DATE</small>
              <h2>
                {new Date(detail.eta_delivery_date).toLocaleDateString("en-GB")}
              </h2>
            </div>
          )}
        </div>
      </div>

      <br />
      <br />

      {/* Requisition Timeline */}
      <QCResolutionTimeline
        resolutionId={detail.id}
        resolutionType="return_refund"
        currentProgressId={detail.progress_id}
        stages={RETURN_REFUND_STAGES}
      />

      <br />
      <br />

      <table className="items-table two-toned">
        <thead>
          <tr>
            <th>#</th>
            <th>CATEGORY</th>
            <th>SUBCATEGORY</th>
            <th>ITEM</th>
            <th>FAILED QTY</th>
            <th>RETURNED QTY</th>
            <th>EXPECTED REFUND</th>
            <th>ACTUAL REFUND</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>{detail.material_category}</td>
            <td>{detail.material_subcategory}</td>
            <td>{detail.material_description}</td>
            <td>
              {formatNumber(detail.failed_quantity)} {detail.unit}
            </td>
            <td>
              {formatNumber(detail.return_quantity)} {detail.unit}
            </td>
            <td>AED{detail.expected_refund.toFixed(2)}</td>
            <td>AED {detail.actual_refund.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <br />
      <br />

      {/* Detail Fields */}
      <div className="mr-with-id">
        <div className="input-row half">
          <InputItem
            label={"VARIANCE AMOUNT"}
            value={`AED ${detail.variance_amount.toFixed(2)}`}
            type={"text"}
            onChange={() => {}}
            required
            disabled
          />

          <InputItem
            label={"REASON FOR VARIANCE"}
            value={detail.reason_for_variance || "-"}
            type={"text"}
            onChange={() => {}}
            required
            disabled
          />
        </div>

        <div className="input-row half">
          <InputItem
            label={"EXPECTED SETTLEMENT DATE"}
            value={
              detail.expected_settlement_date
                ? new Date(detail.expected_settlement_date).toLocaleDateString(
                    "en-GB",
                  )
                : "-"
            }
            type={"text"}
            onChange={() => {}}
            required
            disabled
          />

          <InputItem
            label={"REFUND METHOD"}
            value={detail.refund_method || "-"}
            type={"text"}
            onChange={() => {}}
            required
            disabled
          />
        </div>

        <div className="input-row half">
          <InputItem
            label={"REMARKS"}
            value={detail.remarks || "-"}
            type={"textarea"}
            onChange={() => {}}
            required
            disabled
          />

          <div className="input-item">
            <label className="custom">PROOF OF REFUND / CREDIT NOTE</label>
            {proofUrl ? (
              <Button
                componentType="button"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="rgba(223, 223, 223, 1)"
                textColor="black"
                style={{ padding: "7px 7px" }}
                onClick={async () => {
                  try {
                    const response = await fetch(proofUrl);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = blobUrl;
                    link.download = `PROOF-${qcNumber}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                  } catch (error) {
                    console.error("Download failed:", error);
                    window.open(proofUrl, "_blank");
                  }
                }}
              >
                <img src={downloadIcon} alt="download" />
              </Button>
            ) : (
              "-"
            )}
          </div>
        </div>
      </div>

      {showConfirmRefund && (
        <div className="bottom-nav">
          <div></div>
          <Button
            componentType="button"
            bgColor={"white"}
            borderColor={"white"}
            textColor={"black"}
            onClick={() => setIsConfirmOpen(true)}
          >
            SUBMIT FOR VERIFICATION
          </Button>
        </div>
      )}

      {showVerifyReturn && (
        <div className="bottom-nav">
          <div></div>
          <Button
            componentType="button"
            bgColor={"white"}
            borderColor={"white"}
            textColor={"black"}
            onClick={() => setIsConfirmOpen(true)}
          >
            SUBMIT FOR COMPLETION
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
