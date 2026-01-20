"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import Button from "@/app/components/Button";
import { MrLine } from "../types/mrLine";
import { SupplierQuotation } from "../types/supplierQuotation";

type SupplierDetailsPopUpProps = {
  item: MrLine | SupplierQuotation;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export default function SupplierDetailsPopUp({
  item,
  children,
  style,
}: SupplierDetailsPopUpProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper function to check if item is MrLine type
  const isMrLine = (item: MrLine | SupplierQuotation): item is MrLine => {
    return "approved_supplier_name" in item;
  };

  // Get the supplier data based on the item type
  const supplierData = isMrLine(item)
    ? {
        name: item.approved_supplier_name,
        type: item.approved_supplier_type,
        id: item.id,
        materialCategories: item.approved_supplier_material_categories,
        materialSubcategories: item.approved_supplier_material_subcategories,
        avgLeadTime: item.approved_supplier_avg_lead_time,
        rating: item.approved_supplier_rating,
        trnNumber: item.approved_supplier_trn_number,
        contactPerson: item.approved_supplier_contact_person,
        phone: item.approved_supplier_phone,
        email: item.approved_supplier_email,
        address: item.approved_supplier_address,
      }
    : {
        name: item.supplier_name,
        type: item.supplier_type,
        id: item.id,
        materialCategories: item.supplier_material_categories,
        materialSubcategories: item.supplier_material_subcategories,
        avgLeadTime: item.supplier_avg_lead_time,
        rating: item.supplier_rating,
        trnNumber: item.supplier_trn_number,
        contactPerson: item.supplier_contact_person,
        phone: item.supplier_phone,
        email: item.supplier_email,
        address: item.supplier_address,
      };

  // Format ID with padding only for MrLine
  const formattedId = isMrLine(item)
    ? `SUPP-${String(supplierData.id).padStart(5, "0")}`
    : `SUPP-${supplierData.id}`;

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
            minWidth: "1250px",
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
              <small>NAME</small>
              <h2>{supplierData.name}</h2>
            </div>
            <div>
              <small>TYPE</small>
              <h2>{supplierData.type}</h2>
            </div>
            <div>
              <small>ID</small>
              <h2>{formattedId}</h2>
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
              <small>MATERIAL CATEGORIES</small>
              <h2>{supplierData.materialCategories || "-"}</h2>
            </div>
            <div>
              <small>MATERIAL SUBCATEGORIES</small>
              <h2>{supplierData.materialSubcategories || "-"}</h2>
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
              <small>AVERAGE LEAD TIME</small>
              <h2>{supplierData.avgLeadTime || "-"}</h2>
            </div>
            <div>
              <small>RATING</small>
              <h2>{supplierData.rating || "-"}</h2>
            </div>
            <div>
              <small>TAX REGISTRATION NUMBER</small>
              <h2>{supplierData.trnNumber || "-"}</h2>
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
              <small>CONTACT PERSON NAME</small>
              <h2>{supplierData.contactPerson || "-"}</h2>
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
              <small>PHONE</small>
              <h2>{supplierData.phone || "-"}</h2>
            </div>
            <div>
              <small>EMAIL</small>
              <h2>{supplierData.email || "-"}</h2>
            </div>
            <div>
              <small>ADDRESS</small>
              <h2>{supplierData.address || "-"}</h2>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
