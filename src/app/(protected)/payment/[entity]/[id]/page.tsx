import PaymentDetailsClient from "./components/PaymentDetailsClient";

type Params = {
  entity: string;
  id: string;
};

export default async function PaymentDetailsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolvedParams = await params;
  const entity = resolvedParams.entity as "supplier" | "subcontractor";
  const id = Number(resolvedParams.id);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/details`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, id }),
      next: { revalidate: 0 },
    },
  );

  const data = await response.json();

  return <PaymentDetailsClient initialData={data} entity={entity} id={id} />;
}
