"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";

type ManualAddToStockButtonProp = {
  inventoryItem: InventoryItem;
};

export default function ManualAddToStockButton({
  inventoryItem,
}: ManualAddToStockButtonProp) {
  const { userInfo } = useAuth();

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierID, setSupplierID] = useState<string | number>("");
  const [quantity, setQuantity] = useState("");
  const [reasonForEntry, setReasonForEntry] = useState("");

  const [supplierValues, setSupplierValues] = useState<any>([]);
  const [stockLocationValues, setStockLocationValues] = useState<any>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        setSupplierValues(data);
      });

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: { name: string }) => item.name);
        setStockLocationValues(names);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addStock",
        inventory_item_id: inventoryItem.id,
        supplier_id: supplierID,
        received_by: userInfo?.name,
        quantity,
        location,
        notes,
      }),
    });

    if (res.ok) {
      toast("Added to stock", "success");

      // Reset form fields
      setLocation("");
      setNotes("");
      setSupplierID("");
      setQuantity("");
      setReasonForEntry("");

      router.refresh();

      setIsOpen(false);
    } else {
      toast("Failed to add to stock", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(0, 163, 93, 1)"}
        borderColor={"rgba(0, 163, 93, 1)"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
      >
        ADD STOCK +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ADD STOCK"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"RECEIVED BY"}
              value={userInfo?.name || ""}
              type={"text"}
              placeholder={"ENTER NAME"}
              required
              disabled
              onChange={() => {}}
            />
          </div>
          <div className="input-row half">
            <InputItem
              label={"REASON FOR ENTRY"}
              value={reasonForEntry}
              type={"select"}
              placeholder={"SELECT REASON FOR ENTRY"}
              required
              onChange={(e) => setReasonForEntry(e.target.value)}
              selectOptions={["test"]}
            />
            <SingleSelectDropdown
              label={"SUPPLIER (OPTIONAL)"}
              selectedValue={supplierID}
              onChange={setSupplierID}
              placeholder={"SELECT SUPPLIER"}
              dbData={supplierValues}
              idField="id"
              labelField="name"
            />
          </div>
          <div className="input-row half">
            <div className="input-item">
              <label>QUANTITY</label>
              <div className="input-prefix right">
                <span>{inventoryItem.unit}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="ENTER QUANTITY"
                  required
                  value={quantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setQuantity(value);
                  }}
                />
              </div>
            </div>
            <InputItem
              label={"STOCK LOCATION"}
              value={location}
              type={"select"}
              placeholder={"SELECT LOCATION"}
              required
              onChange={(e) => setLocation(e.target.value)}
              selectOptions={["Headquarters", ...stockLocationValues]}
            />
          </div>
          <div className="input-row full">
            <InputItem
              label={"NOTES (OPTIONAL)"}
              value={notes}
              type={"textarea"}
              placeholder={"ENTER NOTES"}
              required={false}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
