"use client";

import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultipleUploadFileBox from "@/app/components/MultipleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

type props = {
  mrHeaderID: number;
  projectID: number;
  full?: boolean;
  style?: React.CSSProperties;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
};

export default function AddJoItemButton({
  mrHeaderID,
  projectID,
  full,
  bgColor = "black",
  textColor = "white",
  borderColor = "black",
  style,
}: props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [jobScope, setJobScope] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>([]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [budgetEstimate, setBudgetEstimate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attachment, setAttachment] = useState<File[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let attachmentUrls: string[] = [];

    // Handle multiple file uploads
    if (attachment && attachment.length > 0) {
      const formData = new FormData();
      formData.append("folder", "jo-attachments");

      // Append all files to formData
      attachment.forEach((file) => {
        formData.append("files", file);
      });

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        toast("Failed to upload attachments", "error");
        return;
      }

      const uploadData = await uploadRes.json();

      // Handle both single URL or array of URLs response
      if (Array.isArray(uploadData.urls)) {
        attachmentUrls = uploadData.urls;
      } else if (uploadData.url) {
        attachmentUrls = [uploadData.url];
      } else if (uploadData.urls) {
        attachmentUrls = uploadData.urls;
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createJoLine",
        mr_header_id: mrHeaderID,
        job_scope: jobScope,
        job_description: jobDescription,
        boq_line_ids: boqLineIDs,
        quantity,
        unit,
        budget_estimate: budgetEstimate,
        start_date: startDate || null,
        end_date: endDate || null,
        attachment: attachmentUrls.length > 0 ? attachmentUrls : null,
      }),
    });

    if (res.ok) {
      toast("Job item added", "success");
      setIsOpen(false);

      // Reset form
      setJobScope("");
      setJobDescription("");
      setBoqLineIDs([]);
      setQuantity("");
      setUnit("");
      setBudgetEstimate("");
      setStartDate("");
      setEndDate("");
      setAttachment(null);
      router.refresh();
    } else {
      toast("Failed to add job item", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
        full={full}
        style={style}
      >
        ADD ITEM +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CREATE JOB ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ minWidth: "1000px" }}
        >
          <div className="input-row half">
            <InputItem
              label={"JOB SCOPE"}
              value={jobScope}
              type={"text"}
              onChange={(e) => setJobScope(e.target.value)}
              required
            />

            <InputItem
              label={"JOB DESCRIPTION"}
              value={jobDescription}
              type={"text"}
              required
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="input-row three-col">
            <div className="input-item">
              <label className="custom">
                <span>BOQ REFERENCE</span>
                <small>(OPTIONAL)</small>
              </label>
              <MultipleSelectBoqItemButton
                projectID={projectID}
                currentBoqLineIDs={boqLineIDs}
                onSelectBoq={(selectedIDs: number[]) => {
                  setBoqLineIDs(selectedIDs);
                }}
              />
            </div>

            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              required
              onChange={(e) => {
                const val = e.target.value;

                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setQuantity(val);
                }
              }}
            />

            <InputItem
              label={"UNIT"}
              value={unit}
              type={"select"}
              required
              onChange={(e) => setUnit(e.target.value)}
              selectOptions={[
                "ITEM",
                "NOS",
                "SQM",
                "SQFT",
                "M",
                "LM",
                "FT",
                "CUM",
                "KG",
                "TON",
                "LTR",
                "GAL",
                "SET",
                "LOT",
                "LS",
                "PAIR",
                "BOX",
                "BAG",
                "ROLL",
                "DRUM",
              ]}
            />
          </div>

          <div className="input-row three-col">
            <InputItem
              label={"BUDGET ESTIMATE"}
              value={budgetEstimate}
              type={"text postfix"}
              onChange={(e) => {
                const val = e.target.value;

                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setBudgetEstimate(val);
                }
              }}
              postfixText={"AED"}
              required
            />

            <InputItem
              label={"START DATE"}
              value={startDate}
              type={"date"}
              placeholder={"SELECT DATE"}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <InputItem
              label={"END DATE"}
              value={endDate}
              type={"date"}
              placeholder={"SELECT DATE"}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <MultipleUploadFileBox
              fileState={attachment}
              setFileState={setAttachment}
              label="ATTACHMENT"
              acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp"
              placeholder="UPLOAD OR DRAG ATTACHMENT"
              buttonLabel="UPLOAD FILE"
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
