"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "@/app/components/Toast";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import { Project } from "../types/project";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  project: Project | null;
  onSuccess?: () => void;
};

export function EditProjectButton({ project, onSuccess }: props) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [propertyTypes, setPropertyTypes] = useState<[]>([]);
  const [scopeTypes, setScopeTypes] = useState<[]>([]);

  const [name, setName] = useState("");
  const [propertyTypeID, setPropertyTypeID] = useState<number | string>(0);
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

  // Add this useEffect to populate form when project data is available
  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setPropertyTypeID(project.property_type_id || 0);
      setID(project.id || "");
      setSize(
        project.size
          ? Number(String(project.size).replace(/,/g, "")).toLocaleString(
              "en-US",
            )
          : "",
      );
      setStatus(project.status || "");
      setScopeIDs(
        project.scope_ids
          ? String(project.scope_ids)
              .split(",")
              .map((id: any) => Number(id.trim()))
          : [],
      );
      setTypeOfWork(project.type_of_work || "");
      setQuotedBudget(project.quoted_budget || "");
      setCurrency(project.currency || "");
      setAllocatedBudget(
        project.allocated_budget
          ? Number(
              String(project.allocated_budget).replace(/,/g, ""),
            ).toLocaleString("en-US")
          : "",
      );
      setStartDate(project.start_date || "");
      setEndDate(project.end_date || "");
      setType(project.type || "");
    }
  }, [project]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProject",
          id,
          name,
          property_type_id: propertyTypeID,
          size: Number(String(size).replace(/,/g, "")),
          status,
          scope_ids: scopeIDs,
          type_of_work: typeOfWork,
          quoted_budget: Number(String(quotedBudget).replace(/,/g, "")),
          currency,
          type,
          allocated_budget: Number(String(allocatedBudget).replace(/,/g, "")),
          start_date: startDate,
          end_date: endDate,
        }),
      },
    );

    if (res.ok) {
      toast("Project updated", "success");

      await refresh();

      onSuccess && onSuccess();

      setIsOpen(false);
    }
  };

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
        <img src={pencilIcon} />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE PROJECT"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ width: "50dvw" }}
        >
          {/* 1st row */}
          <div className="input-row three-col">
            <InputItem
              label={"NAME"}
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
              postfixText="RAY-"
              onChange={(e) => {
                const val = e.target.value;

                if (val === "" || (/^\d+$/.test(val) && val.length <= 5)) {
                  setID(val === "" ? "" : Number(val));
                }
              }}
              placeholder="00000"
              required
            />

            <InputItem
              label={"SIZE"}
              value={size}
              type={"text postfix"}
              postfixText="SQFT"
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

                const formattedInt = Number(integer).toLocaleString("en-US");

                const finalValue =
                  decimal !== undefined
                    ? `${formattedInt}.${decimal}`
                    : formattedInt;

                setSize(finalValue);
              }}
              required
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
          <div className="input-row">
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
          </div>
        </FormPopUp>
      )}
    </>
  );
}
