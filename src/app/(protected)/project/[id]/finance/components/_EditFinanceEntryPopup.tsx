"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";

type FinanceEntry = {
  id: number;
  entry_type: "revenue" | "expense";
  name: string;
  amount: number;
  is_recurring: number;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
};

type Props = {
  entry: FinanceEntry;
  onClose: () => void;
  onSuccess: () => void;
};

const FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export default function EditFinanceEntryPopup({
  entry,
  onClose,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(entry.name);
  const [amount, setAmount] = useState(String(entry.amount));
  const [type, setType] = useState<"one_time" | "recurring">(
    entry.is_recurring ? "recurring" : "one_time",
  );
  const [frequency, setFrequency] = useState(entry.frequency ?? "");
  const [startDate, setStartDate] = useState(entry.start_date ?? "");
  const [endDate, setEndDate] = useState(entry.end_date ?? "");

  const label = entry.entry_type === "revenue" ? "REVENUE" : "EXPENSES";

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
            action: "update",
            id: entry.id,
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
      toast("Entry updated", "success");
      onClose();
      onSuccess();
    } catch {
      toast("Failed to update entry", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof window === "undefined") return null;

  return createPortal(
    <FormPopUp
      header={`EDIT ${label}`}
      setIsOpen={(val) => {
        if (!val) onClose();
      }}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <div className="input-row half">
        <InputItem
          label={`${label} TYPE`}
          type="select"
          value={type}
          onChange={(e) => setType(e.target.value as "one_time" | "recurring")}
          required
          noOptionalLabel
          dbMap={
            <>
              <option value="one_time">ONE TIME</option>
              <option value="recurring">RECURRING</option>
            </>
          }
        />
        <InputItem
          label="AMOUNT"
          type="text postfix"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="000"
          postfixText="AED"
          required
        />
      </div>
      <div className="input-row full">
        <InputItem
          label={`${label} NAME`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      {type === "recurring" && (
        <>
          <div className="input-row full">
            <InputItem
              label="FREQUENCY"
              type="select"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
              dbMap={
                <>
                  <option value="">SELECT FREQUENCY</option>
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </option>
                  ))}
                </>
              }
            />
          </div>
          <div className="input-row half">
            <InputItem
              label="START DATE"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <InputItem
              label="END DATE"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </>
      )}
    </FormPopUp>,
    document.body,
  );
}
