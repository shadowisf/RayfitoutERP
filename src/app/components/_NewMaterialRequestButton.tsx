"use client";

import { useEffect, useState } from "react";
import FormPopUp from "./FormPopup";
import Button from "./Button";
import { useRouter } from "next/navigation";
import InputItem from "./InputItem";
import { useAuth } from "../context/AuthContext";
import { toast } from "./Toast";
import SingleSelectDropdown from "./SingleSelectDropdown";

export default function NewMrButton() {
  const { userInfo } = useAuth();

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [purposeReasonValues, setPurposeReasonValues] = useState<[]>([]);
  const [projects, setProjects] = useState<[]>([]);

  const [purposeReasonID, setPurposeReasonID] = useState<string | number>("");
  /* const [boqLineID, setBoqLineID] = useState<(string | number)[]>([]); */
  const [projectID, setProjectID] = useState<string | number>("");
  const [requestedBy, setRequestedBy] = useState<string | number>("");
  const [neededBy, setNeededBy] = useState("");

  useEffect(() => {
    if (isOpen && userInfo?.name) {
      setRequestedBy(userInfo.name);
    }
  }, [isOpen, userInfo]);

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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createMrHeader",
        project_id: projectID,
        department_id: userInfo?.departmentID,
        requested_by: requestedBy,
        required_date: neededBy,
        purpose_id: purposeReasonID,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      toast("Material request created", "success");

      setIsOpen(false);

      setPurposeReasonID("");
      setProjectID("");
      setNeededBy("");

      router.refresh();

      router.replace(`/mr/${data.mrHeaderId}`);
    } else {
      toast("Failed to create material request", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"black"}
        textColor={"black"}
        onClick={() => {
          router.refresh();
          setIsOpen(true);
        }}
      >
        NEW MR +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CREATE MATERIAL REQUEST"}
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

            {/* <InputItem
              label={"PROJECT"}
              value={projectID}
              type={"select"}
              placeholder={purposeReasonID === "6" ? "" : "SELECT PROJECT"}
              onChange={(e) => setProjectID(e.target.value)}
              dbMap={projects.map((pr: any) => (
                <option key={pr.id} value={pr.id}>
                  RAY-{pr.id} - {pr.name}
                </option>
              ))}
              required={purposeReasonID === 1 || purposeReasonID === 2}
              disabled={purposeReasonID === 6}
            /> */}

            {/* <SingleSelectDropdown
              label={"BOQ LINE ID"}
              selectedValue={boqLineID}
              onChange={setBoqLineID}
              placeholder={purposeReasonID === "6" ? "" : "SELECT BOQ LINE ID"}
              dbData={boqLines}
              disabled={purposeReasonID === "6"}
            /> */}

            {/* <MultiSelectDropdown
              label={"BOQ LINE ID"}
              selectedValues={boqLineID}
              onChange={setBoqLineID}
              placeholder={purposeReasonID === "6" ? "" : "SELECT BOQ LINE ID"}
              dbData={boqLines}
              disabled={purposeReasonID === "6"}
            /> */}
          </div>

          <div className="input-row half">
            <InputItem
              label={"REQUESTED BY"}
              value={requestedBy}
              type={"text"}
              placeholder={"ENTER NAME"}
              onChange={(e) => setRequestedBy(e.target.value)}
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
