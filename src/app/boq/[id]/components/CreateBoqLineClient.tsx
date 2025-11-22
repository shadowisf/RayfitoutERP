"use client";

import { useEffect, useState } from "react";
import AddItemButton from "./AddItemButton";

export default function CreateBoqLineClient({
  boqHeaderID,
}: {
  boqHeaderID: string;
}) {
  const no_item_img = "/images/no-items.svg";

  const [boqLines, setBoqLines] = useState<[] | null>(null);

  useEffect(() => {
    fetch("/api/boq/getBoqLineByBoqID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: boqHeaderID }),
    })
      .then((res) => res.json())
      .then((data) => {
        data && data.length > 0 ? setBoqLines(data) : setBoqLines(null);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <>
      {boqLines ? (
        ""
      ) : (
        <div className="no-items-container">
          <img src={no_item_img} alt="no items image" />

          <br />
          <br />
          <br />

          <h2>NO ITEMS ADDED</h2>

          <br />

          <span>
            Begin by adding items or subcategories to start structuring your BOQ
          </span>

          <br />
          <br />
          <br />

          <AddItemButton boqHeaderID={boqHeaderID} />
        </div>
      )}
    </>
  );
}
