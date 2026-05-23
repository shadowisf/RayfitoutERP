import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  transferID: number;
  type?: string;
  onSuccess?: () => void;
};

export default function DeleteTransactionButton({
  transferID,
  type,
  onSuccess,
}: props) {
  const trashIcon = "/icons/trash.svg";

  const router = useRouter();
  const { refresh } = useRefresh();


  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: type === "stock" ? "deleteStock" : "deleteTransfer",
          id: transferID,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        onSuccess && onSuccess();
        toast("Transaction deleted", "success");
        await refresh();
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={trashIcon} alt="trash" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"DELETE TRANSACTION"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ textTransform: "none" }}
        >
          Are you sure you want to delete this transaction?
        </FormPopUp>
      )}
    </>
  );
}
