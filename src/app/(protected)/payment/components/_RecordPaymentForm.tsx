"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { formatPriceAED } from "@/lib/formatPrice";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatWithCommas(raw: string): string {
  const [intPart, decPart] = raw.split(".");
  const formattedInt = intPart
    ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : "";
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const PAYMENT_TYPES = [
  "Full payment",
  "Partial payment",
  "Advance payment",
  "Retention payment",
];
export const PAYMENT_METHODS = [
  "Bank transfer",
  "Cheque",
  "Cash",
  "Credit card",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type RecordPaymentFormProps = {
  /** The LPO id to record payment against */
  lpoId: number;
  mrHeaderId: number;
  supplierName: string;
  /** Current outstanding balance (total − already paid) */
  outstanding: number;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  /** Called after a successful submission */
  onSuccess: () => void;
  recordedBy: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecordPaymentForm({
  lpoId,
  mrHeaderId,
  supplierName,
  outstanding,
  isOpen,
  setIsOpen,
  onSuccess,
  recordedBy,
}: RecordPaymentFormProps) {
  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const reset = () => {
    setPaymentType("");
    setPaymentMethod("");
    setPaymentAmount("");
    setPaymentNotes("");
    setReceiptFile(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    setIsOpen(v);
  };

  const handleSubmit = async () => {
    try {
      let receiptUrl: string | null = null;
      if (receiptFile) {
        const fd = new FormData();
        fd.append("folder", "payment-receipts");
        fd.append("files", receiptFile);
        const up = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
          method: "POST",
          body: fd,
        });
        if (up.ok) {
          const d = await up.json();
          receiptUrl = d.urls?.[0] ?? null;
        }
      }
      const numericAmount = Number(paymentAmount.replace(/,/g, ""));
      if (numericAmount > outstanding) {
        toast("Payment amount exceeds the outstanding balance", "error");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "recordPayment",
            lpo_id: lpoId,
            mr_header_id: mrHeaderId,
            payment_type: paymentType,
            payment_method: paymentMethod,
            amount: numericAmount,
            receipt_file: receiptUrl,
            notes: paymentNotes || null,
            recorded_by: recordedBy,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast("Payment recorded", "success");
        reset();
        setIsOpen(false);
        onSuccess();
      } else {
        toast("Failed to record payment", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error recording payment", "error");
    }
  };

  if (!isOpen) return null;

  // ── 270° arc gauge ──────────────────────────────────────────────────────────
  const enteredAmt = Number(paymentAmount.replace(/,/g, "")) || 0;
  const isExceeding = enteredAmt > outstanding && enteredAmt > 0;
  const gaugePct =
    outstanding > 0 ? Math.min((enteredAmt / outstanding) * 100, 100) : 0;
  const gaugeColor = isExceeding ? "rgba(248,77,77,1)" : "rgba(26,216,135,1)";
  const r = 33;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;

  return (
    <FormPopUp
      header="Record Payment"
      setIsOpen={handleClose as React.Dispatch<React.SetStateAction<boolean>>}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
      style={{ maxWidth: "520px" }}
    >
      <div className="input-row half">
        <InputItem
          label="LPO NUMBER"
          type="text"
          value={`LPO-${String(lpoId).padStart(5, "0")}`}
          onChange={() => {}}
          disabled
          required
          noOptionalLabel
        />
        <InputItem
          label="VENDOR"
          type="text"
          value={supplierName || "-"}
          onChange={() => {}}
          disabled
          required
          noOptionalLabel
        />
      </div>

      <div className="input-row half">
        <InputItem
          label="PAYMENT TYPE"
          type="select"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          selectOptions={PAYMENT_TYPES}
          required
        />
        <InputItem
          label="PAYMENT METHOD"
          type="select"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          selectOptions={PAYMENT_METHODS}
          required
        />
      </div>

      {/* Outstanding indicator */}
      <div
        style={{
          backgroundColor: "rgba(248, 249, 251, 1)",
          borderRadius: "10px",
          padding: "15px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left — stats */}
        <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
          <div>
            <small style={{ color: "rgba(120,120,120,1)" }}>
              OUTSTANDING AMOUNT
            </small>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>
              {formatPriceAED(outstanding)}
            </div>
          </div>
          <div>
            <small style={{ color: "rgba(120,120,120,1)" }}>
              PAYMENT AMOUNT
            </small>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>
              {paymentAmount ? paymentAmount : "-"}
            </div>
          </div>
        </div>

        {/* Right — gauge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            flexShrink: 0,
          }}
        >
          <div style={{ position: "relative", width: "90px", height: "90px" }}>
            {/* track */}
            <svg
              width="90"
              height="90"
              viewBox="0 0 90 90"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: "rotate(135deg)",
              }}
            >
              <circle
                cx="45"
                cy="45"
                r={r}
                fill="none"
                stroke="rgba(220,220,220,1)"
                strokeWidth="9"
                strokeLinecap="butt"
                strokeDasharray={`${arc} ${circ}`}
              />
            </svg>
            {/* fill */}
            <svg
              width="90"
              height="90"
              viewBox="0 0 90 90"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: "rotate(135deg)",
              }}
            >
              <circle
                cx="45"
                cy="45"
                r={r}
                fill="none"
                stroke={gaugeColor}
                strokeWidth="9"
                strokeLinecap="butt"
                strokeDasharray={`${(gaugePct / 100) * arc} ${circ}`}
                style={{ transition: "stroke-dasharray 0.4s ease-out" }}
              />
            </svg>
            {/* label */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {Math.round(gaugePct)}%
            </div>
          </div>
          <small style={{ color: "rgba(120,120,120,1)", textAlign: "center" }}>
            PAYMENT PROGRESS
          </small>
        </div>
      </div>

      <br />

      <div className="input-row full">
        <InputItem
          label="PAYMENT AMOUNT"
          type="text prefix"
          value={paymentAmount}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, "");
            if (/^\d*\.?\d*$/.test(raw))
              setPaymentAmount(formatWithCommas(raw));
          }}
          postfixText="AED"
          required
        />
      </div>

      {/* ── Exceeds warning ─────────────────────────────────────────────────── */}
      {isExceeding && (
        <>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <img src="/icons/warning.svg" alt="warning" />
            <p style={{ color: "red" }}>
              Payment amount exceeds outstanding amount
            </p>
          </div>

          <br />
          <br />
        </>
      )}

      <div className="input-row full">
        <InputItem
          label="NOTES"
          type="textarea"
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
        />
      </div>

      <div className="input-row full">
        <SingleUploadFileBox
          fileState={receiptFile}
          setFileState={setReceiptFile}
          label="PAYMENT RECEIPT"
          acceptedFileTypes=".pdf,.jpg,.jpeg,.png"
          placeholder="UPLOAD PAYMENT RECEIPT"
          buttonLabel="UPLOAD RECEIPT"
          required
        />
      </div>
    </FormPopUp>
  );
}
