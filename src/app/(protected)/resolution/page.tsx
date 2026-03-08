"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/_DownloadLPOButton";
import BoqReferencePopUp from "../mr/[id]/components/BoqReferencePopUp";
import { MrLine } from "../mr/[id]/types/mrLine";
import { MrHeader } from "../mr/[id]/types/mrHeader";
import CreateResolutionButton from "./components/_CreateResolutionButton";
import DownloadNCRButton from "./components/_DownloadNCRButton";

type FailedQCItem = {
  qc_id: number;
  lpo_mr_line_id: number;
  lpo_id: number;
  mr_line_id: number;
  mr_header_id: number;
  project_id: number;
  material_category: string;
  material_subcategory: string;
  material_description: string;
  boq_line_ids: string | null;
  unit: string;
  received_quantity: number;
  accepted_quantity: number;
  failed_quantity: number;
  lpo_table_id: number;
  invoice_file: any;
  unit_price: number;
  supplier_name: string;
  checked_by: string;
};

type ResolutionItem = {
  id: number;
  qc_mr_line_id: number;
  progress_id: number;
  resolution_type: string;
  material_description: string;
  failed_quantity: number;
  supplier_name: string;
  created_at: string;
};

// QC Number prefix by resolution type
const QC_PREFIXES: { [key: string]: string } = {
  return_refund: "QC-RR",
  scrap_discard: "QC-SD",
  replace_vendor: "QC-RV",
  accept_conditionally: "QC-AC",
  missing_quantity: "QC-MQ",
};

// Resolution type groups for kanban
const RESOLUTION_GROUPS = [
  {
    name: "Return/Refund",
    type: "return_refund",
    prefix: "QC-RR",
    stages: [
      { name: "Refund Confirmation", progress_id: 1, dept: "Finance" },
      { name: "Verification", progress_id: 2, dept: "Storekeeper" },
      { name: "Completed", progress_id: 3, dept: null },
    ],
    route: "return-refund",
  },
  {
    name: "Scrap/Discard",
    type: "scrap_discard",
    prefix: "QC-SD",
    stages: [{ name: "Pending", progress_id: 1, dept: null }],
    route: "scrap-discard",
  },
  {
    name: "Replace from Vendor",
    type: "replace_vendor",
    prefix: "QC-RV",
    stages: [
      { name: "Awaiting Delivery", progress_id: 1, dept: "Storekeeper" },
      { name: "Stock Entry", progress_id: 2, dept: "Storekeeper" },
      { name: "Completed", progress_id: 3, dept: null },
    ],
    route: "replace-vendor",
  },
  {
    name: "Accept Conditionally",
    type: "accept_conditionally",
    prefix: "QC-AC",
    stages: [{ name: "Pending", progress_id: 1, dept: null }],
    route: "accept-conditionally",
  },
  {
    name: "Missing Quantity",
    type: "missing_quantity",
    prefix: "QC-MQ",
    stages: [{ name: "Pending", progress_id: 1, dept: null }],
    route: "missing-quantity",
  },
];

// Department badge styles
const getDeptStyle = (dept: string | null) => {
  switch (dept) {
    case "Finance":
      return {
        backgroundColor: "rgba(187, 247, 208, 1)",
        color: "rgba(3, 130, 46, 1)",
      };
    case "Storekeeper":
      return {
        backgroundColor: "rgba(143, 236, 255, 1)",
        color: "rgba(21, 104, 120, 1)",
      };
    default:
      return { backgroundColor: "rgba(228, 228, 228, 1)", color: "black" };
  }
};

export default function ResolutionCenter() {
  const { userInfo } = useAuth();
  const searchParams = useSearchParams();

  const downloadIcon = "/icons/download.svg";

  const [activeTab, setActiveTab] = useState<"failed-qc" | "tracker">(
    searchParams.get("tab") === "tracker" ? "tracker" : "failed-qc",
  );
  const [failedQCItems, setFailedQCItems] = useState<FailedQCItem[]>([]);
  const [resolutionItems, setResolutionItems] = useState<ResolutionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrackerLoading, setIsTrackerLoading] = useState(false);

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

  async function fetchFailedQCItems() {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getFailedQCItems`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFailedQCItems(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching failed QC items:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchFailedQCItems();
  }, []);

  useEffect(() => {
    if (activeTab !== "tracker") return;

    async function fetchResolutionItems() {
      setIsTrackerLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setResolutionItems(data.data);
          }
        }
      } catch (error) {
        console.error("Error fetching resolution items:", error);
      } finally {
        setIsTrackerLoading(false);
      }
    }

    fetchResolutionItems();
  }, [activeTab]);

  // Get cards for a specific resolution type and progress stage
  function getCardsForStage(type: string, progressId: number) {
    return resolutionItems.filter(
      (item) =>
        item.resolution_type === type && item.progress_id === progressId,
    );
  }

  // Get total count for a resolution type group
  function getGroupCount(type: string) {
    return resolutionItems.filter((item) => item.resolution_type === type)
      .length;
  }

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>RESOLUTION CENTER</h1>
      </div>

      <br />

      <div className="category-grid">
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            componentType={"button"}
            bgColor={activeTab === "failed-qc" ? "black" : "transparent"}
            borderColor={"black"}
            textColor={activeTab === "failed-qc" ? "white" : "black"}
            onClick={() => setActiveTab("failed-qc")}
            style={{
              padding: "7px 20px",
              borderRadius: "25px",
            }}
          >
            FAILED QC
          </Button>
          <Button
            componentType={"button"}
            bgColor={activeTab === "tracker" ? "black" : "transparent"}
            borderColor={"black"}
            textColor={activeTab === "tracker" ? "white" : "black"}
            onClick={() => setActiveTab("tracker")}
            style={{
              padding: "7px 20px",
              borderRadius: "25px",
            }}
          >
            RESOLUTION TRACKER
          </Button>
        </div>
      </div>

      <br />
      <br />

      {/* ===== FAILED QC TAB ===== */}
      {activeTab === "failed-qc" && (
        <>
          {isLoading ? (
            <p>Loading...</p>
          ) : failedQCItems.length === 0 ? (
            <p style={{ color: "gray" }}>No failed QC items found.</p>
          ) : (
            <table className="items-table two-toned">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CATEGORY</th>
                  <th>SUBCATEGORY</th>
                  <th>ITEM</th>
                  <th>BOQ REF.</th>
                  <th>RECEIVED QTY</th>
                  <th>FAILED QTY</th>
                  <th>LPO</th>
                  <th>INVOICE</th>
                  <th>NCR</th>
                  <th>RESOLUTION</th>
                </tr>
              </thead>
              <tbody>
                {failedQCItems.map((item, index) => (
                  <tr key={item.qc_id}>
                    <td>{index + 1}</td>
                    <td>{item.material_category}</td>
                    <td>{item.material_subcategory}</td>
                    <td>{item.material_description}</td>
                    <td>
                      {item.boq_line_ids ? (
                        <BoqReferencePopUp
                          mrHeader={
                            {
                              project_id: item.project_id,
                            } as MrHeader
                          }
                          item={
                            {
                              boq_line_ids: item.boq_line_ids,
                            } as MrLine
                          }
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {formatNumber(item.received_quantity)} {item.unit}
                    </td>
                    <td>
                      {formatNumber(item.failed_quantity)} {item.unit}
                    </td>
                    <td>
                      <DownloadLPOButton
                        lpoID={item.lpo_id}
                        style={{ padding: "7px 7px" }}
                      >
                        <img src={downloadIcon} alt="download" />
                      </DownloadLPOButton>
                    </td>
                    <td>
                      {parseFileUrl(item.invoice_file) ? (
                        <Button
                          componentType={"button"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ padding: "7px 7px" }}
                          onClick={async () => {
                            const url = parseFileUrl(item.invoice_file)!;
                            try {
                              const response = await fetch(url);
                              const blob = await response.blob();
                              const blobUrl = window.URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = blobUrl;
                              link.download = `INVOICE-${String(item.lpo_id).padStart(5, "0")}`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(blobUrl);
                            } catch (error) {
                              console.error("Download failed:", error);
                              window.open(url, "_blank");
                            }
                          }}
                        >
                          <img src={downloadIcon} alt="download" />
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <DownloadNCRButton qcId={item.qc_id}>
                        <img src={downloadIcon} alt="download" />
                      </DownloadNCRButton>
                    </td>
                    <td>
                      <CreateResolutionButton
                        item={item}
                        onSuccess={() => fetchFailedQCItems()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ===== RESOLUTION TRACKER TAB ===== */}
      {activeTab === "tracker" && (
        <>
          {isTrackerLoading ? (
            <p>Loading...</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "40px",
              }}
            >
              {RESOLUTION_GROUPS.map((group) => {
                const totalCount = getGroupCount(group.type);

                return (
                  <div key={group.type}>
                    {/* Group Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        marginBottom: "20px",
                      }}
                    >
                      <h2 style={{ margin: 0 }}>{group.name}</h2>
                      <div
                        style={{
                          backgroundColor: "black",
                          color: "white",
                          borderRadius: "50px",
                          padding: "3px 8px",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        {totalCount} Items
                      </div>
                    </div>

                    {/* Stage Columns */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${group.stages.length}, 1fr)`,
                        gap: "20px",
                      }}
                    >
                      {group.stages.map((stage) => {
                        const cards = getCardsForStage(
                          group.type,
                          stage.progress_id,
                        );
                        const isEmpty = cards.length === 0;
                        const deptStyle = getDeptStyle(stage.dept);

                        return (
                          <div
                            key={stage.name}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              backgroundColor: isEmpty
                                ? "rgba(242, 242, 242, 1)"
                                : "transparent",
                              borderRadius: "15px",
                              minHeight: "660px",
                            }}
                          >
                            {/* Stage Header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "10px",
                                padding: "15px",
                                borderRadius: "50px",
                                backgroundColor: isEmpty
                                  ? "rgba(242, 242, 242, 1)"
                                  : "white",
                                border: isEmpty
                                  ? "none"
                                  : "1px solid rgba(231, 231, 231, 1)",
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: "14px",
                                  fontWeight: "600",
                                }}
                              >
                                {stage.name}
                              </h3>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                {stage.dept && !isEmpty && (
                                  <div
                                    style={{
                                      ...deptStyle,
                                      padding: "7px 10px",
                                      borderRadius: "50px",
                                      fontSize: "10px",
                                      fontWeight: "600",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <span style={{ scale: "3" }}>•</span>
                                    {stage.dept.toUpperCase()}
                                  </div>
                                )}
                                <div
                                  style={{
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    padding: "6px",
                                    minWidth: "32px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "50%",
                                    backgroundColor: isEmpty
                                      ? "white"
                                      : "black",
                                    color: isEmpty ? "black" : "white",
                                  }}
                                >
                                  {cards.length}
                                </div>
                              </div>
                            </div>

                            {/* Cards */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "15px",
                                overflowY: "auto",
                                maxHeight: "660px",
                                paddingRight: "5px",
                                marginTop: "15px",
                              }}
                            >
                              {cards.map((card) => (
                                <div
                                  key={`${card.resolution_type}-${card.id}`}
                                  style={{
                                    backgroundColor: "white",
                                    borderRadius: "15px",
                                    padding: "15px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px",
                                    border: "1px solid rgba(231, 231, 231, 1)",
                                  }}
                                >
                                  <div
                                    style={{
                                      backgroundColor: "black",
                                      color: "white",
                                      padding: "4px 10px",
                                      borderRadius: "50px",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      width: "fit-content",
                                    }}
                                  >
                                    {group.name.toUpperCase()}
                                  </div>

                                  <div>
                                    <small>QC NUMBER</small>
                                    <h3>
                                      {group.prefix}-
                                      {String(card.id).padStart(5, "0")}
                                    </h3>
                                  </div>

                                  <div>
                                    <small>ITEM NAME</small>
                                    <h3>{card.material_description}</h3>
                                  </div>

                                  <div>
                                    <small>FAILED QTY</small>
                                    <h3>{card.failed_quantity}</h3>
                                  </div>

                                  <div>
                                    <small>VENDOR</small>
                                    <h3>{card.supplier_name}</h3>
                                  </div>

                                  <Button
                                    componentType="link"
                                    bgColor="rgba(239, 239, 239, 1)"
                                    borderColor="rgba(239, 239, 239, 1)"
                                    textColor="black"
                                    style={{ borderRadius: "50px" }}
                                    href={`/resolution/${group.route}/${card.id}`}
                                    full
                                  >
                                    VIEW &gt;
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
