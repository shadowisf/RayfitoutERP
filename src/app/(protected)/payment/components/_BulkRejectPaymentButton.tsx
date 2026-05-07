"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BulkRejectRow = {
  id: number;
  mr_header_id: number;
};

type Props = {
  selectedRows: BulkRejectRow[];
  onSuccess: () => void;
  recordedBy: string;
  isOpenControlled?: boolean;
  setIsOpenControlled?: (v: boolean) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BulkRejectPaymentButton({
  selectedRows,
  onSuccess,
  recordedBy,
  isOpenControlled,
  setIsOpenControlled,
}: Props) {
  const router = useRouter();
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen =
    isOpenControlled !== undefined ? isOpenControlled : isOpenInternal;
  const setIsOpen =
    setIsOpenControlled !== undefined ? setIsOpenControlled : setIsOpenInternal;

  const [rejectReason, setRejectReason] = useState("");

  const reset = () => {
    setRejectReason("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    setIsOpen(v);
  };

  const handleSubmit = async () => {
    try {
      const results = await Promise.all(
        selectedRows.map((row) =>
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "rejectPayment",
              lpo_id: row.id,
              mr_header_id: row.mr_header_id,
              reason: rejectReason || null,
              rejected_by: recordedBy,
            }),
          }).then((r) => r.json()),
        ),
      );

      const failed = results.filter((r) => !r.success);
      if (failed.length === 0) {
        toast(
          `${selectedRows.length} LPO${selectedRows.length !== 1 ? "s" : ""} rejected`,
          "success",
        );
        reset();
        setIsOpen(false);
        router.refresh();
        onSuccess();
      } else {
        toast(`${failed.length} rejection(s) failed`, "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error rejecting payments", "error");
    }
  };

  return (
    <>
      {isOpenControlled === undefined && (
        <Button
          componentType="button"
          bgColor="white"
          borderColor="rgba(194,60,60,1)"
          textColor="rgba(194,60,60,1)"
          style={{ borderRadius: "50px", padding: "7px 20px", fontWeight: 600 }}
          onClick={() => setIsOpen(true)}
        >
          Reject ({selectedRows.length})
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header="MASS REJECT PAYMENTS"
          setIsOpen={
            handleClose as React.Dispatch<React.SetStateAction<boolean>>
          }
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
          style={{ maxWidth: "500px" }}
        >
          <div className="input-row full">
            <InputItem
              label="REASON"
              type="textarea"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
