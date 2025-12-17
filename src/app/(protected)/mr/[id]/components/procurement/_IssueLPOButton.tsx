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
import { LPO } from "../../types/lpo";
import EditLPOButton from "./_EditLPOButton";
import ViewLPOPopUp from "../ViewLPOPopUp";
import DownloadLPOButton from "./_DownloadLPOButton";
import UploadInvoiceButton from "./_UploadInvoiceButton";
import UploadSignedLPOButton from "./_UploadSignedLPOButton";

type IssueLPOButtonProps = {
  mrHeader: MrHeader;
  mrLines: MrLine[];
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  full?: boolean;
  style?: React.CSSProperties;
};

export default function IssueLPOButton({
  mrHeader,
  mrLines,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  style,
}: IssueLPOButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const downloadIcon = "/icons/download.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);

  // Invoice file states
  const [invoiceFiles, setInvoiceFiles] = useState<string[]>([]);

  // Signed LPO file states
  const [signedLpoFiles, setSignedLpoFiles] = useState<string[]>([]);

  const [quotation, setQuotation] = useState("");
  const [supplierContactPersonName, setSupplierContactPersonName] = useState(
    mrLines[0].approved_supplier_contact_person
  );
  const [supplierEmail, setSupplierEmail] = useState(
    mrLines[0].approved_supplier_email
  );
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

  const subtotal = Object.values(totalPrices).reduce(
    (sum, price) => sum + parseFloat(price || "0"),
    0
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
        mrLine.approved_unit_price?.toString() || "0"
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
        }
      );
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const lpoData: LPO = data.data[0];

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
      toast("Local purchase order created", "success");
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
    const canDelete =
      userInfo?.departmentID === 9 && mrHeader.progress_id === 12;

    return (
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <ViewLPOPopUp
          lpoID={existingLpoId}
          bgColor={"white"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          style={style}
        >
          View LPO
        </ViewLPOPopUp>

        {userInfo?.departmentID === 9 && mrHeader.progress_id === 12 && (
          <EditLPOButton
            bgColor="white"
            borderColor="rgba(207, 207, 207, 1)"
            textColor="black"
            style={style}
            lpoId={existingLpoId}
          >
            Edit LPO
          </EditLPOButton>
        )}

        <DownloadLPOButton
          lpoID={existingLpoId}
          bgColor="white"
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          style={style}
        >
          Download LPO
          <img src={downloadIcon} alt="download" />
        </DownloadLPOButton>

        <UploadInvoiceButton
          mrHeader={mrHeader}
          supplierId={supplierId}
          invoiceFiles={invoiceFiles}
          onFilesUpdate={setInvoiceFiles}
          canDelete={canDelete}
        />

        <UploadSignedLPOButton
          mrHeader={mrHeader}
          supplierId={supplierId}
          signedLpoFiles={signedLpoFiles}
          onFilesUpdate={setSignedLpoFiles}
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
          bgColor={bgColor}
          borderColor={borderColor}
          textColor={textColor}
          onClick={() => setIsOpen(true)}
          full={full ? true : false}
          style={style}
        >
          {children}
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header={"CREATE LOCAL PURCHASE ORDER"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row three-col">
            <InputItem
              label={"SUPPLIER NAME"}
              value={mrLines[0].approved_supplier_name}
              type={"text"}
              placeholder={"ENTER SUPPLIER NAME"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"SUPPLIER ADDRESS"}
              value={mrLines[0].approved_supplier_address}
              type={"text"}
              placeholder={"ENTER SUPPLIER ADDRESS"}
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
              gridTemplateColumns: "1fr 0.5fr",
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
                  label={"DISCOUNT (OPTIONAL)"}
                  value={discount}
                  type={"text"}
                  placeholder={"ENTER DISCOUNT"}
                  required={false}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  sideLabel={true}
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label={"S&H (OPTIONAL)"}
                  value={shippingHandling}
                  type={"text"}
                  placeholder={"ENTER S&H"}
                  required={false}
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
                  required={true}
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
                  required={false}
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
