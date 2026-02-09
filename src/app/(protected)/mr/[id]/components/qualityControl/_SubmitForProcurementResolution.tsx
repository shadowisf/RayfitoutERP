"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

type SubmitForProcurementResolutionButtonProps = {
  mrHeaderID: number;
  lpoId?: number;
  style?: React.CSSProperties;
  disabled?: boolean;
};

export default function SubmitForProcurementResolutionButton({
  mrHeaderID,
  lpoId,
  style,
  disabled,
}: SubmitForProcurementResolutionButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const apiUrl = lpoId
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`;

    const bodyData = lpoId
      ? {
          action: "submitLpoForProcurementResolution",
          lpo_id: lpoId,
          mr_header_id: mrHeaderID,
          changed_by: userInfo?.name,
        }
      : {
          action: "submitForProcurementResolution",
          id: mrHeaderID,
          changed_by: userInfo?.name,
        };

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });

    if (res.ok) {
      toast("Material request submitted", "success");

      setIsOpen(false);

      router.refresh();
    } else {
      toast("Failed to submit material request", "error");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={"white"}
        borderColor={"white"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        /* style={{ padding: "7px 20px", ...style }} */
        /* disabled={disabled} */
        style={{ opacity: "0.5" }} // commented because resolution is not fully implemented
        disabled // commented because resolution is not fully implemented
      >
        RETURN FOR RESOLUTION
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this material request?</p>
        </FormPopUp>
      )}
    </>
  );
}
