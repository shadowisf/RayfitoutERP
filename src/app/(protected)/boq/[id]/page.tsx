import BoqLinesView from "./components/BoqLinesView";
import CreateBoqHeaderClient from "./components/CreateBoqHeader";
import CreateBoqLineClient from "./components/CreateBoqLine";
import { BoqHeader } from "./types/boqHeader";

export default async function BOQ({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const boqHeader: BoqHeader = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqHeaderByProjectID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    }
  )
    .then((res) => res.json())
    .then((data) => {
      return data[0];
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
    <div>
      {boqHeader ? (
        boqLines && Object.keys(boqLines).length > 0 ? (
          <BoqLinesView boqLines={boqLines} boqHeader={boqHeader} />
        ) : (
          <CreateBoqLineClient boqHeader={boqHeader} />
        )
      ) : (
        <CreateBoqHeaderClient projectID={id} />
      )}
    </div>
  );
}
