"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { MrLine } from "../types/mrLine";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";

type RenameMrSubCategoryButtonProps = {
  items: MrLine[];
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
  categoryID: string;
  subCategoryID: string;
};

export default function RenameMrSubCategoryButton({
  items,
  categoryID,
  subCategoryID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: RenameMrSubCategoryButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    []
  >([]);

  const [newSubCategory, setNewSubCategory] = useState<string | number>(
    subCategoryID
  );

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateSubCategory",
        new_material_subcategory_id: newSubCategory,
        old_material_subcategory_id: subCategoryID,
        item_ids: items.map((item) => item.id),
      }),
    });

    if (res.ok) {
      alert("Subcategory renamed");

      setNewSubCategory("");

      setIsOpen(false);

      router.refresh();
    } else {
      alert("Failed to rename subcategory. Something went wrong");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"RENAME SUBCATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <SingleSelectDropdown
              label={"SUB CATEGORY"}
              dbData={materialSubCategoryValues}
              selectedValue={newSubCategory}
              onChange={setNewSubCategory}
              placeholder="SELECT SUB CATEGORY"
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
