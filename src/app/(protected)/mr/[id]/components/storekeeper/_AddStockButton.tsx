"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState, useEffect } from "react";
import { MrLine } from "../../types/mrLine";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import CreateInventoryItemButton from "@/app/(protected)/inventory/components/_CreateInventoryItemButton";

type AddToStockButtonProps = {
  mrLine: MrLine;
};

type ExistingStock = {
  id: number;
  batch_id: number;
  inventory_item_id: number;
  quantity: number;
  location: string;
  notes: string;
};

export default function AddToStockButton({ mrLine }: AddToStockButtonProps) {
  const { userInfo } = useAuth();

  const router = useRouter();

  const plusIcon = "/icons/plus.svg";
  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [existingStock, setExistingStock] = useState<ExistingStock | null>(
    null,
  );

  const [inventoryItemValues, setInventoryItemValues] = useState<any>([]);
  const [locationValues, setLocationValues] = useState<any[]>([]);

  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [inventoryItemID, setInventoryItemID] = useState<string | number>("");

  useEffect(() => {
    fetchInventoryItems();
  }, [isOpen]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: any) => item.name);
        setLocationValues(names);
      });
  }, []);

  const fetchInventoryItems = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
        {
          method: "GET",
        },
      );
      const data = await res.json();
      setInventoryItemValues(data.data);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  // Check if stock already exists for this mr_line
  async function checkExistingStock() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockByMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_line_id: mrLine.id,
          }),
        },
      );

      const data = await res.json();

      if (data.success && data.data) {
        setExistingStock(data.data);
        setIsEditMode(true);
      } else {
        setExistingStock(null);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error("Error checking for existing stock:", error);
      setExistingStock(null);
      setIsEditMode(false);
    }
  }

  useEffect(() => {
    checkExistingStock();
  }, [mrLine.id]);

  // Load existing stock data when modal opens in edit mode
  useEffect(() => {
    if (isOpen && isEditMode && existingStock) {
      setInventoryItemID(existingStock.inventory_item_id);
      setLocation(existingStock.location);
      setNotes(existingStock.notes || "");
    }
  }, [isOpen, isEditMode, existingStock]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEditMode && existingStock) {
      // Update existing stock
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateStock",
          id: existingStock.id,
          inventory_item_id: inventoryItemID,
          location,
          notes,
        }),
      });

      if (res.ok) {
        toast("Stock updated", "success");
        setIsOpen(false);

        // Refetch the stock data after update
        await checkExistingStock();

        router.refresh();
      } else {
        toast("Failed to update stock", "error");
      }
    } else {
      // Add new stock
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addStock",
          mr_header_id: mrLine.mr_header_id,
          mr_line_id: mrLine.id,
          inventory_item_id: inventoryItemID,
          supplier_id: mrLine.approved_supplier_id,
          received_by: userInfo?.name,
          unit_price: mrLine.approved_unit_price,
          quantity: mrLine.quantity,
          location,
          notes,
        }),
      });

      if (res.ok) {
        toast("Added to stock", "success");

        setLocation("");
        setNotes("");
        setInventoryItemID("");

        // Refetch to check if stock now exists
        await checkExistingStock();

        router.refresh();

        setIsOpen(false);
      } else {
        toast("Failed to add to stock", "error");
      }
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: "5px", padding: "7px 7px" }}
      >
        <img src={isEditMode ? pencilIcon : plusIcon} alt="plus or pencil" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={
            isEditMode
              ? `UPDATE STOCK FOR ${mrLine.material_description.toUpperCase()}`
              : `ADD STOCK FOR ${mrLine.material_description.toUpperCase()}`
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row half">
            <InputItem
              label={"SUPPLIER"}
              value={mrLine.approved_supplier_name}
              type={"text"}
              placeholder={""}
              required
              onChange={() => {}}
              disabled
            />

            <InputItem
              label={"RECEIVED BY"}
              value={userInfo?.name || ""}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"CATEGORY"}
              value={mrLine.material_category}
              type={"text"}
              placeholder={""}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"SUBCATEGORY"}
              value={mrLine.material_subcategory}
              type={"text"}
              placeholder={""}
              required
              onChange={() => {}}
              disabled
            />
          </div>

          <div className="input-row three-col">
            <SingleSelectDropdown
              label={"ITEM"}
              selectedValue={inventoryItemID}
              onChange={setInventoryItemID}
              placeholder={"SELECT ITEM"}
              dbData={inventoryItemValues}
              required
              idField="id"
              /* labelField="description" */
              formatOptionLabel={(item) =>
                `INV-${String(item.id).padStart(5, "0")} - ${item.description}`
              }
              /* createButtonLabel="NEW INVENTORY ITEM +"
              showCreateButton */
              style={{ width: "300px" }}
              /* onCreateClick={() => setIsCreateInventoryItemOpen(true)} */
              bottomButtonComponent={
                <CreateInventoryItemButton
                  style={{ width: "100%" }}
                  onSuccess={() => fetchInventoryItems()}
                />
              }
            />
            <InputItem
              label={"QUANTITY"}
              value={mrLine.quantity}
              type={"text"}
              placeholder={""}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"UNIT"}
              value={mrLine.unit}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"STOCK LOCATION"}
              value={location}
              type={"select"}
              placeholder={"SELECT LOCATION"}
              required
              onChange={(e) => {
                setLocation(e.target.value);
              }}
              selectOptions={[
                "Headquarters",
                "Umm Al Quwain Warehouse",
                ...locationValues,
              ]}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"NOTES"}
              value={notes}
              type={"textarea"}
              placeholder={"ENTER NOTES"}
              required={false}
              onChange={(e) => {
                setNotes(e.target.value);
              }}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
