"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { UNIT_OPTIONS } from "@/constants/units";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import CreateCategoryButton from "@/app/(protected)/mr/[id]/components/department/_CreateCategoryButton";
import CreateSubCategoryButton from "@/app/(protected)/mr/[id]/components/department/_CreateSubcategoryButton";
import CreateDatabaseInlineButton from "./_CreateDatabaseInlineButton";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  database_id?: number | null;
  is_archived?: number | null;
};

type EditMaterialButtonProps = {
  item: MaterialItem;
  onOpen?: () => void;
  onSuccess?: () => void;
  onDatabaseCreated?: (id: number, name: string) => void;
};

export default function EditMaterialButton({
  item,
  onOpen,
  onSuccess,
  onDatabaseCreated,
}: EditMaterialButtonProps) {
  const { userInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [categoryID, setCategoryID] = useState<string | number>("");
  const [subCategoryID, setSubCategoryID] = useState<string | number>("");
  const [unit, setUnit] = useState("");
  const [brand, setBrand] = useState("");
  const [databaseId, setDatabaseId] = useState<string | number>("");
  const [isSaving, setIsSaving] = useState(false);

  const [categoryValues, setCategoryValues] = useState<any[]>([]);
  const [subCategoryValues, setSubCategoryValues] = useState<any[]>([]);
  const [databases, setDatabases] = useState<{ id: number; name: string }[]>([]);

  type InventorySuggestion = { id: number; description: string };
  const [inventorySuggestions, setInventorySuggestions] = useState<
    InventorySuggestion[]
  >([]);

  // Pre-fill form whenever the popup opens
  useEffect(() => {
    if (isOpen && item) {
      setDescription(item.material_description ?? "");
      setCategoryID(item.category_id ?? "");
      setSubCategoryID(item.subcategory_id ?? "");
      setUnit(item.unit ?? "");
      setBrand(item.brand ?? "");
      setDatabaseId(item.database_id ?? "");
      setInventorySuggestions([]);
    }
  }, [isOpen, item]);

  // Fetch categories and databases on mount
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((r) => r.json())
      .then(setCategoryValues)
      .catch(console.error);

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getDatabases`)
      .then((r) => r.json())
      .then((data: { id: number; name: string }[]) => { if (Array.isArray(data)) setDatabases(data); })
      .catch(console.error);
  }, []);

  // Re-fetch subcategories when category changes
  useEffect(() => {
    if (categoryID) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_id: categoryID }),
        },
      )
        .then((r) => r.json())
        .then(setSubCategoryValues)
        .catch(console.error);
    } else {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      )
        .then((r) => r.json())
        .then(setSubCategoryValues)
        .catch(console.error);
    }
  }, [categoryID]);

  // Debounced inventory suggestions as user types
  useEffect(() => {
    const trimmed = description.trim();
    if (trimmed.length < 3) {
      setInventorySuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory/searchByDescription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptions: [trimmed] }),
        },
      )
        .then((r) => r.json())
        .then((data) => {
          const matches = data?.data?.[trimmed];
          setInventorySuggestions(
            Array.isArray(matches)
              ? matches.map((m: any) => ({
                  id: m.id,
                  description: m.description,
                }))
              : [],
          );
        })
        .catch(() => setInventorySuggestions([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [description]);

  // Sync category when subcategory is selected
  const handleSubCategoryChange = (val: string | number) => {
    setSubCategoryID(val);
    if (val && subCategoryValues.length > 0) {
      const subCat = subCategoryValues.find((sc: any) => sc.id === val);
      if (subCat?.category_id) {
        setCategoryID(subCat.category_id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast("Material name is required.", "error");
      return;
    }
    if (!categoryID) {
      toast("Category is required.", "error");
      return;
    }
    if (!subCategoryID) {
      toast("Subcategory is required.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            material_description: description.trim(),
            category_id: Number(categoryID),
            subcategory_id: Number(subCategoryID),
            unit: unit || null,
            brand: brand || null,
            database_id: databaseId ? Number(databaseId) : null,
            changed_by: userInfo?.name ?? null,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err?.error || "Failed to update material.", "error");
        return;
      }

      toast("Material updated successfully", "success");
      setIsOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast(err?.message || "Something went wrong.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header="EDIT MATERIAL"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
    >
      <div className="input-row half">
        <SingleSelectDropdown
          label={"CATEGORY"}
          dbData={categoryValues}
          selectedValue={categoryID}
          onChange={(val) => {
            setCategoryID(val);
            setSubCategoryID("");
          }}
          placeholder="SELECT CATEGORY"
          required
          style={{ width: "350px" }}
          bottomButtonComponent={
            <CreateCategoryButton
              onSuccess={(newId) => {
                fetch(
                  `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
                )
                  .then((r) => r.json())
                  .then((data) => {
                    setCategoryValues(data);
                    setCategoryID(newId);
                  })
                  .catch(console.error);
              }}
            />
          }
        />
        <SingleSelectDropdown
          label={"SUBCATEGORY"}
          dbData={subCategoryValues}
          selectedValue={subCategoryID}
          onChange={handleSubCategoryChange}
          placeholder="SELECT SUBCATEGORY"
          required
          style={{ width: "350px" }}
          bottomButtonComponent={
            <CreateSubCategoryButton
              materialCategoryID={Number(categoryID)}
              onSuccess={(newId) => {
                const url = categoryID
                  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`
                  : `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`;
                const opts = categoryID
                  ? {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ category_id: categoryID }),
                    }
                  : {
                      method: "GET",
                      headers: { "Content-Type": "application/json" },
                    };
                fetch(url, opts)
                  .then((r) => r.json())
                  .then((data) => {
                    setSubCategoryValues(data);
                    setSubCategoryID(newId);
                  })
                  .catch(console.error);
              }}
            />
          }
        />
      </div>

      <div className="input-row full">
        <InputItem
          label={"NAME"}
          value={description}
          type={"text"}
          required
          onChange={(e) => setDescription(e.target.value)}
          itooltip={
            <p>
              Use standardized naming format.
              <br />
              <br />
              Example: <br />
              MATERIAL NAME – SIZE / VARIATION
              <br />
              <br />
              Avoid using brand or supplier names unless required.
            </p>
          }
        />
      </div>

      {inventorySuggestions.length > 0 && (
        <div
          style={{
            marginTop: "-8px",
            marginBottom: "12px",
            fontSize: "10px",
            fontStyle: "italic",
            color: "rgba(130, 130, 130, 1)",
          }}
        >
          Possible match in material database:
          {inventorySuggestions.map((suggestion) => (
            <div key={suggestion.id} style={{ marginTop: "4px" }}>
              <span
                style={{
                  fontWeight: 600,
                  color: "black",
                  fontStyle: "normal",
                }}
              >
                &ldquo;{suggestion.description}&rdquo;
              </span>
              &nbsp;
              <a
                href={`/inventory/${suggestion.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  verticalAlign: "middle",
                }}
              >
                <img
                  src="/icons/external-link.svg"
                  alt="open"
                  style={{ width: "9px", height: "9px" }}
                />
              </a>
              &nbsp;&nbsp;
              <button
                type="button"
                onClick={() => setDescription(suggestion.description)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "rgba(36, 160, 237, 1)",
                  fontStyle: "normal",
                  fontWeight: 600,
                  fontSize: "10px",
                  textDecoration: "underline",
                }}
              >
                Use This Item
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="input-row half">
        <InputItem
          label={"BRAND"}
          value={brand}
          type={"text"}
          onChange={(e) => setBrand(e.target.value)}
        />
        <InputItem
          label={"UNIT"}
          value={unit}
          type={"select"}
          placeholder={"SELECT UNIT"}
          onChange={(e) => setUnit(e.target.value)}
          selectOptions={[...UNIT_OPTIONS]}
        />
      </div>

      <div className="input-row half">
        <SingleSelectDropdown
          label={"DATABASE"}
          dbData={databases.map((db) => ({ id: db.id, value: db.name }))}
          selectedValue={databaseId}
          onChange={(val) => setDatabaseId(val)}
          placeholder="SELECT DATABASE"
          required
          style={{ width: "350px" }}
          bottomButtonComponent={
            <CreateDatabaseInlineButton
              onSuccess={(id, name) => {
                setDatabases((prev) => [...prev, { id, name }]);
                setDatabaseId(id);
                onDatabaseCreated?.(id, name);
              }}
            />
          }
        />
      </div>
    </FormPopUp>
  );

  return (
    <>
      <Button
        componentType="button"
        bgColor="transparent"
        borderColor="transparent"
        textColor="black"
        full
        style={{ justifyContent: "flex-start" }}
        onClick={() => {
          onOpen?.();
          setIsOpen(true);
        }}
      >
        <img src="/icons/pencil.svg" alt="" /> Edit
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
