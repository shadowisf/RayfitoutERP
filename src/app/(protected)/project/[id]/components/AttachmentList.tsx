"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";

type Attachment = {
  name: string;
  url: string;
  uploaded_at?: string;
};

type AttachmentsListProps = {
  attachments?: Attachment[];
  projectId?: number;
  onDeleteSuccess?: () => void;
  canDelete?: boolean;
};

export default function AttachmentsList({
  attachments,
  projectId,
  onDeleteSuccess,
  canDelete = true,
}: AttachmentsListProps) {
  const externalLinkIcon = "/icons/external-link.svg";
  const trashIcon = "/icons/trash.svg";

  const router = useRouter();

  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const handleDelete = async (attachmentUrl: string) => {
    setDeletingUrl(attachmentUrl);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/deleteAttachments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            attachment_url: attachmentUrl,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete attachment");
      }

      toast("Attachment deleted", "success");

      // Refresh or callback
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      toast(error.message || "Failed to delete attachment", "error");
    } finally {
      setDeletingUrl(null);
    }
  };

  if (attachments?.length === 0 || !attachments) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      {attachments &&
        attachments.map((attachment, index) => (
          <div key={index}>
            <div
              className="approval-pill normal-text"
              style={{
                border: "1px solid rgba(207, 207, 207, 1)",
                color: "black",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: "600",
                fontSize: "14px",
                opacity: deletingUrl === attachment.url ? 0.5 : 1,
                pointerEvents: deletingUrl === attachment.url ? "none" : "auto",
              }}
            >
              {attachment.name}
              <Button
                componentType={"link"}
                bgColor={"transparent"}
                borderColor={"transparent"}
                textColor={"black"}
                style={{ padding: "0px" }}
                href={attachment.url}
                target="_blank"
              >
                <img src={externalLinkIcon} alt="external link" />
              </Button>
              {canDelete && (
                <img
                  src={trashIcon}
                  alt="delete"
                  width={12}
                  onClick={() => handleDelete(attachment.url)}
                  style={{ cursor: "pointer" }}
                />
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
