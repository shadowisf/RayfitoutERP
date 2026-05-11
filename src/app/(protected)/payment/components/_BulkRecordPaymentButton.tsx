"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FormPopUp from "@/app/components/FormPopup";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
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

// ── Types ─────────────────────────────────────────────────────────────────────

export type BulkLpoRow = {
  id: number;
  mr_header_id: number;
  supplier_name: string;
  outstanding: number;
};

type Props = {
  selectedRows: BulkLpoRow[];
  onSuccess: () => void;
  recordedBy: string;
  isOpenControlled?: boolean;
  setIsOpenControlled?: (v: boolean) => void;
};

// ── Sequential distribution ───────────────────────────────────────────────────
// Sorts LPOs lowest→highest outstanding, fills smallest first so we maximise
// fully-paid records. Returns amounts keyed by original row index.

function distribute(rows: BulkLpoRow[], totalAmount: number): number[] {
  // Build sorted index list (ascending outstanding)
  const sorted = rows
    .map((r, i) => ({ i, outstanding: Number(r.outstanding) }))
    .sort((a, b) => a.outstanding - b.outstanding);

  let remaining = totalAmount;
  const amounts = new Array<number>(rows.length).fill(0);

  for (const { i, outstanding } of sorted) {
    const amt = Math.min(outstanding, Math.max(0, remaining));
    amounts[i] = amt;
    remaining -= amt;
  }

  return amounts;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BulkRecordPaymentButton({
  selectedRows,
  onSuccess,
  recordedBy,
  isOpenControlled,
  setIsOpenControlled,
}: Props) {
  const router = useRouter();
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen =
    isOpenControlled !== undefined ? isOpenControlled : isOpenInternal;
  const setIsOpen =
    setIsOpenControlled !== undefined ? setIsOpenControlled : setIsOpenInternal;

  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const totalOutstanding = useMemo(
    () => selectedRows.reduce((s, r) => s + Number(r.outstanding), 0),
    [selectedRows],
  );

  const enteredAmt = Math.max(0, Number(paymentAmount.replace(/,/g, "")) || 0);
  const isExceeding = enteredAmt > totalOutstanding && enteredAmt > 0;
  const capped = Math.min(enteredAmt, totalOutstanding);

  // Live per-LPO breakdown
  const distribution = useMemo(
    () => distribute(selectedRows, capped),
    [selectedRows, capped],
  );

  const lpoNumbers = selectedRows
    .map((r) => `LPO-${String(r.id).padStart(5, "0")}`)
    .join(", ");
  const vendorNames = Array.from(
    new Set(selectedRows.map((r) => r.supplier_name).filter(Boolean)),
  ).join(", ");

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
    if (isExceeding) {
      toast("Payment amount exceeds the total outstanding balance", "error");
      return;
    }
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

      // Only submit LPOs that received a non-zero allocation
      const toSubmit = selectedRows
        .map((row, i) => ({ row, amount: distribution[i] }))
        .filter(({ amount }) => amount > 0);

      const results = await Promise.all(
        toSubmit.map(({ row, amount }) =>
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "recordPayment",
              lpo_id: row.id,
              mr_header_id: row.mr_header_id,
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
          `${toSubmit.length} payment${toSubmit.length !== 1 ? "s" : ""} recorded`,
          "success",
        );
        reset();
        setIsOpen(false);
        router.refresh();
        onSuccess();
      } else {
        toast(`${failed.length} payment(s) failed`, "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error recording payments", "error");
    }
  };

  // ── 270° arc gauge ──────────────────────────────────────────────────────────
  const gaugePct =
    totalOutstanding > 0
      ? Math.min((enteredAmt / totalOutstanding) * 100, 100)
      : 0;
  const gaugeColor = isExceeding ? "rgba(248,77,77,1)" : "rgba(26,216,135,1)";
  const r = 33;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;

  return (
    <>
      {isOpenControlled === undefined && (
        <Button
          componentType="button"
          bgColor="rgba(65, 187, 135, 1)"
          borderColor="rgba(65, 187, 135, 1)"
          textColor="white"
          style={{ borderRadius: "50px", padding: "7px 20px", fontWeight: 600 }}
          onClick={() => setIsOpen(true)}
        >
          Record Payment ({selectedRows.length})
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header="MASS RECORD PAYMENTS"
          setIsOpen={
            handleClose as React.Dispatch<React.SetStateAction<boolean>>
          }
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
              value={vendorNames || "-"}
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
                  {paymentAmount ? paymentAmount : "-"}
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
              <div
                style={{ position: "relative", width: "90px", height: "90px" }}
              >
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
              <small
                style={{ color: "rgba(120,120,120,1)", textAlign: "center" }}
              >
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

          {/* ── Exceeds warning + Max shortcut ─────────────────────────────── */}
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
      )}
    </>
  );
}
