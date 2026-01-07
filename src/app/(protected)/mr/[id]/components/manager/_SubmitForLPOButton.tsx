"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

type SubmitForLPOProps = {
  mrHeaderID: number;
  mrLines: any;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export default function SubmitForLPO({
  mrHeaderID,
  mrLines,
  disabled,
  style,
}: SubmitForLPOProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    console.log(mrLines);

    try {
      // Get all MR line IDs
      const allItemIds: number[] = [];

      for (const category in mrLines) {
        for (const subCategory in mrLines[category]) {
          for (const supplier in mrLines[category][subCategory]) {
            const items = mrLines[category][subCategory][supplier];

            // Add safety check
            if (Array.isArray(items)) {
              items.forEach((item: any) => allItemIds.push(item.id));
            }
          }
        }
      }

      // Fetch approved suppliers for each MR line
      const approvedSuppliers: { mr_line_id: number; quotation_id: number }[] =
        [];

      for (const itemId of allItemIds) {
        try {
          const response = await fetch(
            "/api/supplier/getAllSupplierAndQuotationByMrLineID",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: itemId }),
            }
          );

          if (response.ok) {
            const data = await response.json();

            // Find the approved quotation
            const approvedQuotation = data.find(
              (q: any) => q.approval_status === "Approved"
            );

            if (approvedQuotation) {
              approvedSuppliers.push({
                mr_line_id: itemId,
                quotation_id:
                  approvedQuotation.quotation_id || approvedQuotation.id,
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching quotations for item ${itemId}:`, error);
        }
      }

      // Single call: Delete S3 files AND database records
      const deleteResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deleteNonApprovedQuotationFiles",
            approved_suppliers: approvedSuppliers,
          }),
        }
      );

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.error || "Failed to delete quotations");
      }

      // Update MR progress to LPO stage
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitForLPO",
          id: mrHeaderID,
          changed_by: userInfo?.name,
        }),
      });

      if (res.ok) {
        toast("Material request submitted", "success");
        setIsOpen(false);
        router.refresh();
        router.replace(`/mr/`);
      } else {
        const errorData = await res.json();
        toast(errorData.error || "Failed to submit material request", "error");
      }
    } catch (error) {
      console.error("Error submitting for LPO:", error);
      toast("Failed to submit material request", "error");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor="white"
        borderColor="white"
        textColor="black"
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", ...style }}
        disabled={disabled}
      >
        SUBMIT FOR LOCAL PURCHASE ORDER
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this material request?</p>
        </FormPopUp>
      )}
    </>
  );
}
