"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { MrLine } from "../../types/mrLine";
import { UNIT_OPTIONS, mapPredefinedUnit } from "@/constants/units";

type Props = {
  item: MrLine;
};

export default function QSEditQtyButton({ item }: Props) {
  const router = useRouter();
  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [qtyValue, setQtyValue] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [error, setError] = useState("");

  function openPopup() {
    const qty = parseFloat(Number(item.quantity).toFixed(3));
    setQtyValue(isNaN(qty) ? "" : String(qty));
    // Normalise unit so it always maps to a known UNIT_OPTIONS value
    setUnitValue(item.unit ? mapPredefinedUnit(item.unit) : "");
    setError("");
    setIsOpen(true);
  }

  async function handleSave() {
    const num = parseFloat(qtyValue);
    if (!qtyValue || isNaN(num) || num <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateMrLineQuantity",
        id: item.id,
        quantity: num,
        unit: unitValue || item.unit,
      }),
    });
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        style={{ padding: "7px 7px" }}
        onClick={openPopup}
      >
        <img src={pencilIcon} alt="edit qty" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="EDIT REQUESTED QUANTITY"
          setIsOpen={setIsOpen}
          handleSubmit={handleSave}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"QUANTITY"}
              value={qtyValue}
              type={"text"}
              placeholder={"ENTER QUANTITY"}
              onChange={(e) => {
                const v = (e as React.ChangeEvent<HTMLInputElement>).target
                  .value;
                // Allow digits and a single decimal point only
                if (v === "" || /^\d*\.?\d*$/.test(v)) {
                  setQtyValue(v);
                  setError("");
                }
              }}
              onBlur={() => {
                const num = parseFloat(qtyValue);
                if (qtyValue && (isNaN(num) || num <= 0)) {
                  setError("Please enter a valid quantity.");
                }
              }}
              required
            />
            {error && (
              <small style={{ color: "red", marginTop: "4px" }}>{error}</small>
            )}
          </div>
          <div className="input-row full">
            <InputItem
              label={"UNIT"}
              value={unitValue}
              type={"select"}
              placeholder={"SELECT UNIT"}
              selectOptions={[...UNIT_OPTIONS]}
              onChange={(e) =>
                setUnitValue(
                  (e as React.ChangeEvent<HTMLSelectElement>).target.value,
                )
              }
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
