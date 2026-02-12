"use client";

import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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

  const [jobScopes, setJobScopes] = useState<any[]>([]);

  const [jobScopeID, setJobScopeID] = useState<string | number>("");
  const [jobDescription, setJobDescription] = useState("");
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>([]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [budgetEstimate, setBudgetEstimate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getJobScopes" }),
    })
      .then((res) => res.json())
      .then((data) => setJobScopes(data))
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let attachmentUrl = null;

    if (attachment) {
      const formData = new FormData();
      formData.append("folder", "jo-attachments");
      formData.append("files", attachment);

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        toast("Failed to upload attachment", "error");
        return;
      }

      const uploadData = await uploadRes.json();
      attachmentUrl = uploadData.urls[0];
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createJoLine",
        mr_header_id: mrHeaderID,
        job_scope_id: jobScopeID || null,
        job_description: jobDescription,
        boq_line_ids: boqLineIDs,
        quantity,
        unit,
        budget_estimate: budgetEstimate,
        start_date: startDate || null,
        end_date: endDate || null,
        attachment: attachmentUrl,
      }),
    });

    if (res.ok) {
      toast("Job item added", "success");
      setIsOpen(false);
      setJobScopeID("");
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
            <SingleSelectDropdown
              label={"JOB SCOPE"}
              selectedValue={jobScopeID}
              onChange={setJobScopeID}
              placeholder={"SELECT JOB SCOPE"}
              dbData={jobScopes}
              idField="id"
              labelField="value"
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
                <span>BILL OF QUANTITY ITEMS</span>
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
            <SingleUploadFileBox
              fileState={attachment}
              setFileState={setAttachment}
              label="ATTACHMENT"
              acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp,.dwg,.dxf"
              placeholder="UPLOAD OR DRAG ATTACHMENT"
              buttonLabel="UPLOAD FILE"
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
