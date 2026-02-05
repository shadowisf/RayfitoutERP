"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MrHeader } from "../../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";

type EditMrHeaderButtonProps = {
  mrHeader: MrHeader;
};

export default function EditMrHeaderButton({
  mrHeader,
}: EditMrHeaderButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const [purposeReasonValues, setPurposeReasonValues] = useState<[]>([]);
  const [projects, setProjects] = useState<[]>([]);

  const [purposeReasonID, setPurposeReasonID] = useState<string | number>(
    mrHeader.purpose_id,
  );
  const [projectID, setProjectID] = useState<string | number>(
    mrHeader.project_id,
  );
  const [neededBy, setNeededBy] = useState(
    new Date(mrHeader.required_date).toLocaleDateString("en-CA"),
  );

  const pencilIcon = "/icons/pencil.svg";

  useEffect(function () {
    fetch("/api/mr/getPurposeReasonValues")
      .then((res) => res.json())
      .then(function (data) {
        setPurposeReasonValues(data);
      });

    fetch("/api/projects", {
      method: "GET",
    })
      .then((res) => res.json())
      .then(function (data) {
        setProjects(data);
      });
  }, []);

  useEffect(() => {
    if (purposeReasonID === 6) {
      setProjectID("");
    }
  }, [purposeReasonID]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (purposeReasonID === 1 || purposeReasonID === 2) {
      if (!projectID) {
        toast("Please select a project", "error");
        return;
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateMrHeader",
        id: mrHeader.id,
        project_id: projectID,
        requested_by: mrHeader.requested_by,
        required_date: neededBy,
        purpose_id: purposeReasonID,
      }),
    });

    if (res.ok) {
      toast("Material request header updated", "success");
      setIsOpen(false);
      router.refresh();
    } else {
      toast("Failed to update material request header", "error");
    }
  }

  if (userInfo?.departmentID !== mrHeader.department_id) {
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
        style={{ borderRadius: "5px", padding: "7px 7px" }}
      >
        <img src={pencilIcon} alt="edit" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row half">
            {/* <InputItem
              label={"PURPOSE/REASON"}
              value={purposeReasonID}
              type={"select"}
              placeholder={"SELECT PURPOSE/REASON"}
              onChange={(e) => setPurposeReasonID(e.target.value)}
              dbMap={purposeReasonValues.map((pr: any) => (
                <option key={pr.id} value={pr.id}>
                  {pr.value}
                </option>
              ))}
              required
            /> */}
            <SingleSelectDropdown
              label={"PURPOSE/REASON"}
              selectedValue={purposeReasonID}
              onChange={setPurposeReasonID}
              placeholder={"SELECT PURPOSE/REASON"}
              dbData={purposeReasonValues}
              idField="id"
              labelField="value"
              tooltipField="tooltip"
              required
            />

            <SingleSelectDropdown
              label={"PROJECT"}
              selectedValue={projectID}
              onChange={setProjectID}
              placeholder={"SELECT PROJECT"}
              dbData={[...projects]}
              idField="id"
              labelField="name"
              required={purposeReasonID === 1 || purposeReasonID === 2}
              disabled={purposeReasonID === 6}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"REQUESTED BY"}
              value={mrHeader.requested_by}
              type={"text"}
              placeholder={"ENTER NAME"}
              onChange={() => {}}
              required
              disabled
            />

            <InputItem
              label={"REQUIRED DATE"}
              value={neededBy}
              type={"date"}
              placeholder={"ENTER DATE"}
              onChange={(e) => setNeededBy(e.target.value)}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
