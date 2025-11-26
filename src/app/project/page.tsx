import Button from "../components/Button";

export default async function Project() {
  const external_link_icon = "/icons/external-link.svg";

  const projects = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
    { cache: "no-store" }
  ).then((res) => res.json());

  const projectsWithBOQ = await Promise.all(
    projects.map(async (proj: any) => {
      const boq = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqHeaderByProjectID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: proj.id }),
          cache: "no-store",
        }
      )
        .then((res) => res.json())
        .catch(() => []);

      return {
        ...proj,
        hasBOQ: boq && boq.length > 0,
      };
    })
  );

  return (
    <main className="dashboard">
      <h2>ACTIVE PROJECTS</h2>
      <br />

      <div className="widget-grid active-projects">
        {projectsWithBOQ.map((proj: any) => (
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
                      backgroundColor: "rgba(255,244,93,1)",
                      color: "rgba(132,107,26,1)",
                    }
              }
            >
              {proj.status === "Completed" ? "COMPLETED" : "ONGOING"}
            </span>

            <div>
              <div>
                <span>Name</span>
                <p>{proj.name}</p>
              </div>

              <br />

              <div>
                <span>Budget</span>
                <p>
                  AED{" "}
                  {Number(proj.quoted_budget).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <br />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button
                componentType={"link"}
                bgColor={"rgba(239, 239, 239, 1)"}
                borderColor={"rgba(223, 223, 223, 1)"}
                textColor={"black"}
                href={`boq/${proj.id}`}
                full={false}
              >
                <>
                  {proj.hasBOQ ? "VIEW BOQ" : "CREATE BOQ"}
                  <img src={external_link_icon} alt="external link icon" />
                </>
              </Button>

              <Button
                componentType={"link"}
                bgColor={"black"}
                borderColor={"black)"}
                textColor={"white"}
                full={false}
                href={`project/${proj.id}`}
              >
                {`VIEW`}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
