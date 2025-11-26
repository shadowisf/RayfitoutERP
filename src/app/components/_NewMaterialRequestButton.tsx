"use client";

import { useEffect, useState } from "react";
import FormPopUp from "./FormPopup";
import Button from "./Button";
import { useRouter } from "next/navigation";
import InputItem from "./InputItem";
import SingleSelectDropdown from "./SingleSelectDropdown";

export default function NewMrButton() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [boqLines, setBoqLines] = useState<any[]>([]);
  const [purposeReasonValues, setPurposeReasonValues] = useState<[]>([]);

  const [boqLineID, setBoqLineID] = useState<string | number>("");
  const [purposeReasonID, setPurposeReasonID] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [priority, setPriority] = useState("");

  useEffect(function () {
    fetch("/api/boq/getAllBoqLinesWithNumberRef")
      .then((res) => res.json())
      .then(function (data) {
        setBoqLines(data);

        const map = data.reduce(function (acc: any, boqL: any) {
          acc[
            boqL.id
          ] = `${boqL.project_name} (RAY-${boqL.project_id}) - ${boqL.item_name} (${boqL.item_number})`;
          return acc;
        }, {});

        const array = Object.entries(map).map(function ([id, label]) {
          return {
            id: Number(id),
            value: label,
          };
        });

        setBoqLines(array);
      });

    fetch("/api/mr/getPurposeReasonValues")
      .then((res) => res.json())
      .then(function (data) {
        setPurposeReasonValues(data);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boq_line_id: boqLineID,
        department_id: 1,
        requested_by: requestedBy,
        required_date: neededBy,
        priority,
        purpose_id: purposeReasonID,
      }),
    });

    if (res.ok) {
      alert("Material request header added");

      setIsOpen(false);

      router.refresh();
    } else {
      alert("Failed to add material request header");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"black"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
      >
        + NEW MATERIAL REQUEST
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ADD MATERIAL REQUEST HEADER"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"ADD MATERIAL REQUEST HEADER"}
        >
          <div className="input-row half">
            <SingleSelectDropdown
              label={"BOQ LINE ID"}
              selectedValue={boqLineID}
              onChange={setBoqLineID}
              placeholder={"SELECT BOQ LINE ID"}
              dbData={boqLines}
            />

            <InputItem
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
            />
          </div>

          <div className="input-row three-col">
            <InputItem
              label={"REQUESTED BY"}
              value={requestedBy}
              type={"text"}
              placeholder={"ENTER NAME"}
              onChange={(e) => setRequestedBy(e.target.value)}
              required
            />

            <InputItem
              label={"NEEDED BY"}
              value={neededBy}
              type={"date"}
              placeholder={"ENTER DATE"}
              onChange={(e) => setNeededBy(e.target.value)}
              required
            />

            <InputItem
              label={"PRIORITY"}
              value={priority}
              type={"select"}
              placeholder={"SELECT PRIORITY"}
              onChange={(e) => setPriority(e.target.value)}
              selectOptions={["Normal", "Medium", "High", "Critical"]}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
