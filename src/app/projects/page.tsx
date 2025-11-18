import AddProjectForm from "./components/AddProjectForm";

type Project = {
  id: number;
  name: string;
  status: string;
  type: string;
  quoted_budget: number;
  allocated_budget: number;
  property_type: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type BillOfQuantity = {
  id: number;
  project_id: number;

}

export default async function ProjectsPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }

  const projects: Project[] = await res.json();

  return (
    <>
      <div>
        <h1>Projects</h1>

        <AddProjectForm />

        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              {[
                p.name,
                p.status,
                p.type,
                p.quoted_budget.toLocaleString("en-AE", {
                  style: "currency",
                  currency: "AED",
                }),
                p.allocated_budget.toLocaleString("en-AE", {
                  style: "currency",
                  currency: "AED",
                }),
                p.property_type,
                p.start_date
                  ? new Date(p.start_date).toLocaleDateString("en-US")
                  : "N/A",
                p.end_date
                  ? new Date(p.end_date).toLocaleDateString("en-US")
                  : "N/A",
              ].join(", ")}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h1>Bill of Quantity</h1>

        <ul>
          
        </ul>
      </div>
    </>
  );
}
