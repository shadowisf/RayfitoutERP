"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import { MrLine } from "../../types/mrLine";
import Button from "@/app/components/Button";

type RejectPopUpProps = {
  item: MrLine;
};

export default function RejectCommentPopUp({ item }: RejectPopUpProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"transparent"}
        borderColor={"transparent"}
        textColor={"black"}
        onClick={() => {
          setIsOpen(true);
        }}
        style={{ padding: "0px", filter: "invert(1)" }}
      >
        <img src={externalLinkIcon} alt="external link icon" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"REJECT COMMENTS"}
          setIsOpen={setIsOpen}
          style={{ whiteSpace: "pre-wrap", width: "500px", color: "black" }}
        >
          {item.reject_comment}
        </FormPopUp>
      )}
    </>
  );
}
