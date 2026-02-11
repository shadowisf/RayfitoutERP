"use client";

import AddJoItemButton from "./department/_AddJoItemButton";

type CreateJoLineClientProps = {
  mrHeaderID: number;
  projectID: number;
};

export default function CreateJoLineClient({
  mrHeaderID,
  projectID,
}: CreateJoLineClientProps) {
  const noItemImg = "/images/no-items.svg";

  return (
    <div className="no-items-container">
      <img src={noItemImg} alt="no items image" />

      <br />
      <br />
      <br />

      <h2>NO JOBS ADDED</h2>

      <br />

      <span>Begin by adding jobs to start structuring your job order</span>

      <br />
      <br />
      <br />

      <AddJoItemButton
        full
        mrHeaderID={mrHeaderID}
        projectID={projectID}
        style={{ padding: "20px 0px" }}
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(239, 239, 239, 1)"
        textColor="black"
      />
    </div>
  );
}
