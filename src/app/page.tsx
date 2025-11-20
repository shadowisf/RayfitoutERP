import CustomSelect from "./components/CustomSelect";

export default async function Home() {
  const file_icon = "/icons/file.svg";

  // Fetch projects from your API
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
    { cache: "no-store" } // ensures fresh data always
  );

  const projects = await res.json();

  return (
    <main className="dashboard">
      <p>OVERVIEW</p>
      <br />

      <div className="widget-grid overview">
        <div className="item">
          <div className="icon">
            <img src={file_icon} alt="file icon" />
          </div>
          <div>
            <p className="number">17</p>
            <p className="label">TOTAL MRS THIS WEEK</p>
          </div>
        </div>
        <div className="item">
          <div className="icon">
            <img src={file_icon} alt="file icon" />
          </div>
          <div>
            <p className="number">17</p>
            <p className="label">TOTAL MRS THIS WEEK</p>
          </div>
        </div>
        <div className="item">
          <div className="icon">
            <img src={file_icon} alt="file icon" />
          </div>
          <div>
            <p className="number">17</p>
            <p className="label">TOTAL MRS THIS WEEK</p>
          </div>
        </div>
        <div className="item">
          <div className="icon">
            <img src={file_icon} alt="file icon" />
          </div>
          <div>
            <p className="number">17</p>
            <p className="label">TOTAL MRS THIS WEEK</p>
          </div>
        </div>
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />

      <p>ACTIVE PROJECTS</p>
      <br />

      <div className="widget-grid active-projects">
        {projects.map((proj: any) => (
          <div className="item" key={proj.id}>
            <span
              className="status"
              style={
                proj.status === "Completed"
                  ? {
                      backgroundColor: "rgba(134, 241, 181, 1)",
                      color: "rgba(52, 100, 73, 1)",
                    }
                  : {
                      backgroundColor: "rgba(255, 244, 93, 1)",
                      color: "rgba(132, 107, 26, 1)",
                    }
              }
            >
              {proj.status === "Completed" ? "COMPLETED" : "ONGOING"}
            </span>

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
        ))}
      </div>
    </main>
  );
}
