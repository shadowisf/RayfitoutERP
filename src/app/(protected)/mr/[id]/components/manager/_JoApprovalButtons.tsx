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
import { MrHeader } from "../../types/mrHeader";

type JoApprovalButtonsProps = {
  item: JoLine;
  mrHeader: MrHeader;
};

type StatusType = "pending" | "approved" | "rejected";

export default function JoApprovalButtons({
  item,
  mrHeader,
}: JoApprovalButtonsProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const checkIcon = "/icons/check.svg";
  const crossIcon = "/icons/cross-small.svg";

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
  if (userInfo?.departmentID !== 8 || mrHeader.progress_id === 5) {
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
    return (
      <div
        className="approval-pill"
        style={{
          backgroundColor: "gray",
          color: "white",
        }}
      >
        <span>Pending</span>
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
          textColor={"white"}
          onClick={() => setIsRejectOpen(true)}
          style={{ borderRadius: "20px", padding: "5px 20px", flexGrow: 1 }}
        >
          <img src={crossIcon} alt="reject" />
        </Button>
      </div>

      {isRejectOpen && (
        <FormPopUp
          header="REJECT JOB ITEM"
          setIsOpen={setIsRejectOpen}
          handleSubmit={handleReject}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"COMMENTS"}
              value={rejectText}
              type={"textarea"}
              required
              onChange={(e) => setRejectText(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
