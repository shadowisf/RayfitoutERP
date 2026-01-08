"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import Button from "@/app/components/Button";
import { MrLine } from "../types/mrLine";

type SupplierDetailsPopUp = {
  item: MrLine;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export default function SupplierDetailsPopUp({
  item,
  children,
  style,
}: SupplierDetailsPopUp) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        style={style}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUPPLIER DETAILS"}
          setIsOpen={setIsOpen}
          style={{
            whiteSpace: "pre-wrap",
            color: "black",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "75px",
            }}
          >
            <div>
              <span>NAME</span>
              <h2>{item.approved_supplier_name}</h2>
            </div>
            <div>
              <span>ID</span>
              <h2>SUPP-{String(item.id).padStart(5, "0")}</h2>
            </div>
          </div>

          <br />
          <br />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "75px",
            }}
          >
            <div>
              <span>MATERIAL CATEGORIES</span>
              <h2>{item.approved_supplier_material_categories || "-"}</h2>
            </div>
            <div>
              <span>MATERIAL SUBCATEGORIES</span>
              <h2>{item.approved_supplier_material_subcategories || "-"}</h2>
            </div>
          </div>

          <br />
          <br />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "75px",
            }}
          >
            <div>
              <span>AVERAGE LEAD TIME</span>
              <h2>{item.approved_supplier_avg_lead_time || "-"}</h2>
            </div>
            <div>
              <span>RATING</span>
              <h2>{item.approved_supplier_rating || "-"}</h2>
            </div>
            <div>
              <span>TAX REGISTRATION NUMBER</span>
              <h2>{item.approved_supplier_trn_number || "-"}</h2>
            </div>
          </div>

          <br />
          <br />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "75px",
            }}
          >
            <div>
              <span>CONTACT PERSON NAME</span>
              <h2>{item.approved_supplier_contact_person || "-"}</h2>
            </div>
          </div>

          <br />
          <br />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "75px",
            }}
          >
            <div>
              <span>PHONE</span>
              <h2>{item.approved_supplier_phone || "-"}</h2>
            </div>
            <div>
              <span>EMAIL</span>
              <h2>{item.approved_supplier_email || "-"}</h2>
            </div>
            <div>
              <span>ADDRESS</span>
              <h2>{item.approved_supplier_address || "-"}</h2>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
