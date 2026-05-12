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

// Sequential distribution: fill smallest LPOs first to maximise fully-paid records
function distribute(lpos: LpoPaymentItem[], totalAmount: number): number[] {
  const sorted = lpos
    .map((l, i) => ({ i, outstanding: Number(l.outstanding) }))
    .sort((a, b) => a.outstanding - b.outstanding);

  let remaining = totalAmount;
  const amounts = new Array<number>(lpos.length).fill(0);

  for (const { i, outstanding } of sorted) {
    const amt = Math.min(outstanding, Math.max(0, remaining));
    amounts[i] = amt;
    remaining -= amt;
  }

  return amounts;
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

export type LpoPaymentItem = {
  id: number;
  mr_header_id: number;
  outstanding: number;
};

export type RecordPaymentFormProps = {
  lpos: LpoPaymentItem[];
  supplierName: string;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSuccess: () => void;
  recordedBy: string;
  /** Show the Supplier Statement upload field (required when shown) */
  showSupplierStatement?: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecordPaymentForm({
  lpos,
  supplierName,
  isOpen,
  setIsOpen,
  onSuccess,
  recordedBy,
  showSupplierStatement = false,
}: RecordPaymentFormProps) {
  const totalOutstanding = lpos.reduce((s, l) => s + Number(l.outstanding), 0);

  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const reset = () => {
    setPaymentType("");
    setPaymentMethod("");
    setPaymentAmount("");
    setPaymentNotes("");
    setStatementFile(null);
    setReceiptFile(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    setIsOpen(v);
  };

  const enteredAmt = Math.max(0, Number(paymentAmount.replace(/,/g, "")) || 0);
  const isExceeding = enteredAmt > totalOutstanding && enteredAmt > 0;
  const capped = Math.min(enteredAmt, totalOutstanding);
  const distribution = distribute(lpos, capped);

  const handleSubmit = async () => {
    if (isExceeding) {
      toast("Payment amount exceeds the total outstanding balance", "error");
      return;
    }
    try {
      // Upload supplier statement
      let statementUrl: string | null = null;
      if (showSupplierStatement && statementFile) {
        const fd = new FormData();
        fd.append("folder", "supplier-statements");
        fd.append("files", statementFile);
        const up = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
          method: "POST",
          body: fd,
        });
        if (up.ok) {
          const d = await up.json();
          statementUrl = d.urls?.[0] ?? null;
        }
      }

      // Upload receipt
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

      // Only submit LPOs that received a non-zero allocation
      const toSubmit = lpos
        .map((lpo, i) => ({ lpo, amount: distribution[i] }))
        .filter(({ amount }) => amount > 0);

      const results = await Promise.all(
        toSubmit.map(({ lpo, amount }) =>
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "recordPayment",
              lpo_id: lpo.id,
              mr_header_id: lpo.mr_header_id,
              payment_type: paymentType,
              payment_method: paymentMethod,
              amount,
              receipt_file: receiptUrl,
              supplier_statement: statementUrl,
              notes: paymentNotes || null,
              recorded_by: recordedBy,
            }),
          }).then((r) => r.json()),
        ),
      );

      const failed = results.filter((r) => !r.success);
      if (failed.length === 0) {
        toast(
          toSubmit.length > 1
            ? `${toSubmit.length} payments recorded`
            : "Payment recorded",
          "success",
        );
        reset();
        setIsOpen(false);
        onSuccess();
      } else {
        toast(`${failed.length} payment(s) failed`, "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error recording payments", "error");
    }
  };

  if (!isOpen) return null;

  // ── 270° arc gauge ──────────────────────────────────────────────────────────
  const gaugePct =
    totalOutstanding > 0
      ? Math.min((enteredAmt / totalOutstanding) * 100, 100)
      : 0;
  const gaugeColor = isExceeding ? "rgba(248,77,77,1)" : "rgba(26,216,135,1)";
  const r = 33;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;

  const lpoNumbers = lpos
    .map((l) => `LPO-${String(l.id).padStart(5, "0")}`)
    .join(", ");

  return (
    <FormPopUp
      header="RECORD PAYMENT"
      setIsOpen={handleClose as React.Dispatch<React.SetStateAction<boolean>>}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
      style={{ maxWidth: "520px" }}
    >
      {/* LPO NUMBER + VENDOR */}
      <div className="input-row half">
        <InputItem
          label="LPO NUMBER"
          type="text"
          value={lpoNumbers}
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

      {/* PAYMENT TYPE + METHOD */}
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

      {/* Outstanding indicator + gauge */}
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
        <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
          <div>
            <small style={{ color: "rgba(120,120,120,1)" }}>
              OUTSTANDING AMOUNT
            </small>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>
              {formatPriceAED(totalOutstanding)}
            </div>
          </div>
          <div>
            <small style={{ color: "rgba(120,120,120,1)" }}>
              PAYMENT AMOUNT
            </small>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>
              AED {formatWithCommas(enteredAmt.toFixed(2))}
            </div>
          </div>
        </div>

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
                strokeWidth="14"
                strokeLinecap="butt"
                strokeDasharray={`${arc} ${circ}`}
              />
            </svg>
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
                strokeWidth="14"
                strokeLinecap="butt"
                strokeDasharray={`${(gaugePct / 100) * arc} ${circ}`}
                style={{ transition: "stroke-dasharray 0.4s ease-out" }}
              />
            </svg>
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

      {/* Exceeds warning + Max shortcut */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "-7px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isExceeding && (
            <>
              <img src="/icons/warning.svg" alt="warning" />
              <p style={{ color: "red", margin: 0 }}>
                Payment amount exceeds outstanding amount
              </p>
            </>
          )}
        </div>
        <p
          style={{
            cursor: "pointer",
            color: "rgba(10, 82, 184, 1)",
            fontWeight: "600",
            fontSize: "9px",
          }}
          onClick={() =>
            setPaymentAmount(formatWithCommas(totalOutstanding.toFixed(2)))
          }
        >
          <span style={{ textDecoration: "underline" }}>Max</span> (AED{" "}
          {formatWithCommas(totalOutstanding.toFixed(2))})
        </p>
      </div>

      <br />

      <div className="input-row full">
        <InputItem
          label="NOTES"
          type="textarea"
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
        />
      </div>

      {showSupplierStatement && (
        <div className="input-row full">
          <SingleUploadFileBox
            fileState={statementFile}
            setFileState={setStatementFile}
            label="SUPPLIER STATEMENT"
            acceptedFileTypes=".pdf,.jpg,.jpeg,.png"
            placeholder="UPLOAD SUPPLIER STATEMENT"
            buttonLabel="UPLOAD STATEMENT"
            required
          />
        </div>
      )}

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
