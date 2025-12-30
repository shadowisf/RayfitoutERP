"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { MrLine } from "../../types/mrLine";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";

type RenameMrSubCategoryButtonProps = {
  items: MrLine[];
  categoryID: string;
  subCategoryID: string;
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
      toast("Material request subcategory updated", "success");

      setNewSubCategory("");

      setIsOpen(false);

      router.refresh();
    } else {
      toast("Failed to update material request subcategory", "error");
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
            <SingleSelectDropdown
              label={"SUBCATEGORY"}
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
