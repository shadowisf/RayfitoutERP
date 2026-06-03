"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import CreateDatabaseInlineButton from "./_CreateDatabaseInlineButton";
import { useAuth } from "@/app/context/AuthContext";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  database_id?: number | null;
  is_archived?: number | null;
};

type Props = {
  item: MaterialItem;
  databases: { id: number; name: string }[];
  onSuccess: (newItem: MaterialItem) => void;
  onDatabaseCreated?: (id: number, name: string) => void;
};

export default function CopyMaterialButton({
  item,
  databases,
  onSuccess,
  onDatabaseCreated,
}: Props) {
  const { userInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [targetDatabaseId, setTargetDatabaseId] = useState<string | number>("");
  const [localDatabases, setLocalDatabases] = useState(databases);

  useEffect(() => {
    setLocalDatabases(databases);
  }, [databases]);

  useEffect(() => {
    if (isOpen) setTargetDatabaseId(item.database_id ?? "");
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = targetDatabaseId ? Number(targetDatabaseId) : null;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            material_description: item.material_description,
            category_id: item.category_id,
            subcategory_id: item.subcategory_id,
            unit: item.unit,
            brand: item.brand,
            added_by: item.added_by,
            database_id: targetId,
            source_item_id: item.id,
            action_type: "copy",
            changed_by: userInfo?.name ?? null,
          }),
        },
      );
      if (!res.ok) throw new Error();
      const newItem: MaterialItem = await res.json();
      toast("Material copied.", "success");
      setIsOpen(false);
      onSuccess(newItem);
    } catch {
      toast("Failed to copy material.", "error");
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header="COPY TO..."
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <p>{item.material_description}</p>

      <br />

      <div className="input-row full">
        <SingleSelectDropdown
          label="TARGET DATABASE"
          dbData={localDatabases.map((d) => ({ id: d.id, value: d.name }))}
          selectedValue={targetDatabaseId}
          onChange={(val) => setTargetDatabaseId(val)}
          placeholder="SELECT DATABASE"
          required
          style={{ width: "100%" }}
          bottomButtonComponent={
            <CreateDatabaseInlineButton
              onSuccess={(id, name) => {
                setLocalDatabases((prev) => [...prev, { id, name }]);
                setTargetDatabaseId(id);
                onDatabaseCreated?.(id, name);
              }}
            />
          }
        />
      </div>
    </FormPopUp>
  );

  return (
    <>
      <Button
        componentType="button"
        bgColor="transparent"
        borderColor="transparent"
        textColor="black"
        full
        style={{ justifyContent: "flex-start" }}
        onClick={() => setIsOpen(true)}
      >
        <img src="/icons/duplicate.svg" alt="" /> Copy to...
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
