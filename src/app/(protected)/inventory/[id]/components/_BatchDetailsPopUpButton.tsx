"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { InventoryItem } from "../../types/inventoryItem";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/_DownloadLPOButton";
import DownloadNCRButton from "@/app/(protected)/resolution/components/_DownloadNCRButton";
import DownloadCRButton from "@/app/(protected)/resolution/components/_DownloadCRButton";
import DownloadGRNButton from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/_DownloadGRNButton";

type BatchDetailsPopUpButtonProps = {
  inventoryItem: InventoryItem;
  batchID: number;
};

type BoqItem = {
  boq_line_id: number;
  boq_item_name: string;
  boq_item_description: string;
  boq_quantity: number;
  boq_unit: string;
  boq_rate: number;
  boq_total_cost: number;
  boq_header_id: number;
  boq_project_id: number;
  item_number?: string;
};

type MRBatchDetails = {
  type: "mr";
  stock_id: number;
  batch_id: number;
  stock_quantity: number;
  stock_location: string;
  stock_received_by: string;
  entry_date: string;
  reason_for_entry: string | null;
  stock_notes: string | null;
  mr_header_id: number;
  date_requested: string;
  required_date: string;
  requested_by: string;
  purpose: string;
  progress: string;
  department: string;
  mr_line_id: number;
  requested_quantity: number;
  approved_proposed_quantity: number;
  material_description: string;
  material_unit: string;
  material_category: string;
  material_subcategory: string;
  project_id: number | null;
  project_name: string | null;
  boq_items?: BoqItem[];
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  lpo_id: number | null;
  lpo_code: string | null;
  delivery_date: string | null;
  unit_price: number | null;
  line_total_price: number | null;
  lpo_subtotal: number | null;
  lpo_discount: number | null;
  lpo_vat: number | null;
  lpo_total: number | null;
  payment_status: string | null;
  invoice_file: string[] | null;
  lpo_signed_file: string[] | null;
  payment_file: string[] | null;
  grn_id: number | null;
  grn_date: string | null;
  grn_received_by: string | null;
  received_quantity: number | null;
  grn_notes: string | null;
  qc_id: number | null;
  qc_checked_by: string | null;
  qc_accepted_quantity: number | null;
  qc_status: string | null;
  qc_resolution_id: number | null;
  resolution_type: string | null;
  replacement_grn_id: number | null;
  replacement_grn_date: string | null;
  replacement_grn_received_by: string | null;
  replacement_grn_received_qty: number | null;
  replacement_grn_notes: string | null;
  replacement_grn_attachment: string[] | null;
};

type ManualStockDetails = {
  type: "manual";
  stock_id: number;
  batch_id: number;
  stock_quantity: number;
  stock_location: string;
  stock_received_by: string;
  entry_date: string;
  reason_for_entry: string | null;
  stock_notes: string | null;
  stock_condition: string | null;
  grn_file: string[] | null;
  qc_report_file: string[] | null;
  lpo_file: string[] | null;
  dn_file: string[] | null;
  unit_price: number;
  project_id: number | null;
  project_name: string | null;
  boq_items?: BoqItem[];
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
};

type BatchDetails = MRBatchDetails | ManualStockDetails;

export default function BatchDetailsPopUpButton({
  inventoryItem,
  batchID,
}: BatchDetailsPopUpButtonProps) {
  const arrowUpChartIcon = "/icons/arrow-up-chart.svg";
  const arrowDownChartIcon = "/icons/arrow-down-chart.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [allStocks, setAllStocks] = useState<any[]>([]);
  const [boqItemNumbers, setBoqItemNumbers] = useState<string[]>([]);

  // Price analytics state
  const [priceAnalytics, setPriceAnalytics] = useState<{
    averagePrice: number;
    currentPrice: number;
    percentageChange: number;
  } | null>(null);

  const externalLinkIcon = "/icons/external-link.svg";
  const downloadIcon = "/icons/download.svg";

  // Format number for quantities - no trailing zeros
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return "-";
    }

    const num = Number(value);

    if (Number.isInteger(num)) {
      return num.toString();
    } else {
      return parseFloat(num.toFixed(3)).toString();
    }
  };

  // Format price to exactly 2 decimal places
  const formatPrice = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return "-";
    }
    return Number(value).toFixed(2);
  };

  // Format currency with AED prefix and 2 decimal places
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
      return "-";
    }
    return `AED ${Number(amount).toFixed(2)}`;
  };

  // Fetch all stocks for this inventory item
  const fetchAllStocks = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stocks");
      }

      const data = await response.json();

      const filteredStocks = data.filter(
        (stock: any) => stock.inventory_item_id === inventoryItem.id,
      );

      setAllStocks(filteredStocks);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    }
  };

  const fetchBatchDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getBatchDetailsByInventoryItemID`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inventoryItemId: inventoryItem.id,
            batchId: batchID,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch batch details");
      }

      const data = await response.json();
      setBatchDetails(data);

      if (data.boq_items && data.boq_items.length > 0 && data.project_id) {
        fetchBoqItemNumbers(data.project_id, data.boq_items);
      }
    } catch (error) {
      console.error("Error fetching batch details:", error);
    }
  };

  const fetchBoqItemNumbers = async (
    projectId: number,
    boqItems: BoqItem[],
  ) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqLinesWithNumberRef`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId }),
        },
      );

      if (response.ok) {
        const allBoqLines = await response.json();

        const itemNumbers = boqItems
          .map((boqItem) => {
            const matchingLine = allBoqLines.find(
              (line: any) => line.id === boqItem.boq_line_id,
            );
            return matchingLine?.item_number || null;
          })
          .filter(Boolean);

        setBoqItemNumbers(itemNumbers);
      }
    } catch (error) {
      console.error("Error fetching BOQ item numbers:", error);
    }
  };

  // Calculate price analytics
  useEffect(() => {
    if (batchDetails && allStocks && allStocks.length > 0) {
      const stocksWithPrice = allStocks.filter(
        (stock) => stock.unit_price !== null && stock.unit_price !== undefined,
      );

      if (stocksWithPrice.length > 0) {
        const totalPrice = stocksWithPrice.reduce(
          (sum, stock) => sum + parseFloat(stock.unit_price),
          0,
        );
        const avg = totalPrice / stocksWithPrice.length;

        const currentPrice =
          batchDetails.type === "mr"
            ? parseFloat(batchDetails.unit_price?.toString() || "0")
            : parseFloat(batchDetails.unit_price?.toString() || "0");

        if (currentPrice > 0) {
          const change = ((currentPrice - avg) / avg) * 100;

          setPriceAnalytics({
            averagePrice: avg,
            currentPrice: currentPrice,
            percentageChange: change,
          });
        }
      }
    }
  }, [batchDetails, allStocks]);

  useEffect(() => {
    if (isOpen && !batchDetails) {
      fetchBatchDetails();
      fetchAllStocks();
    }
  }, [isOpen]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";

    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getLeadTime = () => {
    if (
      !batchDetails ||
      batchDetails.type !== "mr" ||
      !batchDetails.date_requested ||
      !batchDetails.delivery_date
    ) {
      return "N/A";
    }

    const requested = new Date(batchDetails.date_requested);
    const delivered = new Date(batchDetails.delivery_date);
    const diffTime = Math.abs(delivered.getTime() - requested.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return `${diffDays} days`;
  };

  // Price Analytics Component
  const renderPriceAnalytics = () => {
    if (!priceAnalytics) return null;

    const isIncrease = priceAnalytics.percentageChange > 0;
    const isDecrease = priceAnalytics.percentageChange < 0;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 10px",
          borderRadius: "20px",
          backgroundColor: isIncrease
            ? "rgba(244, 197, 197, 1)"
            : isDecrease
              ? "rgba(218, 255, 218, 1)"
              : "rgba(239, 239, 239, 1)",
        }}
      >
        <span
          style={{
            color: isIncrease
              ? "rgba(159, 71, 71, 1)"
              : isDecrease
                ? "rgba(0, 108, 60, 1)"
                : "#737373",
          }}
        >
          {isIncrease ? "+" : ""}
          {priceAnalytics.percentageChange.toFixed(0)}%
        </span>

        {isIncrease && (
          <img src={arrowUpChartIcon} width={14} alt="arrow up chart" />
        )}

        {isDecrease && (
          <img src={arrowDownChartIcon} width={14} alt="arrow down chart" />
        )}
      </div>
    );
  };

  // Shared download helper — fetches file as blob and triggers browser download
  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Download failed");
      }

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
      console.error("Error downloading file:", error);
    }
  };

  // Render MR-based stock details
  const renderMRBatchDetails = (details: MRBatchDetails) => (
    <>
      {/* OVERVIEW SECTION */}
      <div
        style={{
          backgroundColor: "rgba(243, 243, 243, 1)",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <h2>OVERVIEW</h2>

        <br />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, max-content)",
            gap: "25px",
            width: "fit-content",
          }}
        >
          <div>
            <small>ENTRY DATE</small>
            <h3>{formatDate(details.entry_date)}</h3>
          </div>
          <div>
            <small>BATCH SOURCE</small>
            <h3>MR-{String(details.mr_header_id).padStart(5, "0")}</h3>
          </div>
          <div>
            <small>PURPOSE</small>
            <h3>{details.purpose || "-"}</h3>
          </div>
          <div>
            <small>PROJECT</small>
            <h3>
              {details.project_name ? (
                <Button
                  componentType={"link"}
                  bgColor={"transparent"}
                  borderColor={"transparent"}
                  textColor={"black"}
                  href={`/project/${details.project_id}`}
                  style={{ padding: "0px", textDecoration: "underline" }}
                >
                  {details.project_name}
                </Button>
              ) : (
                "-"
              )}
            </h3>
          </div>
          <div></div>
          <div>
            <small>LEAD TIME</small>
            <h3>{getLeadTime()}</h3>
          </div>
          <div>
            <small>UNIT PRICE</small>
            <div style={{ display: "flex", gap: "10px" }}>
              <h3>{formatCurrency(details.unit_price)}</h3>
              {renderPriceAnalytics()}
            </div>
          </div>
          <div>
            <small>REQUESTED BY</small>
            <h3>{details.requested_by || "-"}</h3>
          </div>
        </div>
      </div>

      <br />
      <br />

      {/* MATERIAL REQUEST DETAILS SECTION */}
      <div
        style={{
          backgroundColor: "rgba(243, 243, 243, 1)",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <h2>MATERIAL REQUEST DETAILS</h2>
        <br />
        <br />
        <br />
        <br />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, max-content)",
            gap: "25px",
            width: "fit-content",
          }}
        >
          <div>
            <small>MR NUMBER</small>
            <h3>MR-{String(details.mr_header_id).padStart(5, "0")}</h3>
          </div>
          <div>
            <small>PURPOSE</small>
            <h3>{details.purpose || "-"}</h3>
          </div>
          <div>
            <small>PROJECT</small>
            <h3>
              {details.project_name ? (
                <Button
                  componentType={"link"}
                  bgColor={"transparent"}
                  borderColor={"transparent"}
                  textColor={"black"}
                  href={`/project/${details.project_id}`}
                  style={{ padding: "0px", textDecoration: "underline" }}
                >
                  {details.project_name}
                </Button>
              ) : (
                "-"
              )}
            </h3>
          </div>
          {boqItemNumbers.length > 0 && (
            <div>
              <small>BILL OF QUANTITY ITEM(S)</small>
              <h3>
                {boqItemNumbers.map((itemNumber, index) => {
                  const boqItem = details.boq_items?.[index];

                  return (
                    <span key={index}>
                      {index > 0 ? ", " : ""}
                      <Button
                        componentType="link"
                        bgColor="transparent"
                        borderColor="transparent"
                        textColor="black"
                        style={{
                          padding: "0",
                          textDecoration: "underline",
                          display: "inline",
                        }}
                        href={`/project/${boqItem?.boq_project_id}/boq/boq/${boqItem?.boq_header_id}`}
                      >
                        {itemNumber}
                      </Button>
                    </span>
                  );
                })}
              </h3>
            </div>
          )}
          <div>
            <small>REQUESTED BY</small>
            <h3>{details.requested_by || "-"}</h3>
          </div>
        </div>
      </div>

      <br />
      <br />

      {/* GRID OF 4 SECTIONS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, auto)",
          gap: "25px",
        }}
      >
        {/* PURCHASE ORDER & PRICE SIGNAL */}
        <div
          style={{
            backgroundColor: "rgba(243, 243, 243, 1)",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>PURCHASE ORDER & PRICE SIGNAL</h2>
          <br />
          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns: "repeat(2, auto)",
              gap: "25px",
            }}
          >
            <div>
              <small>VENDOR</small>
              <h3>{details.supplier_name || "-"}</h3>
            </div>
          </div>
          <br />
          <br />
          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns: "repeat(2, auto)",
              gap: "25px",
            }}
          >
            <div>
              <small>LPO NUMBER</small>
              <h3>
                <Button
                  componentType={"link"}
                  bgColor={"transparent"}
                  borderColor={"transparent"}
                  textColor={"black"}
                  style={{ padding: "0px", textDecoration: "underline" }}
                  href={`/mr/${details.mr_header_id}/lpo/${details.lpo_id}`}
                >
                  LPO-{String(details.lpo_id).padStart(5, "0")}
                </Button>
              </h3>
            </div>
            <div>
              <small>TOTAL PRICE</small>
              <h3>{formatCurrency(details.lpo_total)}</h3>
            </div>
          </div>
        </div>

        {/* QUALITY & RESOLUTION */}
        <div
          style={{
            backgroundColor: "rgba(243, 243, 243, 1)",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>QUALITY & RESOLUTION</h2>
          <br />
          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns: "repeat(2, auto)",
              gap: "25px",
            }}
          >
            <div>
              <small>QC STATUS</small>
              <h3>{details.qc_status || "PASSED"}</h3>
            </div>
            <div>
              <small>RESOLUTION TYPE</small>
              <h3>{details.resolution_type || "-"}</h3>
            </div>
          </div>
          <br />
          <br />
          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns: "repeat(2, auto)",
              gap: "25px",
            }}
          >
            <div>
              <small>QC NUMBER</small>
              <h3>
                {details.qc_id
                  ? details.resolution_type === "Return/Refund"
                    ? `QC-RR-${String(details.qc_resolution_id).padStart(5, "0")}`
                    : details.resolution_type === "Replace from Vendor"
                      ? `QC-RV-${String(details.qc_resolution_id).padStart(5, "0")}`
                      : details.resolution_type === "Scrap/Discard"
                        ? `QC-SD-${String(details.qc_resolution_id).padStart(5, "0")}`
                        : details.resolution_type === "Accept Conditionally"
                          ? `QC-AC-${String(details.qc_resolution_id).padStart(5, "0")}`
                          : `QC-${String(details.qc_id).padStart(5, "0")}`
                  : "-"}
              </h3>
            </div>
          </div>
        </div>

        {/* STOCK ENTRY DETAILS */}
        <div
          style={{
            backgroundColor: "rgba(243, 243, 243, 1)",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>STOCK ENTRY DETAILS</h2>
          <br />
          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns: "repeat(2, auto)",
              gap: "25px",
            }}
          >
            <div>
              <small>DATE</small>
              <h3>{formatDate(details.entry_date)}</h3>
            </div>
          </div>
          <br />
          <br />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <small>ADDED QUANTITY</small>
              <h3>
                {formatNumber(details.stock_quantity) || "-"}{" "}
                {inventoryItem.unit}
              </h3>
            </div>
            <div>
              <small>STOCK LOCATION</small>
              <h3>{details.stock_location || "-"}</h3>
            </div>
          </div>
        </div>

        {/* DOCUMENTS & ATTACHMENTS */}
        <div
          style={{
            backgroundColor: "rgba(243, 243, 243, 1)",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>DOCUMENTS & ATTACHMENTS</h2>

          <br />

          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns: "repeat(3, auto)",
              gap: "15px",
            }}
          >
            <div>
              {/* For replace resolutions, show replacement GRN download; otherwise show original GRN download */}
              {details.resolution_type === "Replace from Vendor" &&
              details.replacement_grn_id ? (
                <DownloadGRNButton
                  grnId={details.replacement_grn_id}
                  bgColor="rgba(255, 255, 255, 1)"
                  label="Replacement GRN"
                  style={{
                    borderRadius: "25px",
                    padding: "7px 20px",
                    textTransform: "none",
                  }}
                />
              ) : details.grn_id ? (
                <DownloadGRNButton
                  grnId={details.grn_id}
                  bgColor="rgba(255, 255, 255, 1)"
                  label="GRN"
                  style={{
                    borderRadius: "25px",
                    padding: "7px 20px",
                    textTransform: "none",
                  }}
                />
              ) : null}
            </div>
            <div>
              {details.invoice_file && details.invoice_file.length > 0 && (
                <Button
                  componentType={"none"}
                  bgColor={"rgba(255, 255, 255, 1)"}
                  borderColor={"rgba(207, 207, 207, 1)"}
                  textColor={"black"}
                  style={{
                    borderRadius: "25px",
                    padding: "7px 20px",
                    textTransform: "none",
                  }}
                >
                  Invoice
                  <img
                    src={downloadIcon}
                    alt="Download"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      handleDownload(
                        details.invoice_file![0],
                        `Invoice-${String(details.lpo_id).padStart(5, "0")}`,
                      );
                    }}
                  />
                </Button>
              )}
            </div>
            <div>
              {details.qc_id && details.resolution_type && (
                <DownloadNCRButton
                  qcId={details.qc_id}
                  bgColor="white"
                  label="NCR"
                  style={{
                    borderRadius: "25px",
                    padding: "7px 20px",
                    textTransform: "none",
                  }}
                />
              )}
            </div>
            <div>
              {details.qc_id && details.qc_status !== "Failed" && (
                <DownloadCRButton
                  qcId={details.qc_id}
                  bgColor="white"
                  label="CR"
                  style={{
                    borderRadius: "25px",
                    padding: "7px 20px",
                    textTransform: "none",
                  }}
                />
              )}
            </div>
          </div>
          <br />
          <br />
          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns: "repeat(3, auto)",
              gap: "15px",
            }}
          >
            <div>
              {details.lpo_id && (
                <Button
                  componentType={"none"}
                  bgColor={"rgba(255, 255, 255, 1)"}
                  borderColor={"rgba(207, 207, 207, 1)"}
                  textColor={"black"}
                  style={{
                    borderRadius: "25px",
                    padding: "7px 20px",
                    textTransform: "none",
                  }}
                >
                  LPO (Unsigned)
                  <DownloadLPOButton lpoID={details.lpo_id} />
                </Button>
              )}
            </div>
            <div>
              {details.lpo_signed_file &&
                details.lpo_signed_file.length > 0 && (
                  <Button
                    componentType={"none"}
                    bgColor={"rgba(255, 255, 255, 1)"}
                    borderColor={"rgba(207, 207, 207, 1)"}
                    textColor={"black"}
                    style={{
                      borderRadius: "25px",
                      padding: "7px 20px",
                      textTransform: "none",
                    }}
                  >
                    LPO (Signed)
                    <img
                      src={downloadIcon}
                      alt="Download"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        handleDownload(
                          details.lpo_signed_file![0],
                          `LPO-Signed-${String(details.lpo_id).padStart(5, "0")}`,
                        );
                      }}
                    />
                  </Button>
                )}
            </div>
            <div>
              {details.payment_file && details.payment_file.length > 0 && (
                <Button
                  componentType={"none"}
                  bgColor={"rgba(255, 255, 255, 1)"}
                  borderColor={"rgba(207, 207, 207, 1)"}
                  textColor={"black"}
                  style={{
                    borderRadius: "25px",
                    padding: "7px 20px",
                    textTransform: "none",
                  }}
                >
                  Payment Receipt
                  <img
                    src={downloadIcon}
                    alt="Download"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      handleDownload(
                        details.payment_file![0],
                        `Payment-Receipt-${String(details.lpo_id).padStart(5, "0")}`,
                      );
                    }}
                  />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <br />
      <br />

      <div
        style={{
          backgroundColor: "rgba(243, 243, 243, 1)",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <h2>NOTES</h2>
        <br />
        <small>{details.stock_notes || "-"}</small>
      </div>
    </>
  );

  // Render manual stock details
  const renderManualStockDetails = (details: ManualStockDetails) => {
    return (
      <>
        {/* OVERVIEW SECTION */}
        <div
          style={{
            backgroundColor: "rgba(243, 243, 243, 1)",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>OVERVIEW</h2>
          <br />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, max-content)",
              gap: "25px",
              width: "fit-content",
            }}
          >
            <div>
              <small>ENTRY DATE</small>
              <h3>{formatDate(details.entry_date)}</h3>
            </div>
            <div>
              <small>UNIT PRICE</small>
              <div style={{ display: "flex", gap: "10px" }}>
                <h3>{formatCurrency(details.unit_price)}</h3>
                {renderPriceAnalytics()}
              </div>
            </div>
            <div>
              <small>REASON FOR ENTRY</small>
              <h3>{details.reason_for_entry || "-"}</h3>
            </div>
            <div>
              <small>PROJECT</small>
              <h3>
                {details.project_name ? (
                  <Button
                    componentType={"link"}
                    bgColor={"transparent"}
                    borderColor={"transparent"}
                    textColor={"black"}
                    href={`/project/${details.project_id}`}
                    style={{ padding: "0px", textDecoration: "underline" }}
                  >
                    {details.project_name}
                  </Button>
                ) : (
                  "-"
                )}
              </h3>
            </div>
            <div>
              <small>ADDED BY</small>
              <h3>{details.stock_received_by || "-"}</h3>
            </div>
          </div>
        </div>

        <br />
        <br />

        {/* GRID OF 2 SECTIONS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, auto)",
            gap: "25px",
          }}
        >
          {/* SUPPLIER DETAILS */}
          <div
            style={{
              backgroundColor: "rgba(243, 243, 243, 1)",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h2>VENDOR</h2>
            <br />
            <div
              style={{
                display: "inline-grid",
                gridTemplateColumns: "repeat(2, auto)",
                gap: "25px",
              }}
            >
              <div>
                <small>NAME</small>
                <h3>{details.supplier_name || "-"}</h3>
              </div>
            </div>
            <br />
            <br />
            <div
              style={{
                display: "inline-grid",
                gridTemplateColumns: "repeat(2, auto)",
                gap: "25px",
              }}
            >
              <div>
                <small>TOTAL PRICE</small>
                <h3>
                  {details.unit_price * details.stock_quantity
                    ? `${formatCurrency(
                        details.unit_price * details.stock_quantity,
                      )}`
                    : "-"}
                </h3>
              </div>
            </div>
          </div>

          {/* STOCK ENTRY DETAILS */}
          <div
            style={{
              backgroundColor: "rgba(243, 243, 243, 1)",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h2>STOCK ENTRY DETAILS</h2>
            <br />
            <div
              style={{
                display: "inline-grid",
                gridTemplateColumns: "repeat(2, auto)",
                gap: "25px",
              }}
            >
              <div>
                <small>DATE</small>
                <h3>
                  {new Date(details.entry_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </h3>
              </div>
            </div>
            <br />
            <br />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "25px",
              }}
            >
              <div>
                <small>ADDED QUANTITY</small>
                <h3>
                  {formatNumber(details.stock_quantity) || "-"}{" "}
                  {inventoryItem.unit}
                </h3>
              </div>
              <div>
                <small>STOCK LOCATION</small>
                <h3>{details.stock_location || "-"}</h3>
              </div>
            </div>
          </div>
        </div>

        <br />
        <br />

        {/* BOQ DETAILS */}
        {boqItemNumbers.length > 0 && (
          <>
            <div
              style={{
                backgroundColor: "rgba(243, 243, 243, 1)",
                padding: "20px",
                borderRadius: "10px",
              }}
            >
              <h2>PROJECT DETAILS</h2>
              <br />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, auto)",
                  gap: "25px",
                  width: "fit-content",
                }}
              >
                <div>
                  <small>PROJECT</small>
                  <h3>
                    {details.project_name ? (
                      <Button
                        componentType={"link"}
                        bgColor={"transparent"}
                        borderColor={"transparent"}
                        textColor={"black"}
                        href={`/project/${details.project_id}`}
                        style={{ padding: "0px", textDecoration: "underline" }}
                      >
                        {details.project_name}
                      </Button>
                    ) : (
                      "-"
                    )}
                  </h3>
                </div>
                <div>
                  <small>BILL OF QUANTITY ITEM(S)</small>
                  <h3>
                    {boqItemNumbers.map((itemNumber, index) => {
                      const boqItem = details.boq_items?.[index];

                      return (
                        <span key={index}>
                          {index > 0 ? ", " : ""}
                          <Button
                            componentType="link"
                            bgColor="transparent"
                            borderColor="transparent"
                            textColor="black"
                            style={{
                              padding: "0",
                              textDecoration: "underline",
                              display: "inline",
                            }}
                            href={`/project/${details.project_id}/boq/${boqItem?.boq_header_id}`}
                          >
                            {itemNumber}
                          </Button>
                        </span>
                      );
                    })}
                  </h3>
                </div>
              </div>
            </div>
            <br />
            <br />
          </>
        )}

        {/* ATTACHMENTS */}
        {((details.grn_file && details.grn_file.length > 0) ||
          (details.qc_report_file && details.qc_report_file.length > 0) ||
          (details.lpo_file && details.lpo_file.length > 0) ||
          (details.dn_file && details.dn_file.length > 0)) && (
          <>
            <div
              style={{
                backgroundColor: "rgba(243, 243, 243, 1)",
                padding: "20px",
                borderRadius: "10px",
              }}
            >
              <h2>ATTACHMENTS</h2>
              <br />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, auto)",
                  gap: "15px",
                }}
              >
                {details.grn_file &&
                  details.grn_file.map((url, index) => (
                    <Button
                      key={`grn-${index}`}
                      componentType={"none"}
                      bgColor={"rgba(255, 255, 255, 1)"}
                      borderColor={"rgba(207, 207, 207, 1)"}
                      textColor={"black"}
                      style={{ borderRadius: "25px", padding: "7px 20px" }}
                    >
                      GRN
                      <img
                        src={downloadIcon}
                        alt="Download"
                        onClick={() =>
                          handleDownload(
                            url,
                            `GRN-${String(details.stock_id).padStart(5, "0")}`,
                          )
                        }
                      />
                    </Button>
                  ))}

                {details.qc_report_file &&
                  details.qc_report_file.map((url, index) => (
                    <Button
                      key={`qc-${index}`}
                      componentType={"none"}
                      bgColor={"rgba(255, 255, 255, 1)"}
                      borderColor={"rgba(207, 207, 207, 1)"}
                      textColor={"black"}
                      style={{ borderRadius: "25px", padding: "7px 20px" }}
                    >
                      QC REPORT
                      <img
                        src={downloadIcon}
                        alt="Download"
                        onClick={() =>
                          handleDownload(
                            url,
                            `QC-Report-${String(details.stock_id).padStart(
                              5,
                              "0",
                            )}`,
                          )
                        }
                      />
                    </Button>
                  ))}

                {details.lpo_file &&
                  details.lpo_file.map((url, index) => (
                    <Button
                      key={`lpo-${index}`}
                      componentType={"none"}
                      bgColor={"rgba(255, 255, 255, 1)"}
                      borderColor={"rgba(207, 207, 207, 1)"}
                      textColor={"black"}
                      style={{ borderRadius: "25px", padding: "7px 20px" }}
                    >
                      LPO
                      <img
                        src={downloadIcon}
                        alt="Download"
                        onClick={() =>
                          handleDownload(
                            url,
                            `LPO-${String(details.stock_id).padStart(5, "0")}`,
                          )
                        }
                      />
                    </Button>
                  ))}

                {details.dn_file &&
                  details.dn_file.map((url, index) => (
                    <Button
                      key={`dn-${index}`}
                      componentType={"none"}
                      bgColor={"rgba(255, 255, 255, 1)"}
                      borderColor={"rgba(207, 207, 207, 1)"}
                      textColor={"black"}
                      style={{ borderRadius: "25px", padding: "7px 20px" }}
                    >
                      DN
                      <img
                        src={downloadIcon}
                        alt="Download"
                        onClick={() =>
                          handleDownload(
                            url,
                            `DN-${String(details.stock_id).padStart(5, "0")}`,
                          )
                        }
                      />
                    </Button>
                  ))}
              </div>
            </div>
            <br />
            <br />
          </>
        )}

        {/* NOTES */}
        {details.stock_notes && (
          <div
            style={{
              backgroundColor: "rgba(243, 243, 243, 1)",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h2>NOTES</h2>
            <br />
            <small>{details.stock_notes}</small>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="batch details" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={
            batchDetails?.type === "mr" ? (
              "TRANSACTION DETAILS"
            ) : (
              <div
                style={{ display: "flex", gap: "25px", alignItems: "center" }}
              >
                TRANSACTION DETAILS{" "}
                <h6
                  style={{
                    backgroundColor: "black",
                    color: "white",
                    padding: "7px 20px",
                    borderRadius: "25px",
                  }}
                >
                  MANUAL STOCK ENTRY
                </h6>
              </div>
            )
          }
          setIsOpen={setIsOpen}
          style={{ textTransform: "uppercase" }}
        >
          <>
            {batchDetails?.type === "mr"
              ? renderMRBatchDetails(batchDetails)
              : batchDetails?.type === "manual"
                ? renderManualStockDetails(batchDetails)
                : null}
          </>
        </FormPopUp>
      )}
    </>
  );
}
