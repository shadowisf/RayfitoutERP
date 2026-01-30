import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState } from "react";
import { Project } from "../types/project";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";

type props = {
  project: Project | null;
};

export function UploadAdditionalAttachmentsButton({ project }: props) {
  const [isOpen, setIsOpen] = useState(false);

  const [nameOfAttachment, setNameOfAttachment] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: "25px" }}
      >
        New Attachment +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPLOAD NEW ATTACHMENT"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
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
