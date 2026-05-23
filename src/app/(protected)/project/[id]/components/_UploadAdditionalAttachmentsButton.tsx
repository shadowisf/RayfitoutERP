"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState } from "react";
import { Project } from "../types/project";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  project: Project | null;
  onUploadSuccess?: () => void;
};

export default function UploadAdditionalAttachmentsButton({
  project,
  onUploadSuccess,
}: props) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const [isOpen, setIsOpen] = useState(false);
  const [nameOfAttachment, setNameOfAttachment] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!attachment || !nameOfAttachment || !project) {
      return;
    }

    try {
      // Step 1: Upload file to S3 using your /api/s3 route
      const formData = new FormData();
      formData.append("files", attachment);
      formData.append("folder", `projects/${project.id}/attachments`);

      const s3Response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        {
          method: "POST",
          body: formData,
        },
      );

      const s3Data = await s3Response.json();

      if (!s3Response.ok || !s3Data.urls || s3Data.urls.length === 0) {
        throw new Error(s3Data.error || "Failed to upload file to S3");
      }

      const fileUrl = s3Data.urls[0]; // Get the first (and only) uploaded URL

      // Step 2: Save attachment info to database
      const dbResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/uploadAttachments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: project.id,
            attachment_name: nameOfAttachment,
            attachment_url: fileUrl,
          }),
        },
      );

      const dbData = await dbResponse.json();

      if (!dbResponse.ok) {
        // If database save fails, delete the uploaded file from S3
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            url: fileUrl,
          }),
        });

        throw new Error(
          dbData.error || "Failed to save attachment to database",
        );
      }

      toast("Attachment uploaded", "success");

      setNameOfAttachment("");
      setAttachment(null);
      setIsOpen(false);

      // Refresh the page or call callback
      if (onUploadSuccess) {
        onUploadSuccess();
      } else {
        await refresh();
      }
    } catch (error: any) {
      console.error("Error uploading attachment:", error);
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: "50px" }}
      >
        New Attachment +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPLOAD NEW ATTACHMENT"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row half">
            <InputItem
              label={"NAME OF ATTACHMENT"}
              value={nameOfAttachment}
              type={"text"}
              onChange={(e) => setNameOfAttachment(e.target.value)}
              required
            />
          </div>

          <div className="input-row full">
            <SingleUploadFileBox
              fileState={attachment}
              setFileState={setAttachment}
              label={"ATTACHMENT"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
