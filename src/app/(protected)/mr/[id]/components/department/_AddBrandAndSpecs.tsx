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
  const [brand, setBrand] = useState("");
  const [specification, setSpecification] = useState("");

  const hasData = !!(item.brand || item.specification);

  function openPopup() {
    setBrand(item.brand || "");
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
        brand: brand.trim() || null,
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
          header="ADD BRAND, SEPCS, NOTES FOR MATERIAL REQUEST ITEM"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label="BRAND"
              value={brand}
              type="text"
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Enter brand"
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="SPECIFICATION"
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
