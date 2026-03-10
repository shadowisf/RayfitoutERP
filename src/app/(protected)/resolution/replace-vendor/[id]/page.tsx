"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/_DownloadLPOButton";
import DownloadNCRButton from "../../components/_DownloadNCRButton";
import QCResolutionTimeline from "../../components/QCResolutionTimeline";
import CreateReplaceGRNButton from "../../components/_CreateReplaceGRNButton";
import AddReplaceStockButton from "../../components/_AddReplaceStockButton";
import { toast } from "@/app/components/Toast";
import Link from "next/link";
import FormPopUp from "@/app/components/FormPopup";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import Image from "next/image";

type ReplaceDetail = {
  id: number;
  qc_mr_line_id: number;
  progress_id: number;
  replaced_quantity: number;
  replacement_type: string;
  expected_replacement_date: string | null;
  notes: string | null;
  new_material_name: string | null;
  new_material_category_id: number | null;
  new_material_subcategory_ids: string | null;
  new_category_name: string | null;
  new_subcategory_names: string[];
  replacement_grn_id: number | null;
  replacement_grn: {
    id: number;
    received_date: string;
    received_by: string;
    grn_lines: any[];
  } | null;
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

// Replace progress stages
const REPLACE_STAGES = [
  { id: 1, label: "AWAITING DELIVERY" },
  { id: 2, label: "STOCK ENTRY" },
  { id: 3, label: "COMPLETED" },
];

const STATUS_BADGES: {
  [key: number]: { label: string; bg: string; color: string };
} = {
  1: {
    label: "AWAITING DELIVERY",
    bg: "rgba(255, 250, 189, 1)",
    color: "rgba(134, 83, 47, 1)",
  },
  2: {
    label: "STOCK ENTRY",
    bg: "rgba(255, 250, 189, 1)",
    color: "rgba(134, 83, 47, 1)",
  },
  3: {
    label: "COMPLETED",
    bg: "rgba(87, 244, 176, 1)",
    color: "rgba(31, 101, 71, 1)",
  },
};

export default function ReplaceVendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userInfo } = useAuth();
  const resolutionId = params.id as string;

  const downloadIcon = "/icons/download.svg";
  const swapIcon = "/icons/qc-resolution-two-way-arrow.svg";
  const materialIcon = "/icons/qc-resolution-material.svg";

  const [detail, setDetail] = useState<ReplaceDetail | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hasStock, setHasStock] = useState(false);

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

  async function fetchDetail() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution?id=${resolutionId}&type=replace_vendor`,
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

  // Check if stock exists for this mr_line
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
          resolution_type: "replace_vendor",
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
  const qcNumber = `QC-RV-${String(detail.id).padStart(5, "0")}`;
  const invoiceUrl = parseFileUrl(detail.invoice_file);

  // Determine which submit button to show based on progress and department
  const departmentID = userInfo?.departmentID;
  const showSubmitForStockEntry =
    detail.progress_id === 1 && departmentID === 11; // Storekeeper
  const showSubmitForCompletion =
    detail.progress_id === 2 && departmentID === 11; // Storekeeper

  // Determine replacement material info
  const isApprovedAlternative =
    detail.replacement_type === "Approved alternative";
  const replacementMaterialName = isApprovedAlternative
    ? detail.new_material_name || "-"
    : detail.material_description;
  const replacementCategory = isApprovedAlternative
    ? detail.new_category_name || "-"
    : detail.material_category;
  const replacementSubcategory = isApprovedAlternative
    ? detail.new_subcategory_names && detail.new_subcategory_names.length > 0
      ? detail.new_subcategory_names.join(", ")
      : "-"
    : detail.material_subcategory;

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

          {/* Download buttons + action buttons */}
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

            {invoiceUrl && (
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
                      const response = await fetch(invoiceUrl);
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
                      window.open(invoiceUrl, "_blank");
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

            {/* GRN button at stage 1 (Awaiting Delivery) */}
            {detail.progress_id === 1 && (
              <CreateReplaceGRNButton detail={detail} onRefresh={fetchDetail} />
            )}

            {/* Add Stock button at stage 2 (Stock Entry) */}
            {detail.progress_id === 2 && (
              <AddReplaceStockButton detail={detail} onRefresh={fetchDetail} />
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
            <small>REPLACEMENT TYPE</small>
            <h2>{detail.replacement_type}</h2>
          </div>
          <div>
            <small>EXPECTED REPLACEMENT DATE</small>
            <h2>
              {detail.expected_replacement_date
                ? new Date(detail.expected_replacement_date).toLocaleDateString(
                    "en-GB",
                  )
                : "-"}
            </h2>
          </div>
          <div>
            <small>FAILED QUANTITY</small>
            <h2>
              {detail.failed_quantity} {detail.unit}
            </h2>
          </div>
          <div>
            <small>REPLACED QUANTITY</small>
            <h2>
              {detail.replaced_quantity} {detail.unit}
            </h2>
          </div>
          <div>
            <small>NOTES</small>
            {detail.notes ? (
              <InfoPopUpButton text={detail.notes} header="NOTES" />
            ) : (
              <h2>-</h2>
            )}
          </div>
        </div>
      </div>

      <br />
      <br />

      {/* Requisition Timeline */}
      <QCResolutionTimeline
        resolutionId={detail.id}
        resolutionType="replace_vendor"
        currentProgressId={detail.progress_id}
        stages={REPLACE_STAGES}
      />

      <br />
      <br />

      {/* Two Material Cards with Swap Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          gap: "10px",
        }}
      >
        {/* Original Material Card */}
        <div
          className="mr-with-id"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            height: "300px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                className="approval-pill normal-text"
                style={{
                  backgroundColor: "rgba(255, 250, 189, 1)",
                  color: "rgba(134, 83, 47, 1)",
                }}
              >
                ORIGINAL MATERIAL
              </div>
              <Image
                src={materialIcon}
                alt="material icon"
                width={24}
                height={24}
              />
            </div>

            <br />

            <h3 style={{ fontSize: "20px" }}>
              {detail.material_description.toUpperCase()}
            </h3>
          </div>

          <br />

          <div
            style={{
              display: "flex",
              gap: "40px",
            }}
          >
            <div>
              <small>CATEGORY</small>
              <h3>{detail.material_category}</h3>
            </div>
            <div>
              <small>SUBCATEGORY</small>
              <h3>{detail.material_subcategory}</h3>
            </div>
            <div>
              <small>FAILED QTY</small>
              <h3>
                {formatNumber(detail.failed_quantity)} {detail.unit}
              </h3>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Image src={swapIcon} alt="swap icon" width={150} height={150} />
        </div>

        {/* Replacement Material Card */}
        <div
          className="mr-with-id"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            height: "300px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                className="approval-pill normal-text"
                style={{
                  backgroundColor: "rgba(87, 244, 176, 1)",
                  color: "rgba(31, 101, 71, 1)",
                }}
              >
                REPLACEMENT MATERIAL
              </div>

              <Image
                src={materialIcon}
                alt="material icon"
                width={24}
                height={24}
              />
            </div>

            <br />

            <h3 style={{ fontSize: "20px" }}>
              {replacementMaterialName.toUpperCase()}
            </h3>
          </div>

          <br />

          <div
            style={{
              display: "flex",
              gap: "40px",
            }}
          >
            <div>
              <small>CATEGORY</small>
              <h3>{replacementCategory}</h3>
            </div>
            <div>
              <small>SUBCATEGORY</small>
              <h3>{replacementSubcategory}</h3>
            </div>
            <div>
              <small>REPLACED QTY</small>
              <h3>
                {formatNumber(detail.replaced_quantity)} {detail.unit}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {showSubmitForStockEntry && (
        <div className="bottom-nav">
          <div></div>
          <Button
            componentType="button"
            bgColor={"white"}
            borderColor={"white"}
            textColor={"black"}
            onClick={() => setIsConfirmOpen(true)}
            disabled={!detail.replacement_grn_id}
            style={{
              opacity: !detail.replacement_grn_id ? "0.5" : "1",
              cursor: !detail.replacement_grn_id ? "not-allowed" : "pointer",
              pointerEvents: !detail.replacement_grn_id ? "none" : "auto",
            }}
          >
            SUBMIT FOR STOCK ENTRY
          </Button>
        </div>
      )}

      {showSubmitForCompletion && (
        <div className="bottom-nav">
          <div></div>
          <Button
            componentType="button"
            bgColor={"white"}
            borderColor={"white"}
            textColor={"black"}
            onClick={() => setIsConfirmOpen(true)}
            disabled={!hasStock}
            style={{
              opacity: !hasStock ? "0.5" : "1",
              cursor: !hasStock ? "not-allowed" : "pointer",
              pointerEvents: !hasStock ? "none" : "auto",
            }}
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
