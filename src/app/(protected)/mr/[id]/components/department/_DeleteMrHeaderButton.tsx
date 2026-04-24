"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MrHeader } from "../../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";

type DeleteMrHeaderButtonProps = {
  mrHeader: MrHeader;
};

export default function DeleteMrHeaderButton({
  mrHeader,
}: DeleteMrHeaderButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const trashIcon = "/icons/trash.svg";

  const dialogHeader =
    mrHeader.type === "job"
      ? "DELETE JOB ORDER"
      : mrHeader.type === "payment"
        ? "DELETE PAYMENT REQUEST"
        : "DELETE MATERIAL REQUEST";

  const dialogMessage =
    mrHeader.type === "job"
      ? "Are you sure you want to delete this job order?"
      : mrHeader.type === "payment"
        ? "Are you sure you want to delete this payment request?"
        : "Are you sure you want to delete this material request?";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteMrHeader",
        id: mrHeader.id,
        deleted_by: userInfo?.name,
      }),
    });

    if (res.ok) {
      toast("Material request deleted", "success");
      setIsOpen(false);
      router.push("/mr");
    } else {
      toast("Failed to delete material request", "error");
    }
  }

  if (
    userInfo?.departmentID === mrHeader.department_id ||
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 9 ||
    userInfo?.departmentID === 16
  ) {
    return (
      <>
        <Button
          componentType={"button"}
          bgColor={"rgba(239, 239, 239, 1)"}
          borderColor={"rgba(223, 223, 223, 1)"}
          textColor={"black"}
          onClick={() => setIsOpen(true)}
          style={{ borderRadius: "5px", padding: "7px 7px" }}
        >
          <img src={trashIcon} alt="edit" />
        </Button>

        {isOpen && (
          <FormPopUp
            header={dialogHeader}
            setIsOpen={setIsOpen}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
          >
            {dialogMessage}
          </FormPopUp>
        )}
      </>
    );
  } else {
    return null;
  }
}
