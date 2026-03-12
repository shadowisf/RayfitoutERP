"use client";

import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import SingleSelectInventoryItem from "./_SingleSelectInventoryItem";

type Props = {
  item: MrLine;
  progressID: number;
  inventoryMatch?: {
    id: number;
    description: string;
  } | null;
};

type ReviewStatus = "pending" | "item_available" | "need_order";

export default function QSReviewButton({
  item,
  progressID,
  inventoryMatch,
}: Props) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const crossIcon = "/icons/cross.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [status, setStatus] = useState<ReviewStatus>(getInitialStatus());
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  useEffect(() => {
    setStatus(getInitialStatus());
  }, [item.qs_review_type]);

  function getInitialStatus(): ReviewStatus {
    if (item.qs_review_type === "item_available") return "item_available";
    if (item.qs_review_type === "need_order") return "need_order";
    return "pending";
  }

  async function handleNeedOrder() {
    setStatus("need_order");

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setQSReviewNeedOrder",
        id: item.id,
      }),
    });

    if (res.ok) {
      toast(`${item.material_description} marked as Need Order`, "success");
      router.refresh();
    } else {
      toast("Failed to mark item", "error");
      setStatus("pending");
    }
  }

  async function handleItemAvailableConfirm(inventoryItemId: number) {
    setStatus("item_available");
    setIsInventoryOpen(false);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setQSReviewItemAvailable",
        id: item.id,
        linked_inventory_item_id: inventoryItemId,
      }),
    });

    if (res.ok) {
      toast(`${item.material_description} linked to inventory`, "success");
      router.refresh();
    } else {
      toast("Failed to link item to inventory", "error");
      setStatus("pending");
    }
  }

  async function handleReset() {
    setStatus("pending");

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resetQSReview",
        id: item.id,
      }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      toast("Failed to reset review", "error");
    }
  }

  // Read-only pill for non-QS users or non-stage-2
  const isQSAtStage2 = userInfo?.departmentID === 16 && progressID === 2;

  // Show "Need Order" pill
  if (status === "need_order") {
    return (
      <div
        className="approval-pill"
        style={{
          backgroundColor: "rgba(34, 150, 100, 1)",
          color: "white",
        }}
      >
        <span style={{ textWrap: "nowrap" }}>Need Order</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {isQSAtStage2 && (
            <img
              src={crossIcon}
              alt="reset"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
                width: "12px",
              }}
              onClick={handleReset}
            />
          )}
        </div>
      </div>
    );
  }

  // Show "Item Available" pill with linked item name
  if (status === "item_available") {
    return (
      <div
        className="approval-pill"
        style={{
          backgroundColor: "rgba(34, 150, 100, 1)",
          color: "white",
        }}
      >
        <span style={{ textWrap: "nowrap" }}>
          {item.linked_inventory_item_description || "Item Available"}
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {item.linked_inventory_item_id && (
            <Button
              componentType="link"
              bgColor={"transparent"}
              borderColor={"transparent"}
              textColor={"black"}
              href={`/inventory/${item.linked_inventory_item_id}`}
              style={{ padding: "0px" }}
            >
              <img
                src={externalLinkIcon}
                alt="view"
                style={{
                  filter: "invert(1)",
                  cursor: "pointer",
                }}
              />
            </Button>
          )}
          {isQSAtStage2 && (
            <img
              src={crossIcon}
              alt="reset"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
                width: "12px",
              }}
              onClick={handleReset}
            />
          )}
        </div>
      </div>
    );
  }

  // Pending state — only QS at stage 2 can act
  if (!isQSAtStage2) {
    return (
      <div
        className="approval-pill"
        style={{ backgroundColor: "gray", color: "white" }}
      >
        <span style={{ textWrap: "nowrap" }}>Pending QS Review</span>
      </div>
    );
  }

  // QS at stage 2 — show action buttons
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", gap: "8px", width: "280px" }}>
          <Button
            componentType={"button"}
            bgColor={"white"}
            borderColor={"rgba(207, 207, 207, 1)"}
            textColor={"black"}
            onClick={() => setIsInventoryOpen(true)}
            style={{
              borderRadius: "25px",
              padding: "7px 20px",
            }}
          >
            Item Available
          </Button>
          <Button
            componentType={"button"}
            bgColor={"white"}
            borderColor={"rgba(207, 207, 207, 1)"}
            textColor={"black"}
            onClick={handleNeedOrder}
            style={{
              borderRadius: "25px",
              padding: "7px 20px",
            }}
          >
            Need Order
          </Button>
        </div>
        {inventoryMatch && (
          <div
            style={{
              fontSize: "10px",
              color: "rgba(100, 100, 100, 1)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontStyle: "italic",
            }}
          >
            <span>
              Possible match:{" "}
              <span style={{ color: "black" }}>
                "{inventoryMatch.description}"
              </span>
            </span>
            <a
              href={`/inventory/${inventoryMatch.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={externalLinkIcon}
                alt="view"
                style={{ width: "12px", cursor: "pointer" }}
              />
            </a>
          </div>
        )}
      </div>

      {isInventoryOpen && (
        <SingleSelectInventoryItem
          setIsOpen={setIsInventoryOpen}
          onConfirm={handleItemAvailableConfirm}
          initialSearchQuery={item.material_description}
        />
      )}
    </>
  );
}
