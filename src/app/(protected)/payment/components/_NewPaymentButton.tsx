"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { formatPriceAED } from "@/lib/formatPrice";
import { PAYMENT_TYPES, PAYMENT_METHODS } from "./_RecordPaymentForm";
import { useAuth } from "@/app/context/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatWithCommas(raw: string): string {
  const [intPart, decPart] = raw.split(".");
  const formattedInt = intPart
    ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : "";
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LpoOption = {
  id: number;
  mr_header_id: number;
  supplier_id: number;
  supplier_name: string;
  project_name: string;
  requested_by: string;
  outstanding: number;
};

type Props = {
  onSuccess?: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewPaymentButton({ onSuccess }: Props) {
  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [lpoOptions, setLpoOptions] = useState<LpoOption[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Selection state
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedLpoId, setSelectedLpoId] = useState<number | "">("");

  // Payment form state
  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Fetch unpaid LPOs when popup opens
  useEffect(() => {
    if (!isOpen) return;
    setIsFetching(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getPaymentList`)
      .then((r) => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setLpoOptions(
            data
              .filter((r) => r.is_paid !== 1)
              .map((r) => ({
                id: r.id,
                mr_header_id: r.mr_header_id,
                supplier_id: r.supplier_id,
                supplier_name: r.supplier_name,
                project_name: r.project_name ?? "",
                requested_by: r.requested_by ?? "",
                outstanding: Number(r.outstanding),
              })),
          );
        }
      })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [isOpen]);

  const reset = () => {
    setSelectedVendor("");
    setSelectedLpoId("");
    setPaymentType("");
    setPaymentMethod("");
    setPaymentAmount("");
    setPaymentNotes("");
    setReceiptFile(null);
  };

  const handleOpen = () => {
    reset();
    setIsOpen(true);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    setIsOpen(v);
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const vendorList = Array.from(
    new Map(lpoOptions.map((l) => [l.supplier_id, l.supplier_name])).entries(),
  )
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b));

  const filteredLpos = selectedVendor
    ? lpoOptions.filter((l) => l.supplier_name === selectedVendor)
    : [];

  const selectedLpo =
    selectedLpoId !== ""
      ? (lpoOptions.find((l) => l.id === selectedLpoId) ?? null)
      : null;
  const outstanding = selectedLpo?.outstanding ?? 0;
  const showForm = !!selectedLpo;

  // ── Gauge ───────────────────────────────────────────────────────────────────

  const enteredAmt = Number(paymentAmount.replace(/,/g, "")) || 0;
  const isExceeding = enteredAmt > outstanding && enteredAmt > 0;
  const gaugePct =
    outstanding > 0 ? Math.min((enteredAmt / outstanding) * 100, 100) : 0;
  const gaugeColor = isExceeding ? "rgba(248,77,77,1)" : "rgba(26,216,135,1)";
  const r = 33;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedLpo) return;
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
            lpo_id: selectedLpo.id,
            mr_header_id: selectedLpo.mr_header_id,
            payment_type: paymentType,
            payment_method: paymentMethod,
            amount: numericAmount,
            receipt_file: receiptUrl,
            notes: paymentNotes || null,
            recorded_by: userInfo?.name || userInfo?.email || "Finance",
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast("Payment recorded", "success");
        reset();
        setIsOpen(false);
        onSuccess?.();
      } else {
        toast("Failed to record payment", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error recording payment", "error");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Button
        componentType="button"
        bgColor="black"
        borderColor="black"
        textColor="white"
        onClick={handleOpen}
      >
        NEW PAYMENT +
      </Button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <FormPopUp
            header="NEW PAYMENT"
            setIsOpen={
              handleClose as React.Dispatch<React.SetStateAction<boolean>>
            }
            handleSubmit={handleSubmit}
            addButtonLabel="CONFIRM"
            style={{ maxWidth: "520px", height: "95dvh" }}
          >
            {isFetching ? (
              <div
                style={{ textAlign: "center", color: "#888", padding: "20px" }}
              >
                Loading LPOs...
              </div>
            ) : (
              <>
                {/* ── VENDOR + LPO (half layout) ───────────────────────────── */}
                <div className="input-row half">
                  <SingleSelectDropdown
                    label="VENDOR"
                    placeholder="SELECT VENDOR"
                    selectedValue={selectedVendor}
                    onChange={(val) => {
                      setSelectedVendor(String(val));
                      setSelectedLpoId("");
                      setPaymentAmount("");
                    }}
                    selectOptions={vendorList}
                    required
                  />

                  <SingleSelectDropdown
                    label="LPO"
                    placeholder="SELECT LPO"
                    selectedValue={selectedLpoId}
                    onChange={(val) => {
                      setSelectedLpoId(val === "" ? "" : Number(val));
                      setPaymentAmount("");
                    }}
                    dbData={filteredLpos}
                    idField="id"
                    formatOptionLabel={(l) =>
                      `LPO-${String(l.id).padStart(5, "0")} - ${l.project_name || "—"} - ${l.requested_by || "—"}`
                    }
                    disabled={!selectedVendor}
                    required
                  />
                </div>

                {/* ── REST OF FORM (only when LPO selected) ────────────────── */}
                {showForm && (
                  <>
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

                    {/* OUTSTANDING INDICATOR + GAUGE */}
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
                      <div
                        style={{
                          display: "flex",
                          gap: "25px",
                          alignItems: "center",
                        }}
                      >
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

                      {/* Gauge */}
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
                          style={{
                            position: "relative",
                            width: "90px",
                            height: "90px",
                          }}
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
                              style={{
                                transition: "stroke-dasharray 0.4s ease-out",
                              }}
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
                          style={{
                            color: "rgba(120,120,120,1)",
                            textAlign: "center",
                          }}
                        >
                          PAYMENT PROGRESS
                        </small>
                      </div>
                    </div>

                    <br />

                    {/* PAYMENT AMOUNT */}
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

                    {/* WARNING + MAX */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "-7px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
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
                          setPaymentAmount(
                            formatWithCommas(outstanding.toFixed(2)),
                          )
                        }
                      >
                        <span style={{ textDecoration: "underline" }}>Max</span>{" "}
                        (AED {formatWithCommas(outstanding.toFixed(2))})
                      </p>
                    </div>

                    <br />

                    {/* NOTES */}
                    <div className="input-row full">
                      <InputItem
                        label="NOTES"
                        type="textarea"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>

                    {/* RECEIPT */}
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
                  </>
                )}
              </>
            )}
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
