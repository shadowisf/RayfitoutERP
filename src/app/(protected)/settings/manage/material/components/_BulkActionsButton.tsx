"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import CreateDatabaseInlineButton from "./_CreateDatabaseInlineButton";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  database_id?: number | null;
  is_archived?: number | null;
};

type BulkAction = "copy" | "move" | "archive" | null;

type Props = {
  selectedItems: MaterialItem[];
  databases: { id: number; name: string }[];
  onCopySuccess: (newItems: MaterialItem[]) => void;
  onMoveSuccess: () => void;
  onArchiveSuccess: (archivedIds: number[]) => void;
  onDatabaseCreated?: (id: number, name: string) => void;
};

export default function BulkActionsButton({
  selectedItems,
  databases,
  onCopySuccess,
  onMoveSuccess,
  onArchiveSuccess,
  onDatabaseCreated,
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [activeAction, setActiveAction] = useState<BulkAction>(null);
  const [targetDatabaseId, setTargetDatabaseId] = useState<string | number>("");
  const [localDatabases, setLocalDatabases] = useState(databases);

  useEffect(() => {
    setLocalDatabases(databases);
  }, [databases]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const count = selectedItems.length;

  // Close dropdown when clicking outside (but not on the trigger button itself)
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current && triggerRef.current.contains(e.target as Node))
        return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node))
        return;
      setShowDropdown(false);
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const openAction = (action: BulkAction) => {
    setTargetDatabaseId(selectedItems[0]?.database_id ?? "");
    setActiveAction(action);
    setShowDropdown(false);
  };

  // ── Bulk copy ──────────────────────────────────────────────────────────────
  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = targetDatabaseId ? Number(targetDatabaseId) : null;
    try {
      const results = await Promise.all(
        selectedItems.map((item) =>
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                material_description: item.material_description,
                category_id: item.category_id,
                subcategory_id: item.subcategory_id,
                unit: item.unit,
                brand: item.brand,
                added_by: item.added_by,
                database_id: targetId,
              }),
            },
          ).then((r) => {
            if (!r.ok) throw new Error();
            return r.json();
          }),
        ),
      );
      toast(
        `${results.length} material${results.length !== 1 ? "s" : ""} copied`,
        "success",
      );
      setActiveAction(null);
      onCopySuccess(results);
    } catch {
      toast("Failed to copy materials", "error");
    }
  };

  // ── Bulk move ──────────────────────────────────────────────────────────────
  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = targetDatabaseId ? Number(targetDatabaseId) : null;
    try {
      await Promise.all(
        selectedItems.map((item) =>
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: item.id, database_id: targetId }),
            },
          ).then((r) => {
            if (!r.ok) throw new Error();
          }),
        ),
      );
      toast(
        `${selectedItems.length} material${selectedItems.length !== 1 ? "s" : ""} moved`,
        "success",
      );
      setActiveAction(null);
      onMoveSuccess();
    } catch {
      toast("Failed to move materials", "error");
    }
  };

  // ── Bulk archive ───────────────────────────────────────────────────────────
  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all(
        selectedItems.map((item) =>
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: item.id, is_archived: 1 }),
            },
          ).then((r) => {
            if (!r.ok) throw new Error();
          }),
        ),
      );
      toast(
        `${selectedItems.length} material${selectedItems.length !== 1 ? "s" : ""} archived`,
        "success",
      );
      setActiveAction(null);
      onArchiveSuccess(selectedItems.map((i) => i.id));
    } catch {
      toast("Failed to archive materials", "error");
    }
  };

  return (
    <>
      {/* Trigger + dropdown */}
      <div
        ref={triggerRef}
        style={{ position: "relative", display: "inline-block" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          componentType="button"
          bgColor={count === 0 ? "white" : "black"}
          borderColor={count === 0 ? "rgba(211, 211, 211, 1)" : "black"}
          textColor={count === 0 ? "black" : "white"}
          type="button"
          onClick={(e) => {
            if (count > 0) {
              const rect = (
                e.currentTarget as HTMLElement
              ).getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 4, left: rect.left });
              setShowDropdown((v) => !v);
            }
          }}
          disabled={count === 0}
        >
          ACTIONS
        </Button>
      </div>

      {/* ── Dropdown portal ────────────────────────────────────────────────── */}
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
              onClick={() => openAction("copy")}
            >
              <img src="/icons/duplicate.svg" alt="" /> Copy to...
            </Button>
            <Button
              componentType="button"
              bgColor="transparent"
              borderColor="transparent"
              textColor="black"
              full
              style={{ justifyContent: "flex-start" }}
              onClick={() => openAction("move")}
            >
              <img src="/icons/360-arrow.svg" alt="" /> Move to...
            </Button>
            <Button
              componentType="button"
              bgColor="transparent"
              borderColor="transparent"
              textColor="black"
              full
              style={{ justifyContent: "flex-start" }}
              onClick={() => openAction("archive")}
            >
              <img src="/icons/trash.svg" alt="" /> Archive
            </Button>
          </div>,
          document.body,
        )}

      {/* ── Copy popup ─────────────────────────────────────────────────────── */}
      {activeAction === "copy" &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header="COPY TO..."
            setIsOpen={(v) => {
              if (!v) setActiveAction(null);
            }}
            handleSubmit={handleCopy}
            addButtonLabel="CONFIRM"
          >
            <div style={{ marginBottom: "16px" }}>
              {selectedItems.map((item) => (
                <p
                  key={item.id}
                  style={{
                    marginBottom: "4px",
                  }}
                >
                  {item.material_description}
                </p>
              ))}
            </div>
            <div className="input-row full">
              <SingleSelectDropdown
                label="TARGET DATABASE"
                dbData={localDatabases.map((d) => ({
                  id: d.id,
                  value: d.name,
                }))}
                selectedValue={targetDatabaseId}
                onChange={(val) => setTargetDatabaseId(val)}
                placeholder="SELECT DATABASE"
                required
                style={{ width: "100%" }}
                bottomButtonComponent={
                  <CreateDatabaseInlineButton
                    onSuccess={(id, name) => {
                      setLocalDatabases((prev) => [...prev, { id, name }]);
                      setTargetDatabaseId(id);
                      onDatabaseCreated?.(id, name);
                    }}
                  />
                }
              />
            </div>
          </FormPopUp>,
          document.body,
        )}

      {/* ── Move popup ─────────────────────────────────────────────────────── */}
      {activeAction === "move" &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header="MOVE TO..."
            setIsOpen={(v) => {
              if (!v) setActiveAction(null);
            }}
            handleSubmit={handleMove}
            addButtonLabel="CONFIRM"
          >
            <div style={{ marginBottom: "16px" }}>
              {selectedItems.map((item) => (
                <p
                  key={item.id}
                  style={{
                    marginBottom: "4px",
                  }}
                >
                  {item.material_description}
                </p>
              ))}
            </div>
            <div className="input-row full">
              <SingleSelectDropdown
                label="TARGET DATABASE"
                dbData={localDatabases.map((d) => ({
                  id: d.id,
                  value: d.name,
                }))}
                selectedValue={targetDatabaseId}
                onChange={(val) => setTargetDatabaseId(val)}
                placeholder="SELECT DATABASE"
                required
                style={{ width: "100%" }}
                bottomButtonComponent={
                  <CreateDatabaseInlineButton
                    onSuccess={(id, name) => {
                      setLocalDatabases((prev) => [...prev, { id, name }]);
                      setTargetDatabaseId(id);
                      onDatabaseCreated?.(id, name);
                    }}
                  />
                }
              />
            </div>
          </FormPopUp>,
          document.body,
        )}

      {/* ── Archive popup ──────────────────────────────────────────────────── */}
      {activeAction === "archive" &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header="ARCHIVE MATERIALS"
            setIsOpen={(v) => {
              if (!v) setActiveAction(null);
            }}
            handleSubmit={handleArchive}
            addButtonLabel="CONFIRM"
          >
            <p>
              Are you sure you want to archive{" "}
              <strong>
                {count} material{count !== 1 ? "s" : ""}
              </strong>
              ?
            </p>

            <br />

            <p
              style={{
                color: "rgba(200,60,60,1)",
                fontWeight: 600,
              }}
            >
              This action cannot be undone.
            </p>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
