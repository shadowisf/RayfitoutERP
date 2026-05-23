"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import Button from "@/app/components/Button";
import { UNIT_OPTIONS } from "@/constants/units";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import CreateCategoryButton from "../(protected)/mr/[id]/components/department/_CreateCategoryButton";
import CreateSubCategoryButton from "../(protected)/mr/[id]/components/department/_CreateSubcategoryButton";
import ExportMaterialListPDFButton from "../(protected)/mr/[id]/components/_ExportMaterialListPDFButton";
import { toast } from "@/app/components/Toast";
import { useAuth } from "../context/AuthContext";

type CreateNewMaterialButtonProps = {
  onSuccess?: (newItem: PredefinedItem) => void;
  allItems?: PredefinedItem[];
  style?: React.CSSProperties;
};

export default function CreateNewMaterialButton({
  onSuccess,
  allItems,
  style,
}: CreateNewMaterialButtonProps) {
  const { userInfo } = useAuth();
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [newMatDescription, setNewMatDescription] = useState("");
  const [newMatCategoryID, setNewMatCategoryID] = useState<string | number>("");
  const [newMatSubCategoryID, setNewMatSubCategoryID] = useState<
    string | number
  >("");
  const [newMatItemCode, setNewMatItemCode] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("");
  const [newMatBrand, setNewMatBrand] = useState("");
  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

  type InventorySuggestion = { id: number; description: string };
  const [inventorySuggestions, setInventorySuggestions] = useState<
    InventorySuggestion[]
  >([]);

  // Fetch all categories + all subcategories on mount
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then(setMaterialCategoryValues)
      .catch(console.error);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      { method: "GET", headers: { "Content-Type": "application/json" } },
    )
      .then((res) => res.json())
      .then(setMaterialSubCategoryValues)
      .catch(console.error);
  }, []);

  // When category is selected, filter subcategories by category
  useEffect(() => {
    if (newMatCategoryID) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_id: newMatCategoryID }),
        },
      )
        .then((res) => res.json())
        .then(setMaterialSubCategoryValues)
        .catch(console.error);
    } else {
      // If category is reset, load all subcategories
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      )
        .then((res) => res.json())
        .then(setMaterialSubCategoryValues)
        .catch(console.error);
    }
  }, [newMatCategoryID]);

  // Debounced inventory match search as user types the material name
  useEffect(() => {
    const trimmed = newMatDescription.trim();
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
              ? matches.map((m: any) => ({ id: m.id, description: m.description }))
              : [],
          );
        })
        .catch(() => setInventorySuggestions([]));
    }, 350);

    return () => clearTimeout(timer);
  }, [newMatDescription]);

  // Handle subcategory selection — always sync category
  const handleNewMatSubCategoryChange = (val: string | number) => {
    setNewMatSubCategoryID(val);
    if (val && materialSubCategoryValues.length > 0) {
      const subCat = materialSubCategoryValues.find((sc: any) => sc.id === val);
      if (subCat?.category_id) {
        setNewMatCategoryID(subCat.category_id);
      }
    }
  };

  // Handle submit
  const handleNewMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMatDescription.trim()) {
      toast("Material name is required.", "error");
      return;
    }
    if (!newMatCategoryID) {
      toast("Category is required.", "error");
      return;
    }
    if (!newMatSubCategoryID) {
      toast("Subcategory is required.", "error");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_code: newMatItemCode.trim() || null,
            material_description: newMatDescription.trim(),
            category_id: Number(newMatCategoryID),
            subcategory_id: Number(newMatSubCategoryID),
            unit: newMatUnit || null,
            brand: newMatBrand || null,
            added_by: userInfo?.name || null,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err?.error || "Failed to create material.", "error");
        return;
      }

      const newItem: PredefinedItem = await res.json();

      onSuccess && onSuccess(newItem);

      // Reset and close
      setShowNewMaterial(false);
      setNewMatItemCode("");
      setNewMatDescription("");
      setNewMatCategoryID("");
      setNewMatSubCategoryID("");
      setNewMatUnit("");
      setNewMatBrand("");
      setInventorySuggestions([]);
    } catch (err: any) {
      toast(err?.message || "Something went wrong.", "error");
    }
  };

  const newMaterialModal = showNewMaterial && (
    <FormPopUp
      header={"CREATE NEW MATERIAL"}
      setIsOpen={setShowNewMaterial}
      handleSubmit={handleNewMaterialSubmit}
      addButtonLabel={"CONFIRM"}
    >
      {allItems && allItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <ExportMaterialListPDFButton allItems={allItems} />
        </div>
      )}

      <div className="input-row half">
        <SingleSelectDropdown
          label={"CATEGORY"}
          dbData={materialCategoryValues}
          selectedValue={newMatCategoryID}
          onChange={(val) => setNewMatCategoryID(val)}
          placeholder="SELECT CATEGORY"
          required
          style={{ width: "350px" }}
          bottomButtonComponent={
            <CreateCategoryButton
              onSuccess={(newId) => {
                // Re-fetch categories and auto-select the new one
                fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`)
                  .then((res) => res.json())
                  .then((data) => {
                    setMaterialCategoryValues(data);
                    setNewMatCategoryID(newId);
                  })
                  .catch(console.error);
              }}
            />
          }
        />
        <SingleSelectDropdown
          label={"SUBCATEGORY"}
          dbData={materialSubCategoryValues}
          selectedValue={newMatSubCategoryID}
          onChange={handleNewMatSubCategoryChange}
          placeholder="SELECT SUBCATEGORY"
          required
          style={{ width: "350px" }}
          bottomButtonComponent={
            <CreateSubCategoryButton
              materialCategoryID={Number(newMatCategoryID)}
              onSuccess={(newId) => {
                // Re-fetch subcategories for the current category and auto-select the new one
                const url = newMatCategoryID
                  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`
                  : `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`;
                const opts = newMatCategoryID
                  ? {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ category_id: newMatCategoryID }),
                    }
                  : { method: "GET", headers: { "Content-Type": "application/json" } };
                fetch(url, opts)
                  .then((res) => res.json())
                  .then((data) => {
                    setMaterialSubCategoryValues(data);
                    setNewMatSubCategoryID(newId);
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
          value={newMatDescription}
          type={"text"}
          required
          onChange={(e) => setNewMatDescription(e.target.value)}
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
                style={{ fontWeight: 600, color: "black", fontStyle: "normal" }}
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
                onClick={() => setNewMatDescription(suggestion.description)}
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
          value={newMatBrand}
          type={"text"}
          onChange={(e) => setNewMatBrand(e.target.value)}
        />
        <InputItem
          label={"UNIT"}
          value={newMatUnit}
          type={"select"}
          placeholder={"SELECT UNIT"}
          onChange={(e) => setNewMatUnit(e.target.value)}
          selectOptions={[...UNIT_OPTIONS]}
        />
      </div>

    </FormPopUp>
  );

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={(e) => {
          e.preventDefault();
          setShowNewMaterial(true);
        }}
        style={style}
      >
        NEW MATERIAL +
      </Button>

      {typeof window !== "undefined" &&
        newMaterialModal &&
        createPortal(newMaterialModal, document.body)}
    </>
  );
}
