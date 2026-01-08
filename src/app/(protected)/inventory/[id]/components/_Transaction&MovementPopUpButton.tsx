"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useState, useEffect } from "react";
import { InventoryItem } from "../../types/inventoryItem";
import TransactionTimeline from "./TransactionTimeline";

type TransactionAndMovementPopUpButtonProps = {
  inventoryItem: InventoryItem;
};

export default function TransactionAndMovementPopUpButton({
  inventoryItem,
}: TransactionAndMovementPopUpButtonProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [stockData, setStockData] = useState<{
    stocks: any[];
    stocksTransferIssue: any[];
  }>({
    stocks: [],
    stocksTransferIssue: [],
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch stock transactions for this inventory item
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStocksByInventoryItemID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryItemId: inventoryItem.id }),
        }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStockData({
              stocks: data.stocks || [],
              stocksTransferIssue: data.stocksTransferIssue || [],
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching stock data:", err);
        });
    }
  }, [isOpen, inventoryItem.id]);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="view transactions" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={`TRANSACTION & MOVEMENT - ${inventoryItem.description.toUpperCase()}`}
          setIsOpen={setIsOpen}
        >
          {stockData.stocks.length === 0 &&
          stockData.stocksTransferIssue.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#888",
              }}
            >
              No transactions found for this item
            </div>
          ) : (
            <TransactionTimeline
              stocks={stockData.stocks}
              stocksTransferIssue={stockData.stocksTransferIssue}
              inventoryItem={inventoryItem}
            />
          )}
        </FormPopUp>
      )}
    </>
  );
}
