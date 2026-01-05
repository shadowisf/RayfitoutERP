"use client";

import { useAuth } from "@/app/context/AuthContext";
import AddBoqItemButton from "./manager/_AddBoqItemButton";
import { BoqHeader } from "../types/boqHeader";

export default function CreateBoqLineClient({
  boqHeader,
}: {
  boqHeader: BoqHeader;
}) {
  const { userInfo } = useAuth();

  const no_item_img = "/images/no-items.svg";

  return (
    <div className="no-items-container">
      <img src={no_item_img} alt="no items image" />

      <br />
      <br />
      <br />

      <h2>NO ITEMS ADDED</h2>

      <br />

      <span>
        Begin by adding items or subcategories to start structuring your bill of
        quantity
      </span>

      <br />
      <br />
      <br />

      {userInfo?.departmentID === 8 && (
        <AddBoqItemButton
          full
          boqHeaderID={boqHeader.id}
          style={{ padding: "20px 0px" }}
        >
          ADD CATEGORY & ITEM +
        </AddBoqItemButton>
      )}
    </div>
  );
}
