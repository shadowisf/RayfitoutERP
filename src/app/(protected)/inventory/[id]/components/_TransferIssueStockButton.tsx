"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";

type TransferIssueStockButtonProps = {
  inventoryItem: InventoryItem;
};

export default function TransferIssueStocksButton({
  inventoryItem,
}: TransferIssueStockButtonProps) {
  const { userInfo } = useAuth();

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purpose, setPurpose] = useState("");
  const [receiverName, setReceiverName] = useState("");

  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [fromValues, setFromValues] = useState<any>([]);
  const [toValues, setToValues] = useState<any>([]);

  useEffect(() => {
    setReceiverName("");
  }, [type]);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStocksByInventoryItemID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: inventoryItem.id,
        }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        const locations = data.stocks.map(
          (item: { location: string }) => item.location
        );
        setFromValues(locations);
      });

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const locations = data.map((item: { name: string }) => item.name);
        setToValues(locations);
      });

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getTotalQuantityByInventoryItemID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_item_id: inventoryItem.id,
        }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setAvailableQuantity(data.data.total_quantity);
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "transferIssueStock",
        inventory_item_id: inventoryItem.id,
        type,
        from,
        to,
        quantity,
        purpose,
        receiver_name: receiverName || null,
      }),
    });

    if (res.ok) {
      toast(
        type === "Transfer" ? "Transferred stock" : "Issued stock",
        "success"
      );

      // Reset form fields
      setType("");
      setFrom("");
      setTo("");
      setQuantity("");
      setPurpose("");
      setReceiverName("");

      router.refresh();
      setIsOpen(false);
    } else {
      toast("Failed to transfer or issue stock", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(223, 55, 58, 1)"}
        borderColor={"rgba(223, 55, 58, 1)"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
      >
        ISSUE/TRANSFER STOCK -
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ISSUE/TRANSFER STOCK"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"TYPE"}
              value={type}
              type={"select"}
              placeholder={"SELECT TRANSFER TYPE"}
              required
              onChange={(e) => setType(e.target.value)}
              selectOptions={["Transfer", "Issue"]}
            />
          </div>
          <div className="input-row half">
            <InputItem
              label={"FROM"}
              value={from}
              type={"select"}
              placeholder={"SELECT FROM"}
              required
              onChange={(e) => setFrom(e.target.value)}
              selectOptions={[...fromValues]}
            />
            <InputItem
              label={"TO"}
              value={to}
              type={"select"}
              placeholder={"SELECT TO"}
              required
              onChange={(e) => setTo(e.target.value)}
              selectOptions={["Headquarters", ...toValues]}
            />
          </div>
          <div className="input-row three-col">
            <InputItem
              label={"AVAILABLE QUANTITY"}
              value={availableQuantity}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              placeholder={"ENTER QUANTITY"}
              required
              onChange={(e) => setQuantity(e.target.value)}
            />
            <InputItem
              label={"PURPOSE"}
              value={purpose}
              type={"select"}
              placeholder={"SELECT PURPOSE"}
              required
              onChange={(e) => setPurpose(e.target.value)}
              selectOptions={[
                "Project execution",
                "Equipment issue",
                "Internal reallocation",
                "Replacement",
              ]}
            />
          </div>
          {type === "Transfer" && (
            <div className="input-row half">
              <InputItem
                label={"RECEIVER"}
                value={receiverName}
                type={"select"}
                placeholder={"SELECT RECEIVER"}
                required={false}
                onChange={(e) => setReceiverName(e.target.value)}
                selectOptions={["TEST"]}
              />
            </div>
          )}
        </FormPopUp>
      )}
    </>
  );
}
