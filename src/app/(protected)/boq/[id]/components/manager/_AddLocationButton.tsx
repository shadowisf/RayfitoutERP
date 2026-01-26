import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

type props = {
  onSuccess?: () => void;
};

export default function CreateLocationButton({ onSuccess }: props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [location, setLocation] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addLocation",
        value: location,
      }),
    });

    if (res.ok) {
      router.refresh();

      onSuccess && onSuccess();

      toast("Location added", "success");

      setIsOpen(false);
    } else {
      toast("Failed to add location", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        full
        onClick={() => setIsOpen(true)}
      >
        NEW LOCATION +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CREATE LOCATION"}
          setIsOpen={setIsOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={handleSubmit}
        >
          <div className="input-row full">
            <InputItem
              label={"LOCATION"}
              value={location}
              type={"text"}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
