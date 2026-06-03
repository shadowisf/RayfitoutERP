"use client";

import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import { useAuth } from "@/app/context/AuthContext";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  database_id?: number | null;
  is_archived?: number | null;
};

type Props = {
  item: MaterialItem;
  onSuccess: (newItem: MaterialItem) => void;
};

export default function DuplicateMaterialButton({ item, onSuccess }: Props) {
  const { userInfo } = useAuth();

  const handleDuplicate = async () => {
    try {
      const res = await fetch(
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
            database_id: item.database_id ?? null,
            source_item_id: item.id,
            action_type: "duplicate",
            changed_by: userInfo?.name ?? null,
          }),
        },
      );
      if (!res.ok) throw new Error();
      const newItem: MaterialItem = await res.json();
      toast("Material duplicated", "success");
      onSuccess(newItem);
    } catch {
      toast("Failed to duplicate material", "error");
    }
  };

  return (
    <Button
      componentType="button"
      bgColor="transparent"
      borderColor="transparent"
      textColor="black"
      full
      style={{ justifyContent: "flex-start" }}
      onClick={handleDuplicate}
    >
      <img src="/icons/duplicate.svg" alt="" /> Duplicate
    </Button>
  );
}
