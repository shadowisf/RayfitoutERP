"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useEffect, useState } from "react";
import { MrLine } from "../types/mrLine";
import Button from "@/app/components/Button";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";

type BoqReferencePopUpProps = {
  mrHeader: MrHeader;
  item: MrLine;
};

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
  category: string;
  sub_category: string;
  category_number: number;
  subcategory_number: number;
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

  // ✅ Fetch all BOQ items with proper numbering
  useEffect(() => {
    if (!isOpen || !item.boq_line_ids || !mrHeader.project_id) return;

    setIsLoading(true);

    // Parse BOQ IDs
    const boqIdsArray = item.boq_line_ids
      .split(",")
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id));

    // ✅ Fetch ALL BOQ lines for the project to get proper numbering
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqLinesWithNumberRef`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: mrHeader.project_id }),
      },
    )
      .then((res) => res.json())
      .then((allBoqLines) => {
        // Filter to get only the BOQ items we need
        const filteredItems = allBoqLines
          .filter((boqLine: any) => boqIdsArray.includes(boqLine.id))
          .map((boqLine: any) => ({
            id: boqLine.id,
            item_number: boqLine.item_number, // ✅ Full item number like "1.2.3"
            item_name: boqLine.item_name,
            item_description: boqLine.item_description,
            location: boqLine.location,
            scope_of_work: boqLine.scope_of_work,
            quantity: boqLine.quantity,
            unit: boqLine.unit,
            total_cost: boqLine.total_cost,
            attachments: boqLine.attachments,
            boq_header_id: boqLine.boq_id,
            category: boqLine.category,
            sub_category: boqLine.sub_category,
            category_number: boqLine.category_number, // ✅ Get category number
            subcategory_number: boqLine.subcategory_number, // ✅ Get subcategory number
          }));

        setBoqItems(filteredItems);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching BOQ items:", error);
        setIsLoading(false);
      });
  }, [isOpen, item.boq_line_ids, mrHeader.project_id]);

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
                {/* ✅ Show category.subcategory number and name as header */}
                <h2>
                  <a href={`/boq/${boqItem.boq_header_id}`}>
                    {boqItem.category_number}.{boqItem.subcategory_number} -{" "}
                    {boqItem.category} / {boqItem.sub_category}
                  </a>
                </h2>

                <br />

                <table className="items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>ITEM</th>
                      <th>QUANTITY</th>
                      {canSeePrice && <th>TOTAL PRICE</th>}
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
