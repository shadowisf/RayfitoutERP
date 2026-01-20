"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LpoHeader } from "../../types/lpoHeader";

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

  const timeoutRefs = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const vatRateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const discountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shippingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate totals
  const subtotal = Object.values(totalPrices).reduce(
    (sum, price) => sum + parseFloat(price || "0"),
    0,
  );
  const discountAmount = parseFloat(discount || "0");
  const amountAfterDiscount = subtotal - discountAmount;
  const vatAmount = (amountAfterDiscount * parseFloat(vatRate || "0")) / 100;
  const shAmount = parseFloat(shippingHandling || "0");
  const total = amountAfterDiscount + vatAmount + shAmount;

  // Fetch LPO details when modal opens
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

  // Initialize form when lpoData is loaded
  useEffect(() => {
    if (lpoData) {
      setQuotation(lpoData.quotation_code || "");
      setSupplierContactPersonName(lpoData.supplier_contact_person_name || "");
      setSupplierEmail(lpoData.supplier_email || "");

      // Format date for input type="date" (YYYY-MM-DD)
      if (lpoData.delivery_date) {
        const date = new Date(lpoData.delivery_date);
        const formattedDate = date.toISOString().split("T")[0];
        setDeliveryDate(formattedDate);
      }

      setPaymentTerms(lpoData.payment_terms || "");
      setDeliveryTerms(lpoData.delivery_terms || "");
      setDiscount(lpoData.discount?.toString() || "0");
      setVatRate(lpoData.vat_rate?.toString() || "5");
      setShippingHandling(lpoData.shipping_and_handling?.toString() || "0");

      // Initialize unit prices and total prices
      const initialUnitPrices: { [key: number]: string } = {};
      const initialTotalPrices: { [key: number]: string } = {};

      lpoData.lpo_mr_lines.forEach((line, index) => {
        const unitPrice = line.unit_price?.toString() || "";
        const totalPrice = line.total_price?.toString() || "";

        initialUnitPrices[index] = unitPrice;
        initialTotalPrices[index] = totalPrice;
      });

      setUnitPrices(initialUnitPrices);
      setTotalPrices(initialTotalPrices);
    }
  }, [lpoData]);

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
      if (vatRateTimeoutRef.current) clearTimeout(vatRateTimeoutRef.current);
      if (discountTimeoutRef.current) clearTimeout(discountTimeoutRef.current);
      if (shippingTimeoutRef.current) clearTimeout(shippingTimeoutRef.current);
    };
  }, []);

  const isValidNumber = (value: string): boolean => {
    if (value === "" || value === null) return true;
    return /^\d*\.?\d*$/.test(value);
  };

  const handleUnitPriceChange = (index: number, value: string) => {
    if (!lpoData) return;
    if (!isValidNumber(value)) return;

    if (timeoutRefs.current[index]) {
      clearTimeout(timeoutRefs.current[index]);
    }

    setUnitPrices((prev) => ({
      ...prev,
      [index]: value,
    }));

    const quantity = lpoData.lpo_mr_lines[index].quantity;
    const unitPrice = parseFloat(value) || 0;
    const total = quantity * unitPrice;

    const formattedTotal =
      total % 1 === 0 ? total.toString() : total.toFixed(2);

    setTotalPrices((prev) => ({
      ...prev,
      [index]: formattedTotal,
    }));

    if (value === "" || value === null) {
      timeoutRefs.current[index] = setTimeout(() => {
        const originalPrice =
          lpoData.lpo_mr_lines[index].unit_price?.toString() || "";

        setUnitPrices((prev) => ({
          ...prev,
          [index]: originalPrice,
        }));

        const quantity = lpoData.lpo_mr_lines[index].quantity;
        const unitPrice = parseFloat(originalPrice || "0");
        const total = quantity * unitPrice;

        const formattedTotal =
          total % 1 === 0 ? total.toString() : total.toFixed(2);

        setTotalPrices((prev) => ({
          ...prev,
          [index]: formattedTotal,
        }));
      }, 2000);
    }
  };

  const handleVatRateChange = (value: string) => {
    if (!isValidNumber(value)) return;

    if (vatRateTimeoutRef.current) {
      clearTimeout(vatRateTimeoutRef.current);
    }

    setVatRate(value);

    if (value === "" || value === null) {
      vatRateTimeoutRef.current = setTimeout(() => {
        setVatRate("5");
      }, 2000);
    }
  };

  const handleDiscountChange = (value: string) => {
    if (!isValidNumber(value)) return;

    if (discountTimeoutRef.current) {
      clearTimeout(discountTimeoutRef.current);
    }

    setDiscount(value);

    if (value === "" || value === null) {
      discountTimeoutRef.current = setTimeout(() => {
        setDiscount("0");
      }, 2000);
    }
  };

  const handleShippingChange = (value: string) => {
    if (!isValidNumber(value)) return;

    if (shippingTimeoutRef.current) {
      clearTimeout(shippingTimeoutRef.current);
    }

    setShippingHandling(value);

    if (value === "" || value === null) {
      shippingTimeoutRef.current = setTimeout(() => {
        setShippingHandling("0");
      }, 2000);
    }
  };

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
          discount,
          vat_rate: vatRate,
          vat: vatAmount,
          shipping_and_handling: shippingHandling,
          total,
          lpo_mr_lines: updatedLpoMrLines,
        }),
      });

      if (res.ok) {
        toast("Local purchase order updated", "success");
        setIsOpen(false);
        setLpoData(null); // Reset data so it fetches fresh next time
        router.refresh();
      } else {
        toast("Failed to update local purchase order", "error");
      }
    } catch (error) {
      toast("Failed to update local purchase order", "error");
    }
  }

  const formatNumber = (num: number) => {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

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
          {lpoData && (
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
                    <th>UNIT PRICE</th>
                    <th>TOTAL PRICE</th>
                  </tr>
                </thead>
                <tbody style={{ fontWeight: "normal" }}>
                  {lpoData.lpo_mr_lines.map((line, index) => (
                    <tr key={line.id || index}>
                      <td>{index + 1}</td>
                      <td>{line.material_description}</td>
                      <td>
                        {line.quantity} {line.unit}
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
                      <td>{totalPrices[index] || "0"} AED</td>
                    </tr>
                  ))}
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
                      value={formatNumber(subtotal)}
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
                      label={"DISCOUNT"}
                      value={discount}
                      type={"text"}
                      placeholder={"ENTER DISCOUNT"}
                      required
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      sideLabel={true}
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
                      value={formatNumber(vatAmount)}
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
                      value={`${formatNumber(total)} AED`}
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
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
