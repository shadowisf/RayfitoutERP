import CreateMrLineClient from "./components/CreateMrLine";
import DeleteMrHeaderButton from "./components/department/_DeleteMrHeaderButton";
import EditMrHeaderButton from "./components/department/_EditMrHeaderButton";
import MrLinesView from "./components/MrLinesView";
import { MrHeader } from "./types/mrHeader";

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
    }
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
    }
  )
    .then((res) => res.json())
    .then((data) => {
      return data;
    })
    .catch((err) => {
      console.error(err);
    });

  // Check if MR is completed
  const isCompleted =
    mrHeader.progress_name === "Completed" || mrHeader.progress_id === 25;

  // Calculate days left and priority
  const required = new Date(mrHeader.required_date);
  const today = new Date();
  required.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine priority based on days left
  let priority = "";
  let priorityStyle = {
    backgroundColor: "",
    color: "",
  };

  if (diffDays < 0) {
    // Overdue
    priority = "CRITICAL";
    priorityStyle = {
      backgroundColor: "rgba(175, 61, 61, 1)",
      color: "white",
    };
  } else if (diffDays <= 1) {
    // Today or 1 day
    priority = "HIGH";
    priorityStyle = {
      backgroundColor: "rgba(255, 181, 181, 1)",
      color: "rgba(248, 77, 77, 1)",
    };
  } else if (diffDays <= 3) {
    // 2-3 days
    priority = "MEDIUM";
    priorityStyle = {
      backgroundColor: "rgba(255, 250, 189, 1)",
      color: "rgba(134, 83, 47, 1)",
    };
  } else {
    // More than 3 days
    priority = "LOW";
    priorityStyle = {
      backgroundColor: "rgba(87, 244, 176, 1)",
      color: "rgba(31, 101, 71, 1)",
    };
  }

  // Days left text
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

  // Days left style based on days left
  let daysLeftStyle = {
    backgroundColor: "",
    color: "",
  };

  if (diffDays < 0) {
    // Overdue - dark red (same as CRITICAL)
    daysLeftStyle = {
      backgroundColor: "rgba(175, 61, 61, 1)",
      color: "white",
    };
  } else if (diffDays <= 3) {
    // Due in 3 days or less - light red (same as HIGH)
    daysLeftStyle = {
      backgroundColor: "rgba(255, 181, 181, 1)",
      color: "rgba(248, 77, 77, 1)",
    };
  } else {
    // More than 3 days - yellow (same as MEDIUM)
    daysLeftStyle = {
      backgroundColor: "rgba(255, 250, 189, 1)",
      color: "rgba(134, 83, 47, 1)",
    };
  }

  const isRejected = ["reject", "fail"].some((word) =>
    mrHeader.progress_name?.toLowerCase().includes(word)
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
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "50px", alignItems: "center" }}>
              <div>
                <span>MATERIAL REQUEST ID</span>
                <h2>MR-{String(id).padStart(5, "0")}</h2>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <p className="status" style={progressStyle}>
                  {mrHeader.progress_name}
                </p>

                {/* Only show priority badge if NOT completed */}
                {!isCompleted && (
                  <p className="status" style={priorityStyle}>
                    {priority}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <EditMrHeaderButton mrHeader={mrHeader} />
              <DeleteMrHeaderButton mrHeader={mrHeader} />
            </div>
          </div>
        </div>

        <div className="bottom">
          <div>
            <span>PROJECT</span>
            <h2>
              {mrHeader.project_name ? (
                <div style={{ display: "flex", gap: "10px" }}>
                  {mrHeader.project_name}
                  <a href={`/project/${mrHeader.project_name}`}>
                    <img
                      src={externalLinkIcon}
                      alt="external link icon"
                      width={12}
                    />
                  </a>
                </div>
              ) : (
                "-"
              )}
            </h2>
          </div>

          <div>
            <span>PURPOSE</span>
            <h2>{mrHeader.purpose_name}</h2>
          </div>

          <div>
            <span>REQUESTED BY</span>
            <h2>{mrHeader.requested_by || ""}</h2>
          </div>

          <div>
            <span>DEPARTMENT</span>
            <h2>{mrHeader.department_name}</h2>
          </div>

          <div>
            <span>REQUIRED DATE</span>
            <h2>
              {new Date(mrHeader.required_date).toLocaleDateString("en-US")}
            </h2>
          </div>

          {/* Only show days left indicator if NOT completed */}
          {!isCompleted && (
            <div>
              <h2
                style={{
                  padding: "5px 15px",
                  backgroundColor: daysLeftStyle.backgroundColor,
                  color: daysLeftStyle.color,
                  textTransform: "uppercase",
                  borderRadius: "5px",
                }}
              >
                {daysLeftText}
              </h2>
            </div>
          )}
        </div>
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
