"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import Button from "@/app/components/Button";
import { BoqLine } from "../types/boqLine";

type ItemDescriptionPopUpProps = {
  item: BoqLine;
};

export default function ItemDescriptionPopUp({
  item,
}: ItemDescriptionPopUpProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="external link icon" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ITEM DESCRIPTION"}
          setIsOpen={setIsOpen}
          style={{ whiteSpace: "pre-wrap", width: "500px" }}
        >
          {item.item_description}
        </FormPopUp>
      )}
    </>
  );
}
