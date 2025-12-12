"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { LPO } from "../types/lpo";
import { PDFViewer } from "@react-pdf/renderer";
import { LPOPDF } from "@/app/components/LPOPDF";

type ViewLPOPopUpProps = {
  lpoID: number;
  children: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
  style?: React.CSSProperties;
};

export default function ViewLPOPopUp({
  lpoID,
  children,
  bgColor,
  textColor,
  borderColor,
  style,
}: ViewLPOPopUpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [lpo, setLpo] = useState<LPO | null>(null);

  useEffect(() => {
    async function fetchLpo() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoID }),
          }
        );
        const data = await response.json();
        setLpo(data.data);
      } catch (error) {
        console.error("Error fetching LPO:", error);
      }
    }
    fetchLpo();
  }, [lpoID, isOpen]);

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

      {isOpen && lpo && (
        <FormPopUp header={"VIEW LOCAL PURCHASE ORDER"} setIsOpen={setIsOpen}>
          <PDFViewer width="100%" height="800px">
            <LPOPDF lpo={lpo} />
          </PDFViewer>
        </FormPopUp>
      )}
    </>
  );
}
