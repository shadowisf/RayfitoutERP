import Button from "@/app/components/Button";
import { EditProjectButton } from "./components/_EditProjectButton";
import { Project } from "./types/project";
import { DeleteProjectButton } from "./components/_DeleteProjectButton";

export default async function ProjectWithID({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const externalLinkIcon = "/icons/external-link.svg";

  const project: Project = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getProjectByID`,
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
      <h2>
        <a href="/project">PROJECTS</a> &gt; {project?.name.toUpperCase()}
      </h2>

      <br />
      <br />

      <div className="project-with-id">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "rgba(227, 219, 219, 1) 1px solid",
            paddingBottom: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "25px",
              textTransform: "uppercase",
            }}
          >
            <div>
              <small>NAME</small>
              <h2>{project.name}</h2>
            </div>

            <Button
              componentType={"link"}
              bgColor={"transparent"}
              borderColor={"rgba(207, 207, 207, 1)"}
              textColor={"black"}
              style={{ borderRadius: "50px" }}
              href={`/boq/${project.id}`}
            >
              BOQ <img src={externalLinkIcon} alt="external link" />
            </Button>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <EditProjectButton project={project} />
            <DeleteProjectButton project={project} />
          </div>
        </div>

        <br />
        <br />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: "25px",
            textTransform: "uppercase",
          }}
        >
          <div>
            <small>ID</small>
            <h2>RAY-{String(project.id).padStart(5, "0")}</h2>
          </div>

          <div>
            <small>SIZE</small>
            <h2>{project.size.toLocaleString("en-US")} SQFT</h2>
          </div>

          <div>
            <small>STATUS</small>
            <div
              className="approval-pill normal-text"
              style={{
                background: project.status.toLowerCase().includes("completed")
                  ? "rgba(134,241,181,1)"
                  : "rgba(255, 250, 189, 1)",
                color: project.status.toLowerCase().includes("completed")
                  ? "rgba(52,100,73,1)"
                  : "rgba(134, 83, 47, 1)",
              }}
            >
              {project.status}
            </div>
          </div>

          <div>
            <small>TYPE OF WORK</small>
            <h2 style={{ textWrap: "nowrap" }}>
              {project.type_of_work || "-"}
            </h2>
          </div>

          <div>
            <small>QUOTED PRICE</small>
            <h2>
              {project.quoted_budget
                ? `AED ${Number(project.quoted_budget).toLocaleString("en-US")}`
                : "-"}
            </h2>
          </div>

          <div>
            <small>ALLOCATED BUDGET</small>
            <h2>
              {project.allocated_budget
                ? `AED ${Number(project.allocated_budget).toLocaleString(
                    "en-US"
                  )}`
                : "-"}
            </h2>
          </div>

          <div>
            <small>START DATE</small>
            <h2>
              {project.start_date
                ? new Date(project.start_date).toLocaleDateString("en-US")
                : "-"}
            </h2>
          </div>

          <div>
            <small>END DATE</small>
            <h2>
              {project.end_date
                ? new Date(project.end_date).toLocaleDateString("en-US")
                : "-"}
            </h2>
          </div>
        </div>

        <br />
        <br />

        <div style={{ textTransform: "uppercase" }}>
          <small>SCOPE</small>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {project.scope?.split(",").map((item: string, index: number) => (
              <h2
                key={index}
                className=""
                style={{
                  padding: "4px 10px",
                  backgroundColor: "rgba(225, 225, 225, 1)",
                  borderRadius: "5px",
                  color: "black",
                }}
              >
                {item.trim()}
              </h2>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
