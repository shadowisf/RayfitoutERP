"use client";

import AddMrItemButton from "./_AddMrItemButton";

type CreateMrLineClientProps = {
  mrHeaderID: number;
  projectID: number;
};

export default function CreateMrLineClient({
  mrHeaderID,
  projectID,
}: CreateMrLineClientProps) {
  const noItemImg = "/images/no-items.svg";

  return (
    <div className="no-items-container">
      <img src={noItemImg} alt="no items image" />

      <br />
      <br />
      <br />

      <h2>NO MATERIALS ADDED</h2>

      <br />

      <span>
        Begin by adding material or subcategories to start structuring your
        material request
      </span>

      <br />
      <br />
      <br />

      <AddMrItemButton full mrHeaderID={mrHeaderID} projectID={projectID}>
        ADD CATEGORY & ITEM +
      </AddMrItemButton>
    </div>
  );
}
