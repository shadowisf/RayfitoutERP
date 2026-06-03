"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  database_id?: number | null;
  is_archived?: number | null;
};

type Props = {
  selectedItems: MaterialItem[];
  onRestoreSuccess: (restoredIds: number[]) => void;
};

export default function ArchiveBulkActionsButton({
  selectedItems,
  onRestoreSuccess,
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const count = selectedItems.length;

  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setShowDropdown(false);
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all(
        selectedItems.map((item) =>
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, is_archived: 0 }),
          }).then((r) => { if (!r.ok) throw new Error(); }),
        ),
      );
      toast(`${count} material${count !== 1 ? "s" : ""} restored`, "success");
      setRestoreOpen(false);
      onRestoreSuccess(selectedItems.map((i) => i.id));
    } catch {
      toast("Failed to restore materials", "error");
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        style={{ position: "relative", display: "inline-block" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          componentType="button"
          bgColor={count === 0 ? "white" : "black"}
          borderColor={count === 0 ? "rgba(211,211,211,1)" : "black"}
          textColor={count === 0 ? "black" : "white"}
          type="button"
          disabled={count === 0}
          onClick={(e) => {
            if (count > 0) {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 4, left: rect.left });
              setShowDropdown((v) => !v);
            }
          }}
        >
          ACTIONS
        </Button>
      </div>

      {showDropdown &&
        dropdownPos !== null &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="three-dots-dropdown"
            onClick={() => setShowDropdown(false)}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              minWidth: "200px",
              zIndex: 1000,
            }}
          >
            <Button
              componentType="button"
              bgColor="transparent"
              borderColor="transparent"
              textColor="black"
              full
              style={{ justifyContent: "flex-start" }}
              onClick={() => { setRestoreOpen(true); setShowDropdown(false); }}
            >
              <img src="/icons/rewind.svg" alt="" /> Restore
            </Button>
          </div>,
          document.body,
        )}

      {restoreOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header="RESTORE MATERIALS"
            setIsOpen={(v) => { if (!v) setRestoreOpen(false); }}
            handleSubmit={handleRestore}
            addButtonLabel="CONFIRM"
            haveLoadingState
          >
            <p>
              Are you sure you want to restore{" "}
              <strong>
                {count} material{count !== 1 ? "s" : ""}
              </strong>{" "}
              back to the active material list?
            </p>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
