"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { MrLine } from "../../types/mrLine";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import { toast } from "@/app/components/Toast";

type RenameMrSubCategoryButtonProps = {
  items: MrLine[];
  categoryID: string;
  subCategoryID: string | number | (string | number)[];
};

export default function RenameMrSubCategoryButton({
  items,
  categoryID,
  subCategoryID,
}: RenameMrSubCategoryButtonProps) {
  const router = useRouter();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

  // Parse the existing subcategory IDs
  const [materialSubCategoryIDs, setMaterialSubCategoryIDs] = useState<
    (string | number)[]
  >(() => {
    if (subCategoryID) {
      if (typeof subCategoryID === "string") {
        const ids = subCategoryID
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "")
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
        return ids;
      }
      if (Array.isArray(subCategoryID)) {
        return subCategoryID.map((id) => Number(id)).filter((id) => !isNaN(id));
      }
      if (typeof subCategoryID === "number") {
        return [subCategoryID];
      }
    }
    return [];
  });

  useEffect(() => {
    if (isOpen) {
      fetch("/api/mr/getMaterialSubCategoryValuesByCategoryID", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryID,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [categoryID, isOpen]);

  const handleSubCategoryChange = (selectedIds: (string | number)[]) => {
    setMaterialSubCategoryIDs(selectedIds);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (materialSubCategoryIDs.length === 0) {
      toast("Please select at least one subcategory", "error");
      return;
    }

    // Clean the subcategory IDs
    const cleanedSubcategoryIds = materialSubCategoryIDs
      .filter((id) => id && !isNaN(Number(id)))
      .map((id) => Number(id));

    if (cleanedSubcategoryIds.length === 0) {
      toast("Invalid subcategory selection", "error");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateSubCategory",
        new_material_subcategory_ids: cleanedSubcategoryIds, // Array of IDs
        old_material_subcategory_id: subCategoryID,
        item_ids: items.map((item) => item.id),
      }),
    });

    if (res.ok) {
      toast("Material request subcategory updated", "success");
      setMaterialSubCategoryIDs([]);
      setIsOpen(false);
      router.refresh();
    } else {
      const errorData = await res.json();
      toast(
        errorData.error || "Failed to update material request subcategory",
        "error"
      );
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={pencilIcon} alt="pencil" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE MATERIAL REQUEST SUBCATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <MultiSelectDropdown
              label={"SUBCATEGORIES"}
              dbData={materialSubCategoryValues}
              selectedValues={materialSubCategoryIDs}
              onChange={handleSubCategoryChange}
              placeholder="SELECT SUBCATEGORIES"
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
