import Button from "@/app/components/Button";
import LpoLinesView from "./components/LpoLinesView";
import { MrHeader } from "../../types/mrHeader";
import DeleteLpoHeaderButton from "./components/_DeleteLpoHeaderButton";
import CancelMaterialRequestButton from "../../components/_CancelMaterialRequest";
import RequisitionTimeline from "../../components/RequisitionTimeline";
import DownloadCompletedMrLpoPDFButton from "./components/_DownloadCompletedMrLpoPDFButton";

export default async function LpoWithID({
  params,
}: {
  params: Promise<{ id: string; lpoId: string }>;
}) {
  const { id, lpoId } = await params;

  const externalLinkIcon = "/icons/external-link.svg";

  // Fetch MR header (still needed for department_id, project, etc.)
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

  // Fetch LPO with its lines
  const lpoData = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOWithLines`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lpo_id: lpoId }),
    },
  )
    .then((res) => res.json())
    .then((data) => (data.success ? data.data : null))
    .catch((err) => {
      console.error("Error fetching LPO data:", err);
      return null;
    });

  if (!lpoData) {
    return (
      <div className="dashboard">
        <h1>
          <a href="/mr">MATERIAL REQUISITIONS</a> &gt; MR-
          {String(id).padStart(5, "0")} &gt; LPO Not Found
        </h1>
        <br />
        <p>This LPO could not be found.</p>
      </div>
    );
  }

  const lpo = lpoData.lpo;
  const lpoLines = lpoData.lines;

  // Fetch LPO-specific progress duration
  const durationData = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getProgressDuration`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lpo_id: lpoId,
        progress_id: lpo.progress_id,
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

  // Flag color logic
  const getFlagColor = (hours: number, progress_id: number): string => {
    if (hours == null || isNaN(hours) || hours < 0) return "#ECCF28";

    if (progress_id === 14) {
      if (hours <= 0.333) return "#ECCF28";
      if (hours <= 0.5) return "rgba(255, 153, 36, 1)";
      return "rgba(250, 52, 52, 1)";
    }

    if (progress_id === 17) {
      if (hours <= 4) return "#ECCF28";
      if (hours <= 14) return "rgba(255, 153, 36, 1)";
      return "rgba(250, 52, 52, 1)";
    }

    if (hours <= 2) return "#ECCF28";
    if (hours <= 12) return "rgba(255, 153, 36, 1)";
    return "rgba(250, 52, 52, 1)";
  };

  const getDarkerPriorityColor = (color: string): string => {
    if (color === "#ECCF28" || color.includes("236, 207, 40")) {
      return "#B8860B";
    }
    if (color.includes("255, 153, 36")) {
      return "#C45A00";
    }
    if (color.includes("250, 52, 52")) {
      return "#B91C1C";
    }
    return "#374151";
  };

  const getPriorityLabel = (hours: number): string => {
    if (hours == null || isNaN(hours) || hours < 0) return "MEDIUM";
    if (hours <= 0.5) return "MEDIUM";
    if (hours <= 2) return "HIGH";
    return "CRITICAL";
  };

  const isCompleted =
    lpo.progress_name === "Completed" || lpo.progress_id === 25;

  const isRejected = ["reject", "fail"].some((word) =>
    lpo.progress_name?.toLowerCase().includes(word),
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

  const priorityColor = getFlagColor(hoursDecimal, lpo.progress_id);
  const darkerTextColor = getDarkerPriorityColor(priorityColor);
  const priorityLabel = getPriorityLabel(hoursDecimal);

  // Required date days left calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let requiredDaysLeftText = "";
  let requiredDaysLeftStyle = {
    backgroundColor: "rgba(231, 231, 231, 1)",
    color: "black",
  };

  if (mrHeader.required_date) {
    const requiredDate = new Date(mrHeader.required_date);
    requiredDate.setHours(0, 0, 0, 0);
    const reqDiffDays = Math.ceil(
      (requiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (reqDiffDays > 0) {
      requiredDaysLeftText = `${reqDiffDays}d left`;
    } else if (reqDiffDays === 0) {
      requiredDaysLeftText = "Due today";
    } else {
      requiredDaysLeftText = `${Math.abs(reqDiffDays)}d overdue`;
    }

    if (reqDiffDays < 0) {
      requiredDaysLeftStyle = {
        backgroundColor: "rgba(175, 61, 61, 1)",
        color: "white",
      };
    } else if (reqDiffDays <= 1) {
      requiredDaysLeftStyle = {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    } else if (reqDiffDays <= 3) {
      requiredDaysLeftStyle = {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    }
  }

  // Delivery date days left calculation

  let deliveryDaysLeftText = "";
  let deliveryDaysLeftStyle = {
    backgroundColor: "rgba(231, 231, 231, 1)",
    color: "black",
  };

  if (lpo.delivery_date) {
    const deliveryDate = new Date(lpo.delivery_date);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > 0) {
      deliveryDaysLeftText = `${diffDays}d left`;
    } else if (diffDays === 0) {
      deliveryDaysLeftText = "Due today";
    } else {
      deliveryDaysLeftText = `${Math.abs(diffDays)}d overdue`;
    }

    if (diffDays < 0) {
      deliveryDaysLeftStyle = {
        backgroundColor: "rgba(175, 61, 61, 1)",
        color: "white",
      };
    } else if (diffDays <= 1) {
      deliveryDaysLeftStyle = {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    } else if (diffDays <= 3) {
      deliveryDaysLeftStyle = {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    }
  }

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
          <a href="/mr">REQUISITIONS</a> &gt; MR-
          {String(id).padStart(5, "0")} &gt; LPO-
          {String(lpoId).padStart(5, "0")}
        </h1>

        {lpo.progress_id === 25 && (
          <DownloadCompletedMrLpoPDFButton
            mrHeader={mrHeader}
            lpo={lpo}
            flatLines={lpoData.flatLines}
          />
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div
                style={{ display: "flex", gap: "25px", alignItems: "center" }}
              >
                <div>
                  <small>MR ID</small>
                  <h2>MR-{String(id).padStart(5, "0")}</h2>
                </div>

                <div>
                  <small>LPO ID</small>
                  <h2>LPO-{String(lpoId).padStart(5, "0")}</h2>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <p
                    className="approval-pill normal-text"
                    style={{ ...progressStyle, textTransform: "uppercase" }}
                  >
                    {lpo.progress_name}
                  </p>
                </div>

                {!isCompleted && (
                  <div
                    className="approval-pill normal-text centered"
                    style={{
                      backgroundColor: "white",
                      color: darkerTextColor,
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
                        fill={priorityColor}
                      />
                    </svg>
                    <span>PRIORITY: {priorityLabel}</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                {!isCompleted && (
                  <CancelMaterialRequestButton
                    mrHeader={mrHeader}
                    currentProgressId={lpo.progress_id}
                    lpoId={lpo.id}
                  >
                    Roll Back
                  </CancelMaterialRequestButton>
                )}
                <DeleteLpoHeaderButton mrHeader={mrHeader} LpoHeader={lpo} />
              </div>
            </div>
          </div>
        </div>

        <br />
        <br />

        <div className="bottom">
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div>
              <small>PROJECT</small>
              <h2>{mrHeader.project_name || "-"}</h2>
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
            <h2>{mrHeader.purpose_name}</h2>
          </div>

          <div>
            <small>REQUESTED BY</small>
            <h2>{mrHeader.requested_by || ""}</h2>
          </div>

          <div>
            <small>DEPARTMENT</small>
            <h2>{mrHeader.department_name}</h2>
          </div>

          {mrHeader.required_date && (
            <div
              style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}
            >
              <div>
                <small>REQUIRED DATE</small>
                <h2>
                  {new Date(mrHeader.required_date).toLocaleDateString("en-GB")}
                </h2>
              </div>

              {!isCompleted && (
                <div>
                  <h2
                    className="approval-pill normal-text"
                    style={{
                      ...requiredDaysLeftStyle,
                      padding: "4px 10px",
                      borderRadius: "50px",
                      fontSize: "11px",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {requiredDaysLeftText}
                  </h2>
                </div>
              )}
            </div>
          )}

          {lpo.delivery_date &&
            (mrHeader.progress_id === 17 || lpo.progress_id === 17) && (
              <div
                style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}
              >
                <div>
                  <small>DELIVERY DATE</small>
                  <h2>
                    {new Date(lpo.delivery_date).toLocaleDateString("en-GB")}
                  </h2>
                </div>

                {!isCompleted && (
                  <div>
                    <h2
                      className="approval-pill normal-text"
                      style={{
                        ...deliveryDaysLeftStyle,
                        padding: "4px 10px",
                        borderRadius: "50px",
                        fontSize: "11px",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {deliveryDaysLeftText}
                    </h2>
                  </div>
                )}
              </div>
            )}

          {!isCompleted && (
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
      </div>

      <br />
      <br />

      <RequisitionTimeline
        mrHeaderId={Number(id)}
        currentProgressId={lpo.progress_id}
        lpoId={Number(lpoId)}
      />

      <br />
      <br />

      {lpoLines && Object.keys(lpoLines).length > 0 ? (
        <LpoLinesView
          lpoLines={lpoLines}
          lpo={lpoData.lpo}
          flatLines={lpoData.flatLines}
          mrHeader={mrHeader}
          refreshKey={Date.now()}
        />
      ) : (
        <p>No lines found for this LPO.</p>
      )}
    </div>
  );
}
