"use client";

import { useEffect, useState } from "react";
import FormPopUp from "./FormPopup";
import Button from "./Button";
import { useRouter } from "next/navigation";
import InputItem from "./InputItem";
import { useAuth } from "../context/AuthContext";
import MultiSelectDropdown from "./MultiSelectDropdown";

export default function NewMrButton() {
  const { userInfo } = useAuth();

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [boqLines, setBoqLines] = useState<any[]>([]);
  const [purposeReasonValues, setPurposeReasonValues] = useState<[]>([]);

  const [purposeReasonID, setPurposeReasonID] = useState("");
  const [boqLineID, setBoqLineID] = useState<(string | number)[]>([]);

  const [requestedBy, setRequestedBy] = useState(userInfo?.name || "");
  const [neededBy, setNeededBy] = useState("");

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

  useEffect(() => {
    if (purposeReasonID === "6") {
      setBoqLineID([]);
    }
  }, [purposeReasonID]);

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
        onClick={() => {
          router.refresh();
          setIsOpen(true);
        }}
      >
        + NEW MATERIAL REQUEST
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ADD MATERIAL REQUEST HEADER"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"ADD MATERIAL REQUEST HEADER"}
          style={{ minWidth: "80%" }}
        >
          <div className="input-row half">
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

            {/* <SingleSelectDropdown
              label={"BOQ LINE ID"}
              selectedValue={boqLineID}
              onChange={setBoqLineID}
              placeholder={purposeReasonID === "6" ? "" : "SELECT BOQ LINE ID"}
              dbData={boqLines}
              disabled={purposeReasonID === "6"}
            /> */}

            <MultiSelectDropdown
              label={"BOQ LINE ID"}
              selectedValues={boqLineID}
              onChange={setBoqLineID}
              placeholder={purposeReasonID === "6" ? "" : "SELECT BOQ LINE ID"}
              dbData={boqLines}
              disabled={purposeReasonID === "6"}
              /* style={{ minWidth: "600px" }} */
            />
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
              label={"NEEDED BY"}
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
