import CreateMrLineClient from "./components/CreateMrLine";
import MrLinesView from "./components/MrLinesView";

export default async function MrWithID({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const externalLinkIcon = "/icons/external-link.svg";

  const mrHeader = await fetch(
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

  return (
    <div className="dashboard">
      <div className="mr-with-id">
        <div className="top">
          <div>
            <span>MR NUMBER</span>
            <h2>MR-{String(id).padStart(3, "0")}</h2>
          </div>

          <p
            className="status"
            style={{
              backgroundColor: "rgba(255,244,93,1)",
              color: "rgba(132,107,26,1)",
            }}
          >
            {mrHeader.progress_name}
          </p>

          <p
            className="status"
            style={{
              backgroundColor: "rgba(255, 181, 181, 1)",
              color: "rgba(248, 77, 77, 1)",
            }}
          >
            {mrHeader.priority}
          </p>
        </div>

        <div className="bottom">
          <div>
            <span>PROJECT</span>
            <h2>
              {mrHeader.project_name}{" "}
              <a href={`/project/${mrHeader.project_id}`}>
                <img
                  src={externalLinkIcon}
                  alt="external link icon"
                />
              </a>
            </h2>
          </div>

          <div>
            <span>PURPOSE</span>
            <h2>{mrHeader.purpose_name}</h2>
          </div>

          <div>
            <span>REQUESTED BY</span>
            <h2>{mrHeader.requested_by}</h2>
          </div>

          <div>
            <span>DEPARTMENT</span>
            <h2>{mrHeader.department_name}</h2>
          </div>

          <div>
            <span>REQUIRED DATE</span>
            <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
              <h2>{new Date(mrHeader.required_date).toLocaleDateString()}</h2>
              <h2
                style={{
                  padding: "5px 15px",
                  backgroundColor: "rgba(231, 231, 231, 1)",
                  textTransform: "uppercase",
                  borderRadius: "5px",
                }}
              >
                {(() => {
                  const required = new Date(mrHeader.required_date);
                  const today = new Date();
                  required.setHours(0, 0, 0, 0);
                  today.setHours(0, 0, 0, 0);
                  const diffDays = Math.ceil(
                    (required.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  if (diffDays > 0) {
                    return `${diffDays} ${
                      diffDays === 1 ? "DAY" : "DAYS"
                    } LEFT`;
                  } else if (diffDays === 0) {
                    return "DUE TODAY";
                  } else {
                    return `${Math.abs(diffDays)} ${
                      Math.abs(diffDays) === 1 ? "DAY" : "DAYS"
                    } OVERDUE`;
                  }
                })()}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <br />
      <br />

      {mrLines && Object.keys(mrLines).length > 0 ? (
        <MrLinesView
          mrLines={mrLines}
          mrHeader={mrHeader}
        />
      ) : (
        <CreateMrLineClient
          mrHeaderID={mrHeader.id}
          projectID={mrHeader.project_id}
        />
      )}
    </div>
  );
}
