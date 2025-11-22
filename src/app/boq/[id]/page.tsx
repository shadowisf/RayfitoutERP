import CreateBoqClient from "./components/CreateBoqHeaderClient";
import CreateBoqLineClient from "./components/CreateBoqLineClient";

export default async function Boq({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqHeaderByProjectID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    }
  )
    .then((res) => res.json())
    .then((data) => {
      return data && data.length > 0;
    })
    .catch((err) => {
      console.error(err);
    });

  return (
    <main>
      {data ? (
        <CreateBoqLineClient boqHeaderID={id} />
      ) : (
        <CreateBoqClient projectID={id} />
      )}
    </main>
  );
}
