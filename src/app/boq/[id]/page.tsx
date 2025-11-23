import BoqLinesView from "./components/BoqLinesView";
import CreateBoqHeaderClient from "./components/CreateBoqHeaderClient";
import CreateBoqLineClient from "./components/CreateBoqLineClient";

export default async function Boq({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const boqHeader = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqHeaderByProjectID`,
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

  const boqLines = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqLineByBoqID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boq_id: id }),
    }
  )
    .then((res) => res.json())
    .then((data) => {
      return data;
    })
    .catch((err) => console.error(err));

  return (
    <main>
      {boqHeader && boqHeader.length > 0 ? (
        boqLines && Object.keys(boqLines).length > 0 ? (
          <BoqLinesView boqLines={boqLines} boqHeaderID={id} />
        ) : (
          <CreateBoqLineClient boqHeaderID={id} />
        )
      ) : (
        <CreateBoqHeaderClient projectID={id} />
      )}
    </main>
  );
}
