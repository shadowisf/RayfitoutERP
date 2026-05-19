"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { JoLine } from "../../types/joLine";
import { MrHeader } from "../../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import { formatPrice, formatPriceAED } from "@/lib/formatPrice";
import DownloadLPOButton from "../../lpo/[lpoId]/components/_DownloadLPOButton";

type BoqLineItem = {
  boq_line_id: number;
  item_name?: string;
  approved_subcontractor_id?: number | null;
  approved_subcontractor_name?: string | null;
  approved_total_price?: number | null;
};

type IssueJoLpoButtonProps = {
  mrHeader: MrHeader;
  joLines: JoLine[];
  boqItemsByJoLine: Record<number, BoqLineItem[]>;
  onLpoCreated?: (lpoId: number) => void;
};

export default function IssueJoLpoButton({
  mrHeader,
  joLines,
  boqItemsByJoLine,
  onLpoCreated,
}: IssueJoLpoButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);

  // Form fields
  const [quotation, setQuotation] = useState("");
  // const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(
    "Net 30 Days via Bank Transfer / Cheque",
  );
  // const [deliveryTerms, setDeliveryTerms] =
  //   useState(`• Delivery will be made to Street 34, Al Qusais 5, Dubai, UAE
  // • Any deviations or damages will be the responsibility of the subcontractor`);
  const [vatRate, setVatRate] = useState("5");
  const [discount, setDiscount] = useState("0");
  const [shippingHandling, setShippingHandling] = useState("0");

  const warningIcon = "/icons/warning.svg";

  // Approved total per JO line = sum of all BOQ item approved prices for that line
  const getApprovedTotalForLine = (joLineId: number): number =>
    (boqItemsByJoLine[joLineId] || []).reduce(
      (s, i) => s + (Number(i.approved_total_price) || 0),
      0,
    );

  // Lines that have at least one BOQ item with an approved price
  const approvedLines = joLines.filter((l) => getApprovedTotalForLine(l.id) > 0);

  // Primary subcontractor — first BOQ item across all lines with an approved subcontractor
  const firstApproved = Object.values(boqItemsByJoLine)
    .flat()
    .find((i) => i.approved_subcontractor_id);
  const primarySubcontractorId = firstApproved?.approved_subcontractor_id ?? null;
  const primarySubcontractorName = firstApproved?.approved_subcontractor_name ?? null;

  // Financials — subtotal from BOQ line approved prices
  const subtotal = joLines.reduce((sum, l) => sum + getApprovedTotalForLine(l.id), 0);
  const discountRate = parseFloat(discount || "0");
  const discountAmount = subtotal * (discountRate / 100);
  const amountAfterDiscount = subtotal - discountAmount;
  const vatAmount = (amountAfterDiscount * parseFloat(vatRate || "0")) / 100;
  const shAmount = parseFloat(shippingHandling || "0");
  const total = amountAfterDiscount + vatAmount + shAmount;

  const isValidNumber = (value: string) =>
    value === "" || /^\d*\.?\d*$/.test(value);

  // Check for existing LPO on mount
  useEffect(() => {
    checkExistingLpo();
  }, [mrHeader.id]);

  // Pre-populate form fields from existing LPO when edit is opened
  useEffect(() => {
    if (!isOpen || !existingLpoId) return;
    async function loadLpoFields() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: existingLpoId }),
          },
        );
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          setQuotation(d.quotation_code || "");
          // setDeliveryDate(d.delivery_date ? d.delivery_date.split("T")[0] : ""); // hidden for JO LPOs
          setPaymentTerms(d.payment_terms || "");
          // setDeliveryTerms(d.delivery_terms || ""); // hidden for JO LPOs
          setDiscount(String(d.discount ?? "0"));
          setVatRate(String(d.vat_rate ?? "5"));
          setShippingHandling(String(d.shipping_and_handling ?? "0"));
        }
      } catch (err) {
        console.error("Error loading LPO details for edit:", err);
      }
    }
    loadLpoFields();
  }, [isOpen, existingLpoId]);

  async function checkExistingLpo() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_header_id: mrHeader.id,
            // JO LPOs use subcontractor_id — query by mr_header_id only
          }),
        },
      );
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        const lpoId = data.data[0].id;
        setExistingLpoId(lpoId);
        onLpoCreated?.(lpoId);
      } else {
        setExistingLpoId(null);
      }
    } catch (err) {
      console.error("Error checking for existing JO LPO:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (subtotal <= 0) {
      toast("No approved quotations found for this job order", "error");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: existingLpoId ? "updateLPO" : "createLPO",
        ...(existingLpoId ? { lpo_id: existingLpoId } : {}),
        project_id: mrHeader.project_id,
        mr_header_id: mrHeader.id,
        subcontractor_id: primarySubcontractorId,
        quotation_code: quotation,
        delivery_date: null,
        payment_terms: paymentTerms,
        delivery_terms: null,
        subtotal,
        discount: parseFloat(discount || "0"),
        vat_rate: parseFloat(vatRate || "0"),
        vat: vatAmount,
        shipping_and_handling: parseFloat(shippingHandling || "0"),
        total,
        lpo_jo_lines: approvedLines.map((l) => ({
          jo_line_id: l.id,
          approved_total_price: getApprovedTotalForLine(l.id),
        })),
      }),
    });

    if (res.ok) {
      toast(
        existingLpoId ? "LPO updated successfully" : "LPO created successfully",
        "success",
      );
      setIsOpen(false);
      await checkExistingLpo();
      router.refresh();
    } else {
      toast(
        existingLpoId ? "Failed to update LPO" : "Failed to create LPO",
        "error",
      );
    }
  }

  if (subtotal <= 0) {
    return (
      <p style={{ color: "rgba(128,128,128,1)", fontSize: "14px" }}>
        No approved quotations — complete price approval first.
      </p>
    );
  }

  // After LPO exists — pill with download, pencil, delete (mirrors ViewLPOButton)
  if (existingLpoId && !isOpen) {
    const canEdit = userInfo?.departmentID === 9 && mrHeader.progress_id === 12;

    async function handleDeleteLpo() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteLpoPDF", id: existingLpoId }),
        });
        if (res.ok) {
          setExistingLpoId(null);
          onLpoCreated?.(0 as any);
          router.refresh();
        } else {
          toast("Failed to delete LPO", "error");
        }
      } catch {
        toast("Failed to delete LPO", "error");
      }
    }

    return (
      <Button
        componentType="none"
        bgColor="white"
        borderColor="rgba(207, 207, 207, 1)"
        textColor="black"
        style={{ padding: "7px 20px", borderRadius: "25px" }}
      >
        LPO
        <DownloadLPOButton lpoID={existingLpoId} />
        {canEdit && (
          <>
            <Button
              componentType="button"
              bgColor="transparent"
              borderColor="transparent"
              textColor="black"
              style={{ padding: "0px" }}
              onClick={() => setIsOpen(true)}
            >
              <img src="/icons/pencil.svg" alt="edit" />
            </Button>
            <Button
              componentType="button"
              bgColor="transparent"
              borderColor="transparent"
              textColor="black"
              style={{ padding: "0px" }}
              onClick={handleDeleteLpo}
            >
              <img src="/icons/cross-small.svg" alt="delete" />
            </Button>
          </>
        )}
      </Button>
    );
  }

  return (
    <>
      {!existingLpoId &&
        userInfo?.departmentID === 9 &&
        mrHeader.progress_id === 12 && (
          <Button
            componentType="button"
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
          addButtonLabel="CONFIRM"
          style={{ width: "1000px" }}
        >
          <div className="input-row half">
            <InputItem
              label="SUBCONTRACTOR NAME"
              value={primarySubcontractorName || ""}
              type="text"
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label="QUOTATION REFERENCE"
              value={quotation}
              type="text"
              placeholder="ENTER QUOTATION REFERENCE"
              required
              onChange={(e) => setQuotation(e.target.value)}
            />
          </div>

          {/* Delivery date hidden for JO LPOs — sent as null
          <div className="input-row full">
            <InputItem
              label="DELIVERY DATE"
              value={deliveryDate}
              type="date"
              placeholder="ENTER DELIVERY DATE"
              required
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          {mrHeader.required_date < deliveryDate && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <img src={warningIcon} alt="warning" />
              <p style={{ color: "red" }}>
                Selected delivery date is beyond the job order's required date:{" "}
                {new Date(mrHeader.required_date).toLocaleDateString("en-GB")}
              </p>
            </div>
          )}
          */}

          <br />

          {/* JO Lines — prices are read-only (sum of approved BOQ line quotations) */}
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>SCOPE</th>
                <th>DESCRIPTION</th>
                <th>APPROVED TOTAL PRICE</th>
              </tr>
            </thead>
            <tbody>
              {approvedLines.map((line, index) => (
                <tr key={line.id}>
                  <td>{index + 1}</td>
                  <td>{line.job_scope_name || line.job_scope || "-"}</td>
                  <td>{line.job_description || "-"}</td>
                  <td>{formatPriceAED(getApprovedTotalForLine(line.id))}</td>
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
                  label="PAYMENT TERMS"
                  value={paymentTerms}
                  type="textarea"
                  placeholder="ENTER PAYMENT TERMS"
                  required
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </div>
              {/* Delivery terms hidden for JO LPOs — sent as null
              <div className="input-row full">
                <InputItem
                  label="DELIVERY TERMS"
                  value={deliveryTerms}
                  type="textarea"
                  placeholder="ENTER DELIVERY TERMS"
                  required
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                />
              </div>
              */}
            </div>
            <div>
              <div className="input-row full">
                <InputItem
                  label="SUB TOTAL"
                  value={formatPrice(subtotal)}
                  type="text"
                  required
                  onChange={() => {}}
                  sideLabel
                  disabled
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label="DISCOUNT (%)"
                  value={discount}
                  type="text"
                  required
                  onChange={(e) =>
                    isValidNumber(e.target.value) && setDiscount(e.target.value)
                  }
                  sideLabel
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label="DISCOUNT"
                  value={formatPrice(discountAmount)}
                  type="text"
                  required
                  onChange={() => {}}
                  sideLabel
                  disabled
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label="S&H"
                  value={shippingHandling}
                  type="text"
                  placeholder="ENTER S&H"
                  required
                  onChange={(e) =>
                    isValidNumber(e.target.value) &&
                    setShippingHandling(e.target.value)
                  }
                  sideLabel
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label="VAT RATE (%)"
                  value={vatRate}
                  type="text"
                  placeholder="ENTER VAT RATE"
                  required
                  onChange={(e) =>
                    isValidNumber(e.target.value) && setVatRate(e.target.value)
                  }
                  sideLabel
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label="VAT"
                  value={formatPrice(vatAmount)}
                  type="text"
                  required
                  onChange={() => {}}
                  sideLabel
                  disabled
                />
              </div>
              <div className="input-row full">
                <InputItem
                  label="TOTAL"
                  value={formatPriceAED(total)}
                  type="text"
                  required
                  onChange={() => {}}
                  sideLabel
                  disabled
                />
              </div>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
