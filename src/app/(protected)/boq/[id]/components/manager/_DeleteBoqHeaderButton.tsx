"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/app/components/Toast";
import { BoqHeader } from "@/app/(protected)/boq/[id]/types/boqHeader";

type props = {
  boqHeader: BoqHeader | null;
  onSuccess?: () => void;
  threeDotsMenu?: boolean;
};

export function DeleteBoqHeaderButton({
  boqHeader,
  onSuccess,
  threeDotsMenu,
}: props) {
  const router = useRouter();

  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteBoqHeader",
        id: boqHeader?.id,
      }),
    });

    if (res.ok) {
      toast("Bill of quantity deleted", "success");

      router.refresh();
      router.replace(`/project/${boqHeader?.project_id}`);

      onSuccess && onSuccess();

      setIsOpen(false);
    } else {
      toast("Failed to delete bill of quantity", "error");
    }
  };

  return (
    <>
      {threeDotsMenu ? (
        <Button
          componentType="button"
          bgColor={"transparent"}
          borderColor={"transparent"}
          textColor={"black"}
          onClick={() => setIsOpen(true)}
          full
          style={{ justifyContent: "flex-start" }}
        >
          <img src={trashIcon} alt="trash" /> Delete
        </Button>
      ) : (
        <Button
          componentType={"button"}
          bgColor={"rgba(239, 239, 239, 1)"}
          borderColor={"rgba(223, 223, 223, 1)"}
          textColor={"black"}
          onClick={() => setIsOpen(true)}
          style={{ padding: "7px 7px" }}
        >
          <img src={trashIcon} />
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header={"DELETE BILL OF QUANTITY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          Are you sure you want to delete this bill of quantity?
        </FormPopUp>
      )}
    </>
  );
}
