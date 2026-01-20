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

  const timeoutRefs = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const vatRateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const discountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shippingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const subtotal = Object.values(totalPrices).reduce(
    (sum, price) => sum + parseFloat(price || "0"),
    0,
  );
  const discountAmount = parseFloat(discount || "0");
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

  useEffect(() => {
    const initialUnitPrices: { [key: number]: string } = {};
    const initialTotalPrices: { [key: number]: string } = {};

    mrLines.forEach((mrLine, index) => {
      initialUnitPrices[index] = mrLine.approved_unit_price?.toString() || "";

      const quantity = mrLine.quantity;
      const unitPrice = parseFloat(
        mrLine.approved_unit_price?.toString() || "0",
      );
      const total = quantity * unitPrice;

      const formattedTotal =
        total % 1 === 0 ? total.toString() : total.toFixed(2);

      initialTotalPrices[index] = formattedTotal;
    });

    setUnitPrices(initialUnitPrices);
    setTotalPrices(initialTotalPrices);
  }, [mrLines]);

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

    if (timeoutRefs.current[index]) {
      clearTimeout(timeoutRefs.current[index]);
    }

    setUnitPrices((prev) => ({
      ...prev,
      [index]: value,
    }));

    const quantity = mrLines[index].quantity;
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
        const approvedPrice =
          mrLines[index].approved_unit_price?.toString() || "";

        setUnitPrices((prev) => ({
          ...prev,
          [index]: approvedPrice,
        }));

        const quantity = mrLines[index].quantity;
        const unitPrice = parseFloat(approvedPrice || "0");
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

    const lpoMrLines = mrLines.map((mrLine, index) => ({
      mr_line_id: mrLine.id,
      unit_price: parseFloat(unitPrices[index] || "0"),
      total_price: parseFloat(totalPrices[index] || "0"),
    }));

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createLPO",
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
        discount,
        vat_rate: vatRate,
        vat: vatAmount,
        shipping_and_handling: shippingHandling,
        total,
        lpo_mr_lines: lpoMrLines,
      }),
    });

    if (res.ok) {
      toast(
        `Local purchase order created for ${mrLines[0].approved_supplier_name}`,
        "success",
      );
      setIsOpen(false);
      await checkExistingLpo();
      router.refresh();
    } else {
      toast("Failed to create local purchase order", "error");
    }
  }

  const formatNumber = (num: number) => {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  if (existingLpoId) {
    const supplierId = mrLines[0]?.approved_supplier_id;
    const supplierType = mrLines[0]?.approved_supplier_type;
    const canDelete =
      userInfo?.departmentID === 9 &&
      (mrHeader.progress_id === 12 ||
        mrHeader.progress_id === 13 ||
        mrHeader.progress_id === 16);

    return (
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* {userInfo?.departmentID === 9 && mrHeader.progress_id === 12 && (
          <EditLPOButton lpoId={existingLpoId} />
        )} */}

        <ViewLPOButton lpoID={existingLpoId} mrHeader={mrHeader} />

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

        <UploadInvoiceButton
          mrHeader={mrHeader}
          mrLine={mrLines[0]}
          LpoID={existingLpoId}
          supplierId={supplierId}
          invoiceFiles={invoiceFiles}
          onFilesUpdate={setInvoiceFiles}
          canDelete={canDelete}
        />
      </div>
    );
  }

  // Otherwise show "Issue LPO" button
  return (
    <>
      {userInfo?.departmentID === 9 && mrHeader.progress_id === 12 && (
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
          header={"CREATE LOCAL PURCHASE ORDER"}
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
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          {mrHeader.required_date < deliveryDate && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <img src={warningIcon} />
              <p style={{ color: "red" }}>
                Selected delivery date is beyond the material request's required
                date: {mrHeader.required_date}
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
                <th>UNIT PRICE</th>
                <th>TOTAL PRICE</th>
              </tr>
            </thead>
            <tbody>
              {mrLines.map((mrLine, index) => (
                <tr key={mrLine.id || index}>
                  <td>{index + 1}</td>
                  <td>{mrLine.material_description}</td>
                  <td>
                    {mrLine.quantity} {mrLine.unit}
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
        </FormPopUp>
      )}
    </>
  );
}
