"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/app/components/Toast";
import { Project } from "../types/project";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  project: Project | null;
  onSuccess?: () => void;
};

export function DeleteProjectButton({ project, onSuccess }: props) {
  const router = useRouter();
  const { refresh } = useRefresh();


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
          id: project?.id,
        }),
      },
    );

    if (res.ok) {
      toast("Project deleted", "success");

      await refresh();
      router.replace("/project");

      onSuccess && onSuccess();

      setIsOpen(false);
    } else {
      toast("Failed to delete bill of quantity", "error");
    }
  };

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
