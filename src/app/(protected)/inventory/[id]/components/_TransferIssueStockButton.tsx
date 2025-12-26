"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState } from "react";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { useAuth } from "@/app/context/AuthContext";

type TransferIssueStockButtonProps = {
  inventoryItem: InventoryItem;
};

export default function TransferIssueStocksButton({
  inventoryItem,
}: TransferIssueStockButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const [type, setType] = useState("");
  const [from, setFrom] = useState<string | number>("");
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState<string | number>("");
  const [purpose, setPurpose] = useState("");
  const [receiverName, setReceiverName] = useState<string | number>("");
  const [notes, setNotes] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const [availableQuantity, setAvailableQuantity] = useState<number | string>(
    ""
  );
  const [fromValues, setFromValues] = useState<any>([]);
  const [toValues, setToValues] = useState<any>([]);
  const [receiverValues, setReceiverValues] = useState<any>([]);

  // Store the full stock data for quantity calculation
  const [stocksData, setStocksData] = useState<any>(null);

  useEffect(() => {
    setReceiverName("");

    if (type.includes("Issue")) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/cognito/`, {
        method: "GET",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setReceiverValues(
              data.users
                .filter((user: any) => {
                  const currentUserLabel = `${userInfo?.name} (${userInfo?.role})`;
                  const userLabel = `${user.name} (${user.role})`;

                  return userLabel !== currentUserLabel;
                })
                .map((user: any) => ({
                  id: `${user.name} (${user.role})`,
                  value: `${user.name} (${user.role})`,
                }))
            );
          }
        })
        .catch((err) => console.error(err));
    }
  }, [type, isOpen]);

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
        // Store the full data for later quantity calculation
        setStocksData(data);

        // Get locations from stocks table
        const stockLocations = data.stocks.map(
          (item: { location: string }) => item.location
        );

        // Get to_location from received transfers (stocks_transfer_issue)
        const transferredLocations = data.stocksTransferIssue
          .filter((item: any) => item.type.includes("Transfer"))
          .map((item: any) => item.to_location);

        // Combine and remove duplicates
        const allLocations = [
          ...new Set([...stockLocations, ...transferredLocations]),
        ];

        setFromValues(allLocations);
      });

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const locations = data.map((item: { name: string }) => item.name);
        setToValues(locations);
      });
  }, []);

  // Calculate available quantity when "from" location changes
  // Calculate available quantity when "from" location changes
  useEffect(() => {
    if (!from || !stocksData) {
      setAvailableQuantity("");
      return;
    }

    // Calculate quantity for the selected location
    let locationQuantity = 0;

    // Add quantity from stocks table for this location
    stocksData.stocks.forEach((stock: any) => {
      if (stock.location === from) {
        locationQuantity += stock.quantity;
      }
    });

    // Process transfers and issues for this location
    stocksData.stocksTransferIssue.forEach((transaction: any) => {
      if (transaction.type.includes("Issue")) {
        // Subtract issues from the location if received
        if (transaction.received && transaction.from_location === from) {
          locationQuantity -= transaction.quantity;
        }
      } else if (transaction.type.includes("Transfer")) {
        // Subtract from from_location
        if (transaction.from_location === from) {
          locationQuantity -= transaction.quantity;
        }
        // Add to to_location
        if (transaction.to_location === from) {
          locationQuantity += transaction.quantity;
        }
      }
    });

    setAvailableQuantity(locationQuantity > 0 ? locationQuantity : 0);
  }, [from, stocksData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (availableQuantity === "" || availableQuantity === 0) {
      toast("No stock available at selected location", "error");
      return;
    }

    if (Number(quantity) > Number(availableQuantity)) {
      toast(`Quantity cannot exceed available quantity`, "error");
      return;
    }

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
        notes,
        serial_number: serialNumber || null,
      }),
    });

    if (res.ok) {
      toast(
        type.includes("Transfer") ? "Stock transferred" : "Stock issued",
        "success"
      );

      // Reset form fields
      setType("");
      setFrom("");
      setTo("");
      setQuantity("");
      setPurpose("");
      setReceiverName("");
      setNotes("");
      setSerialNumber("");
      setAvailableQuantity("");

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
              selectOptions={["Transfer stock", "Issue material/equipment"]}
            />
          </div>
          {type !== "" && (
            <>
              <div className="input-row half">
                <InputItem
                  label={
                    type.includes("Transfer") ? "TRANSFER FROM" : "ISSUE FROM"
                  }
                  value={from}
                  type={"select"}
                  placeholder={
                    type.includes("Transfer")
                      ? "SELECT TRANSFER FROM"
                      : "SELECT ISSUE FROM"
                  }
                  required
                  onChange={(e) => setFrom(e.target.value)}
                  selectOptions={fromValues.filter((val: string) => val !== to)}
                />

                {type.includes("Transfer") ? (
                  <InputItem
                    label={"TRANSFER TO"}
                    value={to}
                    type={"select"}
                    placeholder={"SELECT TRANSFER TO"}
                    required
                    onChange={(e) => setTo(e.target.value)}
                    selectOptions={[
                      "Headquarters",
                      "Umm Al Quwain warehouse",
                      ...toValues,
                    ].filter((val: string) => val !== from)}
                  />
                ) : (
                  <>
                    {/* <InputItem
                      label={"ISSUE TO"}
                      value={receiverName}
                      type={"select"}
                      placeholder={"SELECT ISSUE TO"}
                      required
                      onChange={(e) => setReceiverName(e.target.value)}
                      selectOptions={receiverValues}
                    /> */}

                    <SingleSelectDropdown
                      label={"ISSUE TO"}
                      selectedValue={receiverName}
                      onChange={setReceiverName}
                      placeholder={"SELECT ISSUE TO"}
                      dbData={receiverValues}
                    />
                  </>
                )}
              </div>
              <div className="input-row three-col">
                <InputItem
                  label={"AVAILABLE QUANTITY"}
                  value={availableQuantity === "" ? "" : `${availableQuantity}`}
                  type={"text"}
                  placeholder={""}
                  required
                  disabled
                  onChange={() => {}}
                />
                <InputItem
                  label={
                    type.includes("Transfer")
                      ? "QUANTITY TO TRANSFER"
                      : "QUANTITY TO ISSUE"
                  }
                  value={quantity}
                  type={"text"}
                  placeholder={
                    type.includes("Transfer")
                      ? "ENTER QUANTITY TO TRANSFER"
                      : "ENTER QUANTITY TO ISSUE"
                  }
                  required
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setQuantity(val === "" ? "" : Number(val));
                    }
                  }}
                />
                <InputItem
                  label={
                    type.includes("Transfer")
                      ? "PURPOSE OF TRANSFER"
                      : "PURPOSE OF ISSUE"
                  }
                  value={purpose}
                  type={"select"}
                  placeholder={
                    type.includes("Transfer")
                      ? "SELECT PURPOSE OF TRANSFER"
                      : "SELECT PURPOSE OF ISSUE"
                  }
                  required
                  onChange={(e) => setPurpose(e.target.value)}
                  selectOptions={
                    type.includes("Transfer")
                      ? [
                          "Project execution",
                          "Internal reallocation",
                          "Replacement",
                        ]
                      : [
                          "Installation",
                          "Trial/mockup",
                          "Temporary use",
                          "Replacement/repair",
                        ]
                  }
                />
              </div>
              {type.includes("Transfer") ? (
                <div className="input-row half">
                  <InputItem
                    label={"SERIAL NUMBER"}
                    value={serialNumber}
                    type={"text"}
                    placeholder={"ENTER SERIAL NUMBER"}
                    required={false}
                    onChange={(e) => setSerialNumber(e.target.value)}
                  />
                </div>
              ) : (
                <div className="input-row full">
                  <InputItem
                    label={"NOTES (OPTIONAL)"}
                    value={notes}
                    type={"textarea"}
                    placeholder={"ENTER NOTES"}
                    required={false}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
