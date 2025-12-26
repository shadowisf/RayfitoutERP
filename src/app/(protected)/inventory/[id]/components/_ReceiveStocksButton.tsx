"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";

type ReceiveStocksButtonProps = {
  inventoryItem: InventoryItem;
};

type PendingTransfer = {
  id: number;
  inventory_item_id: number;
  quantity: number;
  from_location: string;
  to_location: string;
  created_on: string;
  receiver_name: string;
  description: string;
};

export default function ReceiveStocksButton({
  inventoryItem,
}: ReceiveStocksButtonProps) {
  const { userInfo } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>(
    []
  );
  const [selectedTransferId, setSelectedTransferId] = useState("");
  const [selectedTransfer, setSelectedTransfer] =
    useState<PendingTransfer | null>(null);
  const [receivedQuantity, setReceivedQuantity] = useState("");
  const [fullNameOfReceiver, setFullNameOfReceiver] = useState("");
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    fetchPendingTransfers();
  }, []);

  useEffect(() => {
    if (selectedTransferId) {
      // Find the transfer by matching the display value
      const transfer = pendingTransfers.find(
        (t) => `TRN-${t.id.toString().padStart(5, "0")}` === selectedTransferId
      );
      setSelectedTransfer(transfer || null);
    } else {
      setSelectedTransfer(null);
    }
  }, [selectedTransferId, pendingTransfers]);

  const fetchPendingTransfers = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getPendingTransfersByReceiverName`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            receiver_name: userInfo?.name,
            receiver_role: userInfo?.role,
            inventory_item_id: inventoryItem.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pending transfers");
      }

      const data = await response.json();

      setPendingTransfers(data);
    } catch (error) {
      toast("Failed to load pending transfers", "error");
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  function normalizeName(name: string) {
    return name
      .replace(/\(.*?\)/g, "") // remove anything in parentheses
      .trim()
      .toLowerCase();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTransferId) {
      toast("Please select a transaction to receive", "error");
      return;
    }

    if (!agree) {
      toast("Please confirm you received the items", "error");
      return;
    }

    if (!fullNameOfReceiver.trim()) {
      toast("Please enter your full name", "error");
      return;
    }

    const enteredName = normalizeName(fullNameOfReceiver);
    const actualUserName = normalizeName(userInfo?.name || "");

    if (enteredName !== actualUserName) {
      toast("Please check your full name", "error");
      return;
    }

    if (Number(receivedQuantity) > (selectedTransfer?.quantity ?? 0)) {
      toast(
        "Received quantity cannot be more than the transferred quantity",
        "error"
      );
      return;
    }

    // Extract the actual ID from the display value
    const actualId = selectedTransfer?.id.toString();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "receiveStock",
        transfer_id: actualId,
        receiver_full_name: fullNameOfReceiver,
        received_quantity: receivedQuantity,
      }),
    });

    if (res.ok) {
      toast("Stock received", "success");

      router.refresh();

      setIsOpen(false);
      setSelectedTransferId("");
      setSelectedTransfer(null);
      setFullNameOfReceiver("");
      setAgree(false);
      setReceivedQuantity("");
    } else {
      toast("Failed to receive stock", "error");
    }
  }

  if (!Array.isArray(pendingTransfers) || pendingTransfers.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(206, 186, 29, 1)"}
        borderColor={"rgba(206, 186, 29, 1)"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
      >
        RECEIVE ISSUED STOCKS{" "}
        <div
          style={{
            backgroundColor: "rgba(158, 139, 0, 1)",
            padding: "0px 10px",
            borderRadius: "25px",
          }}
        >
          {pendingTransfers.length}
        </div>
      </Button>

      {isOpen && (
        <FormPopUp
          header={"RECEIVE ISSUED STOCKS"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row half">
            <InputItem
              label={"TRANSFER ID"}
              value={selectedTransferId}
              type={"select"}
              placeholder={"SELECT TRANSFER ID"}
              required
              onChange={(e) => setSelectedTransferId(e.target.value)}
              selectOptions={pendingTransfers.map(
                (t) => `TRN-${t.id.toString().padStart(5, "0")}`
              )}
            />
            <InputItem
              label={"TRANSFER DATE"}
              value={
                selectedTransfer?.created_on
                  ? new Date(selectedTransfer.created_on).toLocaleDateString(
                      "en-US",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }
                    )
                  : ""
              }
              type={"text"}
              placeholder={""}
              required
              onChange={(e) => {}}
              disabled
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"ITEM NAME"}
              value={selectedTransfer?.description || ""}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
            <InputItem
              label={"RECEIVED LOCATION"}
              value={selectedTransfer?.to_location || ""}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"RECEIVED DATE"}
              value={selectedTransfer ? getCurrentDate() : ""}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
            <InputItem
              label={"RECEIVED BY"}
              value={
                selectedTransfer ? selectedTransfer.receiver_name ?? "" : ""
              }
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"TRANSFERRED QUANTITY"}
              value={selectedTransfer ? `${selectedTransfer.quantity}` : ""}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
            <InputItem
              label={"RECEIVED QUANTITY"}
              value={receivedQuantity}
              type={"text"}
              placeholder={!selectedTransfer ? "" : "ENTER RECEIVED QUANTITY"}
              required
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setReceivedQuantity(value);
              }}
              disabled={!selectedTransfer}
            />
          </div>

          <br />
          <br />
          <br />
          <br />
          <br />

          <div className="input-row full">
            <div
              className="input-item"
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  height: "100%",
                }}
              >
                <div
                  onClick={() => setAgree(!agree)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "5px",
                    border: agree ? "none" : "2px solid #d1d5db",
                    backgroundColor: agree ? "#10b981" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {agree && (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.6667 5L7.50004 14.1667L3.33337 10"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <label style={{ maxWidth: "500px", textTransform: "uppercase" }}>
                I confirm that I have received the above-mentioned
                equipment/tool(s).
                <br />I understand that I am responsible for this and if
                anything is stolen and I have not adhered to this, I may be
                liable for some/all of the costs.
              </label>
            </div>
          </div>

          <div className="input-row half">
            <InputItem
              label={"FULL NAME OF RECEIVER"}
              value={fullNameOfReceiver}
              type={"text"}
              placeholder={"ENTER FULL NAME OF RECEIVER"}
              required
              onChange={(e) => setFullNameOfReceiver(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
