import FinanceView from "./components/FinanceView";

export default async function FinancePage({
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
      body: JSON.stringify({ id }),
      cache: "no-store",
    },
  )
    .then((r) => r.json())
    .then((data) => data ?? null)
    .catch(() => null);

  return (
    <FinanceView projectId={id} projectName={project?.name ?? "Project"} />
  );
}
