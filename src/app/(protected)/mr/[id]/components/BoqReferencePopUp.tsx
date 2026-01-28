"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useEffect, useState } from "react";
import { MrLine } from "../types/mrLine";
import Button from "@/app/components/Button";
import { MrHeader } from "../types/mrHeader";
// import BudgetTrackerMeter from "./BudgetTrackerMeter";
import { useAuth } from "@/app/context/AuthContext";

type BoqReferencePopUpProps = {
  mrHeader: MrHeader;
  item: MrLine;
};

// type SpendHistoryItem = {
//   mr_header_id: number;
//   lpo_id: number;
//   spent_amount: number;
//   lpo_date: string;
// };

type BoqItemDetail = {
  id: number;
  item_number: string;
  item_name: string;
  item_description?: string;
  location?: string;
  scope_of_work?: string;
  quantity: number;
  unit: string;
  total_cost: number;
  attachments?: string;
  boq_header_id: number;
  // totalSpend: number;
  // spendHistory: SpendHistoryItem[];
};

export default function BoqReferencePopUp({
  item,
  mrHeader,
}: BoqReferencePopUpProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";
  const locationIcon = "/icons/location-boq.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [boqItems, setBoqItems] = useState<BoqItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Fetch all BOQ items when popup opens
  useEffect(() => {
    if (!isOpen || !item.boq_line_ids) return;

    setIsLoading(true);

    // Parse BOQ IDs
    const boqIdsArray = item.boq_line_ids
      .split(",")
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id));

    // Fetch each BOQ item's details
    Promise.all(
      boqIdsArray.map(async (boqId) => {
        try {
          // Fetch BOQ line details
          const boqResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqLineByID`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: boqId }),
            },
          );

          if (!boqResponse.ok) {
            throw new Error(`Failed to fetch BOQ ${boqId}`);
          }

          const boqData = await boqResponse.json();

          // // Fetch total spend for this BOQ item
          // const spendResponse = await fetch(
          //   `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getTotalSpentByBoqLineID`,
          //   {
          //     method: "POST",
          //     headers: { "Content-Type": "application/json" },
          //     body: JSON.stringify({ boq_line_id: boqId }),
          //   },
          // );

          // const spendData = await spendResponse.json();
          // const totalSpend = Number(spendData.total_spend) || 0;

          // // Fetch spend history for this BOQ item
          // const historyResponse = await fetch(
          //   `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getSpentHistoryByBoqLineID`,
          //   {
          //     method: "POST",
          //     headers: { "Content-Type": "application/json" },
          //     body: JSON.stringify({ boq_line_id: boqId }),
          //   },
          // );

          // const historyData = await historyResponse.json();

          return {
            id: boqData.id,
            item_number: boqData.item_number,
            item_name: boqData.item_name,
            item_description: boqData.item_description,
            location: boqData.location,
            scope_of_work: boqData.scope_of_work,
            quantity: boqData.quantity,
            unit: boqData.unit,
            total_cost: boqData.total_cost,
            attachments: boqData.attachments,
            boq_header_id: boqData.boq_header_id,
            // totalSpend,
            // spendHistory: historyData || [],
          };
        } catch (error) {
          console.error(`Error fetching BOQ ${boqId}:`, error);
          return null;
        }
      }),
    ).then((results) => {
      setBoqItems(results.filter(Boolean) as BoqItemDetail[]);
      setIsLoading(false);
    });
  }, [isOpen, item.boq_line_ids]);

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

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
          header="BILL OF QUANTITY REFERENCE"
          setIsOpen={setIsOpen}
          style={{ whiteSpace: "pre-wrap", minWidth: "1000px" }}
        >
          {isLoading ? (
            <div
              key={"loading"}
              style={{ textAlign: "center", padding: "40px" }}
            >
              Loading BOQ details...
            </div>
          ) : (
            boqItems.map((boqItem, index) => (
              <div key={index} style={{ marginBottom: "40px" }}>
                <h2>
                  <a href={`/boq/${boqItem.boq_header_id}`}>
                    {boqItem.item_number} - {boqItem.item_name}
                  </a>
                </h2>

                <br />

                <table className="items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>ITEM</th>
                      <th>QUANTITY</th>
                      {canSeePrice && (
                        <>
                          {/* <th>TOTAL SPEND</th> */}
                          <th>TOTAL PRICE</th>
                        </>
                      )}
                      <th>ATTACHMENT(S)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{boqItem.item_number}</td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <strong>{boqItem.item_name}</strong>

                          {boqItem.item_description && (
                            <p style={{ whiteSpace: "pre-wrap" }}>
                              {boqItem.item_description}
                            </p>
                          )}

                          {boqItem.location && (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                              }}
                            >
                              <img src={locationIcon} alt="location" />
                              <span
                                style={{
                                  fontWeight: 600,
                                  marginTop: "4px",
                                  color: "rgba(105, 105, 105, 1)",
                                }}
                              >
                                {boqItem.location}
                              </span>
                            </div>
                          )}

                          {boqItem.scope_of_work && (
                            <div
                              style={{
                                backgroundColor: "rgba(225, 225, 225, 1)",
                                borderRadius: "50px",
                                padding: "4px 10px",
                                width: "fit-content",
                              }}
                            >
                              <strong>{boqItem.scope_of_work}</strong>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {item.quantity} {item.unit}
                      </td>
                      {canSeePrice && (
                        <>
                          {/* <td>AED {boqItem.totalSpend.toLocaleString()}</td> */}
                          <td>AED {boqItem.total_cost?.toLocaleString()}</td>
                        </>
                      )}
                      <td className="attachments">
                        <div className="attachments-grid">
                          {(() => {
                            try {
                              if (!boqItem.attachments) {
                                return null;
                              }

                              if (Array.isArray(boqItem.attachments)) {
                                return boqItem.attachments.map(function (
                                  url: string,
                                  i: number,
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

                              const attachmentString = String(
                                boqItem.attachments,
                              );

                              if (attachmentString.trim() === "") {
                                return null;
                              }

                              const attachments = JSON.parse(attachmentString);

                              if (!Array.isArray(attachments)) {
                                return null;
                              }

                              return attachments.map(function (
                                url: string,
                                i: number,
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
                                boqItem.attachments,
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
                {/* {canSeePrice && boqItem.spendHistory.length > 0 && (
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
                        {boqItem.spendHistory.map((history, historyIndex) => (
                          <tr key={historyIndex}>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                MR-
                                {String(history.mr_header_id).padStart(5, "0")}
                                <Button
                                  componentType={"link"}
                                  bgColor={"rgba(239, 239, 239, 1)"}
                                  borderColor={"rgba(223, 223, 223, 1)"}
                                  textColor={"black"}
                                  style={{ padding: "7px 7px" }}
                                  href={`/mr/${history.mr_header_id}`}
                                >
                                  <img
                                    src={externalLinkIcon}
                                    alt="external link"
                                  />
                                </Button>
                              </div>
                            </td>
                            <td>{history.spent_amount.toLocaleString()} AED</td>
                            <td>
                              {new Date(history.lpo_date).toLocaleDateString(
                                "en-US",
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )} */}

                {/* Separator between multiple BOQ items */}
                {index < boqItems.length - 1 && (
                  <hr
                    style={{ margin: "40px 0", border: "1px solid #e0e0e0" }}
                  />
                )}
              </div>
            ))
          )}
        </FormPopUp>
      )}
    </>
  );
}
