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

  const jobIcon = "/icons/job-req.svg";
  const mrIcon = "/icons/material-req.svg";
  const warningIcon = "/icons/warning.svg";

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [mode, setMode] = useState<"material" | "job" | "">("");

  const [purposeReasonValues, setPurposeReasonValues] = useState<[]>([]);
  const [projects, setProjects] = useState<[]>([]);

  const [purposeReasonID, setPurposeReasonID] = useState<string | number>("");
  const [projectID, setProjectID] = useState<string | number>("");
  const [requestedBy, setRequestedBy] = useState<string | number>("");
  const [neededBy, setNeededBy] = useState("");

  // Check if user is manager (16) or QS (8) - they have no date restrictions
  const isManagerOrQS =
    userInfo?.departmentID === 16 || userInfo?.departmentID === 8;

  // Check if selected date is at least 3 days from today
  const isDateValid = () => {
    if (!neededBy || isManagerOrQS) return true;

    const selectedDate = new Date(neededBy);
    selectedDate.setHours(0, 0, 0, 0);

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    minDate.setHours(0, 0, 0, 0);

    return selectedDate >= minDate;
  };

  // Get days difference for display
  const getDaysDifference = () => {
    if (!neededBy) return null;

    const selectedDate = new Date(neededBy);
    selectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Get warning message
  const getDateWarning = () => {
    if (!neededBy || isManagerOrQS || isDateValid()) return null;

    const daysDiff = getDaysDifference();

    if (daysDiff !== null && daysDiff < 3) {
      return `Minimum 3 days required for required date`;
    }
  };

  const dateWarning = getDateWarning();
  const daysDiff = getDaysDifference();

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

    // Validate date before submitting
    if (!isDateValid()) {
      toast(getDateWarning() || "Invalid required date", "error");
      return;
    }

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
        type: mode,
        department_id: userInfo?.departmentID,
        requested_by: requestedBy,
        required_date: neededBy,
        purpose_id: purposeReasonID,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      toast(
        `${mode === "job" ? "Job" : "Material"} request created`,
        "success",
      );

      setIsCreateOpen(false);

      setPurposeReasonID("");
      setProjectID("");
      setNeededBy("");
      setMode("");

      router.refresh();

      router.replace(`/mr/${data.mrHeaderId}`);
    } else {
      toast(`Failed to create ${mode} request`, "error");
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
        NEW REQUEST +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CREATE NEW REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            setIsOpen(false);
            setIsCreateOpen(true);
          }}
          addButtonLabel={"CONFIRM"}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <label
              style={{
                position: "relative",
                border: `1px solid ${mode === "job" ? "rgba(0, 163, 93, 1)" : "rgba(217, 217, 217, 1)"}`,
                borderRadius: "10px",
                padding: "40px 20px",
                cursor: "pointer",
                background: mode === "job" ? "#d4f4e7" : "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setMode("job")}
            >
              <input
                type="radio"
                name="requestType"
                value="job"
                checked={mode === "job"}
                onChange={() => setMode("job")}
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "16px",
                  width: "20px",
                  height: "20px",
                  cursor: "pointer",
                  accentColor: "#00aa6c",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={jobIcon}
                    alt="Job Order"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      filter:
                        mode === "job" ? "brightness(100) invert(1)" : "none",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    textAlign: "center",
                    color: "black",
                  }}
                >
                  JOB ORDER
                </span>
              </div>
            </label>

            <label
              style={{
                position: "relative",
                border: `1px solid ${mode === "material" ? "rgba(0, 163, 93, 1)" : "rgba(217, 217, 217, 1)"}`,
                borderRadius: "10px",
                padding: "40px 20px",
                cursor: "pointer",
                background:
                  mode === "material" ? "rgba(227, 255, 243, 1)" : "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setMode("material")}
            >
              <input
                type="radio"
                name="requestType"
                value="mr"
                checked={mode === "material"}
                onChange={() => setMode("material")}
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "16px",
                  width: "20px",
                  height: "20px",
                  cursor: "pointer",
                  accentColor: "#00aa6c",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={mrIcon}
                    alt="Material Request"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      filter:
                        mode === "material"
                          ? "brightness(100) invert(1)"
                          : "none",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    textAlign: "center",
                    color: "black",
                  }}
                >
                  MATERIAL REQUEST
                </span>
              </div>
            </label>
          </div>
        </FormPopUp>
      )}

      {isCreateOpen && (
        <FormPopUp
          header={`CREATE ${String(mode).toUpperCase()} REQUEST`}
          setIsOpen={setIsCreateOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row half">
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
              value={requestedBy}
              type={"text"}
              placeholder={"ENTER NAME"}
              onChange={(e) => setRequestedBy(e.target.value)}
              required
              disabled
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                flex: 1,
              }}
            >
              <InputItem
                label={"REQUIRED DATE"}
                value={neededBy}
                type={"date"}
                placeholder={"ENTER DATE"}
                onChange={(e) => setNeededBy(e.target.value)}
                required
                style={dateWarning ? { borderColor: "red" } : undefined}
              />
            </div>
          </div>

          <br />

          {/* Date validation warning - shows when date is less than 3 days */}
          {dateWarning && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <img src={warningIcon} alt="warning" />
              <p
                style={{
                  color: "rgba(175, 61, 61, 1)",
                }}
              >
                {dateWarning}
              </p>
            </div>
          )}
        </FormPopUp>
      )}
    </>
  );
}
