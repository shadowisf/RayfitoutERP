"use client";

import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { BoqHeader } from "../../types/boqHeader";

type props = {
  boqHeader: BoqHeader;
  onSuccess?: () => void;
};

export function SetBoqPrimaryButton({ boqHeader, onSuccess }: props) {
  const handleClick = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setBoqPrimary",
        id: boqHeader.id,
        project_id: boqHeader.project_id,
      }),
    });

    if (res.ok) {
      onSuccess && onSuccess();
    } else {
      toast("Failed to set BOQ as primary", "error");
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
      Set Primary
    </Button>
  );
}
