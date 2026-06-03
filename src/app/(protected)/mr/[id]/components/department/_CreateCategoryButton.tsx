import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  onSuccess?: (newId: number) => void;
  renderTrigger?: (open: () => void) => React.ReactNode;
};

export default function CreateCategoryButton({ onSuccess, renderTrigger }: props) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const [isOpen, setIsOpen] = useState(false);

  const [value, setValue] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createCategory",
          value,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast("Category created", "success");
        setIsOpen(false);
        setValue("");
        await refresh();

        onSuccess && onSuccess(data.id);
      } else {
        toast("Failed to create category", "error");
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  }

  return (
    <>
      {renderTrigger ? renderTrigger(() => setIsOpen(true)) : (
        <Button
          componentType={"button"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          onClick={() => setIsOpen(true)}
          full
        >
          NEW CATEGORY +
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header={"CREATE CATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"CATEGORY"}
              value={value}
              type={"text"}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
