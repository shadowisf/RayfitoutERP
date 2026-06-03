"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type Props = {
  onSuccess: (id: number, name: string) => void;
};

export default function CreateDatabaseInlineButton({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!isOpen) setName("");
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast("Database name is required.", "error");
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createDatabase", name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data?.error || "Failed to create database.", "error");
        return;
      }
      toast("Database created.", "success");
      setIsOpen(false);
      onSuccess(data.id, trimmed);
    } catch {
      toast("Failed to create database.", "error");
    }
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor="black"
        borderColor="black"
        textColor="white"
        full
        onClick={() => setIsOpen(true)}
      >
        NEW DATABASE +
      </Button>

      {isOpen && (
        <FormPopUp
          header="CREATE DATABASE"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label="DATABASE NAME"
              value={name}
              type="text"
              required
              onChange={(e) => setName(e.target.value)}
              noOptionalLabel
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
