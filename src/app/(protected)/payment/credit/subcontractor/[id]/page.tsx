import CreditSubcontractorPaymentClient from "./components/CreditSubcontractorPaymentClient";

export default async function CreditSubcontractorPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subcontractorId = Number(id);

  // Fetch subcontractor name for breadcrumb
  let subcontractorName = `SUB-${String(id).padStart(5, "0")}`;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor/getSubcontractorByID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subcontractorId }),
        cache: "no-store",
      },
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.name) subcontractorName = data.name.toUpperCase();
    }
  } catch {
    // fallback to default
  }

  return (
    <div className="dashboard">
      <h1 style={{ marginBottom: "25px" }}>
        <a href="/payment">PAYMENTS</a> &gt; SUBCONTRACTOR &gt; {subcontractorName}
      </h1>

      <CreditSubcontractorPaymentClient subcontractorId={subcontractorId} />
    </div>
  );
}
