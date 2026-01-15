"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

export function DeleteProjectButton({ project }: { project: any }) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteProject",
          id: project.id,
        }),
      }
    );

    if (res.ok) {
      toast("Project deleted", "success");

      router.refresh();
      router.replace("/project");

      setIsOpen(false);
    }
  };

  if (userInfo?.departmentID !== 8) {
    return null;
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={trashIcon} />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"DELETE PROJECT"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          Are you sure you want to delete this project?
        </FormPopUp>
      )}
    </>
  );
}
