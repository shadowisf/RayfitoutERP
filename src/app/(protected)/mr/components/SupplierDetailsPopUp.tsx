"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import Button from "@/app/components/Button";
import { MrLine } from "../[id]/types/mrLine";
import { SupplierQuotation } from "../[id]/types/supplierQuotation";
import { Supplier } from "@/app/(protected)/vendor/types/supplier";

type SupplierDetailsPopUpProps = {
  item: MrLine | SupplierQuotation | Supplier;
  children: React.ReactNode;
  style?: React.CSSProperties;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
};

export default function SupplierDetailsPopUp({
  item,
  children,
  style,
  bgColor = "white",
  borderColor = "rgba(207, 207, 207, 1)",
  textColor = "black",
}: SupplierDetailsPopUpProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper function to check if item is MrLine type
  const isMrLine = (
    item: MrLine | SupplierQuotation | Supplier,
  ): item is MrLine => {
    return "approved_supplier_name" in item;
  };

  // Helper function to check if item is Supplier type
  const isSupplier = (
    item: MrLine | SupplierQuotation | Supplier,
  ): item is Supplier => {
    return "trade_license" in item;
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
    : isSupplier(item)
      ? {
          name: item.name,
          type: item.type,
          id: item.id,
          materialCategories: item.material_categories,
          materialSubcategories: item.material_subcategories,
          avgLeadTime: item.avg_lead_time,
          rating: item.supplier_rating,
          trnNumber: item.trn_number,
          contactPerson: item.contact_person_name,
          phone: item.phone,
          email: item.email,
          address: item.address,
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

  // Format ID with padding
  const formattedId = `VEN-${String(supplierData.id).padStart(5, "0")}`;

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
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
          header={"VENDOR DETAILS"}
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
              <small>ID</small>
              <h2>{formattedId}</h2>
            </div>
            <div>
              <small>TYPE</small>
              <h2>{supplierData.type}</h2>
            </div>
          </div>

          <br />
          <br />
          <br />
          <br />

          <div>
            <small>MATERIAL CATEGORIES</small>
            <h2>{supplierData.materialCategories || "-"}</h2>
          </div>

          <br />
          <br />

          <div>
            <small>MATERIAL SUBCATEGORIES</small>
            <h2>{supplierData.materialSubcategories || "-"}</h2>
          </div>

          <br />
          <br />
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
              <small>TAX REGISTRATION NUMBER</small>
              <h2>{supplierData.trnNumber || "-"}</h2>
            </div>
            <div>
              <small>AVERAGE LEAD TIME</small>
              <h2>{supplierData.avgLeadTime || "-"}</h2>
            </div>
            <div>
              <small>RATING</small>
              <h2>{supplierData.rating || "-"}</h2>
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
