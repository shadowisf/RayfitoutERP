"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import GRNRefPopUp from "./_GRNRefPopUp";
import { toast } from "@/app/components/Toast";
import { InventoryItem } from "@/app/(protected)/inventory/types/inventoryItem";

export default function AddInventoryButton({
  mrLine,
}: AddInventoryButtonProps) {
  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [existingInventory, setExistingInventory] =
    useState<InventoryItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const pencilIcon = "/icons/pencil.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  useEffect(() => {
    checkExistingInventory();
  }, [mrLine.id]);

  async function checkExistingInventory() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
        {
          method: "GET",
        }
      );

      if (res.ok) {
        const data = await res.json();

        if (data.success && data.data) {
          // Find inventory item that matches this MR line
          const inventoryItem = data.data.find(
            (item: InventoryItem) =>
              item.category === mrLine.material_category &&
              item.subcategory === mrLine.material_subcategory &&
              item.item === mrLine.material_description
          );

          if (inventoryItem) {
            setExistingInventory(inventoryItem);
            setIsEditMode(true);
            setLocation(inventoryItem.location);
            setNotes(inventoryItem.notes || "");
          } else {
            setExistingInventory(null);
            setIsEditMode(false);
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing inventory:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!location) {
      toast("Please select a location", "error");
      return;
    }

    if (isEditMode && existingInventory) {
      // Update existing inventory
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateStock",
            id: existingInventory.id,
            location: location,
            notes: notes,
          }),
        }
      );

      if (res.ok) {
        toast("Inventory item updated", "success");
        setIsOpen(false);
        await checkExistingInventory();
      } else {
        toast("Failed to update inventory item", "error");
      }
    } else {
      // Add new inventory
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addToStock",
            id: mrLine.id,
            batch_id: mrLine.mr_header_id,
            category: mrLine.material_category,
            subcategory: mrLine.material_subcategory,
            item: mrLine.material_description,
            location: location,
            total_quantity: mrLine.quantity,
            unit: mrLine.unit,
            notes: notes,
          }),
        }
      );

      if (res.ok) {
        toast("Stock added", "success");
        setIsOpen(false);
        await checkExistingInventory();
      } else {
        toast("Failed to add stock", "error");
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
        <img src={pencilIcon} alt="pencil" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={isEditMode ? "UPDATE INVENTORY ITEM" : "ADD INVENTORY ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
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

          <div className="input-row half">
            <InputItem
              label={"ITEM"}
              value={mrLine.material_description}
              type={"text"}
              placeholder={""}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"LOCATION"}
              value={location}
              type={"select"}
              placeholder={"SELECT LOCATION"}
              required
              onChange={(e) => {
                setLocation(e.target.value);
              }}
              selectOptions={["Headquarters", `${mrLine.project_name}`]}
            />
          </div>

          <div className="input-row half">
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

          <div className="input-row">
            <InputItem
              label={"GRN REF."}
              value={mrLine.approved_supplier_name}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />

            <GRNRefPopUp
              bgColor={"rgba(239, 239, 239, 1)"}
              borderColor={"rgba(207, 207, 207, 1)"}
              textColor={"black"}
              mrLine={mrLine}
              style={{
                borderRadius: "5px",
                padding: "7px 7px",
              }}
            >
              <img src={externalLinkIcon} alt="external link" height={11} />
            </GRNRefPopUp>
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
