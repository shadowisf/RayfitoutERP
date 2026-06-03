"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  database_id?: number | null;
  is_archived?: number | null;
};

type Props = {
  selectedItems: MaterialItem[];
  onSuccess: (id: number, name: string) => void;
  onMoveSuccess?: (id: number, name: string) => void;
};

export default function CreateDatabaseButton({
  selectedItems,
  onSuccess,
  onMoveSuccess,
}: Props) {
  const { userInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  type Mode = "scratch" | "import" | "selected" | null;
  const [mode, setMode] = useState<Mode>(null);

  const [dbName, setDbName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  const recalcPos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const hasOpenModal = document.querySelector(
        ".popup-overlay, .form-popup, .modal-overlay, .form-outer-container",
      );
      if (hasOpenModal) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      const isClickOnDropdown = target.closest(".select-dropdown-portal");
      if (isClickOnDropdown) return;
      if (buttonRef.current && !buttonRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => recalcPos();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!mode) {
      setDbName("");
      setImportFile(null);
    }
  }, [mode]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = dbName.trim();
    if (!trimmed) { toast("Database name is required.", "error"); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createDatabase", name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data?.error || "Failed to create database.", "error"); return; }
      toast("Database created.", "success");
      setMode(null);
      onSuccess(data.id, trimmed);
    } catch { toast("Failed to create database.", "error"); }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = dbName.trim();
    if (!trimmed) { toast("Database name is required.", "error"); return; }
    if (!importFile) { toast("Please select a file.", "error"); return; }

    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("database_name", trimmed);
    if (userInfo?.name) formData.append("added_by", userInfo.name);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/importMaterials`,
        { method: "POST", body: formData },
      );
      const data = await res.json();
      if (!res.ok) { toast(data?.error || "Failed to import.", "error"); return; }
      toast(
        `${data.imported} material${data.imported !== 1 ? "s" : ""} imported into "${trimmed}".`,
        "success",
      );
      setMode(null);
      onSuccess(data.database_id, trimmed);
    } catch { toast("Failed to import.", "error"); }
  };

  const handleFromSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = dbName.trim();
    if (!trimmed) { toast("Database name is required.", "error"); return; }
    if (selectedItems.length === 0) { toast("No items selected.", "error"); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createDatabaseFromSelected",
          name: trimmed,
          item_ids: selectedItems.map((i) => i.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data?.error || "Failed to create database.", "error"); return; }
      toast(
        `Database created with ${selectedItems.length} material${selectedItems.length !== 1 ? "s" : ""} moved.`,
        "success",
      );
      setMode(null);
      onMoveSuccess?.(data.id, trimmed);
    } catch { toast("Failed to create database.", "error"); }
  };

  const downloadTemplate = () => {
    const header = ["item_code", "category", "subcategory", "material", "brand", "unit"];
    const csvContent = header.map((c) => `"${c}"`).join(",");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "material_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Menu item renderer ────────────────────────────────────────────────────────

  function MenuItem({
    icon,
    label,
    onClick,
    disabled = false,
  }: {
    icon: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(false);
          onClick();
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "9px 14px",
          background: "none",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "13px",
          fontWeight: 500,
          color: disabled ? "rgba(180,180,180,1)" : "black",
          textAlign: "left",
          opacity: disabled ? 0.5 : 1,
          whiteSpace: "nowrap",
        }}
      >
        <img
          src={`/icons/${icon}`}
          alt=""
          style={{
            width: "15px",
            flexShrink: 0,
            filter: icon === "import.svg" ? "invert(1)" : undefined,
          }}
        />
        {label}
      </button>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const opening = !isOpen;
          if (opening) recalcPos();
          setIsOpen(opening);
          if (opening) setHasBeenOpened(true);
        }}
        style={{
          padding: "7px 15px",
          fontSize: "12px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          borderRadius: "6px 6px 0 0",
          whiteSpace: "nowrap",
          flexShrink: 0,
          backgroundColor: "white",
          border: "none",
          cursor: "pointer",
          color: "black",
        }}
      >
        NEW DATABASE
        <img src="/icons/database.svg" alt="" style={{ width: "15px" }} />
      </button>

      {/* Dropdown portal */}
      {hasBeenOpened &&
        dropdownPos !== null &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="three-dots-dropdown"
            style={{
              position: "fixed",
              top: dropdownPos.top,
              right: dropdownPos.right,
              backgroundColor: "white",
              border: isOpen ? "1px solid #e5e7eb" : "none",
              borderRadius: "12px",
              boxShadow: isOpen ? "0 4px 6px rgba(0,0,0,0.1)" : "none",
              minWidth: "260px",
              zIndex: 1000,
              height: isOpen ? "auto" : 0,
              overflow: "hidden",
            }}
          >
            <MenuItem icon="import.svg" label="Import" onClick={() => setMode("import")} />
            <MenuItem icon="plus.svg" label="Create from Scratch" onClick={() => setMode("scratch")} />
            <MenuItem
              icon="plus.svg"
              label={`Create with Selected Materials (${selectedItems.length})`}
              onClick={() => setMode("selected")}
              disabled={selectedItems.length === 0}
            />
          </div>,
          document.body,
        )}

      {/* ── Create from Scratch modal ── */}
      {mode === "scratch" &&
        createPortal(
          <FormPopUp
            header="CREATE DATABASE"
            setIsOpen={() => setMode(null)}
            handleSubmit={handleScratch}
            addButtonLabel="CONFIRM"
          >
            <div className="input-row full">
              <InputItem
                label="DATABASE NAME"
                value={dbName}
                type="text"
                required
                noOptionalLabel
                onChange={(e) => setDbName(e.target.value)}
              />
            </div>
          </FormPopUp>,
          document.body,
        )}

      {/* ── Import modal ── */}
      {mode === "import" &&
        createPortal(
          <FormPopUp
            header="IMPORT DATABASE"
            setIsOpen={() => setMode(null)}
            handleSubmit={handleImport}
            addButtonLabel="CONFIRM"
            secondButton={
              <Button
                componentType="button"
                bgColor="white"
                borderColor="rgba(211,211,211,1)"
                textColor="black"
                type="button"
                onClick={downloadTemplate}
              >
                DOWNLOAD TEMPLATE
                <img src="/icons/download.svg" alt="" />
              </Button>
            }
          >
            <div className="input-row full">
              <InputItem
                label="DATABASE NAME"
                value={dbName}
                type="text"
                required
                noOptionalLabel
                onChange={(e) => setDbName(e.target.value)}
              />
            </div>

            {/* Format reference */}
            <div
              style={{
                backgroundColor: "rgba(248,248,248,1)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p style={{ textTransform: "uppercase", marginBottom: "8px" }}>
                Expected Column Order
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "4px 14px",
                }}
              >
                {[
                  ["A", "item_code — leave blank to auto-generate"],
                  ["B", "category *"],
                  ["C", "subcategory *"],
                  ["D", "material *"],
                  ["E", "brand"],
                  ["F", "unit"],
                ].map(([col, label]) => (
                  <>
                    <span key={`col-${col}`} style={{ fontWeight: 700, color: "black" }}>
                      {col}
                    </span>
                    <span key={`lbl-${col}`}>{label}</span>
                  </>
                ))}
              </div>
              <p style={{ marginTop: "8px", fontSize: "11px", color: "rgba(130,130,130,1)" }}>
                Categories and subcategories are matched case-insensitively. New ones are created automatically.
              </p>
            </div>

            <div className="input-row full">
              <SingleUploadFileBox
                fileState={importFile}
                setFileState={setImportFile}
                label="FILE"
                required
                acceptedFileTypes=".xlsx,.xls,.csv"
                placeholder="UPLOAD OR DRAG YOUR EXCEL / CSV FILE"
                buttonLabel="SELECT FILE"
              />
            </div>
          </FormPopUp>,
          document.body,
        )}

      {/* ── Create from Selected modal ── */}
      {mode === "selected" &&
        createPortal(
          <FormPopUp
            header="CREATE DATABASE FROM SELECTED"
            setIsOpen={() => setMode(null)}
            handleSubmit={handleFromSelected}
            addButtonLabel="CONFIRM"
          >
            <div style={{ marginBottom: "16px" }}>
              {selectedItems.map((item) => (
                <p key={item.id} style={{ marginBottom: "4px" }}>
                  {item.material_description}
                </p>
              ))}
            </div>
            <div className="input-row full">
              <InputItem
                label="DATABASE NAME"
                value={dbName}
                type="text"
                required
                noOptionalLabel
                onChange={(e) => setDbName(e.target.value)}
              />
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
