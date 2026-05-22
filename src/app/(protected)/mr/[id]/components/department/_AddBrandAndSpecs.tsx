"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { MrLine } from "../../types/mrLine";
import { useAuth } from "@/app/context/AuthContext";

type Props = {
  item: MrLine;
  stageName?: string;
};

export default function AddBrandAndSpecs({ item, stageName }: Props) {
  const router = useRouter();
  const { userInfo } = useAuth();
  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [specification, setSpecification] = useState("");

  const hasData = !!item.specification;

  function openPopup() {
    setSpecification(item.specification || "");
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateMrLineBrandSpec",
        id: item.id,
        specification: specification.trim() || null,
        notes: item.notes || null,
        changed_by: userInfo?.name || null,
        stage_name: stageName || "INITIAL APPROVAL",
      }),
    });
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={"rgb(239, 239, 239)"}
        borderColor={"rgb(223, 223, 223)"}
        textColor={"black"}
        style={{ padding: "7px 7px" }}
        onClick={openPopup}
      >
        {hasData ? (
          <img src={pencilIcon} alt="edit" />
        ) : (
          <img src={"/icons/plus.svg"} alt="add" />
        )}
      </Button>

      {isOpen && (
        <FormPopUp
          header="ADD SPECS / NOTES"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label="SPECS / NOTES"
              value={specification}
              type="textarea"
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="Enter specification"
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
