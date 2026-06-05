"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type EntryType = "revenue" | "expense";

type Props = {
  projectId: string;
  entryType: EntryType;
  onSuccess: () => void;
};

const FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export default function AddFinanceEntryButton({
  projectId,
  entryType,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<"one_time" | "recurring">("one_time");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const label = entryType === "revenue" ? "REVENUE" : "EXPENSES";
  const bgColor =
    entryType === "revenue" ? "rgba(0,163,93,1)" : "rgba(238, 79, 79, 1)";

  const reset = () => {
    setType("one_time");
    setName("");
    setAmount("");
    setFrequency("");
    setStartDate("");
    setEndDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Please enter a name", "error");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
    if (type === "recurring" && !frequency) {
      toast("Please select a frequency", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/manageFinanceEntry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            project_id: projectId,
            entry_type: entryType,
            name: name.trim(),
            amount: Number(amount),
            is_recurring: type === "recurring" ? 1 : 0,
            frequency: type === "recurring" ? frequency : null,
            start_date: type === "recurring" && startDate ? startDate : null,
            end_date: type === "recurring" && endDate ? endDate : null,
          }),
        },
      );
      if (!res.ok) throw new Error();
      toast(`${label} entry added`, "success");
      setIsOpen(false);
      reset();
      onSuccess();
    } catch {
      toast(`Failed to add ${label.toLowerCase()} entry`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor={bgColor}
        borderColor={bgColor}
        textColor="white"
        full
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        style={{ padding: "25px" }}
      >
        ADD {label} +
      </Button>

      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header={`ADD ${label}`}
            setIsOpen={(val) => {
              setIsOpen(val);
              if (!val) reset();
            }}
            handleSubmit={handleSubmit}
            addButtonLabel="ADD"
            haveLoadingState
          >
            {/* TYPE */}
            <div style={{ marginBottom: "20px" }}>
              <small
                style={{
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "rgba(120,120,120,1)",
                }}
              >
                {label} TYPE
              </small>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "one_time" | "recurring")
                }
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(217,217,217,1)",
                  backgroundColor: "white",
                }}
              >
                <option value="one_time">ONE TIME</option>
                <option value="recurring">RECURRING</option>
              </select>
            </div>

            {/* NAME */}
            <div style={{ marginBottom: "20px" }}>
              <small
                style={{
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "rgba(120,120,120,1)",
                }}
              >
                {label} NAME
              </small>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(217,217,217,1)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* AMOUNT */}
            <div style={{ marginBottom: type === "recurring" ? "20px" : "0" }}>
              <small
                style={{
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "rgba(120,120,120,1)",
                }}
              >
                AMOUNT
              </small>
              <div style={{ position: "relative", marginTop: "6px" }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="000"
                  style={{
                    width: "100%",
                    padding: "10px 50px 10px 10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(217,217,217,1)",
                    boxSizing: "border-box",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(150,150,150,1)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  AED
                </span>
              </div>
            </div>

            {/* RECURRING FIELDS */}
            {type === "recurring" && (
              <>
                <div style={{ marginBottom: "20px" }}>
                  <small
                    style={{
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color: "rgba(120,120,120,1)",
                    }}
                  >
                    FREQUENCY
                  </small>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    style={{
                      width: "100%",
                      marginTop: "6px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(217,217,217,1)",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="">SELECT FREQUENCY</option>
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <small
                      style={{
                        textTransform: "uppercase",
                        fontWeight: 600,
                        color: "rgba(120,120,120,1)",
                      }}
                    >
                      START DATE (OPTIONAL)
                    </small>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        width: "100%",
                        marginTop: "6px",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(217,217,217,1)",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <small
                      style={{
                        textTransform: "uppercase",
                        fontWeight: 600,
                        color: "rgba(120,120,120,1)",
                      }}
                    >
                      END DATE (OPTIONAL)
                    </small>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{
                        width: "100%",
                        marginTop: "6px",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(217,217,217,1)",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
