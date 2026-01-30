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

  const externalLinkIcon = "/icons/external-link.svg";

  const mrHeader: MrHeader = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    },
  )
    .then((res) => res.json())
    .then((data) => {
      return data;
    })
    .catch((err) => {
      console.error(err);
    });

  const mrLines = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrLinesByMrHeaderID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    },
  )
    .then((res) => res.json())
    .then((data) => {
      return data;
    })
    .catch((err) => {
      console.error(err);
    });

  // ✅ Fetch delivery dates by vendor
  const deliveryDates = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getDeliveryDatesByMrHeaderID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mr_header_id: id }),
    },
  )
    .then((res) => res.json())
    .then((data) => {
      return data.success ? data.delivery_dates : [];
    })
    .catch((err) => {
      console.error("Error fetching delivery dates:", err);
      return [];
    });

  const { duration, durationStyle } = await fetch(
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

      if (
        data &&
        data.hours_in_stage != null &&
        data.minutes_in_stage != null
      ) {
        hoursDecimal =
          Number(data.hours_in_stage) + Number(data.minutes_in_stage) / 60;
      }

      // Calculate hours and minutes separately
      const totalMinutes = Math.round(hoursDecimal * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      // Format as HHH:MMM
      const durationString = `${String(hours).padStart(2, "0")}H:${String(
        minutes,
      ).padStart(2, "0")}M`;

      // Set style based on thresholds (using total hours)
      let style = { color: "", backgroundColor: "" };

      if (hoursDecimal > 48) {
        style = {
          color: "white",
          backgroundColor: "rgba(175, 61, 61, 1)",
        };
      } else if (hoursDecimal >= 24 && hoursDecimal <= 48) {
        style = {
          color: "rgba(248, 77, 77, 1)",
          backgroundColor: "rgba(255, 181, 181, 1)",
        };
      } else if (hoursDecimal >= 12 && hoursDecimal <= 24) {
        style = {
          color: "rgba(134, 83, 47, 1)",
          backgroundColor: "rgba(255, 250, 189, 1)",
        };
      } else {
        style = {
          color: "black",
          backgroundColor: "rgba(231, 231, 231, 1)",
        };
      }

      return { duration: durationString, durationStyle: style };
    })
    .catch((err) => {
      console.error("Error fetching duration:", err);
      return {
        duration: "00H:00M",
        durationStyle: {
          color: "black",
          backgroundColor: "rgba(231, 231, 231, 1)",
        },
      };
    });

  // Check if MR is completed
  const isCompleted =
    mrHeader.progress_name === "Completed" || mrHeader.progress_id === 25;

  // Calculate days left for REQUIRED DATE
  const required = new Date(mrHeader.required_date);
  const today = new Date();
  required.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Days left text for REQUIRED DATE
  let daysLeftText = "";
  if (diffDays > 0) {
    daysLeftText = `${diffDays} ${diffDays === 1 ? "DAY" : "DAYS"} LEFT`;
  } else if (diffDays === 0) {
    daysLeftText = "DUE TODAY";
  } else {
    daysLeftText = `${Math.abs(diffDays)} ${
      Math.abs(diffDays) === 1 ? "DAY" : "DAYS"
    } OVERDUE`;
  }

  // Days left style for REQUIRED DATE
  let daysLeftStyle = {
    backgroundColor: "",
    color: "",
  };

  if (diffDays < 0) {
    daysLeftStyle = {
      backgroundColor: "rgba(175, 61, 61, 1)",
      color: "white",
    };
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
  } else {
    daysLeftStyle = {
      backgroundColor: "rgba(231, 231, 231, 1)",
      color: "black",
    };
  }

  // ✅ Helper function to calculate days left for any date
  const calculateDaysLeft = (dateString: string) => {
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let text = "";
    if (diffDays > 0) {
      text = `${diffDays} ${diffDays === 1 ? "DAY" : "DAYS"} LEFT`;
    } else if (diffDays === 0) {
      text = "DUE TODAY";
    } else {
      text = `${Math.abs(diffDays)} ${
        Math.abs(diffDays) === 1 ? "DAY" : "DAYS"
      } OVERDUE`;
    }

    let style = {
      backgroundColor: "",
      color: "",
    };

    if (diffDays < 0) {
      style = {
        backgroundColor: "rgba(175, 61, 61, 1)",
        color: "white",
      };
    } else if (diffDays <= 1) {
      style = {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    } else if (diffDays <= 3) {
      style = {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    } else {
      style = {
        backgroundColor: "rgba(231, 231, 231, 1)",
        color: "black",
      };
    }

    return { text, style };
  };

  const isRejected = ["reject", "fail"].some((word) =>
    mrHeader.progress_name?.toLowerCase().includes(word),
  );

  // Progress style based on status
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

  return (
    <div className="dashboard">
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
                <small>MATERIAL REQUEST ID</small>
                <h2>MR-{String(id).padStart(5, "0")}</h2>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <p className="status" style={progressStyle}>
                  {mrHeader.progress_name}
                </p>
              </div>

              {mrHeader.progress_id !== 1 && mrHeader.progress_id !== 25 && (
                <div>
                  <h2
                    className="approval-pill normal-text"
                    style={{
                      ...durationStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      borderRadius: "5px",
                      textWrap: "nowrap",
                      color: durationStyle.color,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 11 11"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ color: durationStyle.color }}
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
                  </h2>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {mrHeader?.progress_id >= 2 && mrHeader.progress_id <= 12 && (
                <CancelMaterialRequestButton
                  mrHeaderID={Number(id)}
                  bgColor="black"
                  borderColor="black"
                  textColor="white"
                >
                  ROLL BACK MATERIAL REQUEST
                </CancelMaterialRequestButton>
              )}

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
                componentType={"link"}
                bgColor={"rgba(239, 239, 239, 1)"}
                borderColor={"rgba(223, 223, 223, 1)"}
                textColor={"black"}
                href={`/project/${mrHeader.project_id}`}
                style={{ padding: "7px 7px" }}
              >
                <img src={externalLinkIcon} />
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

          <div style={{ display: "flex", gap: "10px" }}>
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
                    backgroundColor: daysLeftStyle.backgroundColor,
                    color: daysLeftStyle.color,
                    borderRadius: "5px",
                    textWrap: "nowrap",
                  }}
                >
                  {daysLeftText}
                </h2>
              </div>
            )}
          </div>
        </div>

        {mrHeader?.progress_id === 17 && (
          <>
            <br />
            <br />

            <div className="bottom">
              {/* ✅ Delivery Dates by Vendor */}
              {deliveryDates && deliveryDates.length > 0 && (
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
                                backgroundColor: style.backgroundColor,
                                color: style.color,
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
