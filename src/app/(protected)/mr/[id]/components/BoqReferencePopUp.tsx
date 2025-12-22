"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import { MrLine } from "../types/mrLine";
import Button from "@/app/components/Button";

type BoqReferencePopUpProps = {
  item: MrLine;
};

export default function BoqReferencePopUp({ item }: BoqReferencePopUpProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="external link icon" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={
            <>
              <a href={`/boq/${item.boq_header_id}`}>
                {item.boq_item_number} - {item.boq_item_name}
              </a>
            </>
          }
          setIsOpen={setIsOpen}
          style={{ whiteSpace: "pre-wrap" }}
        >
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ITEM</th>
                <th>QUANTITY</th>
                <th>RATE</th>
                <th>TOTAL COST</th>
                <th>LOCATION</th>
                <th>ITEM DESCRIPTION</th>
                <th>ATTACHMENT(S)</th>
              </tr>
            </thead>
            <tbody>
              <tr key={item.id}>
                <td>{item.boq_item_number}</td>
                <td>{item.boq_item_name}</td>
                <td>
                  {item.quantity} {item.unit}
                </td>
                <td>{item.boq_rate?.toLocaleString()}</td>
                <td>AED {item.boq_total_cost?.toLocaleString()}</td>
                <td>{item.boq_location?.split(" - ").pop()}</td>
                {/* <td
                  className="item-description"
                  style={{ whiteSpace: "pre-wrap", width: "300px" }}
                >
                  {needsCollapse ? (
                    <>
                      {expanded
                        ? item.item_description
                        : item.item_description.substring(0, maxLength) + "..."}
                      <br />
                      <br />
                      <span
                        className="toggle-btn"
                        onClick={function () {
                          toggleDescription(item.id);
                        }}
                      >
                        {expanded ? "SHOW LESS" : "SHOW MORE"}
                      </span>
                    </>
                  ) : (
                    item.item_description
                  )}
                </td> */}
                <td>{item.boq_item_description}</td>
                {/* <td>
                  <BoqReferenceItemDescriptionPopUp item={item} />
                </td> */}

                <td className="attachments">
                  <div className="attachments-grid">
                    {(() => {
                      try {
                        if (!item.boq_attachments) {
                          return null;
                        }

                        if (Array.isArray(item.boq_attachments)) {
                          return item.boq_attachments.map(function (
                            url: string,
                            i: number
                          ) {
                            return (
                              <a
                                href={url}
                                key={i}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img src={url} alt="attachment" />
                              </a>
                            );
                          });
                        }

                        // Handle if it's a string (JSON or plain string)
                        const attachmentString = String(item.boq_attachments);

                        if (attachmentString.trim() === "") {
                          return null;
                        }

                        // Try to parse as JSON
                        const attachments = JSON.parse(attachmentString);

                        if (!Array.isArray(attachments)) {
                          return null;
                        }

                        return attachments.map(function (
                          url: string,
                          i: number
                        ) {
                          return (
                            <a
                              href={url}
                              key={i}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img src={url} alt="attachment" />
                            </a>
                          );
                        });
                      } catch (error) {
                        console.error(
                          "Failed to parse attachments:",
                          error,
                          item.boq_attachments
                        );
                        return null;
                      }
                    })()}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </FormPopUp>
      )}
    </>
  );
}
