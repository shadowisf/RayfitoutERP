"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { LpoHeader } from "../../../types/lpoHeader";
import { MrHeader } from "../../../types/mrHeader";

type props = {
  mrHeader: MrHeader;
  LpoHeader: LpoHeader;
};

export default function DeleteLpoHeaderButton({ mrHeader, LpoHeader }: props) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const trashIcon = "/icons/trash.svg";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteLpoHeader",
        lpo_id: LpoHeader.id,
        mr_header_id: mrHeader.id,
        deleted_by: userInfo?.name,
      }),
    });

    if (res.ok) {
      toast("Local purchase order deleted", "success");
      setIsOpen(false);
      router.push("/mr");
    } else {
      toast("Failed to delete Local purchase order", "error");
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
            header={"DELETE LOCAL PURCHASE ORDER"}
            setIsOpen={setIsOpen}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
          >
            Are you sure you want to delete this local purchase order?
          </FormPopUp>
        )}
      </>
    );
  } else {
    return null;
  }
}
