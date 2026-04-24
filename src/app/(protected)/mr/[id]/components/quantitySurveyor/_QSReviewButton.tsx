"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import ReplaceMaterialButton from "./_ReplaceMaterialButton";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";

type Props = {
  item: MrLine;
  progressID: number;
  inventoryMatch?: {
    id: number;
    description: string;
  } | null;
};

type ReviewStatus =
  | "pending"
  | "item_available"
  | "need_order"
  | "rejected"
  | "replaced";

export default function QSReviewButton({ item, progressID }: Props) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const checkIcon = "/icons/check.svg";
  const crossSmallIcon = "/icons/cross-small.svg";
  const rewindIcon = "/icons/rewind-two-arrows.svg";
  const crossIcon = "/icons/cross.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [status, setStatus] = useState<ReviewStatus>(getInitialStatus());
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");

  useEffect(() => {
    setStatus(getInitialStatus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.qs_review_type, item.qs_approval_status]);

  function getInitialStatus(): ReviewStatus {
    if (item.qs_approval_status === "Replaced") return "replaced";
    if (item.qs_review_type === "item_available") return "item_available";
    if (item.qs_review_type === "need_order") return "need_order";
    if (item.qs_approval_status?.toLowerCase() === "rejected")
      return "rejected";
    return "pending";
  }

  async function handleNeedOrder() {
    setStatus("need_order");
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setQSReviewNeedOrder", id: item.id }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setStatus("pending");
    }
  }

  async function handleReject() {
    setStatus("rejected");
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rejectItemQS",
        id: item.id,
        comment: rejectText,
      }),
    });
    if (res.ok) {
      setRejectText("");
      setIsRejectOpen(false);
      router.refresh();
    } else {
      setStatus("pending");
    }
  }

  async function handleReset() {
    setStatus("pending");
    // Reset both review type and QS approval status
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetQSReview", id: item.id }),
    });
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetItemQS", id: item.id }),
    });
    router.refresh();
  }

  const isQSAtStage2 = userInfo?.departmentID === 16 && progressID === 2;

  // ── Need Order pill ───────────────────────────────────────────────────────
  if (status === "need_order") {
    return (
      <div
        className="approval-pill"
        style={{ backgroundColor: "rgba(34, 150, 100, 1)", color: "white" }}
      >
        <span style={{ textWrap: "nowrap" }}>Approved</span>
        {isQSAtStage2 && (
          <img
            src={crossIcon}
            alt="reset"
            style={{ filter: "invert(1)", cursor: "pointer", width: "12px" }}
            onClick={handleReset}
          />
        )}
      </div>
    );
  }

  // ── Item Available pill ───────────────────────────────────────────────────
  if (status === "item_available") {
    return (
      <div
        className="approval-pill"
        style={{ backgroundColor: "rgba(34, 150, 100, 1)", color: "white" }}
      >
        <span style={{ textWrap: "nowrap" }}>
          {item.linked_inventory_item_description || "Item Available"}
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {item.linked_inventory_item_id && (
            <a
              href={`/inventory/${item.linked_inventory_item_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={externalLinkIcon}
                alt="view"
                style={{ filter: "invert(1)", cursor: "pointer" }}
              />
            </a>
          )}
          {isQSAtStage2 && (
            <img
              src={crossIcon}
              alt="reset"
              style={{ filter: "invert(1)", cursor: "pointer", width: "12px" }}
              onClick={handleReset}
            />
          )}
        </div>
      </div>
    );
  }

  // ── QS Rejected pill ─────────────────────────────────────────────────────
  if (status === "rejected") {
    return (
      <div
        className="approval-pill"
        style={{ backgroundColor: "rgba(185, 28, 28, 1)", color: "white" }}
      >
        <span style={{ textWrap: "nowrap" }}>Rejected</span>
        {isQSAtStage2 && (
          <img
            src={crossIcon}
            alt="reset"
            style={{ filter: "invert(1)", cursor: "pointer", width: "12px" }}
            onClick={handleReset}
          />
        )}
      </div>
    );
  }

  // ── Replaced pill ─────────────────────────────────────────────────────────
  if (status === "replaced") {
    return (
      <div
        className="approval-pill"
        style={{ backgroundColor: "rgba(209, 157, 90, 1)", color: "white" }}
      >
        <span style={{ textWrap: "nowrap" }}>Replaced</span>
        {isQSAtStage2 && (
          <img
            src={crossIcon}
            alt="reset"
            style={{ filter: "invert(1)", cursor: "pointer", width: "12px" }}
            onClick={handleReset}
          />
        )}
      </div>
    );
  }

  // ── Read-only pending pill for non-QS or wrong stage ─────────────────────
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

  return (
    <>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        {/* Approve → Need Order */}
        <Button
          onClick={handleNeedOrder}
          componentType={"button"}
          bgColor={"white"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          style={{ borderRadius: "25px", padding: "7px 20px" }}
        >
          <img src={checkIcon} alt="approve" />
        </Button>

        {/* Reject */}
        <Button
          onClick={() => setIsRejectOpen(true)}
          componentType={"button"}
          bgColor={"white"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          style={{ borderRadius: "25px", padding: "7px 20px" }}
        >
          <img src={crossSmallIcon} alt="reject" />
        </Button>

        {/* Replace Material — direct to picker */}
        <ReplaceMaterialButton
          item={item}
          directSubmit
          renderTrigger={(openPicker) => (
            <Button
              onClick={openPicker}
              componentType={"button"}
              bgColor={"white"}
              borderColor={"rgba(207, 207, 207, 1)"}
              textColor={"black"}
              style={{ borderRadius: "25px", padding: "7px 20px" }}
            >
              <img src={rewindIcon} alt="replace" style={{ width: "13px" }} />
            </Button>
          )}
        />
      </div>

      {/* Possible match — commented out
      {inventoryMatch && (
        <div style={{ fontSize: "10px", color: "rgba(100, 100, 100, 1)", display: "flex", alignItems: "flex-start", gap: "10px", fontStyle: "italic" }}>
          <span>Possible match: <span style={{ color: "black" }}>"{inventoryMatch.description}"</span></span>
          <a href={`/inventory/${inventoryMatch.id}`} target="_blank" rel="noopener noreferrer">
            <img src={externalLinkIcon} alt="view" style={{ width: "12px", cursor: "pointer" }} />
          </a>
        </div>
      )}
      */}

      {isRejectOpen && (
        <FormPopUp
          header="REJECT MATERIAL REQUEST ITEM"
          setIsOpen={setIsRejectOpen}
          handleSubmit={handleReject}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"COMMENTS"}
              value={rejectText}
              type={"textarea"}
              placeholder={"ENTER COMMENTS"}
              required
              onChange={(e) => setRejectText(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
