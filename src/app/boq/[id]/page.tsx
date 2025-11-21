import BoqClient from "./components/BoqClient";

export default async function Boq({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <BoqClient project_id={id} />
    </>
  );
}
