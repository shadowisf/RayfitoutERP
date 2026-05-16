"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { BoqHeader } from "../../types/boqHeader";

type props = {
  boqHeader: BoqHeader;
  onSuccess?: () => void;
};

export function DuplicateBoqHeaderButton({ boqHeader, onSuccess }: props) {
  const [loading, setLoading] = useState(false);
  const duplicateIcon = "/icons/duplicate.svg";

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "duplicateBoqHeader",
          id: boqHeader.id,
        }),
      });

      if (res.ok) {
        toast("BOQ duplicated successfully", "success");
        onSuccess?.();
      } else {
        toast("Failed to duplicate BOQ", "error");
      }
    } catch {
      toast("Failed to duplicate BOQ", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      componentType="button"
      bgColor="transparent"
      borderColor="transparent"
      textColor="black"
      onClick={handleClick}
      disabled={loading}
      full
      style={{ justifyContent: "flex-start" }}
    >
      <img src={duplicateIcon} alt="duplicate" />
      {loading ? "Duplicating..." : "Duplicate"}
    </Button>
  );
}
