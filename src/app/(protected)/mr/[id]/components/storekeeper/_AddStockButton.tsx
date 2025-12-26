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
    null
  );

  const [inventoryItemValues, setInventoryItemValues] = useState<any>([]);

  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [inventoryItemID, setInventoryItemID] = useState<string | number>("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        setInventoryItemValues(data.data);
      });
  }, []);

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
        }
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

  // Function to calculate similarity between two strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match
    if (s1 === s2) return 1000;

    // Contains match (higher score for shorter containing string)
    if (s1.includes(s2)) return 500 / s1.length;
    if (s2.includes(s1)) return 500 / s2.length;

    // Word-based matching
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    let matchingWords = 0;
    words1.forEach((word1) => {
      if (
        words2.some((word2) => word2.includes(word1) || word1.includes(word2))
      ) {
        matchingWords++;
      }
    });

    return (matchingWords / Math.max(words1.length, words2.length)) * 100;
  };

  // Find closest matching inventory item
  const findClosestMatch = () => {
    if (!inventoryItemValues || inventoryItemValues.length === 0) return "";

    const searchText = mrLine.material_description || "";

    if (!searchText) return "";

    let bestMatch = inventoryItemValues[0];
    let bestScore = 0;

    inventoryItemValues.forEach((item: any) => {
      const score = calculateSimilarity(item.description, searchText);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    });

    // Only auto-select if there's a reasonable match (score > 10)
    if (bestScore > 10) {
      return bestMatch.id;
    }

    return "";
  };

  // Auto-select closest match when modal opens (only for create mode)
  useEffect(() => {
    if (
      isOpen &&
      !isEditMode &&
      inventoryItemValues.length > 0 &&
      !inventoryItemID
    ) {
      const closestMatch = findClosestMatch();
      if (closestMatch) {
        setInventoryItemID(closestMatch);
      }
    }
  }, [isOpen, isEditMode, inventoryItemValues]);

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
          category_id: mrLine.material_category_id,
          subcategory_id: mrLine.material_subcategory_id,
          unit: mrLine.unit,
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
          header={isEditMode ? "UPDATE STOCK" : "ADD STOCK"}
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
              labelField="description"
              formatOptionLabel={(item) =>
                `MRT-${String(item.id).padStart(5, "0")} - ${item.description}`
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
                "Umm Al Quwain warehouse",
                `${mrLine.project_name}`,
              ]}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"NOTES (OPTIONAL)"}
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
