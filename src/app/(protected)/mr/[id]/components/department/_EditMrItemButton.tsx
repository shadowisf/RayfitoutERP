"use client";

import { useState, useEffect } from "react";
import MultipleSelectMaterialItemButton, {
  PredefinedItem,
} from "@/app/components/_MultipleSelectMaterialItemButton";
import MobileMaterialSelect from "@/app/components/_MobileMaterialSelect";
import Button from "@/app/components/Button";
import { mapPredefinedUnit } from "@/constants/units";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import { useRefresh } from "@/app/context/RefreshContext";

type EditMrItemButtonProps = {
  projectID?: number;
  item: MrLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
  full?: boolean;
  style?: React.CSSProperties;
  stageName?: string;
  canEditItemDetails?: boolean;
};

export default function EditMrItemButton({
  item,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  style,
  stageName,
}: EditMrItemButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();

  const { userInfo } = useAuth();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false);
  const [isMobileSelectOpen, setIsMobileSelectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseBoqLineIds = (): number[] => {
    if (!item.boq_line_ids) return [];
    if (typeof item.boq_line_ids === "string") {
      return item.boq_line_ids
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id) && id > 0);
    }
    if (typeof item.boq_line_ids === "number") return [item.boq_line_ids];
    return [];
  };

  const handleMaterialSelect = async (items: PredefinedItem[]) => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    const selected = items[0];
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: item.id,
          changed_by: userInfo?.name || null,
          stage_name: stageName || "INITIAL APPROVAL",
          boq_line_ids: parseBoqLineIds(),
          material_category_id: selected.category_id,
          material_subcategory_id: [selected.subcategory_id],
          material_description: selected.material_description,
          quantity: Number(item.quantity) || 0,
          unit: selected.unit
            ? mapPredefinedUnit(selected.unit)
            : item.unit || "",
          notes: item.notes || null,
          specification: item.specification || null,
          brand: item.brand || null,
          delivery_location: item.delivery_location || "",
          predefined_item_id: selected.id,
          attachment: item.attachment || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(
          err.error || `Failed to update ${selected.material_description}`,
          "error",
        );
        return;
      }

      toast(`Updated to ${selected.material_description}`, "success");
      await refresh();
    } catch {
      toast("Failed to update material request item", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => {
          if (isMobile) setIsMobileSelectOpen(true);
          else setIsMaterialPickerOpen(true);
        }}
        full={full ? true : false}
        style={{ padding: "7px 7px", ...style }}
        disabled={isSubmitting}
      >
        {children}
      </Button>

      {/* Desktop — single-select material picker */}
      <MultipleSelectMaterialItemButton
        onSelectItems={handleMaterialSelect}
        currentItemIDs={
          item.predefined_item_id ? [item.predefined_item_id] : []
        }
        isOpen={isMaterialPickerOpen}
        setIsOpen={setIsMaterialPickerOpen}
        singleSelect
      />

      {/* Mobile — bottom sheet */}
      {isMobile && isMobileSelectOpen && (
        <MobileMaterialSelect
          onSelectItems={(items) => {
            setIsMobileSelectOpen(false);
            handleMaterialSelect(items);
          }}
          onClose={() => setIsMobileSelectOpen(false)}
          currentItemIDs={
            item.predefined_item_id ? [item.predefined_item_id] : []
          }
          singleSelect
        />
      )}
    </>
  );
}
