"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import { LpoHeader } from "../../types/lpoHeader";
import ViewLPOButton from "./_ViewLPOButton";
import UploadInvoiceButton from "./_UploadInvoiceButton";
import UploadSignedLPOButton from "./_UploadSignedLPOButton";
import { formatPrice, formatPriceAED } from "@/lib/formatPrice";

type IssueLPOButtonProps = {
  mrHeader: MrHeader;
  mrLines: MrLine[];
};

export default function IssueLPOButton({
  mrHeader,
  mrLines,
}: IssueLPOButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const warningIcon = "/icons/warning.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);
  const [existingLpoData, setExistingLpoData] = useState<any>(null);

  // Invoice file states
  const [invoiceFiles, setInvoiceFiles] = useState<string[]>([]);

  // Signed LPO file states
  const [signedLpoFiles, setSignedLpoFiles] = useState<string[]>([]);

  const [quotation, setQuotation] = useState("");
  const [supplierContactPersonName, setSupplierContactPersonName] = useState(
    mrLines[0].approved_supplier_contact_person,
  );
  const [supplierEmail, setSupplierEmail] = useState(
    mrLines[0].approved_supplier_email,
  );
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(
    "Net 30 Days via Bank Transfer / Cheque",
  );
  const [deliveryTerms, setDeliveryTerms] =
    useState(`• Delivery will be made to Street 34, Al Qusais 5, Dubai, UAE
• Any deviations or damages will be responsibility of the supplier which he/she will rectify without any additional charges`);
  const [discount, setDiscount] = useState("0");
  const [vatRate, setVatRate] = useState("5");
  const [shippingHandling, setShippingHandling] = useState("0");

  const [unitPrices, setUnitPrices] = useState<{ [key: number]: string }>({});
  const [totalPrices, setTotalPrices] = useState<{ [key: number]: string }>({});

  const subtotal = Object.values(totalPrices).reduce(
    (sum, price) => sum + parseFloat(price || "0"),
    0,
  );
  const discountRate = parseFloat(discount || "0");
  const discountAmount = subtotal * (discountRate / 100);
  const amountAfterDiscount = subtotal - discountAmount;
  const vatAmount = (amountAfterDiscount * parseFloat(vatRate || "0")) / 100;
  const shAmount = parseFloat(shippingHandling || "0");
  const total = amountAfterDiscount + vatAmount + shAmount;

  // Check for existing LPO on component mount and when mrLines change
  useEffect(() => {
    if (mrLines.length > 0 && mrLines[0]?.approved_supplier_id) {
      checkExistingLpo();
    }
  }, [mrHeader.id, mrLines]);

  // Add this useEffect after the existing useEffect hooks
  useEffect(() => {
    // Check if supplier type is marketplace/online and set VAT to 0
    const supplierType =
      mrLines[0]?.approved_supplier_type?.toLowerCase() || "";

    if (
      supplierType.includes("marketplace") ||
      supplierType.includes("online")
    ) {
      setVatRate("0");
    } else {
      // Set default VAT rate for non-marketplace suppliers
      setVatRate("5");
    }
  }, [mrLines]);

  // Helper function to format number without trailing zeros
  const formatNumberWithoutTrailingZeros = (value: number | string): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) {
      return num.toString();
    }
    return parseFloat(num.toFixed(3)).toString();
  };

  // Helper function to format to 2 decimal places (for initial load only)
  const formatToTwoDecimals = (value: number | string): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toFixed(2);
  };

  // Helper function to format S&H, discount, VAT rate without trailing zeros
  const formatFieldValue = (value: number | string): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) {
      return num.toString();
    }
    // Remove trailing zeros for display
    return parseFloat(num.toFixed(3)).toString();
  };

  useEffect(() => {
    // If we have existing LPO data, use it; otherwise use mrLines data
    if (existingLpoData && existingLpoData.lpo_mr_lines) {
      const initialUnitPrices: { [key: number]: string } = {};
      const initialTotalPrices: { [key: number]: string } = {};

      mrLines.forEach((mrLine, index) => {
        // Find matching LPO line
        const lpoLine = existingLpoData.lpo_mr_lines.find(
          (line: any) => line.mr_line_id === mrLine.id,
        );

        if (lpoLine) {
          // Use existing LPO values, formatted to 2 decimals for initial display
          initialUnitPrices[index] = formatToTwoDecimals(
            lpoLine.unit_price || "0",
          );
          initialTotalPrices[index] = formatToTwoDecimals(
            lpoLine.total_price || "0",
          );
        } else {
          // Fallback to mrLine data
          initialUnitPrices[index] = formatToTwoDecimals(
            mrLine.approved_unit_price || "",
          );

          const proposedQty = Number(mrLine.approved_proposed_quantity) || 0;
          const quantity = proposedQty > 0 ? proposedQty : mrLine.quantity;
          const unitPrice = parseFloat(
            mrLine.approved_unit_price?.toString() || "0",
          );
          const total = quantity * unitPrice;
          initialTotalPrices[index] = total.toFixed(2);
        }
      });

      setUnitPrices(initialUnitPrices);
      setTotalPrices(initialTotalPrices);

      // Also set other LPO fields with proper formatting
      setQuotation(existingLpoData.quotation_code || "");
      setSupplierContactPersonName(
        existingLpoData.supplier_contact_person_name ||
          mrLines[0].approved_supplier_contact_person,
      );
      setSupplierEmail(
        existingLpoData.supplier_email || mrLines[0].approved_supplier_email,
      );
      setDeliveryDate(
        existingLpoData.delivery_date
          ? existingLpoData.delivery_date.split("T")[0]
          : "",
      );
      setPaymentTerms(
        existingLpoData.payment_terms ||
          "Net 30 Days via Bank Transfer / Cheque",
      );
      setDeliveryTerms(
        existingLpoData.delivery_terms ||
          `• Delivery will be made to Street 34, Al Qusais 5, Dubai, UAE\n• Any deviations or damages will be responsibility of the supplier which he/she will rectify without any additional charges`,
      );

      // Format these fields without trailing zeros
      setDiscount(formatFieldValue(existingLpoData.discount || "0"));
      setVatRate(formatFieldValue(existingLpoData.vat_rate || "5"));
      setShippingHandling(
        formatFieldValue(existingLpoData.shipping_and_handling || "0"),
      );
    } else {
      // No existing LPO data, use mrLines data
      const initialUnitPrices: { [key: number]: string } = {};
      const initialTotalPrices: { [key: number]: string } = {};

      mrLines.forEach((mrLine, index) => {
        initialUnitPrices[index] = formatToTwoDecimals(
          mrLine.approved_unit_price || "",
        );

        const proposedQty = Number(mrLine.approved_proposed_quantity) || 0;
        const quantity = proposedQty > 0 ? proposedQty : mrLine.quantity;
        const unitPrice = parseFloat(
          mrLine.approved_unit_price?.toString() || "0",
        );
        const total = quantity * unitPrice;

        initialTotalPrices[index] = total.toFixed(2);
      });

      setUnitPrices(initialUnitPrices);
      setTotalPrices(initialTotalPrices);
    }
  }, [mrLines, existingLpoData]);

  async function checkExistingLpo() {
    try {
      const supplierId = mrLines[0]?.approved_supplier_id;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
          }),
        },
      );
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const lpoData: LpoHeader = data.data[0];

        setExistingLpoId(lpoData.id);

        // Fetch full LPO details including lpo_mr_lines
        const detailsRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoData.id }),
          },
        );

        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          if (detailsData.success) {
            setExistingLpoData(detailsData.data);
          }
        }

        // Load existing invoice files
        if (lpoData.invoice_file) {
          try {
            const parsedFiles =
              typeof lpoData.invoice_file === "string"
                ? JSON.parse(lpoData.invoice_file)
                : lpoData.invoice_file;
            setInvoiceFiles(Array.isArray(parsedFiles) ? parsedFiles : []);
          } catch (error) {
            console.error("Error parsing invoice files:", error);
            setInvoiceFiles([]);
          }
        }

        // Load existing signed LPO files
        if (lpoData.signed_file) {
          try {
            const parsedFiles =
              typeof lpoData.signed_file === "string"
                ? JSON.parse(lpoData.signed_file)
                : lpoData.signed_file;
            setSignedLpoFiles(Array.isArray(parsedFiles) ? parsedFiles : []);
          } catch (error) {
            console.error("Error parsing signed LPO files:", error);
            setSignedLpoFiles([]);
          }
        }
      } else {
        setExistingLpoId(null);
        setExistingLpoData(null);
        setInvoiceFiles([]);
        setSignedLpoFiles([]);
      }
    } catch (error) {
      console.error("Error checking for existing LPO:", error);
    }
  }

  const isValidNumber = (value: string): boolean => {
    if (value === "" || value === null) return true;
    return /^\d*\.?\d*$/.test(value);
  };

  const handleUnitPriceChange = (index: number, value: string) => {
    if (!isValidNumber(value)) return;

    // Store raw value while typing — no reformatting, no timeout replacement
    setUnitPrices((prev) => ({ ...prev, [index]: value }));

    // Recalculate total live
    const proposedQty = Number(mrLines[index].approved_proposed_quantity) || 0;
    const quantity = proposedQty > 0 ? proposedQty : mrLines[index].quantity;
    const unitPrice = parseFloat(value) || 0;
    const total = quantity * unitPrice;

    setTotalPrices((prev) => ({
      ...prev,
      [index]: total.toFixed(2),
    }));
  };

  const handleVatRateChange = (value: string) => {
    if (!isValidNumber(value)) return;
    setVatRate(value);
  };

  const handleDiscountChange = (value: string) => {
    if (!isValidNumber(value)) return;
    setDiscount(value);
  };

  const handleShippingChange = (value: string) => {
    if (!isValidNumber(value)) return;
    setShippingHandling(value);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const lpoMrLines = mrLines.map((mrLine, index) => ({
      mr_line_id: mrLine.id,
      unit_price: parseFloat(unitPrices[index] || "0"),
      total_price: parseFloat(totalPrices[index] || "0"),
    }));

    const action = existingLpoId ? "updateLPO" : "createLPO";
    const lpoIdParam = existingLpoId ? { lpo_id: existingLpoId } : {};

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...lpoIdParam,
        project_id: mrHeader.project_id,
        mr_header_id: mrHeader.id,
        supplier_id: mrLines[0].approved_supplier_id,
        quotation_code: quotation,
        supplier_contact_person_name: supplierContactPersonName,
        supplier_email: supplierEmail,
        delivery_date: deliveryDate,
        payment_terms: paymentTerms,
        delivery_terms: deliveryTerms,
        subtotal,
        discount: parseFloat(discount || "0"),
        vat_rate: parseFloat(vatRate || "0"),
        vat: vatAmount,
        shipping_and_handling: parseFloat(shippingHandling || "0"),
        total,
        lpo_mr_lines: lpoMrLines,
      }),
    });

    if (res.ok) {
      toast(
        `Local purchase order ${existingLpoId ? "updated" : "created"} for ${mrLines[0].approved_supplier_name}`,
        "success",
      );
      setIsOpen(false);
      await checkExistingLpo();
      router.refresh();
    } else {
      toast(
        `Failed to ${existingLpoId ? "update" : "create"} local purchase order`,
        "error",
      );
    }
  }

  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };

  if (existingLpoId && !isOpen) {
    const supplierId = mrLines[0]?.approved_supplier_id;
    const supplierType = mrLines[0]?.approved_supplier_type;
    const canDelete =
      userInfo?.departmentID === 9 &&
      (mrHeader.progress_id === 12 ||
        mrHeader.progress_id === 13 ||
        mrHeader.progress_id === 16);

    // ✅ Check supplier type to determine which buttons to show
    const supplierTypeLower = supplierType?.toLowerCase() || "";
    const isCredit = supplierTypeLower.includes("credit");
    const isMarketplace =
      supplierTypeLower.includes("marketplace") ||
      supplierTypeLower.includes("online");

    return (
      <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
        <ViewLPOButton
          lpoID={existingLpoId}
          mrHeader={mrHeader}
          onRefresh={() => checkExistingLpo()}
        />

        {/* ✅ Only show Upload Signed LPO for Cash/Local suppliers (NOT credit, NOT marketplace) */}
        {!isCredit &&
          !isMarketplace &&
          (userInfo?.departmentID === 9 ||
            userInfo?.departmentID === 8 ||
            userInfo?.departmentID === 10) && (
            <UploadSignedLPOButton
              mrHeader={mrHeader}
              mrLine={mrLines[0]}
              LpoID={existingLpoId}
              supplierId={supplierId}
              supplierType={supplierType}
              signedLpoFiles={signedLpoFiles}
              onFilesUpdate={setSignedLpoFiles}
              canDelete={canDelete}
            />
          )}

        {/* ✅ Only show Upload Invoice for Cash/Local and Marketplace (NOT credit) */}
        {!isCredit &&
          (userInfo?.departmentID === 9 ||
            userInfo?.departmentID === 8 ||
            userInfo?.departmentID === 10) && (
            <UploadInvoiceButton
              mrHeader={mrHeader}
              mrLine={mrLines[0]}
              LpoID={existingLpoId}
              supplierId={supplierId}
              invoiceFiles={invoiceFiles}
              onFilesUpdate={setInvoiceFiles}
              canDelete={canDelete}
            />
          )}
      </div>
    );
  }

  // Show "Issue LPO" button or Edit form
  return (
    <>
      {!existingLpoId &&
        userInfo?.departmentID === 9 &&
        mrHeader.progress_id === 12 && (
          <Button
            componentType={"button"}
            bgColor="black"
            borderColor="black"
            textColor="white"
            onClick={() => setIsOpen(true)}
            style={{ padding: "7px 20px", borderRadius: "25px" }}
          >
            Issue LPO +
          </Button>
        )}

      {isOpen && (
        <FormPopUp
          header={
            existingLpoId
              ? "UPDATE LOCAL PURCHASE ORDER"
              : "CREATE LOCAL PURCHASE ORDER"
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ width: "1000px" }}
        >
          <div className="input-row three-col">
            <InputItem
              label={"VENDOR NAME"}
              value={mrLines[0].approved_supplier_name}
              type={"text"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"VENDOR ADDRESS"}
              value={mrLines[0].approved_supplier_address || "-"}
              type={"text"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"QUOTATION REFERENCE"}
              value={quotation}
              type={"text"}
              placeholder={"ENTER QUOTATION REFERENCE"}
              required
              onChange={(e) => setQuotation(e.target.value)}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"VENDOR CONTACT PERSON NAME"}
              value={supplierContactPersonName}
              type={"text"}
              required
              onChange={(e) => setSupplierContactPersonName(e.target.value)}
            />
            <InputItem
              label={"VENDOR EMAIL"}
              value={supplierEmail}
              type={"text"}
              required
              onChange={(e) => setSupplierEmail(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"DELIVERY DATE"}
              value={deliveryDate}
              type={"date"}
              placeholder={"ENTER DELIVERY DATE"}
              required
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          {mrHeader.required_date < deliveryDate && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <img src={warningIcon} />
              <p style={{ color: "red" }}>
                Selected delivery date is beyond the material request's required
                date:{" "}
                {new Date(mrHeader.required_date).toLocaleDateString("en-GB")}
              </p>
            </div>
          )}

          <br />

          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>DESCRIPTION</th>
                <th>QUANTITY</th>
                <th style={{ minWidth: "250px" }}>UNIT PRICE</th>
                <th>TOTAL PRICE</th>
              </tr>
            </thead>
            <tbody>
              {mrLines.map((mrLine, index) => {
                const proposedQty =
                  Number(mrLine.approved_proposed_quantity) || 0;
                const displayQty =
                  proposedQty > 0
                    ? proposedQty
                    : mrLine.approved_proposed_quantity;
                // Format quantity without trailing zeros
                const formattedQty =
                  formatNumberWithoutTrailingZeros(displayQty);

                return (
                  <tr key={mrLine.id || index}>
                    <td>{index + 1}</td>
                    <td>{mrLine.material_description}</td>
                    <td>
                      {formattedQty} {mrLine.unit}
                    </td>
                    <td>
                      <div className="input-prefix right">
                        <span>AED</span>
                        <input
                          type="text"
                          placeholder="ENTER UNIT PRICE"
                          value={unitPrices[index] || ""}
                          onChange={(e) =>
                            handleUnitPriceChange(index, e.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td>
                      {formatPriceAED(parseFloat(totalPrices[index] || "0"))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <br />
          <br />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.75fr",
              gap: "75px",
            }}
          >
            <div>
              <div className="input-row full">
                <InputItem
                  label={"PAYMENT TERMS"}
                  value={paymentTerms}
                  type={"textarea"}
                  placeholder={"ENTER PAYMENT TERMS"}
                  required
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label={"DELIVERY TERMS"}
                  value={deliveryTerms}
                  type={"textarea"}
                  placeholder={"ENTER DELIVERY TERMS"}
                  required
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                />
              </div>
            </div>
            <div>
              <div className="input-row full">
                <InputItem
                  label={"SUB TOTAL"}
                  value={formatPrice(subtotal)}
                  type={"text"}
                  placeholder={""}
                  required
                  onChange={() => {}}
                  sideLabel={true}
                  disabled={true}
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label={"DISCOUNT (%)"}
                  value={discount}
                  type={"text"}
                  placeholder={""}
                  required
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  sideLabel={true}
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label={"DISCOUNT"}
                  value={formatPrice(discountAmount)}
                  type={"text"}
                  placeholder={""}
                  required
                  onChange={() => {}}
                  sideLabel={true}
                  disabled={true}
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label={"S&H"}
                  value={shippingHandling}
                  type={"text"}
                  placeholder={"ENTER S&H"}
                  required
                  onChange={(e) => handleShippingChange(e.target.value)}
                  sideLabel={true}
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label={"VAT RATE (%)"}
                  value={vatRate}
                  type={"text"}
                  placeholder={"ENTER VAT RATE"}
                  required
                  onChange={(e) => handleVatRateChange(e.target.value)}
                  sideLabel={true}
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label={"VAT"}
                  value={formatPrice(vatAmount)}
                  type={"text"}
                  placeholder={""}
                  required
                  onChange={() => {}}
                  sideLabel={true}
                  disabled={true}
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label={"TOTAL"}
                  value={formatPriceAED(total)}
                  type={"text"}
                  placeholder={""}
                  required={true}
                  onChange={() => {}}
                  sideLabel={true}
                  disabled={true}
                />
              </div>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
