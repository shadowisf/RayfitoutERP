import Button from "./Button";

type ProjectBoxProps = {
  proj: any;
};

export default function ProjectBox({ proj }: ProjectBoxProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  // Calculate progress percentage (spent / budget * 100)
  const progressPercentage =
    proj.quoted_budget > 0
      ? Math.min(((proj.allocated_budget || 0) / proj.quoted_budget) * 100, 100)
      : 0;

  return (
    <div className="item" key={proj.id}>
      <span
        className="status"
        style={
          proj.status === "Completed"
            ? {
                backgroundColor: "rgba(134,241,181,1)",
                color: "rgba(52,100,73,1)",
              }
            : {
                backgroundColor: "rgba(255, 250, 189, 1)",
                color: "rgba(134, 83, 47, 1)",
              }
        }
      >
        {proj.status === "Completed" ? "COMPLETED" : "ONGOING"}
      </span>

      <div>
        <small>NAME</small>
        <h2>{proj.name}</h2>

        <br />

        <small>BUDGET</small>
        <h2>
          AED{" "}
          {Number(proj.quoted_budget).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </h2>

        <br />

        <small>PROGRESS</small>

        {/* Progress Bar */}
        <div style={{ marginTop: "10px" }}>
          <div
            style={{
              width: "100%",
              height: "25px",
              backgroundColor: "rgba(238, 238, 238, 1)",
              borderRadius: "25px",
              overflow: "visible",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${progressPercentage}%`,
                height: "100%",
                backgroundColor: "rgba(26, 216, 135, 1)",
                borderRadius: "25px",
                transition: "width 0.3s ease",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  right: progressPercentage === 0 ? "auto" : "10px",
                  left: progressPercentage === 0 ? "50%" : "auto",
                  transform:
                    progressPercentage === 0
                      ? "translate(-50%, -50%)"
                      : "translateY(-50%)",
                  fontWeight: "bold",
                  color: progressPercentage === 0 ? "black" : "white",
                  whiteSpace: "nowrap",
                }}
              >
                {progressPercentage.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "10px",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "rgba(26, 216, 135, 1)",
                  borderRadius: "50%",
                }}
              />
              <small style={{ color: "black" }}>SPENT</small>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "rgba(238, 238, 238, 1)",
                  borderRadius: "50%",
                }}
              />
              <small style={{ color: "black" }}>BUDGET</small>
            </div>
          </div>
        </div>
      </div>

      <br />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "5px" }}>
          <Button
            componentType={"link"}
            bgColor={"transparent"}
            borderColor={"rgba(223, 223, 223, 1)"}
            textColor={"black"}
            href={`boq/${proj.id}`}
            style={{ borderRadius: "50px" }}
          >
            <>
              BOQ
              <img src={externalLinkIcon} alt="external link icon" />
            </>
          </Button>
          <Button
            componentType={"link"}
            bgColor={"transparent"}
            borderColor={"rgba(223, 223, 223, 1)"}
            textColor={"black"}
            href={``}
            style={{ borderRadius: "50px" }}
          >
            <>
              MRs
              <img src={externalLinkIcon} alt="external link icon" />
            </>
          </Button>
        </div>

        <Button
          componentType={"link"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          href={`project/${proj.id}`}
          style={{
            width: "125px",
            display: "flex",
            justifyContent: "space-between",
            borderRadius: "50px",
          }}
        >
          <p>VIEW</p>
          <p>&gt;</p>
        </Button>
      </div>
    </div>
  );
}
