"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import InputItem from "@/app/components/InputItem";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { useRefresh } from "@/app/context/RefreshContext";

export default function DashboardNewRequestButton() {
  const { userInfo } = useAuth();
  const router = useRouter();
  const { refresh } = useRefresh();


  const jobIcon = "/icons/job-req.svg";
  const mrIcon = "/icons/material-req.svg";
  const paymentIcon = "/icons/payment-req.svg";
  const warningIcon = "/icons/warning.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mode, setMode] = useState<"material" | "">("");

  const [purposeReasonValues, setPurposeReasonValues] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [purposeReasonID, setPurposeReasonID] = useState<string | number>("");
  const [projectID, setProjectID] = useState<string | number>("");
  const [requestedBy, setRequestedBy] = useState<string | number>("");
  const [requestedFor, setRequestedFor] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [skipApprovals, setSkipApprovals] = useState(false);

  const MR_PURPOSE_IDS = [1, 2, 3, 4, 5];

  const filteredPurposeReasonValues = purposeReasonValues.filter((item: any) =>
    MR_PURPOSE_IDS.includes(item.id),
  );

  const isDateValid = () => {
    if (!neededBy) return true;
    const selectedDate = new Date(neededBy);
    selectedDate.setHours(0, 0, 0, 0);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    minDate.setHours(0, 0, 0, 0);
    return selectedDate >= minDate;
  };

  const getDaysDifference = () => {
    if (!neededBy) return null;
    const selectedDate = new Date(neededBy);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil(
      (selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const getDateWarning = () => {
    if (!neededBy || isDateValid()) return null;
    const daysDiff = getDaysDifference();
    if (daysDiff !== null && daysDiff < 3)
      return "Minimum 3 days required for required date";
  };

  const dateWarning = getDateWarning();

  useEffect(() => {
    if (isOpen && userInfo?.name) setRequestedBy(userInfo.name);
  }, [isOpen, userInfo]);

  useEffect(() => {
    fetch("/api/mr/getPurposeReasonValues")
      .then((r) => r.json())
      .then(setPurposeReasonValues);

    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
        type: "material",
        department_id: userInfo?.departmentID,
        requested_by: requestedBy,
        requested_for: requestedFor || null,
        required_date: neededBy,
        purpose_id: purposeReasonID,
        skip_approvals: skipApprovals,
        delivery_location: deliveryLocation || null,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      toast("Material request created", "success");
      setIsCreateOpen(false);
      setPurposeReasonID("");
      setProjectID("");
      setNeededBy("");
      setDeliveryLocation("");
      setMode("");
      setSkipApprovals(false);
      await refresh();
      router.replace(`/mr/${data.mrHeaderId}`);
    } else {
      toast("Failed to create material request", "error");
    }
  }

  // ── Option card styles ─────────────────────────────────────────────────────
  const optionCard = (
    active: boolean,
    disabled: boolean,
    icon: string,
    label: string,
    value: string,
    onSelect: () => void,
  ) => (
    <label
      style={{
        position: "relative",
        border: `1px solid ${active ? "rgba(0,163,93,1)" : "rgba(217,217,217,1)"}`,
        borderRadius: "10px",
        padding: "16px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active
          ? "rgba(227,255,243,1)"
          : disabled
            ? "rgba(248,248,248,1)"
            : "white",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
      onClick={disabled ? undefined : onSelect}
    >
      <input
        type="radio"
        name="requestType"
        value={value}
        checked={active}
        onChange={onSelect}
        disabled={disabled}
        style={{
          width: "18px",
          height: "18px",
          flexShrink: 0,
          accentColor: "#00aa6c",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      />
      <div
        style={{
          width: "40px",
          height: "40px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={icon}
          alt={label}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: active ? "invert(1)" : "none",
          }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <span
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "black",
            display: "block",
          }}
        >
          {label}
        </span>
        {disabled && (
          <span
            style={{
              fontSize: "11px",
              color: "rgba(150,150,150,1)",
              fontWeight: 500,
            }}
          >
            COMING SOON
          </span>
        )}
      </div>
    </label>
  );

  return (
    <>
      {/* Banner trigger button — hidden on mobile */}
      <button
        className="banner-new-request mobile-hide"
        onClick={async () => {
          await refresh();
          setIsOpen(true);
        }}
      >
        + NEW REQUEST
      </button>

      {/* Mobile floating action button */}
      <button
        className="mobile-show"
        onClick={async () => {
          await refresh();
          setIsOpen(true);
        }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "black",
          color: "white",
          border: "3px solid white",
          fontSize: "42px",
          fontWeight: "300",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 200,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
        aria-label="New request"
      >
        +
      </button>

      {/* Step 1 — Select request type */}
      {isOpen && (
        <FormPopUp
          header={"CREATE NEW REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            if (!mode) {
              toast("Please select a request type", "error");
              return;
            }
            setIsOpen(false);
            setIsCreateOpen(true);
          }}
          addButtonLabel={"CONFIRM"}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {optionCard(false, true, jobIcon, "JOB ORDER", "job", () => {})}
            {optionCard(
              mode === "material",
              false,
              mrIcon,
              "MATERIAL REQUEST",
              "material",
              () => setMode("material"),
            )}
            {optionCard(
              false,
              true,
              paymentIcon,
              "PAYMENT REQUEST",
              "payment",
              () => {},
            )}
          </div>
        </FormPopUp>
      )}

      {/* Step 2 — Fill in material request details */}
      {isCreateOpen && (
        <FormPopUp
          header={"CREATE MATERIAL REQUEST"}
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
              dbData={filteredPurposeReasonValues}
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
              required
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
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setNeededBy(e.target.value)}
                required
              />
            </div>
          </div>

          {(userInfo?.departmentID === 8 ||
            userInfo?.departmentID === 16 ||
            userInfo?.departmentID === 9) && (
            <div className="input-row full">
              <InputItem
                label="REQUESTED FOR"
                value={requestedFor}
                type="text"
                onChange={(e) => setRequestedFor(e.target.value as string)}
              />
            </div>
          )}

          <div className="input-row full">
            <InputItem
              label="DELIVERY LOCATION"
              value={deliveryLocation}
              type="select"
              placeholder="SELECT DELIVERY LOCATION"
              onChange={(e) => setDeliveryLocation(e.target.value)}
              selectOptions={[
                "Headquarters",
                "Umm Al Quwain Warehouse",
                ...projects.map((p: any) => p.name),
              ]}
              required
            />
          </div>

          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              <input
                type="checkbox"
                id="dashboard-skip-approvals"
                checked={skipApprovals}
                onChange={(e) => setSkipApprovals(e.target.checked)}
                style={{
                  width: "16px",
                  height: "16px",
                  cursor: "pointer",
                  accentColor: "rgba(0,163,93,1)",
                  flexShrink: 0,
                }}
              />
              <label
                htmlFor="dashboard-skip-approvals"
                style={{
                  fontSize: "13px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                SKIP APPROVALS
              </label>
            </div>
          )}

          <br />

          {dateWarning && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <img src={warningIcon} alt="warning" />
              <p style={{ color: "rgba(175,61,61,1)" }}>{dateWarning}</p>
            </div>
          )}
        </FormPopUp>
      )}
    </>
  );
}
