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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: mrHeader.id,
      }),
    });

    if (res.ok) {
      toast("Material request header deleted", "success");
      setIsOpen(false);
      router.refresh();
      router.push("/mr");
    } else {
      toast("Failed to delete material request header", "error");
    }
  }

  if (userInfo?.departmentID !== mrHeader.department_id) {
    return null;
  }

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
          header={"DELETE MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          Are you sure you want to delete this material request?
        </FormPopUp>
      )}
    </>
  );
}
