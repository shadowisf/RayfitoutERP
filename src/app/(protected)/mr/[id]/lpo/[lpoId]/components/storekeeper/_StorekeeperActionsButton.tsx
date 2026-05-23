"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import CreateInventoryItemButton from "@/app/(protected)/inventory/components/_CreateInventoryItemButton";
import { MrLine } from "../../../../types/mrLine";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";

type Props = {
  selectedItemIds: Set<number>;
  setSelectedItemIds: (ids: Set<number>) => void;
  allItems: MrLine[];
  hasGrn?: boolean;
  inventoryStatus?: { [itemId: number]: boolean };
  onSingleItemStock?: (itemId: number) => void;
  onStockAdded?: () => void;
};

export default function StorekeeperActionsButton({
  selectedItemIds,
  setSelectedItemIds,
  allItems,
  hasGrn = false,
  inventoryStatus = {},
  onSingleItemStock,
  onStockAdded,
}: Props) {
  const { userInfo } = useAuth();
  const router = useRouter();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [inventoryItemValues, setInventoryItemValues] = useState<any[]>([]);
  const [locationValues, setLocationValues] = useState<string[]>([]);
  const [inventoryItemID, setInventoryItemID] = useState<string | number>("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node))
        setActionsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchInventoryItems = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
        { method: "GET" },
      );
      const data = await res.json();
      setInventoryItemValues(data.data);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, { method: "GET" })
      .then((r) => r.json())
      .then((data) => setLocationValues(data.map((p: any) => p.name)));
  }, []);

  // Only include items that are selected AND don't already have stock
  const selectedItems = allItems.filter(
    (item) => selectedItemIds.has(item.id) && !inventoryStatus[item.id],
  );
  const eligibleCount = selectedItems.length;

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await Promise.all(
        selectedItems.map(async (mrLine) => {
          const proposedQty = Number(mrLine.approved_proposed_quantity) || 0;
          const requestedQty = Number(mrLine.quantity) || 0;
          const hasStockQty = proposedQty > requestedQty;
          const stockQty = hasStockQty ? proposedQty - requestedQty : 0;

          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`,
            {
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
                quantity: requestedQty,
                location,
                notes,
                inventory_item_unit: mrLine.unit,
                inventory_item_description: mrLine.material_description,
                manually_add: false,
              }),
            },
          );

          if (!res.ok)
            throw new Error(`Failed for ${mrLine.material_description}`);

          if (hasStockQty) {
            const resStocks = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`,
              {
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
                  quantity: stockQty,
                  location: "Headquarters",
                  notes: notes ? `[FOR STOCKS] ${notes}` : "[FOR STOCKS]",
                  inventory_item_unit: mrLine.unit,
                  inventory_item_description: mrLine.material_description,
                  manually_add: false,
                }),
              },
            );
            if (!resStocks.ok)
              throw new Error(
                `Failed stocks entry for ${mrLine.material_description}`,
              );
          }
        }),
      );

      toast(
        `Stock added for ${selectedItems.length} item${selectedItems.length !== 1 ? "s" : ""}`,
        "success",
      );
      setSelectedItemIds(new Set());
      setAddStockOpen(false);
      setInventoryItemID("");
      setLocation("");
      setNotes("");
      onStockAdded?.();
      router.refresh();
    } catch {
      toast("Failed to add stock for some items", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    backgroundColor: "white",
    border: "1px solid rgba(207, 207, 207, 1)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    zIndex: 100,
    minWidth: "180px",
    overflow: "hidden",
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "10px 16px",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "black",
    fontWeight: "600",
    fontSize: "13px",
  };

  return (
    <>
      <div ref={actionsRef} style={{ position: "relative" }}>
        <Button
          componentType="button"
          bgColor={selectedItemIds.size === 0 ? "white" : "black"}
          borderColor={
            selectedItemIds.size === 0 ? "rgba(211, 211, 211, 1)" : "black"
          }
          textColor={selectedItemIds.size === 0 ? "black" : "white"}
          disabled={selectedItemIds.size === 0}
          onClick={() => setActionsOpen((v) => !v)}
        >
          ACTIONS
        </Button>

        {actionsOpen && (
          <div style={dropdownStyle}>
            <button
              type="button"
              style={{
                ...dropdownItemStyle,
                opacity: !hasGrn || eligibleCount === 0 ? 0.4 : 1,
                cursor: !hasGrn || eligibleCount === 0 ? "not-allowed" : "pointer",
              }}
              disabled={!hasGrn || eligibleCount === 0}
              onClick={() => {
                if (!hasGrn || eligibleCount === 0) return;
                setActionsOpen(false);
                // Single eligible item: delegate to the row's own AddToInventoryButton
                if (eligibleCount === 1 && onSingleItemStock) {
                  onSingleItemStock(selectedItems[0].id);
                  return;
                }
                setAddStockOpen(true);
              }}
              onMouseEnter={(e) => {
                if (hasGrn && eligibleCount > 0)
                  (e.target as HTMLElement).style.backgroundColor =
                    "rgba(245,245,245,1)";
              }}
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.backgroundColor =
                  "transparent")
              }
            >
              Add Stock ({eligibleCount})
              {!hasGrn ? (
                <span
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: "400",
                    color: "rgba(175,61,61,1)",
                    marginTop: "2px",
                  }}
                >
                  GRN required
                </span>
              ) : eligibleCount === 0 ? (
                <span
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: "400",
                    color: "rgba(150,150,150,1)",
                    marginTop: "2px",
                  }}
                >
                  All selected have stock
                </span>
              ) : null}
            </button>
          </div>
        )}
      </div>

      {addStockOpen && (
        <FormPopUp
          header={`ADD STOCK FOR ${selectedItemIds.size} ITEM${selectedItemIds.size !== 1 ? "S" : ""}`}
          setIsOpen={(open) => {
            if (!open) {
              setAddStockOpen(false);
              setInventoryItemID("");
              setLocation("");
              setNotes("");
            }
          }}
          handleSubmit={handleAddStock}
          addButtonLabel={isSubmitting ? "SAVING..." : "CONFIRM"}
        >
          {/* Selected items list */}
          <div
            style={{
              marginBottom: "20px",
              border: "1px solid rgba(239,239,239,1)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {selectedItems.map((item, i) => (
              <div
                key={item.id}
                style={{
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: "500",
                  borderTop:
                    i > 0 ? "1px solid rgba(239,239,239,1)" : undefined,
                  backgroundColor:
                    i % 2 === 0 ? "white" : "rgba(249,249,249,1)",
                }}
              >
                {item.material_description}
              </div>
            ))}
          </div>

          <div className="input-row half">
            <SingleSelectDropdown
              label="INVENTORY ITEM"
              selectedValue={inventoryItemID}
              onChange={setInventoryItemID}
              placeholder="SELECT ITEM"
              dbData={inventoryItemValues}
              required
              idField="id"
              formatOptionLabel={(item) =>
                `INV-${String(item.id).padStart(5, "0")} - ${item.description}`
              }
              bottomButtonComponent={
                <CreateInventoryItemButton
                  style={{ width: "100%" }}
                  onSuccess={() => fetchInventoryItems()}
                />
              }
            />
            <InputItem
              label="STOCK LOCATION"
              value={location}
              type="select"
              placeholder="SELECT LOCATION"
              required
              onChange={(e) => setLocation(e.target.value)}
              selectOptions={[
                "Headquarters",
                "Umm Al Quwain Warehouse",
                ...locationValues,
              ]}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="NOTES"
              value={notes}
              type="textarea"
              placeholder="ENTER NOTES"
              required={false}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
