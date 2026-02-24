"use client";

import { useAuth } from "@/app/context/AuthContext";
import AddBoqItemButton from "./manager/_AddBoqItemButton";
import { BoqHeader } from "../types/boqHeader";
import EditBoqHeaderButton from "./manager/_EditBoqHeaderButton";
import { DeleteBoqHeaderButton } from "./manager/_DeleteBoqHeaderButton";

type props = {
  boqHeader: BoqHeader | null;
};

export default function CreateBoqLineClient({ boqHeader }: props) {
  const { userInfo } = useAuth();

  const no_item_img = "/images/no-items.svg";

  if (!boqHeader) {
    return null;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>
          <a href="/project">PROJECTS</a> &gt;{" "}
          <a href={`/project/${boqHeader?.project_id}`}>
            {boqHeader?.project_name.toUpperCase()}
          </a>{" "}
          &gt; BOQ-
          {String(boqHeader?.id).padStart(5, "0")}
        </h1>
        <div style={{ display: "flex", gap: "5px" }}>
          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
            <>
              <EditBoqHeaderButton boqHeader={boqHeader} />
              <DeleteBoqHeaderButton boqHeader={boqHeader} />
            </>
          )}
        </div>
      </div>

      <br />
      <br />

      <div className="no-items-container">
        <img src={no_item_img} alt="no items image" />

        <br />
        <br />
        <br />

        <h2>NO ITEMS ADDED</h2>

        <br />

        <span>
          Begin by adding items or subcategories to start structuring your bill
          of quantity
        </span>

        <br />
        <br />
        <br />

        {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
          <AddBoqItemButton
            full
            boqHeaderID={boqHeader.id}
            style={{ padding: "20px 0px" }}
            currency={boqHeader.currency}
          >
            ADD ITEM +
          </AddBoqItemButton>
        )}
      </div>
    </>
  );
}
