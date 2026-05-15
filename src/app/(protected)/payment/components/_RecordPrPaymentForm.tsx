"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { formatPriceAED } from "@/lib/formatPrice";
import { PAYMENT_TYPES, PAYMENT_METHODS } from "./_RecordPaymentForm";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatWithCommas(raw: string): string {
  const [intPart, decPart] = raw.split(".");
  const formattedInt = intPart
    ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : "";
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

// Sequential distribution: fill smallest PRs first to maximise fully-paid records
function distribute(prs: PrPaymentItem[], totalAmount: number): number[] {
  const sorted = prs
    .map((p, i) => ({ i, outstanding: Number(p.outstanding) }))
    .sort((a, b) => a.outstanding - b.outstanding);

  let remaining = totalAmount;
  const amounts = new Array<number>(prs.length).fill(0);

  for (const { i, outstanding } of sorted) {
    const amt = Math.min(outstanding, Math.max(0, remaining));
    amounts[i] = amt;
    remaining -= amt;
  }

  return amounts;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PrPaymentItem = {
  id: number;
  outstanding: number;
};

export type RecordPrPaymentFormProps = {
  prs: PrPaymentItem[];
  subcontractorName: string;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSuccess: () => void;
  recordedBy: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecordPrPaymentForm({
  prs,
  subcontractorName,
  isOpen,
  setIsOpen,
  onSuccess,
  recordedBy,
}: RecordPrPaymentFormProps) {
  const totalOutstanding = prs.reduce((s, p) => s + Number(p.outstanding), 0);

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

  const enteredAmt = Math.max(0, Number(paymentAmount.replace(/,/g, "")) || 0);
  const isExceeding = enteredAmt > totalOutstanding && enteredAmt > 0;
  const capped = Math.min(enteredAmt, totalOutstanding);
  const distribution = distribute(prs, capped);

  const handleSubmit = async () => {
    if (isExceeding) {
      toast("Payment amount exceeds the total outstanding balance", "error");
      return;
    }
    try {
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

      // Only submit PRs that received a non-zero allocation
      const toSubmit = prs
        .map((pr, i) => ({ pr, amount: distribution[i] }))
        .filter(({ amount }) => amount > 0);

      const results = await Promise.all(
        toSubmit.map(({ pr, amount }) =>
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "recordPrPayment",
              pr_id: pr.id,
              payment_type: paymentType,
              payment_method: paymentMethod,
              amount,
              receipt_file: receiptUrl,
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

  const prNumbers = prs
    .map((p) => `PR-${String(p.id).padStart(5, "0")}`)
    .join(", ");

  return (
    <FormPopUp
      header="RECORD PAYMENT"
      setIsOpen={handleClose as React.Dispatch<React.SetStateAction<boolean>>}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
      style={{ maxWidth: "520px" }}
    >
      {/* PR NUMBER + SUBCONTRACTOR */}
      <div className="input-row half">
        <InputItem
          label="PR NUMBER"
          type="text"
          value={prNumbers}
          onChange={() => {}}
          disabled
          required
          noOptionalLabel
        />
        <InputItem
          label="SUBCONTRACTOR"
          type="text"
          value={subcontractorName || "-"}
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
