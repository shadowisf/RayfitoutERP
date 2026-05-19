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

type CreateNewMaterialButtonProps = {
  onSuccess?: (newItem: PredefinedItem) => void;
  style?: React.CSSProperties;
};

export default function CreateNewMaterialButton({
  onSuccess,
  style,
}: CreateNewMaterialButtonProps) {
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

    if (!newMatDescription.trim()) return;
    if (!newMatCategoryID) return;
    if (!newMatSubCategoryID) return;

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
          }),
        },
      );

      if (!res.ok) return;

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
    } catch {
      // silent
    }
  };

  const newMaterialModal = showNewMaterial && (
    <FormPopUp
      header={"CREATE NEW MATERIAL"}
      setIsOpen={setShowNewMaterial}
      handleSubmit={handleNewMaterialSubmit}
      addButtonLabel={"CONFIRM"}
    >
      {/* <div className="input-row full">
        <InputItem
          label={"CODE"}
          value={newMatItemCode}
          type={"text"}
          onChange={(e) => setNewMatItemCode(e.target.value)}
        />
      </div> */}

      <div className="input-row half">
        <SingleSelectDropdown
          label={"CATEGORY"}
          dbData={materialCategoryValues}
          selectedValue={newMatCategoryID}
          onChange={(val) => setNewMatCategoryID(val)}
          placeholder="SELECT CATEGORY"
          required
          style={{ width: "350px" }}
          bottomButtonComponent={<CreateCategoryButton />}
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
            />
          }
        />
      </div>

      <div className="input-row half">
        <InputItem
          label={"NAME"}
          value={newMatDescription}
          type={"text"}
          required
          onChange={(e) => setNewMatDescription(e.target.value)}
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

      {/* <div className="input-row half">
        <InputItem
          label={"BRAND"}
          value={newMatBrand}
          type={"text"}
          onChange={(e) => setNewMatBrand(e.target.value)}
        />
      </div> */}
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
