"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import CreateInventoryItemButton from "@/app/(protected)/inventory/components/_CreateInventoryItemButton";
import { useRefresh } from "@/app/context/RefreshContext";

type ReplaceDetail = {
  id: number;
  qc_mr_line_id: number;
  lpo_id: number;
  lpo_mr_line_id: number;
  mr_line_id: number;
  mr_header_id: number;
  replaced_quantity: number;
  replacement_type: string;
  material_description: string;
  material_category: string;
  material_subcategory: string;
  new_material_name: string | null;
  new_category_name: string | null;
  new_subcategory_names: string[];
  unit: string;
  unit_price: number;
  supplier_name: string;
};

type AddReplaceStockButtonProps = {
  detail: ReplaceDetail;
  onRefresh?: () => void;
};

type ExistingStock = {
  id: number;
  batch_id: number;
  inventory_item_id: number;
  quantity: number;
  location: string;
  notes: string;
};

export default function AddReplaceStockButton({
  detail,
  onRefresh,
}: AddReplaceStockButtonProps) {
  const { userInfo } = useAuth();
  const router = useRouter();
  const { refresh } = useRefresh();


  const plusIcon = "/icons/plus.svg";
  const pencilIcon = "/icons/pencil.svg";

  const isApprovedAlt = detail.replacement_type === "Approved alternative";
  const stockDescription =
    isApprovedAlt && detail.new_material_name
      ? detail.new_material_name
      : detail.material_description;
  const stockCategory =
    isApprovedAlt && detail.new_category_name
      ? detail.new_category_name
      : detail.material_category;
  const stockSubcategory =
    isApprovedAlt && detail.new_subcategory_names?.length > 0
      ? detail.new_subcategory_names.join(", ")
      : detail.material_subcategory;

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
            mr_line_id: detail.mr_line_id,
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
  }, [detail.mr_line_id]);

  // Load existing stock data when modal opens in edit mode
  useEffect(() => {
    if (isOpen && isEditMode && existingStock) {
      setInventoryItemID(existingStock.inventory_item_id);
      setLocation(existingStock.location);
      setNotes(existingStock.notes || "");
    }
  }, [isOpen, isEditMode, existingStock]);

  const formatQty = (qty: number) => {
    return qty % 1 === 0 ? qty.toFixed(0) : qty.toString();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEditMode && existingStock) {
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
        onRefresh?.();
        setIsOpen(false);
        await checkExistingStock();
        await refresh();
      } else {
        toast("Failed to update stock", "error");
      }
    } else {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addStock",
          mr_header_id: detail.mr_header_id,
          mr_line_id: detail.mr_line_id,
          inventory_item_id: inventoryItemID,
          supplier_id: null,
          received_by: userInfo?.name,
          unit_price: detail.unit_price,
          quantity: detail.replaced_quantity,
          location,
          notes,
          inventory_item_unit: detail.unit,
          inventory_item_description: stockDescription,
          manually_add: false,
        }),
      });

      if (!res.ok) {
        toast("Failed to add stock", "error");
        return;
      }

      toast("Added to stock", "success");
      setLocation("");
      setNotes("");
      setInventoryItemID("");
      onRefresh?.();
      await checkExistingStock();
      await refresh();
      setIsOpen(false);
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", borderRadius: "25px" }}
      >
        {isEditMode ? (
          <>
            Edit Stock{" "}
            <img src={pencilIcon} alt="edit" style={{ filter: "invert(1)" }} />
          </>
        ) : (
          <>Add Stock +</>
        )}
      </Button>

      {isOpen && (
        <FormPopUp
          header={
            isEditMode
              ? `UPDATE STOCK FOR ${stockDescription.toUpperCase()}`
              : `ADD STOCK FOR ${stockDescription.toUpperCase()}`
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row half">
            <InputItem
              label={"SUPPLIER"}
              value={detail.supplier_name}
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
              value={stockCategory}
              type={"text"}
              placeholder={""}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"SUBCATEGORY"}
              value={stockSubcategory}
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
              formatOptionLabel={(item) =>
                `INV-${String(item.id).padStart(5, "0")} - ${item.description}`
              }
              style={{ width: "300px" }}
              bottomButtonComponent={
                <CreateInventoryItemButton
                  style={{ width: "100%" }}
                  onSuccess={() => fetchInventoryItems()}
                />
              }
            />
            <InputItem
              label={"UNIT"}
              value={detail.unit}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
            <div></div>
          </div>

          <div className="input-row half">
            <InputItem
              label={"QUANTITY"}
              value={formatQty(detail.replaced_quantity)}
              type={"text"}
              placeholder={""}
              required
              onChange={() => {}}
              disabled
            />
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
