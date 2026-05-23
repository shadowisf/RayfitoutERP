"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { MrLine } from "../../types/mrLine";
import { useRefresh } from "@/app/context/RefreshContext";

type Props = {
  selectedItems: MrLine[];
  mrHeaderId: number;
  stageName?: string;
  onComplete?: () => void;
  onReset?: () => void;
};

export default function DepartmentActionsButton({
  selectedItems,
  mrHeaderId,
  stageName,
  onComplete,
  onReset,
}: Props) {
  const router = useRouter();
  const { refresh } = useRefresh();

  const { userInfo } = useAuth();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);

  const count = selectedItems.length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as Node)
      )
        setActionsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      for (const item of selectedItems) {
        if (item.attachment) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "delete", url: item.attachment }),
            });
          } catch {
            // S3 failure shouldn't stop DB deletion
          }
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deleteItem",
            id: item.id,
            changed_by: userInfo?.name || null,
            stage_name: stageName || "INITIAL APPROVAL",
          }),
        });

        if (!res.ok) {
          toast(`Failed to delete ${item.material_description}`, "error");
          setIsLoading(false);
          return;
        }
      }

      toast(`${count} item${count !== 1 ? "s" : ""} deleted`, "success");
      setDeleteOpen(false);
      onComplete?.();
      await refresh();
    } catch {
      toast("Failed to delete items", "error");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Duplicate ───────────────────────────────────────────────────────────────
  async function handleDuplicate() {
    setActionsOpen(false);
    setIsLoading(true);
    try {
      for (const item of selectedItems) {
        let subcategoryIds: number[] = [];
        if (typeof item.material_subcategory_id === "string") {
          subcategoryIds = item.material_subcategory_id
            .split(",")
            .map((id) => Number(id.trim()))
            .filter((id) => !isNaN(id) && id > 0);
        } else if (typeof item.material_subcategory_id === "number") {
          subcategoryIds = [item.material_subcategory_id];
        } else if (Array.isArray(item.material_subcategory_id)) {
          subcategoryIds = item.material_subcategory_id;
        }

        let boqLineIds: number[] = [];
        if (item.boq_line_ids && typeof item.boq_line_ids === "string") {
          boqLineIds = item.boq_line_ids
            .split(",")
            .map((id) => Number(id.trim()))
            .filter((id) => !isNaN(id) && id > 0);
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createMrLine",
            mr_header_id: mrHeaderId,
            changed_by: userInfo?.name || null,
            stage_name: stageName || "INITIAL APPROVAL",
            material_category_id: item.material_category_id,
            material_subcategory_ids: subcategoryIds,
            predefined_item_id: item.predefined_item_id,
            material_description: item.material_description,
            quantity: item.quantity || 0,
            unit: item.unit || "",
            boq_line_ids: boqLineIds,
            notes: item.notes || null,
            specification: item.specification || null,
            brand: item.brand || null,
            delivery_location: item.delivery_location || null,
          }),
        });

        if (!res.ok) {
          toast(`Failed to duplicate ${item.material_description}`, "error");
          setIsLoading(false);
          return;
        }
      }

      toast(`${count} item${count !== 1 ? "s" : ""} duplicated`, "success");
      onComplete?.();
      await refresh();
    } catch {
      toast("Failed to duplicate items", "error");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Shared styles (matches QSActionsButton) ─────────────────────────────────
  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    backgroundColor: "white",
    border: "1px solid rgba(207,207,207,1)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    zIndex: 100,
    minWidth: "160px",
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
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* ── Reset button ─────────────────────────────────────────────────── */}
        <Button
          componentType="button"
          bgColor={count === 0 ? "white" : "black"}
          borderColor={count === 0 ? "rgba(211,211,211,1)" : "black"}
          textColor={count === 0 ? "black" : "white"}
          disabled={count === 0 || isLoading}
          onClick={() => onReset?.()}
        >
          RESET
        </Button>

        {/* ── Actions dropdown ─────────────────────────────────────────────── */}
        <div ref={actionsRef} style={{ position: "relative" }}>
        <Button
          componentType="button"
          bgColor={count === 0 ? "white" : "black"}
          borderColor={count === 0 ? "rgba(211,211,211,1)" : "black"}
          textColor={count === 0 ? "black" : "white"}
          disabled={count === 0 || isLoading}
          onClick={() => setActionsOpen((v) => !v)}
        >
          ACTIONS
        </Button>

        {actionsOpen && (
          <div style={dropdownStyle}>
            {[
              {
                label: `Duplicate (${count})`,
                onClick: handleDuplicate,
              },
              {
                label: `Delete (${count})`,
                onClick: () => {
                  setActionsOpen(false);
                  setDeleteOpen(true);
                },
              },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={opt.onClick}
                style={dropdownItemStyle}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.backgroundColor =
                    "rgba(245,245,245,1)")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.backgroundColor =
                    "transparent")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {deleteOpen && (
        <FormPopUp
          header={`DELETE ${count} MATERIAL REQUEST ITEM${count !== 1 ? "S" : ""}`}
          setIsOpen={(open) => {
            if (!open) setDeleteOpen(false);
          }}
          handleSubmit={handleDelete}
          addButtonLabel={isLoading ? "DELETING..." : "CONFIRM"}
        >
          Are you sure you want to delete{" "}
          <strong>{count}</strong> material request item
          {count !== 1 ? "s" : ""}? This action cannot be undone.
        </FormPopUp>
      )}
    </>
  );
}
