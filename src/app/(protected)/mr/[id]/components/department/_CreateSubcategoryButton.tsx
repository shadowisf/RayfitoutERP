import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  onSuccess?: (newId: number) => void;
  materialCategoryID: number;
};

export default function CreateSubCategoryButton({
  materialCategoryID,
  onSuccess,
}: props) {
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
          action: "createSubCategory",
          category_id: materialCategoryID,
          value,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast("Subcategory created", "success");
        setIsOpen(false);
        setValue("");
        await refresh();

        onSuccess && onSuccess(data.id);
      } else {
        toast("Failed to create subcategory", "error");
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  }

  function openMenu() {
    if (!materialCategoryID) {
      toast("Please select a material category first", "error");
    } else {
      setIsOpen(true);
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={() => openMenu()}
        full
      >
        NEW SUBCATEGORY +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CREATE SUBCATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"SUBCATEGORY"}
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
