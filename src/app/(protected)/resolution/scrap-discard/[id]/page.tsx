"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/_DownloadLPOButton";
import DownloadNCRButton from "../../components/_DownloadNCRButton";
import QCResolutionTimeline from "../../components/QCResolutionTimeline";
import { toast } from "@/app/components/Toast";
import Link from "next/link";
import FormPopUp from "@/app/components/FormPopup";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import Image from "next/image";
import { useRefresh } from "@/app/context/RefreshContext";

type ScrapDetail = {
  id: number;
  qc_mr_line_id: number;
  progress_id: number;
  scrap_quantity: number;
  scrap_reason: string;
  return_not_possible_reason: string | null;
  disposal_method: string | null;
  scrap_attachment: any;
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

// Scrap progress stages
const SCRAP_STAGES = [
  { id: 1, label: "MANAGER APPROVAL" },
  { id: 2, label: "COMPLETED" },
];

const STATUS_BADGES: {
  [key: number]: { label: string; bg: string; color: string };
} = {
  1: {
    label: "AWAITING",
    bg: "rgba(255, 250, 189, 1)",
    color: "rgba(134, 83, 47, 1)",
  },
  2: {
    label: "COMPLETED",
    bg: "rgba(87, 244, 176, 1)",
    color: "rgba(31, 101, 71, 1)",
  },
};

export default function ScrapDiscardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { refresh } = useRefresh();

  const { userInfo } = useAuth();
  const resolutionId = params.id as string;

  const downloadIcon = "/icons/download.svg";
  const materialIcon = "/icons/qc-resolution-material.svg";

  const [detail, setDetail] = useState<ScrapDetail | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution?id=${resolutionId}&type=scrap_discard`,
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
          resolution_type: "scrap_discard",
          new_progress_id: newProgressId,
          from_progress_id: detail.progress_id,
          changed_by: userInfo?.name || "Unknown",
        }),
      },
    );

    if (res.ok) {
      toast("Resolution submitted", "success");
      setIsConfirmOpen(false);
      await refresh();
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
  const qcNumber = `QC-SD-${String(detail.id).padStart(5, "0")}`;
  const invoiceUrl = parseFileUrl(detail.invoice_file);
  const scrapAttachmentUrl = parseFileUrl(detail.scrap_attachment);

  // Determine which submit button to show based on progress and department
  const departmentID = userInfo?.departmentID;
  // Manager approval (dept 8 = Management)
  const showApproveButton = detail.progress_id === 1 && departmentID === 8;

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

        <div
          style={{
            display: "flex",
            gap: "40px",
          }}
        >
          <div>
            <small>SCRAP REASON</small>
            <h2>{detail.scrap_reason?.toUpperCase() || "-"}</h2>
          </div>
          <div>
            <small>FAILED QTY</small>
            <h2>
              {formatNumber(detail.failed_quantity)} {detail.unit}
            </h2>
          </div>
          <div>
            <small>REASON FOR RETURN NOT POSSIBLE</small>
            {detail.return_not_possible_reason ? (
              <InfoPopUpButton
                text={detail.return_not_possible_reason}
                header="REASON FOR RETURN NOT POSSIBLE"
              />
            ) : (
              <h2>-</h2>
            )}
          </div>
          <div>
            <small>DISPOSAL METHOD</small>
            <h2>{detail.disposal_method?.toUpperCase() || "-"}</h2>
          </div>
        </div>
      </div>

      <br />
      <br />

      {/* Resolution Timeline */}
      <QCResolutionTimeline
        resolutionId={detail.id}
        resolutionType="scrap_discard"
        currentProgressId={detail.progress_id}
        stages={SCRAP_STAGES}
      />

      <br />
      <br />

      {/* Scrap Item Section */}
      <h3 style={{ fontWeight: "600", marginBottom: "15px" }}>SCRAP ITEM</h3>

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
            <small>SUBCATEGORY</small>
            <h3>{detail.material_subcategory}</h3>
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
            <small>SCRAP QTY</small>
            <h3>
              {formatNumber(detail.scrap_quantity)} {detail.unit}
            </h3>
          </div>
        </div>
      </div>

      {/* Scrap Attachment */}
      {scrapAttachmentUrl && (
        <>
          <br />
          <br />
          <h3 style={{ fontWeight: "600", marginBottom: "15px" }}>
            ATTACHMENT
          </h3>
          <Button
            componentType="none"
            bgColor="white"
            borderColor="rgba(207, 207, 207, 1)"
            textColor="black"
            style={{
              padding: "7px 20px",
              borderRadius: "50px",
              textTransform: "none",
            }}
          >
            {detail.scrap_reason === "Vendor rejection refused"
              ? "Vendor Rejection Email/Clause"
              : detail.scrap_reason === "Expired"
                ? "Expired Label/Item"
                : detail.scrap_reason === "Damaged beyond repair"
                  ? "Proof of Damage"
                  : "Attachment"}
            <img
              src={downloadIcon}
              alt="download"
              onClick={() =>
                handleDownload(
                  scrapAttachmentUrl,
                  `SCRAP-ATTACHMENT-${qcNumber}`,
                )
              }
            />
          </Button>
        </>
      )}

      {/* Bottom Action Button */}
      {showApproveButton && (
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
