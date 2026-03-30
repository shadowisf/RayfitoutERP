"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LpoHeader } from "../../types/lpoHeader";
import { formatPrice, formatPriceAED } from "@/lib/formatPrice";

type EditLPOButtonProps = {
  lpoId: number;
};

export default function EditLPOButton({ lpoId }: EditLPOButtonProps) {
  const pencilIcon = "/icons/pencil.svg";
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [lpoData, setLpoData] = useState<LpoHeader | null>(null);

  const [quotation, setQuotation] = useState("");
  const [supplierContactPersonName, setSupplierContactPersonName] =
    useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [discount, setDiscount] = useState("0");
  const [vatRate, setVatRate] = useState("5");
  const [shippingHandling, setShippingHandling] = useState("0");

  const [unitPrices, setUnitPrices] = useState<{ [key: number]: string }>({});
  const [totalPrices, setTotalPrices] = useState<{ [key: number]: string }>({});

  // ─── Calculated totals ────────────────────────────────────────────────────

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

  // ─── Formatting helpers ───────────────────────────────────────────────────

  /** Format to exactly 2 decimal places for unit/total prices on load */
  const formatToTwoDecimals = (
    value: number | string | null | undefined,
  ): string => {
    if (value === null || value === undefined || value === "") return "";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toFixed(2);
  };

  /** Format without trailing zeros for discount, vat rate, s&h on load */
  const formatFieldValue = (
    value: number | string | null | undefined,
  ): string => {
    if (value === null || value === undefined || value === "") return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
  };

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && !lpoData) {
      fetchLpoDetails();
    }
  }, [isOpen]);

  async function fetchLpoDetails() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lpo_id: lpoId }),
        },
      );
      const data = await res.json();

      if (data.success && data.data) {
        setLpoData(data.data);
      } else {
        toast("Failed to load LPO details", "error");
      }
    } catch (error) {
      console.error("Error fetching LPO details:", error);
      toast("Failed to load LPO details", "error");
    }
  }

  // Initialize form when lpoData is loaded — format nicely on load only
  useEffect(() => {
    if (lpoData) {
      setQuotation(lpoData.quotation_code || "");
      setSupplierContactPersonName(lpoData.supplier_contact_person_name || "");
      setSupplierEmail(lpoData.supplier_email || "");

      if (lpoData.delivery_date) {
        setDeliveryDate(
          new Date(lpoData.delivery_date).toISOString().split("T")[0],
        );
      }

      setPaymentTerms(lpoData.payment_terms || "");
      setDeliveryTerms(lpoData.delivery_terms || "");

      // Format field values the same way as IssueLPOButton
      setDiscount(formatFieldValue(lpoData.discount));
      setVatRate(formatFieldValue(lpoData.vat_rate));
      setShippingHandling(formatFieldValue(lpoData.shipping_and_handling));

      // Format unit/total prices to 2 decimals on load
      const initialUnitPrices: { [key: number]: string } = {};
      const initialTotalPrices: { [key: number]: string } = {};

      lpoData.lpo_mr_lines.forEach((line, index) => {
        initialUnitPrices[index] = formatToTwoDecimals(line.unit_price);
        initialTotalPrices[index] =
          formatToTwoDecimals(line.total_price) || "0.00";
      });

      setUnitPrices(initialUnitPrices);
      setTotalPrices(initialTotalPrices);
    }
  }, [lpoData]);

  // ─── Input handlers ───────────────────────────────────────────────────────

  const isValidNumber = (value: string): boolean => {
    if (value === "" || value === null) return true;
    return /^\d*\.?\d*$/.test(value);
  };

  const handleUnitPriceChange = (index: number, value: string) => {
    if (!lpoData) return;
    if (!isValidNumber(value)) return;

    // Store raw value while typing — no reformatting
    setUnitPrices((prev) => ({ ...prev, [index]: value }));

    // Recalculate total live - use safer access
    const line = lpoData.lpo_mr_lines[index];
    if (!line) return;

    // Use approved_proposed_quantity from lpo_mr_lines (same as displayed)
    const proposedQty = Number(line.approved_proposed_quantity) || 0;
    const quantity = proposedQty > 0 ? proposedQty : Number(line.quantity) || 0;
    const unitPrice = parseFloat(value) || 0;

    setTotalPrices((prev) => ({
      ...prev,
      [index]: (quantity * unitPrice).toFixed(2),
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

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lpoData) return;

    try {
      const updatedLpoMrLines = lpoData.lpo_mr_lines.map((line, index) => ({
        id: line.id,
        mr_line_id: line.mr_line_id,
        unit_price: parseFloat(unitPrices[index] || "0"),
        total_price: parseFloat(totalPrices[index] || "0"),
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLPO",
          lpo_id: lpoData.id,
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
          lpo_mr_lines: updatedLpoMrLines,
        }),
      });

      if (res.ok) {
        toast("Local purchase order updated", "success");
        setIsOpen(false);
        setLpoData(null);
        router.refresh();
      } else {
        toast("Failed to update local purchase order", "error");
      }
    } catch (error) {
      toast("Failed to update local purchase order", "error");
    }
  }

  const formatNumberWithoutTrailingZeros = (value: number | string): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) {
      return num.toString();
    }
    return parseFloat(num.toFixed(3)).toString();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Button
        componentType={"button"}
        bgColor="white"
        borderColor="rgba(207, 207, 207, 1)"
        textColor="black"
        onClick={() => setIsOpen(true)}
        style={{ padding: "0px", border: "none" }}
      >
        <img src={pencilIcon} alt="pencil" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE LOCAL PURCHASE ORDER"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ width: "1000px" }}
        >
          {lpoData ? (
            <>
              <div className="input-row three-col">
                <InputItem
                  label={"SUPPLIER NAME"}
                  value={lpoData.supplier_name}
                  type={"text"}
                  placeholder={"SUPPLIER NAME"}
                  required
                  onChange={() => {}}
                  disabled
                />
                <InputItem
                  label={"SUPPLIER ADDRESS"}
                  value={lpoData.supplier_address || "-"}
                  type={"text"}
                  placeholder={"SUPPLIER ADDRESS"}
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
                  label={"SUPPLIER CONTACT PERSON NAME"}
                  value={supplierContactPersonName}
                  type={"text"}
                  placeholder={"ENTER SUPPLIER CONTACT PERSON NAME"}
                  required
                  onChange={(e) => setSupplierContactPersonName(e.target.value)}
                />
                <InputItem
                  label={"SUPPLIER EMAIL"}
                  value={supplierEmail}
                  type={"text"}
                  placeholder={"ENTER EMAIL"}
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
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              <br />

              <table className="items-table" style={{ fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>DESCRIPTION</th>
                    <th>QUANTITY</th>
                    <th style={{ minWidth: "250px" }}>UNIT PRICE</th>
                    <th>TOTAL PRICE</th>
                  </tr>
                </thead>
                <tbody style={{ fontWeight: "normal" }}>
                  {lpoData.lpo_mr_lines.map((line, index) => {
                    // Use approved_proposed_quantity with fallback to quantity
                    const proposedQty =
                      Number(line.approved_proposed_quantity) || 0;
                    const displayQty =
                      proposedQty > 0 ? proposedQty : line.quantity;
                    const formattedQty =
                      formatNumberWithoutTrailingZeros(displayQty);

                    return (
                      <tr key={line.id || index}>
                        <td>{index + 1}</td>
                        <td>{line.material_description}</td>
                        <td>
                          {formattedQty} {line.unit}
                        </td>
                        <td>
                          <div className="input-prefix right">
                            <span>AED</span>
                            <input
                              type="text"
                              placeholder="ENTER UNIT PRICE"
                              value={unitPrices[index] ?? ""}
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
                      placeholder={"ENTER DISCOUNT %"}
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
                      required={true}
                      onChange={() => {}}
                      sideLabel={true}
                      disabled={true}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </FormPopUp>
      )}
    </>
  );
}
