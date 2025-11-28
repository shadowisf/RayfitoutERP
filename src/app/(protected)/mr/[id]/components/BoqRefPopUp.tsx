"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import { MrLine } from "../types/mrLine";
import Button from "@/app/components/Button";

type BoqRefPopUpProps = {
  item: MrLine;
};

export default function BoqRefPopUp({ item }: BoqRefPopUpProps) {
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
          header={`${item.boq_item_number} - ${item.boq_item_name}`}
          setIsOpen={setIsOpen}
          style={{ whiteSpace: "pre-wrap", width: "500px" }}
        >
          <span>QUANTITY & UNIT</span>
          <h2>
            {item.boq_quantity} {item.boq_unit}
          </h2>
          <br />
          <br />
          <span>TOTAL COST</span>
          <h2>{item.boq_total_cost} AED</h2>
          <br />
          <br />
          {item.boq_item_description}
        </FormPopUp>
      )}
    </>
  );
}
