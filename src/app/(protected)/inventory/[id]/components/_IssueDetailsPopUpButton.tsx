"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import DownloadDnPdfButton from "./_DownloadDnPdfButton";
import UploadSignedDnButton from "./_UploadSignedDnButton";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import DownloadPlPdfButton from "./_DownloadPlPdfButton";

type TransactionDetailsPopUpButtonProps = {
  transferID: number;
  onSuccess?: () => void;
};

export default function TransactionDetailsPopUpButton({
  transferID,
  onSuccess,
}: TransactionDetailsPopUpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [transaction, setTransaction] = useState<any | null>(null);

  const externalLinkIcon = "/icons/external-link.svg";
  const noImageIcon = "/icons/no-image.jpg";

  function formatQuantity(qty: number | string | undefined | null) {
    if (qty == null) return "0";
    const num = Number(qty);
    if (isNaN(num)) return "0";
    return Number.isInteger(num)
      ? num.toString()
      : num.toFixed(3).replace(/\.?0+$/, "");
  }

  useEffect(() => {
    async function fetchTransferDetails() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockDetailsByID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: transferID }),
          },
        );
        const data = await response.json();

        if (data.success && data.data) {
          setTransaction(data.data);
        }
      } catch (error) {
        console.error("Error fetching transfer details:", error);
      }
    }
    fetchTransferDetails();
  }, [transferID]);

  return (
    <>
      <Button
        componentType="button"
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="batch details" />
      </Button>

      {isOpen && (
        <FormPopUp header={"TRANSACTION DETAILS"} setIsOpen={setIsOpen}>
          <div
            style={{
              backgroundColor: "rgba(243, 243, 243, 1)",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h2>OVERVIEW</h2>

            <br />

            {transaction?.type.toLowerCase().includes("transfer") && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, max-content)",
                  gap: "25px",
                  width: "fit-content",
                }}
              >
                <div>
                  <small>DATE</small>
                  <h3>
                    {new Date(transaction?.created_on).toLocaleDateString(
                      "en-GB",
                    )}
                  </h3>
                </div>
                <div>
                  <small>TRANSFER TYPE</small>
                  <h3>{transaction?.type}</h3>
                </div>
                <div>
                  <small>TRANSFEREE</small>
                  <h3>{transaction?.transferee}</h3>
                </div>
                <div>
                  <small>FULL NAME OF SITE RECIPIENT</small>
                  <h3>{transaction?.receiver_name}</h3>
                </div>
                <div>
                  <small>PURPOSE</small>
                  <h3>{transaction?.purpose}</h3>
                </div>
                <div>
                  <small>TRANSFER FROM</small>
                  <h3>{transaction?.from_location}</h3>
                </div>
                <div>
                  <small>TRANSFER TO</small>
                  <h3>{transaction?.to_location}</h3>
                </div>
                <div>
                  <small>3RD PARTY TRANSPORTATION INVOLVED?</small>
                  <h3>
                    {transaction?.third_party_involved === 1 ? "YES" : "NO"}
                  </h3>
                </div>
                <div>
                  <small>PACKING LIST REQUIRED?</small>
                  <h3>
                    {transaction?.packing_list_required === 1 ? "YES" : "NO"}
                  </h3>
                </div>
              </div>
            )}

            {transaction?.type.toLowerCase().includes("issue") && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, max-content)",
                  gap: "25px",
                  width: "fit-content",
                }}
              >
                <div>
                  <small>DATE</small>
                  <h3>
                    {new Date(transaction?.created_on).toLocaleDateString(
                      "en-GB",
                    )}
                  </h3>
                </div>
                <div>
                  <small>TRANSFER TYPE</small>
                  <h3>{transaction?.type}</h3>
                </div>
                <div>
                  <small>REASON</small>
                  <h3>{transaction?.purpose}</h3>
                </div>
                <div>
                  <small>PROJECT</small>
                  <h3>{transaction?.project_name || "-"}</h3>
                </div>
                <div>
                  <small>BOQ REFERENCE</small>
                  {/* ✅ Updated to show multiple BOQ items */}
                  <h3>
                    {transaction?.boq_items && transaction.boq_items.length > 0
                      ? transaction.boq_items.length === 1
                        ? transaction.boq_items[0].boq_item_number
                        : `${transaction.boq_items.length} BOQ ITEMS`
                      : "-"}
                  </h3>
                </div>
                <div>
                  <small>ISSUED FROM</small>
                  <h3>{transaction?.from_location}</h3>
                </div>
                <div>
                  <small>FULL NAME OF SITE RECIPIENT</small>
                  <h3>{transaction?.receiver_name}</h3>
                </div>
              </div>
            )}

            {transaction?.type.toLowerCase().includes("send") && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, max-content)",
                  gap: "25px",
                  width: "fit-content",
                }}
              >
                <div>
                  <small>DATE</small>
                  <h3>
                    {new Date(transaction?.created_on).toLocaleDateString(
                      "en-GB",
                    )}
                  </h3>
                </div>
                <div>
                  <small>TRANSFER TYPE</small>
                  <h3>{transaction?.type}</h3>
                </div>
                <div>
                  <small>REASON</small>
                  <h3>{transaction?.purpose}</h3>
                </div>
                <div>
                  <small>FULL NAME OF RECIPIENT</small>
                  <h3>{transaction?.receiver_name}</h3>
                </div>
                <div>
                  <small>ISSUED FROM</small>
                  <h3>{transaction?.from_location}</h3>
                </div>
                <div>
                  <small>3RD PARTY TRANSPORTATION INVOLVED?</small>
                  <h3>
                    {transaction?.third_party_involved === 1 ? "YES" : "NO"}
                  </h3>
                </div>
              </div>
            )}
          </div>

          <br />
          <br />

          <h2>MATERIALS</h2>
          <br />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM</th>
                  <th>SPECIFICATION</th>
                  <th>QUANTITY</th>
                  <th>ATTACHMENT</th>
                </tr>
              </thead>
              <tbody>
                {transaction?.items?.map((item: any, index: number) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "25px",
                        }}
                      >
                        <div style={{ width: "50px" }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt="reference image"
                              width={50}
                              style={{
                                aspectRatio: "1/1",
                                objectFit: "cover",
                                borderRadius: "5px",
                              }}
                            />
                          ) : (
                            <img
                              src={noImageIcon}
                              alt="reference image"
                              width={50}
                              style={{
                                aspectRatio: "1/1",
                                objectFit: "cover",
                                borderRadius: "5px",
                              }}
                            />
                          )}
                        </div>
                        {item.description}
                      </div>
                    </td>
                    <td>
                      {item.specification ? (
                        <InfoPopUpButton
                          header={"SPECIFICATION"}
                          text={item.specification}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {formatQuantity(item.quantity)} {item.unit}
                    </td>
                    <td>
                      {item.attachment && (
                        <a
                          href={item.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={item.attachment}
                            alt="item attachment"
                            width="50"
                            height="50"
                            style={{
                              objectFit: "cover",
                              borderRadius: "5px",
                            }}
                          />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <br />
          <br />

          <div
            style={{
              backgroundColor: "rgba(243, 243, 243, 1)",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h2>DOCUMENTS & ATTACHMENTS</h2>

            <br />

            <div style={{ maxWidth: "750px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <DownloadDnPdfButton transactionID={transferID} />
                <UploadSignedDnButton
                  transactionID={transferID}
                  onSuccess={onSuccess}
                />

                {transaction?.packing_list_required === 1 && (
                  <DownloadPlPdfButton transactionID={transferID} />
                )}
              </div>

              <br />

              <small style={{ textTransform: "none" }}>
                Disclaimer: By uploading the signed Delivery Note (DN), you
                confirm that the document is accurate, complete, and clearly
                legible. All signatures, stamps, dates, and material details
                must be fully visible in the scan. Any unclear or incomplete
                submissions may be rejected.
              </small>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
