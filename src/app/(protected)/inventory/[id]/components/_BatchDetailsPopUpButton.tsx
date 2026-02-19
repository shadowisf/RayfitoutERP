"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { InventoryItem } from "../../types/inventoryItem";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/components/procurement/_DownloadLPOButton";
import GRNRefPopUp from "@/app/(protected)/mr/[id]/components/storekeeper/_GRNRefPopUp";
import { MrLine } from "@/app/(protected)/mr/[id]/types/mrLine";

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
  item_number?: string; // ✅ Add item_number field
};

type MRBatchDetails = {
  type: "mr";
  // Stock Entry Details
  stock_id: number;
  batch_id: number;
  stock_quantity: number;
  stock_location: string;
  stock_received_by: string;
  entry_date: string;
  reason_for_entry: string | null;
  stock_notes: string | null;

  // Material Request Header
  mr_header_id: number;
  date_requested: string;
  required_date: string;
  requested_by: string;
  purpose: string;
  progress: string;
  department: string;

  // Material Request Line
  mr_line_id: number;
  requested_quantity: number;
  material_description: string;
  material_unit: string;
  material_category: string;
  material_subcategory: string;

  // Project Details
  project_id: number | null;
  project_name: string | null;

  // BOQ Details
  boq_items?: BoqItem[];

  // Supplier Details
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;

  // LPO Details
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

  // GRN Details
  grn_id: number | null;
  grn_date: string | null;
  grn_received_by: string | null;
  received_quantity: number | null;
  grn_notes: string | null;

  // QC Details
  qc_id: number | null;
  qc_checked_by: string | null;
  qc_accepted_quantity: number | null;
  qc_status: string | null;

  // QC Resolution
  qc_resolution_id: number | null;
  resolution_type: string | null;
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

  // Project Details
  project_id: number | null;
  project_name: string | null;

  // BOQ Details
  boq_items?: BoqItem[];

  // Supplier Details
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
  const [boqItemNumbers, setBoqItemNumbers] = useState<string[]>([]); // ✅ Store item numbers

  // Price analytics state
  const [priceAnalytics, setPriceAnalytics] = useState<{
    averagePrice: number;
    currentPrice: number;
    percentageChange: number;
  } | null>(null);

  const externalLinkIcon = "/icons/external-link.svg";
  const downloadIcon = "/icons/download.svg";

  const formatNumber = (value: number | null | undefined): string | number => {
    // Handle null, undefined, or non-numeric values
    if (value === null || value === undefined || isNaN(Number(value))) {
      return "-";
    }

    const num = Number(value);

    // Check if the number has decimal places
    if (num % 1 === 0) {
      // No decimal places, return as integer
      return Math.round(num);
    } else {
      // Has decimal places, format to remove trailing zeros
      return parseFloat(num.toFixed(3));
    }
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

      // Filter stocks for this specific inventory item
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

      // ✅ Fetch BOQ item numbers if boq_items exist
      if (data.boq_items && data.boq_items.length > 0 && data.project_id) {
        fetchBoqItemNumbers(data.project_id, data.boq_items);
      }
    } catch (error) {
      console.error("Error fetching batch details:", error);
    }
  };

  // ✅ Fetch BOQ item numbers using the boq route
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

        // Map boq_line_id to item_number
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
        // Calculate average
        const totalPrice = stocksWithPrice.reduce(
          (sum, stock) => sum + parseFloat(stock.unit_price),
          0,
        );
        const avg = totalPrice / stocksWithPrice.length;

        // Get current price from batch details
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return `AED ${amount.toLocaleString()}`;
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
          padding: "0px 5px",
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
            <Button
              componentType={"link"}
              bgColor={"transparent"}
              borderColor={"transparent"}
              textColor={"black"}
              style={{ padding: "0px", textDecoration: "underline" }}
              href={`/mr/${details.mr_header_id}`}
            >
              MR-{String(details.mr_header_id).padStart(5, "0")}
            </Button>
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
            <small>MATERIAL REQUEST ID</small>
            <h3>
              <Button
                componentType={"link"}
                bgColor={"transparent"}
                borderColor={"transparent"}
                textColor={"black"}
                style={{ padding: "0px", textDecoration: "underline" }}
                href={`/mr/${details.mr_header_id}`}
              >
                MR-{String(details.mr_header_id).padStart(5, "0")}
              </Button>
            </h3>
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
          {/* ✅ Display BOQ item numbers as comma-separated list */}
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
                        href={`/boq/${boqItem?.boq_header_id}`}
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
              <small>LPO ID</small>
              <h3>LPO-{String(details.lpo_id).padStart(5, "0")}</h3>
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
              <small>QUALITY CONTROL STATUS</small>
              <h3>{details.qc_status || "-"}</h3>
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
              <small>NON-COMPLIANCE REPORT ID</small>
              <h3>-</h3>
            </div>
            <div>
              <small>QUALITY CONTROL ID</small>
              <h3>QC-{String(details.qc_id).padStart(5, "0") || "-"}</h3>
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
              gridTemplateColumns: "repeat(2, auto)",
              gap: "25px",
            }}
          >
            <div>
              {details.grn_id && details.mr_line_id && (
                <GRNRefPopUp
                  mrLine={
                    {
                      id: details.mr_line_id,
                      mr_header_id: details.mr_header_id,
                      material_description: details.material_description,
                      quantity: details.requested_quantity,
                      unit: details.material_unit,
                      approved_supplier_name: details.supplier_name || "",
                      approved_supplier_id: details.supplier_id || 0,
                    } as MrLine
                  }
                  bgColor={"rgba(255, 255, 255, 1)"}
                  borderColor={"rgba(207, 207, 207, 1)"}
                  textColor={"black"}
                  style={{ borderRadius: "25px", padding: "7px 20px" }}
                >
                  GRN
                  <img src={externalLinkIcon} alt="external link" />
                </GRNRefPopUp>
              )}
            </div>
            <div>
              {details.invoice_file && details.invoice_file.length > 0 && (
                <Button
                  componentType={"link"}
                  bgColor={"rgba(255, 255, 255, 1)"}
                  borderColor={"rgba(207, 207, 207, 1)"}
                  textColor={"black"}
                  style={{ borderRadius: "25px" }}
                  href={details.invoice_file[0]}
                  target="_blank"
                >
                  INVOICE
                  <img src={downloadIcon} alt="Download" />
                </Button>
              )}
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
              {details.lpo_id && (
                <DownloadLPOButton lpoID={details.lpo_id}>
                  LPO (UNSIGNED)
                  <img src={downloadIcon} alt="Download" />
                </DownloadLPOButton>
              )}
            </div>
            <div>
              {details.lpo_signed_file &&
                details.lpo_signed_file.length > 0 && (
                  <Button
                    componentType={"link"}
                    bgColor={"rgba(255, 255, 255, 1)"}
                    borderColor={"rgba(207, 207, 207, 1)"}
                    textColor={"black"}
                    style={{ borderRadius: "25px" }}
                    href={details.lpo_signed_file[0]}
                    target="_blank"
                  >
                    LPO (SIGNED)
                    <img src={downloadIcon} alt="Download" />
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
    // Helper function to download file
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

        {/* ✅ BOQ DETAILS - Condensed version */}
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
                            href={`/boq/${boqItem?.boq_header_id}`}
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
                {/* GRN Files */}
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

                {/* QC Report Files */}
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

                {/* LPO Files */}
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

                {/* DN Files */}
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
