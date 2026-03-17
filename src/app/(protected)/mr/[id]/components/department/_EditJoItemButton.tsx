"use client";

import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { UNIT_OPTIONS } from "@/constants/units";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { JoLine } from "../../types/joLine";

type props = {
  item: JoLine;
  projectID: number;
};

export default function EditJoItemButton({ item, projectID }: props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const pencilIcon = "/icons/pencil.svg";

  const [jobScopes, setJobScopes] = useState<any[]>([]);

  const [jobScopeID, setJobScopeID] = useState<string | number>(
    item.job_scope_id,
  );
  const [jobDescription, setJobDescription] = useState(item.job_description);
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>(() => {
    if (item.boq_line_ids) {
      if (typeof item.boq_line_ids === "string") {
        const ids = item.boq_line_ids
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "")
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
        return ids;
      }

      if (typeof item.boq_line_ids === "number") {
        return [item.boq_line_ids];
      }
    }
    return [];
  });
  const [quantity, setQuantity] = useState<string | number>(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [budgetEstimate, setBudgetEstimate] = useState<string | number>(
    item.budget_estimate,
  );
  const [startDate, setStartDate] = useState(
    new Date(item.start_date).toLocaleDateString("en-CA"),
  );
  const [endDate, setEndDate] = useState(
    new Date(item.end_date).toLocaleDateString("en-CA"),
  );
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

    let attachmentUrl: string | undefined = undefined; // only set if new file uploaded

    // Only upload if user selected a new file
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

    // Build payload — only include attachment if we have a new URL
    const payload: any = {
      action: "updateJoLine",
      id: item.id,
      job_scope_id: jobScopeID || null,
      job_description: jobDescription,
      boq_line_ids: boqLineIDs,
      quantity,
      unit,
      budget_estimate: budgetEstimate,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    // Only add attachment field if we uploaded something new
    if (attachmentUrl) {
      payload.attachment = attachmentUrl;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast("Job item updated", "success");
      router.refresh();
      setIsOpen(false);
    } else {
      toast("Failed to update job item", "error");
    }
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
        <img src={pencilIcon} alt="edit" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE JOB ITEM"}
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
              selectOptions={[...UNIT_OPTIONS]}
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
              acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp"
              placeholder="UPLOAD OR DRAG ATTACHMENT"
              buttonLabel="UPLOAD FILE"
              existingFileUrl={item.attachment}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
