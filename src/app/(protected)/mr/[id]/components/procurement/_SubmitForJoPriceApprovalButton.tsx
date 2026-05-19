"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { BulkQuotationData } from "./_BulkSubcontractorButton";

type SubmitForJoPriceApprovalButtonProps = {
  mrHeaderID: number;
  disabled?: boolean;
  style?: React.CSSProperties;
  progressId?: number;
  bulkQuotationData?: BulkQuotationData | null;
  bulkTotalPrices?: { [boq_line_id: number]: string };
  boqItemsByJoLine?: { [joLineId: number]: { boq_line_id: number }[] };
};

export default function SubmitForJoPriceApprovalButton({
  mrHeaderID,
  disabled,
  style,
  progressId,
  bulkQuotationData,
  bulkTotalPrices,
  boqItemsByJoLine,
}: SubmitForJoPriceApprovalButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function uploadFileToS3(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("files", file, file.name);
    formData.append("folder", "jo-quotations");
    const res = await fetch("/api/s3", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Failed to upload quotation file");
    const data = await res.json();
    const url = data.urls?.[0];
    if (!url) throw new Error("No URL returned from upload");
    return url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If bulk quotation data exists, upload file and create records first
    if (bulkQuotationData && bulkTotalPrices && boqItemsByJoLine) {
      try {
        const quotationUrl = await uploadFileToS3(
          bulkQuotationData.quotation_file,
        );

        // Create one quotation record per BOQ line that has a total price entered
        const createPromises: Promise<Response>[] = [];
        for (const [joLineIdStr, boqItems] of Object.entries(boqItemsByJoLine)) {
          const joLineId = Number(joLineIdStr);
          for (const item of boqItems) {
            const rawPrice = bulkTotalPrices[item.boq_line_id];
            if (!rawPrice) continue;
            const totalPrice = parseFloat(
              String(rawPrice).replace(/,/g, ""),
            );
            if (isNaN(totalPrice) || totalPrice <= 0) continue;
            createPromises.push(
              fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "addSubcontractorAndQuotation",
                  jo_line_id: joLineId,
                  boq_line_id: item.boq_line_id,
                  quotations: [
                    {
                      subcontractor_id: Number(
                        bulkQuotationData.subcontractor_id,
                      ),
                      quotation_file: quotationUrl,
                      total_price: totalPrice,
                      created_by: userInfo?.name || "",
                    },
                  ],
                }),
              }),
            );
          }
        }
        await Promise.all(createPromises);
      } catch (err: any) {
        toast(err.message || "Failed to create quotation records", "error");
        return;
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForPricingApproval",
        id: mrHeaderID,
        changed_by: userInfo?.name,
        from_progress_id: progressId,
      }),
    });

    if (res.ok) {
      toast("Job order submitted", "success");

      setIsOpen(false);

      router.refresh();
      router.replace(`/mr/`);
    } else {
      toast("Failed to submit job order", "error");
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
        SUBMIT FOR MANAGER PRICE APPROVAL
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT JOB ORDER"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this job order?</p>
        </FormPopUp>
      )}
    </>
  );
}
