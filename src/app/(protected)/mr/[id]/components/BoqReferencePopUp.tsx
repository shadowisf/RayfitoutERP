"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useEffect, useState } from "react";
import { MrLine } from "../types/mrLine";
import Button from "@/app/components/Button";
import { MrHeader } from "../types/mrHeader";
import BudgetTrackerMeter from "./BudgetTrackerMeter";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import { useAuth } from "@/app/context/AuthContext";

type BoqReferencePopUpProps = {
  mrHeader: MrHeader;
  item: MrLine;
};

type SpendHistoryItem = {
  mr_header_id: number;
  lpo_id: number;
  spent_amount: number;
  lpo_date: string;
};

export default function BoqReferencePopUp({
  item,
  mrHeader,
}: BoqReferencePopUpProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";
  const locationIcon = "/icons/location-boq.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [quotedBudget, setQuotedBudget] = useState(0);
  const [allocatedBudget, setAllocatedBudget] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [spendHistory, setSpendHistory] = useState<SpendHistoryItem[]>([]);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getBudgetTrackingDetailsByMrHeaderID`,
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

  // Fetch total spend and spend history for this BOQ item
  useEffect(() => {
    if (!item.boq_line_id) return;

    // Fetch total spend
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getTotalSpentByBoqLineID`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boq_line_id: item.boq_line_id,
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
        setTotalSpend(Number(data.total_spend) || 0);
      })
      .catch((err) => {
        console.error("Error fetching total spend:", err);
      });

    // Fetch spend history
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getSpentHistoryByBoqLineID`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boq_line_id: item.boq_line_id,
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
        setSpendHistory(data);
      })
      .catch((err) => {
        console.error("Error fetching spend history:", err);
      });
  }, [item.boq_line_id]);

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
                {/* <th>DESCRIPTION</th>
                <th>LOCATION</th> */}
                <th>QUANTITY</th>
                {(userInfo?.departmentID === 8 ||
                  userInfo?.departmentID === 12 ||
                  userInfo?.departmentID === 10) && (
                  <>
                    <th>TOTAL PRICE</th>
                    <th>TOTAL SPEND</th>
                  </>
                )}
                <th>ATTACHMENT(S)</th>
              </tr>
            </thead>
            <tbody>
              <tr key={item.id}>
                <td>{item.boq_item_number}</td>
                <td>
                  <strong>{item.boq_item_name}</strong>

                  {item.boq_item_description && (
                    <>
                      <br />
                      <br />
                      {item.boq_item_description}
                    </>
                  )}

                  {item.boq_location && (
                    <>
                      <br />
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <img src={locationIcon} />
                        <span
                          style={{
                            fontWeight: 600,
                            marginTop: "4px",
                            color: "rgba(105, 105, 105, 1)",
                          }}
                        >
                          {item.boq_location}
                        </span>
                      </div>
                    </>
                  )}

                  {item.boq_scope_of_work && (
                    <>
                      <br />

                      <div
                        style={{
                          backgroundColor: "rgba(225, 225, 225, 1)",
                          borderRadius: "50px",
                          padding: "4px 10px",
                          width: "fit-content",
                        }}
                      >
                        <strong>{item.boq_scope_of_work}</strong>
                      </div>
                    </>
                  )}
                </td>

                {/* <td>
                  {item.boq_item_description ? (
                    <InfoPopUpButton
                      text={item.boq_item_description}
                      header={"ITEM DESCRIPTION"}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td>{item.boq_location?.split(" - ").pop()}</td> */}
                <td>
                  {item.quantity} {item.unit}
                </td>
                {(userInfo?.departmentID === 8 ||
                  userInfo?.departmentID === 12 ||
                  userInfo?.departmentID === 10) && (
                  <>
                    <td>AED {item.boq_total_cost?.toLocaleString()}</td>
                    <td>AED {totalSpend.toLocaleString()}</td>
                  </>
                )}

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

          {/* Spend History Table */}
          {(userInfo?.departmentID === 8 ||
            userInfo?.departmentID === 12 ||
            userInfo?.departmentID === 10) &&
            spendHistory.length > 0 && (
              <>
                <br />
                <br />

                <h3>SPEND HISTORY</h3>
                <br />
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>MR NUMBER</th>
                      <th>AMOUNT</th>
                      <th>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spendHistory.map((history, index) => (
                      <tr key={index}>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              alignItems: "center",
                            }}
                          >
                            MR-{String(history.mr_header_id).padStart(5, "0")}
                            <Button
                              componentType={"link"}
                              bgColor={"rgba(239, 239, 239, 1)"}
                              borderColor={"rgba(223, 223, 223, 1)"}
                              textColor={"black"}
                              style={{ padding: "7px 7px" }}
                              href={`/mr/${history.mr_header_id}`}
                            >
                              <img src={externalLinkIcon} alt="external link" />
                            </Button>
                          </div>
                        </td>
                        <td>{history.spent_amount.toLocaleString()} AED</td>
                        <td>
                          {new Date(history.lpo_date).toLocaleDateString(
                            "en-US"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
        </FormPopUp>
      )}
    </>
  );
}
