"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";

type Props = {
  boqLineId: number;
  onUpload: (boqLineId: number, file: File) => Promise<void>;
};

export default function BoqLineAttachmentUploadButton({
  boqLineId,
  onUpload,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const uploadIcon = "/icons/upload.svg";

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast("Please select a file to upload", "error");
      return;
    }
    await onUpload(boqLineId, file);
    setFile(null);
    setIsOpen(false);
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(223, 223, 223, 1)"
        textColor="black"
        style={{ padding: "7px 7px" }}
        onClick={() => setIsOpen(true)}
      >
        <img src={uploadIcon} alt="upload" style={{ filter: "invert(1)" }} />
      </Button>

      {isOpen && (
        <FormPopUp
          header="UPLOAD ATTACHMENT(S)"
          setIsOpen={(open) => {
            if (!open) {
              setFile(null);
              setIsOpen(false);
            }
          }}
          handleSubmit={handleConfirm}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <UploadFileBox
              fileState={file}
              setFileState={setFile}
              label="ATTACHMENT"
              acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp"
              placeholder=""
              buttonLabel="SELECT FILE"
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
