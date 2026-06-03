"use client";

import Button from "@/app/components/Button";
import CreateNewMaterialButton from "@/app/components/_CreateNewMaterialButton";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";

type Props = {
  categoryId: number;
  subCategoryId: number;
  defaultDatabase?: string;
  onSuccess: (newItem: PredefinedItem) => void;
};

export default function AddMaterialToSubCategoryButton({
  categoryId,
  subCategoryId,
  defaultDatabase,
  onSuccess,
}: Props) {
  return (
    <CreateNewMaterialButton
      defaultCategoryId={categoryId}
      defaultSubCategoryId={subCategoryId}
      defaultDatabase={defaultDatabase}
      onSuccess={onSuccess}
      renderTrigger={(open) => (
        <Button
          componentType="button"
          bgColor="transparent"
          borderColor="transparent"
          textColor="black"
          type="button"
          style={{ padding: "0px" }}
          onClick={(e) => {
            (e as any).stopPropagation();
            open();
          }}
        >
          <img src="/icons/plus.svg" alt="add" />
        </Button>
      )}
    />
  );
}
