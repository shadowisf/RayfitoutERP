import CreditSupplierPaymentClient from "./components/CreditSupplierPaymentClient";

export default async function CreditSupplierPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplierId = Number(id);

  // Fetch supplier name for breadcrumb
  let supplierName = `SUPPLIER-${String(id).padStart(5, "0")}`;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getSupplierByID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: supplierId }),
        cache: "no-store",
      },
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.name) supplierName = data.name.toUpperCase();
    }
  } catch {
    // fallback to default
  }

  return (
    <div className="dashboard">
      <h1 style={{ marginBottom: "25px" }}>
        <a href="/payment">PAYMENTS</a> &gt; CREDIT &gt; {supplierName}
      </h1>

      <CreditSupplierPaymentClient supplierId={supplierId} />
    </div>
  );
}
