"use client";

import { useState, useEffect } from "react";
import FormPopUp from "./FormPopup";
import InputItem from "./InputItem";
import Button from "./Button";
import { useRouter } from "next/navigation";
import { toast } from "./Toast";
import MultiSelectDropdown from "./MultiSelectDropdown";

export default function NewProjectButton() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [propertyTypes, setPropertyTypes] = useState<[]>([]);
  const [scopeTypes, setScopeTypes] = useState<[]>([]);

  const [name, setName] = useState("");
  const [propertyTypeID, setPropertyTypeID] = useState<number | string>("");
  const [id, setID] = useState<number | string>("");
  const [size, setSize] = useState<number | string>("");
  const [status, setStatus] = useState("");
  const [scopeIDs, setScopeIDs] = useState<(string | number)[]>([]);
  const [typeOfWork, setTypeOfWork] = useState("");
  const [quotedBudget, setQuotedBudget] = useState<number | string>("");
  const [currency, setCurrency] = useState("");
  const [allocatedBudget, setAllocatedBudget] = useState<number | string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getPropertyTypeValues`
    )
      .then((res) => res.json())
      .then((data: []) => setPropertyTypes(data))
      .catch((err) => console.error(err));

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getScopeValues`)
      .then((res) => res.json())
      .then((data: []) => setScopeTypes(data))
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
          action: "createProject",
          name,
          property_type_id: propertyTypeID,
          id,
          size: Number(String(size).replace(/,/g, "")) | 0,
          status,
          scope_ids: scopeIDs,
          type_of_work: typeOfWork,
          quoted_budget: Number(String(quotedBudget).replace(/,/g, "")) | 0,
          currency,
          allocated_budget:
            Number(String(allocatedBudget).replace(/,/g, "")) | 0,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      }
    );

    const data = await res.json();

    if (res.ok) {
      toast("Project created", "success");

      setName("");
      setPropertyTypeID("");
      setID("");
      setStatus("");
      setScopeIDs([0]);
      setTypeOfWork("");
      setQuotedBudget(0);
      setCurrency("");
      setAllocatedBudget(0);
      setStartDate("");
      setEndDate("");
      setIsOpen(false);

      router.refresh();

      router.push(`/boq/${data.id}`);
    } else {
      toast("Failed to create project. Something went wrong", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"white"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
      >
        + NEW PROJECT
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ADD PROJECT"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          {/* 1st row */}
          <div className="input-row">
            <InputItem
              label={"NAME"}
              value={name}
              type={"text"}
              placeholder={"ENTER NAME"}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <InputItem
              label={"PROPERTY TYPE"}
              value={propertyTypeID}
              type={"select"}
              placeholder={"SELECT PROPETY TYPE"}
              onChange={(e) => setPropertyTypeID(Number(e.target.value))}
              dbMap={propertyTypes.map((pt: any) => (
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
              <label>ID</label>
              <div className="input-prefix left">
                <span>RAY-</span>
                <input
                  style={{ padding: "7px 42px" }}
                  type="text"
                  value={id}
                  onChange={(e) => {
                    const val = e.target.value;

                    if (val === "" || (/^\d+$/.test(val) && val.length <= 3)) {
                      setID(val === "" ? "" : Number(val));
                    }
                  }}
                  placeholder="000"
                  required
                />
              </div>
            </div>

            <div className="input-item">
              <label>SIZE</label>
              <div className="input-prefix right">
                <span>SQFT</span>
                <input
                  style={{ paddingRight: "50px" }}
                  type="text"
                  value={size}
                  /* onChange={(e) => {
                    const val = e.target.value;

                    if (val === "" || /^\d+$/.test(val)) {
                      setSize(val === "" ? "" : Number(val));
                    }
                  }} */
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/,/g, "");

                    if (val === "") {
                      setSize("");
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

                    setSize(finalValue);
                  }}
                  placeholder="ENTER SIZE"
                  required
                />
              </div>
            </div>
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

            {/* <InputItem
              label={"SCOPE"}
              value={scopeID}
              type={"select"}
              placeholder={"SELECT SCOPE"}
              onChange={(e) => setScopeID(Number(e.target.value))}
              dbMap={scopeTypes.map((st: any) => (
                <option key={st.id} value={st.id}>
                  {st.value}
                </option>
              ))}
              required
            /> */}

            <MultiSelectDropdown
              label="SCOPE"
              dbData={scopeTypes}
              selectedValues={scopeIDs}
              onChange={setScopeIDs}
              placeholder="SELECT SCOPE"
              style={{ maxWidth: "260px" }}
              required
            />

            <InputItem
              label={"TYPE OF WORK"}
              value={typeOfWork}
              type={"select"}
              placeholder={"SELECT TYPE"}
              onChange={(e) => setTypeOfWork(e.target.value)}
              selectOptions={["Renovation", "New construction"]}
              required
            />
          </div>

          {/* 4th row */}
          <div className="input-row">
            <div className="input-item">
              <label>QUOTED BUDGET (OPTIONAL)</label>
              <div className="input-prefix right">
                <span>{currency}</span>
                <input
                  style={{ paddingRight: "50px" }}
                  type="text"
                  value={quotedBudget}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/,/g, "");

                    if (val === "") {
                      setQuotedBudget("");
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
                />
              </div>
            </div>

            <InputItem
              label={"CURRENCY"}
              value={currency}
              type={"select"}
              placeholder={"SELECT CURRENCY"}
              required
              onChange={(e) => {
                setCurrency(e.target.value);
              }}
              selectOptions={[
                "AED",
                "USD",
                "EUR",
                "GBP",
                "SAR",
                "KES",
                "JPY",
                "CAD",
                "CHF",
                "AUD",
                "CNY",
              ]}
            />
          </div>

          {/* 5th row */}
          <div className="input-row full">
            <div className="input-item">
              <label>ALLOCATED BUDGET (OPTIONAL)</label>
              <div className="input-prefix right">
                <span>{currency}</span>
                <input
                  style={{ paddingRight: "50px" }}
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
