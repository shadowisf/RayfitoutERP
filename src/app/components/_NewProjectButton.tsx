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
  const [type, setType] = useState("");

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getPropertyTypeValues`,
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
          type,
        }),
      },
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
      setType("");

      router.refresh();

      router.push(`/project/${data.id}`);
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
        NEW PROJECT +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CREATE PROJECT"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ width: "50dvw" }}
        >
          {/* 1st row */}
          <div className="input-row three-col">
            <InputItem
              label={"PROJECT NAME"}
              value={name}
              type={"text"}
              placeholder={"ENTER NAME"}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <InputItem
              label={"TYPE"}
              value={type}
              type={"select"}
              placeholder={"SELECT TYPE"}
              onChange={(e) => setType(e.target.value)}
              required
              selectOptions={["Quotation", "Signed"]}
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
            <InputItem
              label={"PROJECT NUMBER"}
              value={id}
              type={"text prefix"}
              onChange={(e) => {
                const val = e.target.value;

                if (val === "" || (/^\d+$/.test(val) && val.length <= 5)) {
                  setID(val === "" ? "" : Number(val));
                }
              }}
              placeholder="00000"
              required
              postfixText="RAY-"
            />

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
              selectOptions={["Ongoing", "Complete", "Mobilization"]}
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
          {/* <div className="input-row">
            <InputItem
              label={"PROJECT VALUE"}
              value={quotedBudget}
              type={"text postfix"}
              onChange={(e) => {
                let val = e.target.value;

                // Remove any commas
                val = val.replace(/,/g, "");

                // Clear input if empty
                if (val === "") {
                  setQuotedBudget("");
                  return;
                }

                // Allow only numbers and a single decimal point
                if (!/^\d*\.?\d*$/.test(val)) {
                  return;
                }

                // Set the value as-is (with decimal if present)
                setQuotedBudget(val);
              }}
              postfixText={currency}
            />

            <div className="input-item">
              <label className="custom">
                <span>QUOTED PRICE</span>
                <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                  (OPTIONAL)
                </small>
              </label>

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
          </div> */}

          {/* 5th row */}
          <div className="input-row">
            {/* <div className="input-item">
              <label className="custom">
                <span>ALLOCATED BUDGET</span>
                <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                  (OPTIONAL)
                </small>
              </label>
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
            </div> */}

            <InputItem
              label={"BUDGET"}
              value={allocatedBudget}
              type={"text postfix"}
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

                const formattedInt = Number(integer).toLocaleString("en-US");

                const finalValue =
                  decimal !== undefined
                    ? `${formattedInt}.${decimal}`
                    : formattedInt;

                setAllocatedBudget(finalValue);
              }}
              postfixText={currency}
              required
            />

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

          {/* 6th row */}
          <div className="input-row three-col">
            <InputItem
              label={"START DATE"}
              value={startDate}
              type={"date"}
              placeholder={"ENTER START DATE"}
              onChange={(e) => setStartDate(e.target.value)}
              required={false}
            />

            <InputItem
              label={"END DATE"}
              value={endDate}
              type={"date"}
              placeholder={"ENTER END DATE"}
              onChange={(e) => setEndDate(e.target.value)}
              required={false}
            />

            {/* <div className="input-item">
              <label>SIGNED</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  height: "100%",
                }}
              >
                <div
                  onClick={() => setSigned(!signed)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "5px",
                    border: signed ? "none" : "2px solid #d1d5db",
                    backgroundColor: signed ? "#10b981" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {signed && (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.6667 5L7.50004 14.1667L3.33337 10"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div> */}
          </div>
        </FormPopUp>
      )}
    </>
  );
}
