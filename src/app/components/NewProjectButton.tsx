"use client";

import { useState, useEffect } from "react";
import FormPopUp from "./FormPopup";
import InputItem from "./InputItem";

type PropertyType = {
  id: number;
  value: string;
};

type ScopeType = {
  id: number;
  value: string;
};

export default function NewProjectButton() {
  const [isOpen, setIsOpen] = useState(false);

  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [scopeTypes, setScopeTypes] = useState<ScopeType[]>([]);

  const [name, setName] = useState("");
  const [propertyTypeID, setPropertyTypeID] = useState<number>(0);
  const [id, setID] = useState<number | string>("");
  const [boqID, setBoqID] = useState(0);
  const [status, setStatus] = useState("");
  const [scopeID, setScopeID] = useState(0);
  const [type, setType] = useState("");
  const [quotedBudget, setQuotedBudget] = useState<number | string>("");
  const [allocatedBudget, setAllocatedBudget] = useState<number | string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/property_type`)
      .then((res) => res.json())
      .then((data: PropertyType[]) => setPropertyTypes(data))
      .catch((err) => console.error(err));

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/scope`)
      .then((res) => res.json())
      .then((data: ScopeType[]) => setScopeTypes(data))
      .catch((err) => console.error(err));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          property_type_id: propertyTypeID,
          id,
          status,
          scope_id: scopeID,
          type,
          quoted_budget: Number(quotedBudget),
          allocated_budget: Number(allocatedBudget),
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      }
    );

    if (res.ok) {
      alert("Project added!");
      setName("");
      setPropertyTypeID(0);
      setID("");
      setBoqID(0);
      setStatus("");
      setScopeID(0);
      setType("");
      setQuotedBudget(0);
      setAllocatedBudget(0);
      setStartDate("");
      setEndDate("");
      setIsOpen(false);
    } else {
      alert("Failed to add project");
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="new-project-button">
        + NEW PROJECT
      </button>

      {isOpen && (
        <FormPopUp
          header={"ADD PROJECT"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"ADD PROJECT"}
        >
          {/* 1st row */}
          <div className="input-row">
            <InputItem
              label={"PROJECT NAME"}
              value={name}
              type={"text"}
              placeholder={"ENTER PROJECT NAME"}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <InputItem
              label={"PROPERTY"}
              value={propertyTypeID}
              type={"select"}
              placeholder={"SELECT PROPETY TYPE"}
              onChange={(e) => setPropertyTypeID(Number(e.target.value))}
              dbMap={propertyTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.value}
                </option>
              ))}
              required
            />
          </div>

          {/* 2nd row */}
          <div className="input-row">
            <div className="input-item">
              <label>PROJECT ID</label>
              <div className="input-prefix left">
                <span>RAY</span>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setID(Number(val));
                    }
                  }}
                  placeholder="000"
                  required
                />
              </div>
            </div>

            <InputItem
              label={"BOQ"}
              value={boqID}
              type={"select"}
              placeholder={"SELECT BOQ"}
              onChange={(e) => setBoqID(Number(e.target.value))}
              selectOptions={[]}
              required={false}
            />
          </div>

          {/* 3rd row */}
          <div className="input-row three-col">
            <InputItem
              label={"STATUS"}
              value={status}
              type={"select"}
              placeholder={"SELECT STATUS"}
              onChange={(e) => setStatus(e.target.value)}
              selectOptions={["In progress", "Complete", "Mobilization"]}
              required
            />

            <InputItem
              label={"SCOPE"}
              value={scopeID}
              type={"select"}
              placeholder={"SELECT SCOPE"}
              onChange={(e) => setScopeID(Number(e.target.value))}
              dbMap={scopeTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.value}
                </option>
              ))}
              required
            />

            <InputItem
              label={"TYPE OF WORKS"}
              value={type}
              type={"select"}
              placeholder={"SELECT TYPE"}
              onChange={(e) => setType(e.target.value)}
              selectOptions={["Renovation", "New construction"]}
              required
            />
          </div>

          {/* 4th row */}
          <div className="input-row full">
            <div className="input-item">
              <label>QUOTED BUDGET</label>
              <div className="input-prefix right">
                <span>AED</span>
                <input
                  type="text"
                  value={quotedBudget}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/,/g, "");

                    if (val === "") {
                      setAllocatedBudget("");
                      return;
                    }

                    if (!/^\d*\.?\d*$/.test(val)) {
                      return;
                    }

                    const parts = val.split(".");
                    const integer = parts[0];
                    const decimal = parts[1];

                    const formattedInt =
                      Number(integer).toLocaleString("en-US");

                    const finalValue =
                      decimal !== undefined
                        ? `${formattedInt}.${decimal}`
                        : formattedInt;

                    setQuotedBudget(finalValue);
                  }}
                  placeholder="ENTER QUOTED BUDGET"
                  required
                />
              </div>
            </div>
          </div>

          {/* 5th row */}
          <div className="input-row full">
            <div className="input-item">
              <label>ALLOCATED BUDGET</label>
              <div className="input-prefix right">
                <span>AED</span>
                <input
                  type="text"
                  value={allocatedBudget}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/,/g, "");

                    if (val === "") {
                      setAllocatedBudget("");
                      return;
                    }

                    if (!/^\d*\.?\d*$/.test(val)) {
                      return;
                    }

                    const parts = val.split(".");
                    const integer = parts[0];
                    const decimal = parts[1];

                    const formattedInt =
                      Number(integer).toLocaleString("en-US");

                    const finalValue =
                      decimal !== undefined
                        ? `${formattedInt}.${decimal}`
                        : formattedInt;

                    setAllocatedBudget(finalValue);
                  }}
                  placeholder="ENTER ALLOCATED BUDGET"
                />
              </div>
            </div>
          </div>

          {/* 6th row */}
          <div className="input-row three-col" style={{ marginBottom: "40px" }}>
            <InputItem
              label={"START DATE (OPTIONAL)"}
              value={startDate}
              type={"date"}
              placeholder={"ENTER START DATE"}
              onChange={(e) => setStartDate(e.target.value)}
              required={false}
            />

            <InputItem
              label={"END DATE (OPTIONAL)"}
              value={endDate}
              type={"date"}
              placeholder={"ENTER END DATE"}
              onChange={(e) => setEndDate(e.target.value)}
              required={false}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
