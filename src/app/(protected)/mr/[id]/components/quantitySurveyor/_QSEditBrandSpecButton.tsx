"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { MrLine } from "../../types/mrLine";
import { useAuth } from "@/app/context/AuthContext";
import { useRefresh } from "@/app/context/RefreshContext";

type Props = {
  item: MrLine;
};

export default function QSEditBrandSpecButton({ item }: Props) {
  const router = useRouter();
  const { refresh } = useRefresh();

  const { userInfo } = useAuth();
  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [brandValue, setBrandValue] = useState("");
  const [specValue, setSpecValue] = useState("");

  function openPopup() {
    setBrandValue(item.brand ?? "");
    setSpecValue(item.specification ?? "");
    setIsOpen(true);
  }

  async function handleSave() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateMrLineBrandSpec",
        id: item.id,
        brand: brandValue.trim() || null,
        specification: specValue.trim() || null,
        changed_by:
          userInfo?.name && userInfo?.role
            ? `${userInfo.name}, ${userInfo.role}`
            : userInfo?.name || null,
        stage_name: "QS REVIEW",
      }),
    });
    await refresh();
    setIsOpen(false);
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        style={{ padding: "7px 7px" }}
        onClick={openPopup}
      >
        <img src={pencilIcon} alt="edit brand/spec" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="EDIT BRAND & SPECIFICATION"
          setIsOpen={setIsOpen}
          handleSubmit={handleSave}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"BRAND"}
              value={brandValue}
              type={"text"}
              placeholder={"ENTER BRAND"}
              onChange={(e) =>
                setBrandValue(
                  (e as React.ChangeEvent<HTMLInputElement>).target.value,
                )
              }
            />
          </div>
          <div className="input-row full">
            <InputItem
              label={"SPECIFICATION"}
              value={specValue}
              type={"textarea"}
              placeholder={"ENTER SPECIFICATION"}
              onChange={(e) =>
                setSpecValue(
                  (e as React.ChangeEvent<HTMLTextAreaElement>).target.value,
                )
              }
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
