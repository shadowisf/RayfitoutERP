"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import { useRefresh } from "@/app/context/RefreshContext";

type Props = {
  item: MrLine;
  stageName?: string;
};

export default function EditPredefinedItemButton({ item, stageName }: Props) {
  const router = useRouter();
  const { refresh } = useRefresh();

  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState(
    item.material_description || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpen() {
    setDescription(item.material_description || "");
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast("Description is required", "error");
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateMrLineDescription",
          id: item.id,
          material_description: description.trim(),
          predefined_item_id: item.predefined_item_id ?? null,
          changed_by: userInfo?.name || null,
          stage_name: stageName || "",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to update description", "error");
        return;
      }

      toast("Description updated", "success");
      await refresh();
      setIsOpen(false);
    } catch {
      toast("Failed to update description", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(223, 223, 223, 1)"
        textColor="black"
        onClick={handleOpen}
        style={{ padding: "7px 7px" }}
      >
        <img src={pencilIcon} alt="edit description" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="EDIT MATERIAL NAME"
          setIsOpen={(open) => {
            if (!open) setIsOpen(false);
          }}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label="MATERIAL NAME"
              value={description}
              type="text"
              required
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
