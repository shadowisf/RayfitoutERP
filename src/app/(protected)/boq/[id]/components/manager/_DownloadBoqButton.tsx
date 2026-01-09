"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import Button from "@/app/components/Button";
import DownloadBoqWithPriceButton from "./_DownloadBoqWithPriceButton";
import { BoqHeader } from "../../types/boqHeader";
import { BoqLine } from "../../types/boqLine";
import DownloadBoqWithNoPriceButton from "./_DownloadBoqWithNoPriceButton";

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

type DownloadBoqButtonProps = {
  boqHeader: BoqHeader;
  boqLines: GroupedBoqLines;
};

export default function DownloadBoqButton({
  boqHeader,
  boqLines,
}: DownloadBoqButtonProps) {
  const downloadIcon = "/icons/download.svg";
  const fileIcon = "/icons/file-boq.svg";

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"black"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
      >
        EXPORT BOQ <img src={downloadIcon} />
      </Button>

      {isOpen && (
        <FormPopUp header={"EXPORT BOQ"} setIsOpen={setIsOpen}>
          <div className="input-row full">
            <DownloadBoqWithPriceButton
              boqHeader={boqHeader}
              boqLines={boqLines}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  marginLeft: "25px",
                  marginRight: "25px",
                }}
              >
                <div style={{ display: "flex", gap: "20px" }}>
                  <img src={fileIcon} style={{ scale: 2 }} />{" "}
                  <span>Priced BOQ</span>
                </div>{" "}
                <img src={downloadIcon} />
              </div>
            </DownloadBoqWithPriceButton>
          </div>

          <br />

          <div className="input-row full">
            <DownloadBoqWithNoPriceButton
              boqHeader={boqHeader}
              boqLines={boqLines}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  marginLeft: "25px",
                  marginRight: "25px",
                }}
              >
                <div style={{ display: "flex", gap: "20px" }}>
                  <img src={fileIcon} style={{ scale: 2 }} />{" "}
                  <span>Unpriced BOQ</span>
                </div>{" "}
                <img src={downloadIcon} />
              </div>
            </DownloadBoqWithNoPriceButton>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
