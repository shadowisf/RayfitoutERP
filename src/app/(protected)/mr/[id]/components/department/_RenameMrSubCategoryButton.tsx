"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { MrLine } from "../../types/mrLine";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRefresh } from "@/app/context/RefreshContext";

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
  const { refresh } = useRefresh();


  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

  // Resolve initial single subcategory ID
  const resolveInitialId = (): string | number => {
    if (!subCategoryID) return "";
    if (typeof subCategoryID === "number") return subCategoryID;
    if (typeof subCategoryID === "string") {
      const first = subCategoryID.split(",")[0].trim();
      const num = Number(first);
      return isNaN(num) ? "" : num;
    }
    if (Array.isArray(subCategoryID)) {
      const num = Number(subCategoryID[0]);
      return isNaN(num) ? "" : num;
    }
    return "";
  };

  const [selectedSubCategoryID, setSelectedSubCategoryID] = useState<
    string | number
  >(resolveInitialId);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/mr/getMaterialSubCategoryValuesByCategoryID", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryID }),
      })
        .then((res) => res.json())
        .then((data) => setMaterialSubCategoryValues(data))
        .catch(console.error);
    }
  }, [categoryID, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSubCategoryID) {
      toast("Please select a subcategory", "error");
      return;
    }

    const cleanedId = Number(selectedSubCategoryID);
    if (isNaN(cleanedId)) {
      toast("Invalid subcategory selection", "error");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateSubCategory",
        new_material_subcategory_ids: [cleanedId],
        old_material_subcategory_id: subCategoryID,
        item_ids: items.map((item) => item.id),
      }),
    });

    if (res.ok) {
      toast("Material request subcategory updated", "success");
      setSelectedSubCategoryID("");
      await refresh();
      setIsOpen(false);
    } else {
      const errorData = await res.json();
      toast(
        errorData.error || "Failed to update material request subcategory",
        "error",
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
            <SingleSelectDropdown
              label={"SUBCATEGORY"}
              dbData={materialSubCategoryValues}
              selectedValue={selectedSubCategoryID}
              onChange={(val) => setSelectedSubCategoryID(val)}
              placeholder="SELECT SUBCATEGORY"
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
