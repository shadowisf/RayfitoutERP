"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormPopUp from "@/app/components/FormPopup";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import Button from "@/app/components/Button";
import { MrLine } from "../../types/mrLine";

type Props = {
  item: MrLine;
};

export default function AddMrLineAttachment({ item }: Props) {
  const router = useRouter();
  const externalLinkIcon = "/icons/external-link.svg";
  const attachmentIcon = "/icons/attachment.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("files", file);
    formData.append("folder", "mr-attachments");

    const uploadRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
      { method: "POST", body: formData },
    );
    if (!uploadRes.ok) return;
    const uploadResult = await uploadRes.json();
    const url = uploadResult.urls?.[0];
    if (!url) return;

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateMrLineAttachment",
        id: item.id,
        attachment: JSON.stringify(url),
      }),
    });

    setIsOpen(false);
    setFile(null);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {item.attachment && (
        <Button
          componentType="link"
          bgColor="rgba(239,239,239,1)"
          borderColor="rgba(223,223,223,1)"
          textColor="black"
          style={{ padding: "7px 7px" }}
          href={item.attachment}
          target="_blank"
        >
          <img src={externalLinkIcon} alt="view" />
        </Button>
      )}

      <Button
        componentType="button"
        bgColor={"rgb(239, 239, 239)"}
        borderColor={"rgb(223, 223, 223)"}
        textColor={"black"}
        style={{ padding: "7px 7px" }}
        onClick={() => setIsOpen(true)}
      >
        <img src={"/icons/upload.svg"} style={{ filter: "invert(1)" }} />
      </Button>

      {isOpen && (
        <FormPopUp
          header="UPLOAD ATTACHMENT"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <SingleUploadFileBox
              fileState={file}
              setFileState={setFile}
              label="ATTACHMENT"
              acceptedFileTypes=".pdf,.png,.jpg,.jpeg"
              required
            />
          </div>
        </FormPopUp>
      )}
    </div>
  );
}
