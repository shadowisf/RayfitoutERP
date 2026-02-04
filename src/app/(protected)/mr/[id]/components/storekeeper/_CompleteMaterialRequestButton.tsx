"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";
import { MrLine } from "../../types/mrLine";

type GroupedMrLines = {
  [category: string]: {
    [subCategory: string]: {
      [supplier: string]: MrLine[];
    };
  };
};

type CompleteMaterialRequestButtonProps = {
  mrHeader: MrHeader;
  mrLineItems: GroupedMrLines; // ✅ Add this prop to pass MR line items
  style?: React.CSSProperties;
  disabled?: boolean;
};

export default function CompleteMaterialRequestButton({
  mrHeader,
  mrLineItems, // ✅ Add this
  style,
  disabled,
}: CompleteMaterialRequestButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ✅ Flatten the grouped MR lines into a single array
    const flattenedItems: any[] = [];
    for (const category in mrLineItems) {
      for (const subCategory in mrLineItems[category]) {
        for (const supplier in mrLineItems[category][subCategory]) {
          const items = mrLineItems[category][subCategory][supplier];
          flattenedItems.push(...items);
        }
      }
    }

    const res = await fetch(`/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForCompletion",
        id: mrHeader.id,
        changed_by: userInfo?.name,
        department_id: mrHeader.department_id,
        mr_line_items: flattenedItems, // ✅ Pass all MR line items
      }),
    });

    if (res.ok) {
      toast("Material request completed", "success");
      router.refresh();
      setIsOpen(false);
    } else {
      toast("Failed to complete material request", "error");
      setIsOpen(false);
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={"white"}
        borderColor={"white"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", ...style }}
        disabled={disabled}
      >
        COMPLETE MATERIAL REQUEST
      </Button>

      {isOpen && (
        <FormPopUp
          header={"COMPLETE MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to complete this material request?</p>
        </FormPopUp>
      )}
    </>
  );
}
