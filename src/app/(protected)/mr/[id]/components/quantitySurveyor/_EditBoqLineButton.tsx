"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";

type Props = {
  initialCompletedQty: string;
  initialRetention: string;
  unit?: string | null;
  onSave: (completedQty: string, retention: string) => void | Promise<void>;
};

export default function EditBoqLineButton({
  initialCompletedQty,
  initialRetention,
  unit,
  onSave,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [completedQty, setCompletedQty] = useState("");
  const [retention, setRetention] = useState("");

  function handleOpen() {
    setCompletedQty(initialCompletedQty);
    setRetention(initialRetention);
    setIsOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(completedQty, retention);
    setIsOpen(false);
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor="black"
        style={{ padding: "7px 7px" }}
        onClick={handleOpen}
      >
        <img src="/icons/pencil.svg" alt="edit" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="EDIT BOQ LINE"
          setIsOpen={(open) => {
            if (!open) setIsOpen(false);
          }}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row half">
            <InputItem
              label="COMPLETED QTY"
              value={completedQty}
              type="text postfix"
              postfixText={unit || ""}
              placeholder="ENTER COMPLETED QTY"
              required
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) setCompletedQty(val);
              }}
            />
            <InputItem
              label="RETENTION (%)"
              value={retention}
              type="text"
              placeholder="ENTER RETENTION"
              required
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) setRetention(val);
              }}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
