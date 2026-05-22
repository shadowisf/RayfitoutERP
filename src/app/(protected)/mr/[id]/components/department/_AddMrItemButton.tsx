"use client";

import MultipleSelectMaterialItemButton, {
  PredefinedItem,
} from "@/app/components/_MultipleSelectMaterialItemButton";
import MobileMaterialSelect from "@/app/components/_MobileMaterialSelect";
import Button from "@/app/components/Button";
import { mapPredefinedUnit } from "@/constants/units";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";

type AddMrItemButtonProps = {
  mrHeaderID: number;
  projectID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  full?: boolean;
  style?: React.CSSProperties;
  stageName?: string;
};

export default function AddMrItemButton({
  mrHeaderID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  style,
  stageName,
}: AddMrItemButtonProps) {
  const router = useRouter();
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

  // On confirm from material picker → create MR lines immediately
  const handleMaterialSelect = async (items: PredefinedItem[]) => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    try {
      for (const item of items) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createMrLine",
            mr_header_id: mrHeaderID,
            changed_by: userInfo?.name || null,
            stage_name: stageName || "INITIAL APPROVAL",
            material_category_id: item.category_id,
            material_subcategory_ids: [item.subcategory_id],
            predefined_item_id: item.id,
            material_description: item.material_description,
            quantity: 0,
            unit: item.unit ? mapPredefinedUnit(item.unit) : "",
            boq_line_ids: [],
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          toast(
            err.error || `Failed to add ${item.material_description}`,
            "error",
          );
          return;
        }
      }

      toast(
        `${items.length} item${items.length !== 1 ? "s" : ""} added`,
        "success",
      );
      router.refresh();
    } catch {
      toast("Failed to add material request items", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => {
          if (isMobile) setIsMobileSelectOpen(true);
          else setIsMaterialPickerOpen(true);
        }}
        full={full ? true : false}
        style={style}
        disabled={isSubmitting}
      >
        {children}
      </Button>

      {/* Desktop — material picker opens directly */}
      <MultipleSelectMaterialItemButton
        onSelectItems={handleMaterialSelect}
        currentItemIDs={[]}
        isOpen={isMaterialPickerOpen}
        setIsOpen={setIsMaterialPickerOpen}
      />

      {/* Mobile — bottom sheet material picker */}
      {isMobile && isMobileSelectOpen && (
        <MobileMaterialSelect
          onSelectItems={(items) => {
            setIsMobileSelectOpen(false);
            handleMaterialSelect(items);
          }}
          onClose={() => setIsMobileSelectOpen(false)}
          currentItemIDs={[]}
        />
      )}
    </>
  );
}
