"use client";

import { BoqHeader } from "../types/boqHeader";
import Button from "@/app/components/Button";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import EditBoqHeaderButton from "./manager/_EditBoqHeaderButton";
import { DeleteBoqHeaderButton } from "./manager/_DeleteBoqHeaderButton";

type props = {
  boqHeader: BoqHeader;
  onSuccess?: () => void;
};

export default function BoqCard({ boqHeader, onSuccess }: props) {
  return (
    <div className="item" key={boqHeader?.id}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
        }}
      >
        <div>
          <small>BOQ ID</small>
          <h2>BOQ-{String(boqHeader?.id).padStart(5, "0")}</h2>
        </div>

        <div>
          <small>NAME</small>
          <h2>{boqHeader?.name || "-"}</h2>
        </div>

        <ThreeDotsMenuButton>
          <EditBoqHeaderButton
            boqHeader={boqHeader}
            threeDotsMenu
            onSuccess={onSuccess}
          />
          <DeleteBoqHeaderButton
            boqHeader={boqHeader}
            threeDotsMenu
            onSuccess={onSuccess}
          />
        </ThreeDotsMenuButton>
      </div>

      <br />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
        }}
      >
        <div>
          <small>LOCATION</small>
          <h2>{boqHeader?.location}</h2>
        </div>

        <div>
          <small>DATE</small>
          <h2>
            {boqHeader?.boq_date
              ? new Date(boqHeader.boq_date).toLocaleDateString("en-GB")
              : "-"}
          </h2>
        </div>

        <div></div>
      </div>

      <br />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
        }}
      >
        <div>
          <small>CLIENT NAME</small>
          <h2>{boqHeader?.client_name || "-"}</h2>
        </div>

        <div></div>

        <div></div>
      </div>

      <br />
      <br />

      <Button
        componentType={"link"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        href={`/boq/${boqHeader?.id}`}
        style={{
          borderRadius: "50px",
        }}
        full
      >
        <p style={{ textAlign: "center" }}>VIEW &gt;</p>
      </Button>
    </div>
  );
}
