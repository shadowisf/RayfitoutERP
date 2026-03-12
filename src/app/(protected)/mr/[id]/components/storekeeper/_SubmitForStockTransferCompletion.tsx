"use client";

import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";

type Props = {
  mrHeader: MrHeader;
  mrLines: MrLine[];
};

export default function SubmitForStockTransferCompletion({
  mrHeader,
  mrLines,
}: Props) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  // Only item_available lines matter
  const itemAvailableLines = mrLines.filter(
    (l) => l.qs_review_type === "item_available",
  );

  // Check if there are any need_order lines (mixed MR)
  const hasNeedOrder = mrLines.some(
    (l) => l.qs_review_type === "need_order",
  );

  // Check if all item_available items have transfers and signed DN
  const allComplete = itemAvailableLines.every(
    (l) => l.stock_transfer_id && l.signed_dn_file,
  );

  async function handleSubmit() {
    if (!allComplete) {
      toast(
        "All items must be transferred and have signed DN uploaded",
        "error",
      );
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitStockTransferCompletion",
        id: mrHeader.id,
        changed_by: userInfo?.name,
        department_id: mrHeader.department_id,
      }),
    });

    if (res.ok) {
      setIsOpen(false);
      toast(
        hasNeedOrder
          ? "Material request submitted for quotations"
          : "Material request completed, material request fulfilled",
        "success",
      );
      router.refresh();
      router.replace(`/mr/`);
    } else {
      const data = await res.json();
      toast(data.error || "Failed to submit", "error");
    }
  }

  const isDisabled = !allComplete;

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"white"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        disabled={isDisabled}
        style={{
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? "not-allowed" : "pointer",
          pointerEvents: isDisabled ? "none" : "auto",
        }}
      >
        {hasNeedOrder ? "SUBMIT FOR QUOTATION" : "SUBMIT FOR COMPLETION"}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <p>Are you sure you want to submit this material request?</p>
        </FormPopUp>
      )}
    </>
  );
}
