"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect } from "react";
import RejectCommentPopUp from "./RejectCommentPopUp";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { JoLine } from "../../types/joLine";

type JoApprovalButtonsProps = {
  item: JoLine;
};

type StatusType = "pending" | "approved" | "rejected";

export default function JoApprovalButtons({ item }: JoApprovalButtonsProps) {
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
    const s = item.approval_status.toLowerCase();
    if (s === "approved") return "approved";
    if (s === "rejected") return "rejected";
    return "pending";
  }

  async function handleApprove() {
    setStatus("approved");

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approveItem",
        id: item.id,
      }),
    });

    if (res.ok) {
      toast("Item approved", "success");
      router.refresh();
    } else {
      setStatus("pending");
      toast("Failed to approve item", "error");
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();

    setStatus("rejected");

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rejectItem",
        id: item.id,
        comment: rejectText,
      }),
    });

    if (res.ok) {
      toast("Item rejected", "success");
      setIsRejectOpen(false);
      setRejectText("");
      router.refresh();
    } else {
      setStatus("pending");
      toast("Failed to reject item", "error");
    }
  }

  async function handleReset() {
    setStatus("pending");

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resetItem",
        id: item.id,
      }),
    });

    if (res.ok) {
      router.refresh();
    }
  }

  // Only managers (dept 8) can approve/reject
  if (userInfo?.departmentID !== 8) {
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
          <RejectCommentPopUp text={item.reject_comment || ""} />
        </div>
      );
    }
    return null;
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
        <img
          src={crossIcon}
          alt="reset"
          style={{ filter: "invert(1)", cursor: "pointer", width: "10px" }}
          onClick={handleReset}
        />
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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <RejectCommentPopUp text={item.reject_comment || ""} />
          <img
            src={crossIcon}
            alt="reset"
            style={{ filter: "invert(1)", cursor: "pointer", width: "10px" }}
            onClick={handleReset}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: "5px" }}>
        <Button
          componentType={"button"}
          bgColor={"rgba(34, 150, 100, 1)"}
          borderColor={"rgba(34, 150, 100, 1)"}
          textColor={"white"}
          onClick={handleApprove}
          style={{ borderRadius: "25px", padding: "7px 15px" }}
        >
          <img
            src={checkIcon}
            alt="approve"
            style={{ filter: "invert(1)", width: "12px" }}
          />
        </Button>
        <Button
          componentType={"button"}
          bgColor={"rgba(185, 28, 28, 1)"}
          borderColor={"rgba(185, 28, 28, 1)"}
          textColor={"white"}
          onClick={() => setIsRejectOpen(true)}
          style={{ borderRadius: "25px", padding: "7px 15px" }}
        >
          <img
            src={crossIcon}
            alt="reject"
            style={{ filter: "invert(1)", width: "10px" }}
          />
        </Button>
      </div>

      {isRejectOpen && (
        <FormPopUp
          header="REJECT ITEM"
          setIsOpen={setIsRejectOpen}
          handleSubmit={handleReject}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"COMMENTS"}
              value={rejectText}
              type={"textarea"}
              placeholder={"ENTER REJECTION REASON"}
              required
              onChange={(e) => setRejectText(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
