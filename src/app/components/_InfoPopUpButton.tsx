"use client";

import FormPopUp from "@/app/components/FormPopup";
import React, { CSSProperties, useState } from "react";
import Button from "@/app/components/Button";

type InfoPopUpButtonProps = {
  text: React.ReactNode;
  header: React.ReactNode;
  children?: React.ReactNode;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  style?: CSSProperties;
};

const externalLinkIcon = "/icons/external-link.svg";

export default function InfoPopUpButton({
  text,
  header,
  children = <img src={externalLinkIcon} alt="external link icon" />,
  bgColor = "rgba(239, 239, 239, 1)",
  borderColor = "rgba(223, 223, 223, 1)",
  textColor = "black",
  style = { padding: "7px 7px" },
}: InfoPopUpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        style={style}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={header}
          setIsOpen={setIsOpen}
          style={{ whiteSpace: "pre-wrap" }}
        >
        <p>{text}</p>
        </FormPopUp>
      )}
    </>
  );
}
