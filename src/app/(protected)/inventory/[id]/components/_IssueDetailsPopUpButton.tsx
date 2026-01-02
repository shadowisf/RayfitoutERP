"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import ViewTSNPDFButton from "./_ViewTsnPDFButton";
import UploadSignedTSCButton from "./_UploadSignedTSCButton";

type TransactionDetailsPopUpButtonProps = {
  transferID: number;
};

export default function TransactionDetailsPopUpButton({
  transferID,
}: TransactionDetailsPopUpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const externalLinkIcon = "/icons/external-link.svg";
  const downloadIcon = "/icons/download.svg";

  useEffect(() => {
    async function fetchTransferDetails() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockDetailsByID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: transferID }),
          }
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
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="batch details" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"TRANSACTION DETAILS"}
          setIsOpen={setIsOpen}
          style={{ textTransform: "uppercase" }}
        >
          <div
            style={{
              backgroundColor: "rgba(243, 243, 243, 1)",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h2>OVERVIEW</h2>

            <br />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, max-content)",
                gap: "25px",
                width: "fit-content",
              }}
            >
              <div>
                <small>TRANSFER TYPE</small>
                <h3>{transaction?.type}</h3>
              </div>
              <div>
                <small>QUANTITY</small>
                <h3>
                  {transaction?.quantity} {transaction?.unit}
                </h3>
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
                <h3>
                  {transaction?.to_location ||
                    transaction?.project_name ||
                    transaction?.receiver_name ||
                    "-"}
                </h3>
              </div>
              <div>
                <small>THIRD PARTY TRANSPORTATION INVOLVED?</small>
                <h3>
                  {transaction?.third_party_involved === 1 ? "YES" : "NO"}
                </h3>
              </div>
            </div>
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
                <ViewTSNPDFButton transactionID={transferID} />
                <UploadSignedTSCButton transactionID={transferID} />
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

          <br />
          <br />

          <div
            style={{
              backgroundColor: "rgba(243, 243, 243, 1)",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h2>ATTACHMENTS</h2>

            <br />

            {transaction?.attachment && transaction?.attachment.length > 0 ? (
              <div style={{ display: "flex", gap: "10px" }}>
                {transaction?.attachment.map((attachment: any) => (
                  <a
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={attachment}
                  >
                    <img
                      src={attachment}
                      alt="attachment"
                      width="100"
                      height="100"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p>No attachments found.</p>
            )}
          </div>
        </FormPopUp>
      )}
    </>
  );
}
