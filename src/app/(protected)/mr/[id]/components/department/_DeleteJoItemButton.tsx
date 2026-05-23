import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  itemId: number;
};

export function DeleteJoItemButton({ itemId }: props) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteItem", id: itemId }),
      });

      if (res.ok) {
        toast("Job item deleted", "success");
        await refresh();
      }
    } catch (error) {
      toast("Failed to delete job item", "error");
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        style={{
          padding: "7px 7px",
        }}
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
      >
        <img src={trashIcon} alt="delete" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"DELETE JOB ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          Are you sure you want to delete this job item?
        </FormPopUp>
      )}
    </>
  );
}
