"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

export type SupplierInfo = {
  supplierId: number;
  lpoId: number;
  supplierType: string;
  supplierName: string;
  paymentValue: number;
};

type SubitForPaymentButtonProps = {
  mrHeaderID: number;
  style?: React.CSSProperties;
  disabled?: boolean;
  suppliers: SupplierInfo[]; // Array of all suppliers with their LPOs
};

export default function SubmitForPaymentButton({
  mrHeaderID,
  style,
  disabled,
  suppliers,
}: SubitForPaymentButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Categorize suppliers
  const creditSuppliers = suppliers.filter((s) =>
    s.supplierType.toLowerCase().includes("credit"),
  );
  const cashSuppliers = suppliers.filter(
    (s) => !s.supplierType.toLowerCase().includes("credit"),
  );

  const hasMixedSuppliers =
    creditSuppliers.length > 0 && cashSuppliers.length > 0;
  const allSuppliers = [...creditSuppliers, ...cashSuppliers];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setProgress({ current: 0, total: allSuppliers.length });

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitForLPOSegregation",
          id: mrHeaderID,
        }),
      });
    } catch (error) {
      console.error("Error fetching MR:", error);
    }

    const results = {
      success: [] as SupplierInfo[],
      failed: [] as SupplierInfo[],
    };

    // Process each supplier sequentially (or use Promise.all for parallel)
    for (let i = 0; i < allSuppliers.length; i++) {
      const supplier = allSuppliers[i];
      setProgress({ current: i + 1, total: allSuppliers.length });

      const isCredit = supplier.supplierType.toLowerCase().includes("credit");
      const action = isCredit ? "submitLpoForDelivery" : "submitLpoForPayment";

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: action,
            lpo_id: supplier.lpoId,
            mr_header_id: mrHeaderID,
            changed_by: userInfo?.name,
            payment_value: Number(supplier.paymentValue).toFixed(2),
            skip_to_delivery: isCredit,
            supplier_id: supplier.supplierId,
          }),
        });

        if (res.ok) {
          results.success.push(supplier);
        } else {
          results.failed.push(supplier);
        }
      } catch (error) {
        console.error(
          `Error processing supplier ${supplier.supplierId}:`,
          error,
        );
        results.failed.push(supplier);
      }
    }

    setIsLoading(false);
    setProgress(null);

    // Show results
    if (results.failed.length === 0) {
      toast("Material request submitted", "success");
      setIsOpen(false);
      router.refresh();
      router.replace(`/mr/`);
    } else {
      toast(`${results.failed.length} supplier(s) failed to submit`, "error");
      console.error("Failed suppliers:", results.failed);
    }
  }

  // Determine button text
  const getButtonText = () => {
    if (hasMixedSuppliers) {
      return "SUBMIT FOR PAYMENT & DELIVERY";
    } else if (creditSuppliers.length > 0) {
      return "SUBMIT FOR DELIVERY";
    } else {
      return "SUBMIT FOR PAYMENT";
    }
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor={"white"}
        borderColor={"white"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", ...style }}
        disabled={disabled || isLoading || suppliers.length === 0}
      >
        {getButtonText()}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            <p>Are you sure you want to submit this material request?</p>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
