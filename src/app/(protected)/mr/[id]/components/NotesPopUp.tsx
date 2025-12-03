"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import { MrLine } from "../types/mrLine";
import Button from "@/app/components/Button";

type NotesPopUpProps = {
  item: MrLine;
};

export default function NotesPopUp({ item }: NotesPopUpProps) {
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
          header={"NOTES"}
          setIsOpen={setIsOpen}
          style={{ whiteSpace: "pre-wrap", width: "500px" }}
        >
          {item.notes}
        </FormPopUp>
      )}
    </>
  );
}
