"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect } from "react";
import RejectCommentPopUp from "./RejectCommentPopUp";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";

type InitialApprovalButtonsProps = {
  item: MrLine;
  progressID: number;
};

type StatusType = "pending" | "approved" | "rejected";

export default function InitialApprovalButtons({
  item,
  progressID,
}: InitialApprovalButtonsProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const checkIcon = "/icons/check.svg";
  const crossIcon = "/icons/cross.svg";

  const [status, setStatus] = useState<StatusType>(getInitialStatus());

  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const [rejectText, setRejectText] = useState("");

  useEffect(() => {
    setStatus(getInitialStatus());
  }, [item.approval_status]);

  function getInitialStatus(): StatusType {
    if (!item.approval_status) return "pending";

    const status = item.approval_status.toLowerCase();
    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";
    return "pending";
  }

  async function handleApprove() {
    setStatus("approved");

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approveItem",
        id: item.id,
      }),
    });

    if (res.ok) {
      toast(`${item.boq_item_name} approved`, "success");

      router.refresh();
    } else {
      toast("Failed to approve material request item", "error");
      setStatus("pending");
    }
  }

  async function handleReject() {
    setStatus("rejected");

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rejectItem",
        id: item.id,
        comment: rejectText,
      }),
    });

    if (res.ok) {
      toast(`${item.boq_item_name} rejected`, "success");

      setRejectText("");

      router.refresh();
    } else {
      toast("Failed to reject material request item", "error");
      setStatus("pending");
    }
  }

  async function handleReset() {
    setStatus("pending");

    setIsRejectOpen(false);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resetItem",
        id: item.id,
      }),
    });

    if (res.ok) {
      toast("Material request item approval reset", "success");

      router.refresh();
    } else {
      toast("Failed to reset approval for material request item", "error");
      setStatus("pending");
    }
  }

  if (status === "pending" && userInfo?.departmentID !== 8) {
    return (
      <div
        className="approval-pill"
        style={{ backgroundColor: "gray", color: "white" }}
      >
        <span>Pending Approval</span>
        <div
          style={{ display: "flex", gap: "12px", alignItems: "center" }}
        ></div>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div
        className="approval-pill"
        style={{
          backgroundColor: "rgba(34, 150, 100, 1)",
          color: "white",
        }}
      >
        <span>Approved</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {userInfo?.departmentID === 8 && progressID === 3 && (
            <img
              src={crossIcon}
              alt="close"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
                width: "10px",
              }}
              onClick={handleReset}
            />
          )}
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div
        className="approval-pill"
        style={{
          backgroundColor: "rgba(185, 28, 28, 1)",
          color: "white",
        }}
      >
        <span>Rejected</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <RejectCommentPopUp text={item.reject_comment} />
          {userInfo?.departmentID === 8 && progressID === 3 && (
            <img
              src={crossIcon}
              alt="close"
              style={{ filter: "invert(1)", cursor: "pointer", width: "10px" }}
              onClick={handleReset}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: "10px", width: "200px" }}>
        <Button
          componentType={"button"}
          bgColor={"white"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          onClick={handleApprove}
          style={{ borderRadius: "20px", padding: "5px 20px", flexGrow: 1 }}
        >
          <img src={checkIcon} alt="approve" />
        </Button>
        <Button
          componentType={"button"}
          bgColor={"white"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          onClick={() => setIsRejectOpen(true)}
          style={{ borderRadius: "20px", padding: "5px 20px", flexGrow: 1 }}
        >
          <img src={crossIcon} alt="reject" />
        </Button>
      </div>

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
