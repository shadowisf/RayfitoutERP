"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useEffect, useState } from "react";
import { MrLine } from "../types/mrLine";
import Button from "@/app/components/Button";
import { MrHeader } from "../types/mrHeader";
import BudgetTrackerMeter from "./BudgetTrackerMeter";

type BoqReferencePopUpProps = {
  mrHeader: MrHeader;
  item: MrLine;
};

export default function BoqReferencePopUp({
  item,
  mrHeader,
}: BoqReferencePopUpProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [quotedBudget, setQuotedBudget] = useState(0);
  const [allocatedBudget, setAllocatedBudget] = useState(0);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getBudgetTrackingDetails`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mr_header_id: mrHeader.id,
        }),
      }
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setQuotedBudget(Number(data.quoted_budget) || 0);
        setAllocatedBudget(Number(data.allocated_budget) || 0);
      })
      .catch((err) => {
        console.error("Error fetching budget details:", err);
      });
  }, [mrHeader.id]);

  const percentageUsed =
    quotedBudget > 0
      ? Math.min((allocatedBudget / quotedBudget) * 100, 100)
      : 0;

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
          {/* Budget Tracking Section */}
          <BudgetTrackerMeter mrHeader={mrHeader} />

          <br />
          <br />

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
                <td>AED {item.boq_rate?.toLocaleString()}</td>
                <td>AED {item.boq_total_cost?.toLocaleString()}</td>
                <td>{item.boq_location?.split(" - ").pop()}</td>
                <td>{item.boq_item_description}</td>

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

                        const attachmentString = String(item.boq_attachments);

                        if (attachmentString.trim() === "") {
                          return null;
                        }

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
