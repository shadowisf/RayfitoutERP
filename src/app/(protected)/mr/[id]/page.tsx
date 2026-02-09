import Button from "@/app/components/Button";
import CreateMrLineClient from "./components/CreateMrLine";
import DeleteMrHeaderButton from "./components/department/_DeleteMrHeaderButton";
import EditMrHeaderButton from "./components/department/_EditMrHeaderButton";
import MrLinesView from "./components/MrLinesView";
import { MrHeader } from "./types/mrHeader";
import CancelMaterialRequestButton from "./components/_CancelMaterialRequest";

export default async function MrWithID({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const uTurnIcon = "/icons/u-turn.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const mrHeader: MrHeader = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    },
  )
    .then((res) => res.json())
    .then((data) => data)
    .catch((err) => {
      console.error(err);
      return {} as MrHeader;
    });

  const mrLines = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrLinesByMrHeaderID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    },
  )
    .then((res) => res.json())
    .catch((err) => {
      console.error(err);
      return {};
    });

  const deliveryDates = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getDeliveryDatesByMrHeaderID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mr_header_id: id }),
    },
  )
    .then((res) => res.json())
    .then((data) => (data.success ? data.delivery_dates : []))
    .catch((err) => {
      console.error("Error fetching delivery dates:", err);
      return [];
    });

  // Fetch and format progress duration
  const durationData = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getProgressDuration`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mr_header_id: id,
        progress_id: mrHeader.progress_id,
      }),
    },
  )
    .then((res) => res.json())
    .then((data) => {
      let hoursDecimal = 0;

      if (data?.hours_in_stage != null && data?.minutes_in_stage != null) {
        hoursDecimal =
          Number(data.hours_in_stage) + Number(data.minutes_in_stage) / 60;
      }

      // Format as DD:HH:MM
      const totalMinutes = Math.round(hoursDecimal * 60);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      const durationString = `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

      let durationStyle = {
        color: "black",
        backgroundColor: "rgba(231, 231, 231, 1)",
      };

      if (hoursDecimal > 48) {
        durationStyle = {
          color: "white",
          backgroundColor: "rgba(175, 61, 61, 1)",
        };
      } else if (hoursDecimal >= 24) {
        durationStyle = {
          color: "rgba(248, 77, 77, 1)",
          backgroundColor: "rgba(255, 181, 181, 1)",
        };
      } else if (hoursDecimal >= 12) {
        durationStyle = {
          color: "rgba(134, 83, 47, 1)",
          backgroundColor: "rgba(255, 250, 189, 1)",
        };
      }

      return { duration: durationString, durationStyle, hoursDecimal };
    })
    .catch((err) => {
      console.error("Error fetching duration:", err);
      return {
        duration: "00:00:00",
        durationStyle: {
          color: "black",
          backgroundColor: "rgba(231, 231, 231, 1)",
        },
        hoursDecimal: 0,
      };
    });

  const { duration, durationStyle, hoursDecimal } = durationData;

  // Flag color logic — same as in the Kanban list view
  const getFlagColor = (hours: number, progress_id: number): string => {
    if (hours == null || isNaN(hours) || hours < 0) return "#ECCF28";

    if (progress_id === 7) {
      // Quotations
      if (hours <= 1) return "#ECCF28";
      if (hours <= 3) return "rgba(255, 153, 36, 1)";
      return "rgba(250, 52, 52, 1)";
    }

    if (progress_id === 14) {
      // Pending Payments
      if (hours <= 0.333) return "#ECCF28"; // ≤ ~20 min
      if (hours <= 0.5) return "rgba(255, 153, 36, 1)";
      return "rgba(250, 52, 52, 1)";
    }

    if (progress_id === 17) {
      // Awaiting Delivery
      if (hours <= 4) return "#ECCF28";
      if (hours <= 14) return "rgba(255, 153, 36, 1)";
      return "rgba(250, 52, 52, 1)";
    }

    // Default fallback
    if (hours <= 2) return "#ECCF28";
    if (hours <= 12) return "rgba(255, 153, 36, 1)";
    return "rgba(250, 52, 52, 1)";
  };

  // Darker version of the flag color for readable priority text
  const getDarkerPriorityColor = (color: string): string => {
    // Hard-coded darker shades for reliability and readability
    if (color === "#ECCF28" || color.includes("236, 207, 40")) {
      return "#B8860B"; // dark gold/yellow
    }
    if (color.includes("255, 153, 36")) {
      return "#C45A00"; // dark orange
    }
    if (color.includes("250, 52, 52")) {
      return "#B91C1C"; // dark red
    }
    return "#374151"; // very dark gray fallback
  };

  // Priority label (using the same logic as before – can be made stage-specific later if needed)
  const getPriorityLabel = (hours: number): string => {
    if (hours == null || isNaN(hours) || hours < 0) return "MEDIUM";
    if (hours <= 0.5) return "MEDIUM";
    if (hours <= 2) return "HIGH";
    return "CRITICAL";
  };

  const isCompleted =
    mrHeader.progress_name === "Completed" || mrHeader.progress_id === 25;

  const required = new Date(mrHeader.required_date);
  const today = new Date();
  required.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  let daysLeftText = "";
  if (diffDays > 0) {
    daysLeftText = `${diffDays}${diffDays === 1 ? "d" : "d"} left`;
  } else if (diffDays === 0) {
    daysLeftText = "Due today";
  } else {
    daysLeftText = `${Math.abs(diffDays)}${Math.abs(diffDays) === 1 ? "d" : "d"} overdue`;
  }

  let daysLeftStyle = {
    backgroundColor: "rgba(231, 231, 231, 1)",
    color: "black",
  };

  if (diffDays < 0) {
    daysLeftStyle = { backgroundColor: "rgba(175, 61, 61, 1)", color: "white" };
  } else if (diffDays <= 1) {
    daysLeftStyle = {
      backgroundColor: "rgba(255, 181, 181, 1)",
      color: "rgba(248, 77, 77, 1)",
    };
  } else if (diffDays <= 3) {
    daysLeftStyle = {
      backgroundColor: "rgba(255, 250, 189, 1)",
      color: "rgba(134, 83, 47, 1)",
    };
  }

  const calculateDaysLeft = (dateString: string) => {
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    const days = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let text = "";
    if (days > 0) text = `${days}${days === 1 ? "d" : "d"} left`;
    else if (days === 0) text = "DUE TODAY";
    else text = `${Math.abs(days)}${Math.abs(days) === 1 ? "d" : "d"} OVERDUE`;

    let style = { backgroundColor: "rgba(231, 231, 231, 1)", color: "black" };
    if (days < 0)
      style = { backgroundColor: "rgba(175, 61, 61, 1)", color: "white" };
    else if (days <= 1)
      style = {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    else if (days <= 3)
      style = {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };

    return { text, style };
  };

  const isRejected = ["reject", "fail"].some((word) =>
    mrHeader.progress_name?.toLowerCase().includes(word),
  );

  const progressStyle = isRejected
    ? {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      }
    : isCompleted
      ? {
          backgroundColor: "rgba(87, 244, 176, 1)",
          color: "rgba(31, 101, 71, 1)",
        }
      : {
          backgroundColor: "rgba(255, 250, 189, 1)",
          color: "rgba(134, 83, 47, 1)",
        };

  // Priority color & label
  const priorityColor = getFlagColor(hoursDecimal, mrHeader.progress_id);
  const darkerTextColor = getDarkerPriorityColor(priorityColor);
  const priorityLabel = getPriorityLabel(hoursDecimal);

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>
          <a href="/mr">MATERIAL REQUISITIONS</a> &gt; MR-
          {String(mrHeader.id).padStart(5, "0")}
        </h1>

        {mrHeader?.progress_id !== 1 && mrHeader.progress_id !== 25 && (
          <CancelMaterialRequestButton
            mrHeader={mrHeader}
            bgColor="rgba(248, 77, 77, 1)"
            borderColor="rgba(248, 77, 77, 1)"
            textColor="white"
            currentProgressId={mrHeader.progress_id}
          >
            ROLL BACK MATERIAL REQUEST <img src={uTurnIcon} alt="u-turn" />
          </CancelMaterialRequestButton>
        )}
      </div>

      <br />

      <div className="mr-with-id">
        <div className="top">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
              <div>
                <small>MR ID</small>
                <h2>MR-{String(id).padStart(5, "0")}</h2>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <p
                  className="approval-pill normal-text"
                  style={{ ...progressStyle, textTransform: "uppercase" }}
                >
                  {mrHeader.progress_name}
                </p>
              </div>

              {mrHeader.progress_id !== 1 && mrHeader.progress_id !== 25 && (
                <div
                  className="approval-pill normal-text centered"
                  style={{
                    backgroundColor: "white",
                    color: darkerTextColor, // darker for readability
                    border: "1px solid rgba(207, 207, 207, 1)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg
                    width="13"
                    height="15"
                    viewBox="0 0 15 17"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 17V0H9L9.4 2H15V12H8L7.6 10H2V17H0Z"
                      fill={priorityColor} // flag keeps original brightness
                    />
                  </svg>
                  <span>PRIORITY: {priorityLabel}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <EditMrHeaderButton mrHeader={mrHeader} />
              <DeleteMrHeaderButton mrHeader={mrHeader} />
            </div>
          </div>
        </div>

        <br />
        <br />

        <div className="bottom">
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div>
              <small>PROJECT</small>
              <h2 style={{ textWrap: "nowrap" }}>
                {mrHeader.project_name || "-"}
              </h2>
            </div>

            {mrHeader.project_name && (
              <Button
                componentType="link"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="rgba(223, 223, 223, 1)"
                textColor="black"
                href={`/project/${mrHeader.project_id}`}
                style={{ padding: "7px 7px" }}
              >
                <img src={externalLinkIcon} alt="external link" />
              </Button>
            )}
          </div>

          <div>
            <small>PURPOSE</small>
            <h2 style={{ textWrap: "nowrap" }}>{mrHeader.purpose_name}</h2>
          </div>

          <div>
            <small style={{ textWrap: "nowrap" }}>REQUESTED BY</small>
            <h2 style={{ textWrap: "nowrap" }}>
              {mrHeader.requested_by || ""}
            </h2>
          </div>

          <div>
            <small>DEPARTMENT</small>
            <h2>{mrHeader.department_name}</h2>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <div>
              <small style={{ textWrap: "nowrap" }}>REQUIRED DATE</small>
              <h2>
                {new Date(mrHeader.required_date).toLocaleDateString("en-US")}
              </h2>
            </div>

            {!isCompleted && (
              <div>
                <h2
                  className="approval-pill normal-text"
                  style={{
                    ...daysLeftStyle,
                    padding: "4px 10px",
                    borderRadius: "50px",
                    fontSize: "11px",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}
                >
                  {daysLeftText}
                </h2>
              </div>
            )}
          </div>

          {mrHeader.progress_id !== 1 && mrHeader.progress_id !== 25 && (
            <div>
              <small>CURRENT PROGRESS DURATION</small>
              <div
                style={{
                  padding: "4px 8px",
                  borderRadius: "50px",
                  fontSize: "11px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  backgroundColor: "rgba(234, 234, 234, 1)",
                  color: "rgba(89, 89, 89, 1)",
                  width: "fit-content",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: "rgba(89, 89, 89, 1)" }}
                >
                  <path
                    d="M5.5 2.5V5.5H8.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5.5 10.5C8.2615 10.5 10.5 8.2615 10.5 5.5C10.5 2.7385 8.2615 0.5 5.5 0.5C2.7385 0.5 0.5 2.7385 0.5 5.5C0.5 8.2615 2.7385 10.5 5.5 10.5Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {duration}
              </div>
            </div>
          )}
        </div>

        {mrHeader?.progress_id === 17 && (
          <>
            <br />
            <br />
            <div className="bottom">
              {deliveryDates?.length > 0 && (
                <>
                  {deliveryDates.map((delivery: any, index: number) => {
                    const { text, style } = calculateDaysLeft(
                      delivery.delivery_date,
                    );
                    return (
                      <div key={index} style={{ display: "flex", gap: "10px" }}>
                        <div>
                          <small style={{ textWrap: "nowrap" }}>
                            {delivery.supplier_name.toUpperCase()} DELIVERY DATE
                          </small>
                          <h2>
                            {new Date(
                              delivery.delivery_date,
                            ).toLocaleDateString("en-US")}
                          </h2>
                        </div>
                        {!isCompleted && (
                          <div>
                            <h2
                              className="approval-pill normal-text"
                              style={{
                                ...style,
                                borderRadius: "5px",
                                textWrap: "nowrap",
                              }}
                            >
                              {text}
                            </h2>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <br />
      <br />

      {mrLines && Object.keys(mrLines).length > 0 ? (
        <MrLinesView mrLines={mrLines} mrHeader={mrHeader} />
      ) : (
        <CreateMrLineClient
          mrHeaderID={mrHeader.id}
          projectID={mrHeader.project_id}
          projectName={mrHeader.project_name}
          purposeID={mrHeader.purpose_id}
        />
      )}
    </div>
  );
}
