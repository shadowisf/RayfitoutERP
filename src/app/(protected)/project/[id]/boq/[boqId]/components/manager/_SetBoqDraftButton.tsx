"use client";

import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { BoqHeader } from "../../types/boqHeader";

type props = {
  boqHeader: BoqHeader;
  onSuccess?: () => void;
};

export function SetBoqDraftButton({ boqHeader, onSuccess }: props) {
  const pencilIcon = "/icons/pencil.svg";

  const handleClick = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggleBoqDraft",
        id: boqHeader.id,
        is_draft: !boqHeader.is_draft,
      }),
    });

    if (res.ok) {
      onSuccess && onSuccess();
    } else {
      toast("Failed to update BOQ status", "error");
    }
  };

  return (
    <Button
      componentType="button"
      bgColor="transparent"
      borderColor="transparent"
      textColor="black"
      onClick={handleClick}
      full
      style={{ justifyContent: "flex-start" }}
    >
      <img src={pencilIcon} alt="pencil" />
      {boqHeader.is_draft ? "Set Active" : "Set Draft"}
    </Button>
  );
}
