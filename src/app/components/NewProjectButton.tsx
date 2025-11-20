"use client";

import { useState, useEffect, SetStateAction } from "react";
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
  const cross_icon = "/icons/cross.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [scopeTypes, setScopeTypes] = useState<ScopeType[]>([]);

  const [name, setName] = useState("");
  const [propertyTypeID, setPropertyTypeID] = useState<number | "">("");
  const [id, setID] = useState<number | "">("");
  const [boqID, setBoqID] = useState(0);
  const [status, setStatus] = useState("");
  const [scopeID, setScopeID] = useState("");
  const [type, setType] = useState("");
  const [quotedBudget, setQuotedBudget] = useState("");
  const [allocatedBudget, setAllocatedBudget] = useState("");
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
          quoted_budget: parseFloat(quotedBudget),
          allocated_budget: parseFloat(allocatedBudget),
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      }
    );

    if (res.ok) {
      alert("Project added!");
      setName("");
      setPropertyTypeID("");
      setID("");
      setBoqID(0);
      setStatus("");
      setScopeID("");
      setType("");
      setQuotedBudget("");
      setAllocatedBudget("");
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
            />

            <div className="input-item">
              <label htmlFor="propertyTypeId">PROPERTY</label>
              <select
                value={propertyTypeID}
                onChange={(e) => setPropertyTypeID(parseInt(e.target.value))}
                required
              >
                <option value="" disabled>
                  SELECT PROPETY TYPE
                </option>
                {propertyTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2nd row */}
          <div className="input-row">
            <div className="input-item">
              <label htmlFor="id">PROJECT ID</label>
              <div className="input-prefix">
                <span>RAY</span>
                <input
                  type="number"
                  value={id}
                  onChange={(e) => setID(Number(e.target.value))}
                  placeholder="000"
                  required
                />
              </div>
            </div>

            <div className="input-item">
              <label htmlFor="boq">BOQ</label>
              <select
                value={boqID}
                onChange={(e) => setBoqID(Number(e.target.value))}
              >
                <option value={0} disabled>
                  SELECT BOQ
                </option>
              </select>
            </div>
          </div>

          {/* 3rd row */}
          <div className="input-row three-col">
            <div className="input-item">
              <label htmlFor="status">STATUS</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="" disabled>
                  SELECT STATUS
                </option>
                <option value="in progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="mobilization">Mobilization</option>
              </select>
            </div>

            <div className="input-item">
              <label htmlFor="scope">SCOPE</label>
              <select
                value={scopeID}
                onChange={(e) => setScopeID(e.target.value)}
              >
                <option value="" disabled>
                  SELECT SCOPE
                </option>
                {scopeTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-item">
              <label htmlFor="type">TYPE OF WORKS</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">SELECT TYPE</option>
                <option value="renovation">Renovation</option>
                <option value="new construction">New Construction</option>
              </select>
            </div>
          </div>

          {/* 4th row */}
          <div className="input-row full">
            <div className="input-item">
              <label htmlFor="quotedBudget">QUOTED BUDGET</label>
              <input
                type="number"
                placeholder="ENTER QUOTED BUDGET"
                value={quotedBudget}
                onChange={(e) => setQuotedBudget(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 5th row */}
          <div className="input-row full">
            <div className="input-item">
              <label htmlFor="allocatedBudget">ALLOCATED BUDGET</label>
              <input
                type="number"
                placeholder="ENTER ALLOCATED BUDGET"
                value={allocatedBudget}
                onChange={(e) => setAllocatedBudget(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 6th row */}
          <div className="input-row three-col" style={{ marginBottom: "40px" }}>
            <div className="input-item">
              <label htmlFor="startDate">START DATE (OPTIONAL)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="ENTER START DATE"
              />
            </div>

            <div className="input-item">
              <label htmlFor="endDate">END DATE (OPTIONAL)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="ENTER END DATE"
                onFocus={(e) => (e.target.type = "date")}
              />
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}

/* {isOpen && (
        <div className="form-outer-container">
          <div className="form-inner-container">
            <div className="form-header" style={{ marginBottom: "40px" }}>
              <h2>CREATE PROJECT</h2>

              <img
                src={cross_icon}
                alt="cross"
                style={{ cursor: "pointer" }}
                onClick={() => setIsOpen(false)}
              />
            </div>

            <form onSubmit={handleSubmit}>
              
              <div className="input-row">
                <div className="input-item">
                  <label htmlFor="name">PROJECT NAME</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ENTER PROJECT NAME"
                    required
                  />
                </div>

                <div className="input-item">
                  <label htmlFor="propertyTypeId">PROPERTY</label>
                  <select
                    value={propertyTypeID}
                    onChange={(e) =>
                      setPropertyTypeID(parseInt(e.target.value))
                    }
                    required
                  >
                    <option value="" disabled>
                      SELECT PROPETY TYPE
                    </option>
                    {propertyTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              
              <div className="input-row">
                <div className="input-item">
                  <label htmlFor="id">PROJECT ID</label>
                  <div className="input-prefix">
                    <span>RAY</span>
                    <input
                      type="number"
                      value={id}
                      onChange={(e) => setID(Number(e.target.value))}
                      placeholder="000"
                      required
                    />
                  </div>
                </div>

                <div className="input-item">
                  <label htmlFor="boq">BOQ</label>
                  <select
                    value={boqID}
                    onChange={(e) => setBoqID(Number(e.target.value))}
                  >
                    <option value={0} disabled>
                      SELECT BOQ
                    </option>
                  </select>
                </div>
              </div>

              
              <div className="input-row three-col">
                <div className="input-item">
                  <label htmlFor="status">STATUS</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="" disabled>
                      SELECT STATUS
                    </option>
                    <option value="in progress">In Progress</option>
                    <option value="complete">Complete</option>
                    <option value="mobilization">Mobilization</option>
                  </select>
                </div>

                <div className="input-item">
                  <label htmlFor="scope">SCOPE</label>
                  <select
                    value={scopeID}
                    onChange={(e) => setScopeID(e.target.value)}
                  >
                    <option value="" disabled>
                      SELECT SCOPE
                    </option>
                    {scopeTypes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-item">
                  <label htmlFor="type">TYPE OF WORKS</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="">SELECT TYPE</option>
                    <option value="renovation">Renovation</option>
                    <option value="new construction">New Construction</option>
                  </select>
                </div>
              </div>

              
              <div className="input-row full">
                <div className="input-item">
                  <label htmlFor="quotedBudget">QUOTED BUDGET</label>
                  <input
                    type="number"
                    placeholder="ENTER QUOTED BUDGET"
                    value={quotedBudget}
                    onChange={(e) => setQuotedBudget(e.target.value)}
                    required
                  />
                </div>
              </div>

              
              <div className="input-row full">
                <div className="input-item">
                  <label htmlFor="allocatedBudget">ALLOCATED BUDGET</label>
                  <input
                    type="number"
                    placeholder="ENTER ALLOCATED BUDGET"
                    value={allocatedBudget}
                    onChange={(e) => setAllocatedBudget(e.target.value)}
                    required
                  />
                </div>
              </div>

              
              <div
                className="input-row three-col"
                style={{ marginBottom: "40px" }}
              >
                <div className="input-item">
                  <label htmlFor="startDate">START DATE (OPTIONAL)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="ENTER START DATE"
                  />
                </div>

                <div className="input-item">
                  <label htmlFor="endDate">END DATE (OPTIONAL)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="ENTER END DATE"
                    onFocus={(e) => (e.target.type = "date")}
                  />
                </div>
              </div>

              <div className="button-container">
                <button className="save-draft-button">SAVE DRAFT</button>

                <button className="add-project-button" type="submit">
                  ADD PROJECT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
 */
