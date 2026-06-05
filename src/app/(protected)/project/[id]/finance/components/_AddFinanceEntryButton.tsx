"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";

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
            <div className="input-row half">
              <InputItem
                label={`${label} TYPE`}
                type="select"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "one_time" | "recurring")
                }
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
        )}
    </>
  );
}
