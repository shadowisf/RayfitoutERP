import BoqLinesView from "./components/BoqLinesView";
import CreateBoqLineClient from "./components/CreateBoqLine";
import { BoqHeader } from "./types/boqHeader";

export default async function BOQ({
  params,
}: {
  params: Promise<{ boqId: string }>;
}) {
  const { boqId } = await params;

  const boqHeader: BoqHeader = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqHeaderByID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: boqId }),
      cache: "no-store",
    },
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
      body: JSON.stringify({ boq_id: boqId }),
      cache: "no-store",
    },
  )
    .then((res) => res.json())
    .then((data) => {
      return data;
    })
    .catch((err) => console.error(err));

  return (
    <div>
      {boqLines && Object.keys(boqLines).length > 0 ? (
        <BoqLinesView boqLines={boqLines} boqHeader={boqHeader} />
      ) : (
        <CreateBoqLineClient boqHeader={boqHeader} />
      )}
    </div>
  );
}
