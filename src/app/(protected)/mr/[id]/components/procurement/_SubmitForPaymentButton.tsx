"use client";

import { useState } from "react";
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
  paymentValue?: number; // Optional for backward compatibility
};

type SubmitForPaymentButtonProps = {
  mrHeaderID: number;
  lpoID?: number; // For single LPO mode (LpoLinesView)
  paymentValue?: number; // Total amount for single LPO
  style?: React.CSSProperties;
  disabled?: boolean;
  suppliers?: SupplierInfo[]; // For multi-supplier mode (MrLinesView)
  mode?: "single" | "multi"; // Explicit mode selection
};

export default function SubmitForPaymentButton({
  mrHeaderID,
  lpoID,
  paymentValue = 0,
  style,
  disabled,
  suppliers = [],
  mode = "single",
}: SubmitForPaymentButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Determine which suppliers to process
  const suppliersToProcess =
    mode === "multi"
      ? suppliers
      : lpoID
        ? [
            {
              supplierId: 0,
              lpoId: lpoID,
              supplierType: "",
              supplierName: "",
              paymentValue: paymentValue,
            },
          ]
        : [];

  // Categorize suppliers
  const creditSuppliers = suppliersToProcess.filter((s) =>
    s.supplierType.toLowerCase().includes("credit"),
  );
  const cashSuppliers = suppliersToProcess.filter(
    (s) => !s.supplierType.toLowerCase().includes("credit"),
  );

  const hasMixedSuppliers =
    creditSuppliers.length > 0 && cashSuppliers.length > 0;
  const allSuppliers = [...creditSuppliers, ...cashSuppliers];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const segregateRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitForLPOSegregation",
          id: mrHeaderID,
          changed_by: userInfo?.name,
        }),
      },
    );

    if (!segregateRes.ok) {
      const errorData = await segregateRes.json().catch(() => ({}));
      throw new Error(
        `Segregation failed: ${errorData.error || segregateRes.statusText}`,
      );
    }

    // Step 2: Process each supplier
    setProgress({ current: 0, total: allSuppliers.length });

    const results = {
      success: [] as SupplierInfo[],
      failed: [] as SupplierInfo[],
    };

    for (let i = 0; i < allSuppliers.length; i++) {
      const supplier = allSuppliers[i];
      setProgress({ current: i + 1, total: allSuppliers.length });

      const isCredit = supplier.supplierType.toLowerCase().includes("credit");
      const action = isCredit ? "submitLpoForDelivery" : "submitLpoForPayment";
      const supplierPaymentValue = supplier.paymentValue || paymentValue || 0;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: action,
            lpo_id: supplier.lpoId || lpoID,
            mr_header_id: mrHeaderID,
            changed_by: userInfo?.name,
            payment_value: Number(supplierPaymentValue).toFixed(2),
            skip_to_delivery: isCredit,
            supplier_id: supplier.supplierId || 0,
          }),
        });

        if (res.ok) {
          results.success.push(supplier);
          console.log(`✓ Supplier ${supplier.supplierId || i} success`);
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error(
            `✗ Supplier ${supplier.supplierId || i} failed:`,
            errorData,
          );
          results.failed.push(supplier);
        }
      } catch (error) {
        console.error(`✗ Supplier ${supplier.supplierId || i} error:`, error);
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
      toast(`${results.failed.length} supplier(s) failed`, "error");
      console.error("Failed:", results.failed);
    }
  }

  // Determine button text
  const getButtonText = () => {
    if (isLoading && progress) {
      return `PROCESSING ${progress.current}/${progress.total}...`;
    }

    if (mode === "multi") {
      if (hasMixedSuppliers) return "SUBMIT FOR PAYMENT & DELIVERY";
      if (creditSuppliers.length > 0) return "SUBMIT FOR DELIVERY";
      return "SUBMIT FOR PAYMENT";
    }

    // Single mode - check if we can determine type from suppliers array
    if (suppliers.length === 1) {
      const isCredit = suppliers[0].supplierType
        .toLowerCase()
        .includes("credit");
      return isCredit ? "SUBMIT FOR DELIVERY" : "SUBMIT FOR PAYMENT";
    }

    return "SUBMIT FOR PAYMENT";
  };

  const isDisabled =
    disabled ||
    isLoading ||
    (mode === "multi" && suppliers.length === 0) ||
    (mode === "single" && !lpoID);

  return (
    <>
      <Button
        componentType="button"
        bgColor={"white"}
        borderColor={"white"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", ...style }}
        disabled={isDisabled}
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

            {/*    <br />
            <br /> */}

            {/* {mode === "multi" && suppliers.length > 0 && (
              <table style={{ width: "100%" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ccc" }}>
                    <th style={{ textAlign: "left", padding: "5px" }}>
                      Supplier
                    </th>
                    <th style={{ textAlign: "left", padding: "5px" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "5px" }}>Route</th>
                  </tr>
                </thead>
                <tbody>
                  {allSuppliers.map((s) => {
                    const isCredit = s.supplierType
                      .toLowerCase()
                      .includes("credit");
                    return (
                      <tr
                        key={s.supplierId + s.supplierName}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "5px" }}>{s.supplierName}</td>
                        <td style={{ padding: "5px" }}>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "10px",
                              fontSize: "10px",
                              backgroundColor: isCredit
                                ? "rgba(87, 244, 176, 0.3)"
                                : "rgba(255, 181, 181, 0.3)",
                              color: isCredit
                                ? "rgba(31, 101, 71, 1)"
                                : "rgba(248, 77, 77, 1)",
                            }}
                          >
                            {s.supplierType || "Unknown"}
                          </span>
                        </td>
                        <td style={{ padding: "5px", fontSize: "11px" }}>
                          {isCredit ? "→ Delivery" : "→ Payment"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )} */}
          </div>
        </FormPopUp>
      )}
    </>
  );
}
