"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";

type BatchDetailsPopUpButtonProps = {
  inventoryItem: InventoryItem;
};

export default function BatchDetailsPopUpButton({
  inventoryItem,
}: BatchDetailsPopUpButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const externalLinkIcon = "/icons/external-link.svg";

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
        <img src={externalLinkIcon} />
      </Button>

      {isOpen && (
        <FormPopUp header={"BATCH DETAILS"} setIsOpen={setIsOpen}>
          TEST
        </FormPopUp>
      )}
    </>
  );
}
