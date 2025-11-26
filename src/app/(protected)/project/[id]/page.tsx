export default async function ProjectWithID({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await fetch(
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
    <main className="dashboard">
      <h2>PROJECTS</h2>

      <br />
      <br />
      <br />

      <div className="project-with-id">
        <div>
          <span>CODE</span>
          <h2>RAY-{project.id}</h2>

          <br />

          <span>NAME</span>
          <h2>{project.name}</h2>

          <br />

          <span>STATUS</span>
          <p
            className="status"
            style={
              project.status === "Completed"
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
            {project.status === "Completed" ? "COMPLETED" : "ONGOING"}
          </p>
        </div>

        <div>
            
        </div>
      </div>
    </main>
  );
}
