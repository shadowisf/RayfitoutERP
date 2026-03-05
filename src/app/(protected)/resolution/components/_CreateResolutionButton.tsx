"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type FailedQCItem = {
  qc_id: number;
  lpo_mr_line_id: number;
  lpo_id: number;
  mr_line_id: number;
  mr_header_id: number;
  project_id: number;
  material_category: string;
  material_subcategory: string;
  material_description: string;
  boq_line_ids: string | null;
  unit: string;
  received_quantity: number;
  accepted_quantity: number;
  failed_quantity: number;
  lpo_table_id: number;
  invoice_file: any;
  unit_price: number;
  supplier_name: string;
  checked_by: string;
};

type CreateResolutionButtonProps = {
  item: FailedQCItem;
};

export default function CreateResolutionButton({
  item,
}: CreateResolutionButtonProps) {
  const plusIcon = "/icons/plus.svg";

  const { userInfo } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  // Top-level
  const [resolutionType, setResolutionType] = useState("");

  // Return/Refund fields
  const [returnRequired, setReturnRequired] = useState("");
  const [pickupType, setPickupType] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [actualRefund, setActualRefund] = useState("");
  const [reasonForVariance, setReasonForVariance] = useState("");
  const [expectedSettlementDate, setExpectedSettlementDate] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [remarks, setRemarks] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const expectedRefund = item.unit_price * item.failed_quantity;
  const varianceAmount = expectedRefund - (Number(actualRefund) || 0);

  function resetAllFields() {
    setReturnRequired("");
    setPickupType("");
    setExpectedReturnDate("");
    setActualRefund("");
    setReasonForVariance("");
    setExpectedSettlementDate("");
    setRefundMethod("");
    setRemarks("");
    setProofFile(null);
  }

  function handleTypeChange(
    e: React.ChangeEvent<
      HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement
    >,
  ) {
    setResolutionType(e.target.value);
    resetAllFields();
  }

  const formatNumber = (value: unknown): string => {
    const num = Number(value);
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (resolutionType === "Return/refund") {
      try {
        // Upload proof file to S3 if present
        let proofUrl: string[] = [];
        if (proofFile) {
          const formData = new FormData();
          formData.append("files", proofFile);
          formData.append("folder", "qc-resolution-proof");

          const uploadResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
            {
              method: "POST",
              body: formData,
            },
          );

          if (!uploadResponse.ok) {
            toast("Failed to upload file", "error");
            return;
          }

          const uploadResult = await uploadResponse.json();
          proofUrl = uploadResult.urls || [];
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "createReturnRefund",
              qc_mr_line_id: item.qc_id,
              return_required: returnRequired,
              pickup_type: returnRequired === "Yes" ? pickupType : null,
              return_quantity: item.failed_quantity,
              expected_refund: expectedRefund,
              actual_refund: Number(actualRefund) || 0,
              variance_amount: varianceAmount,
              reason_for_variance: reasonForVariance || null,
              eta_delivery_date: expectedReturnDate || null,
              expected_settlement_date: expectedSettlementDate || null,
              refund_method: refundMethod || null,
              remarks: remarks || null,
              proof_of_payment: proofUrl,
              created_by: userInfo?.name,
            }),
          },
        );

        if (res.ok) {
          toast("Resolution created", "success");
          setIsOpen(false);
          resetAllFields();
          setResolutionType("");
          router.refresh();
        } else {
          const data = await res.json();
          toast(data.message || "Failed to create resolution", "error");
        }
      } catch (error) {
        console.error("Error creating resolution:", error);
        toast("Failed to create resolution", "error");
      }
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(223, 223, 223, 1)"
        textColor="black"
        style={{ padding: "7px 7px" }}
        onClick={() => setIsOpen(true)}
      >
        <img src={plusIcon} alt="add" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={`CREATE RESOLUTION FOR ${item.material_description.toUpperCase()}`}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          {/* Resolution Type */}
          <div className="input-row full">
            <InputItem
              label="RESOLUTION TYPE"
              value={resolutionType}
              type="select"
              required
              onChange={handleTypeChange}
              selectOptions={[
                "Return/refund",
                "Replace",
                "Conditionally accepted",
                "Reject/scrap",
              ]}
            />
          </div>

          {/* Return/Refund Fields */}
          {resolutionType === "Return/refund" && (
            <>
              <br />

              {/* Return Required + Pickup Type */}
              <div className="input-row full">
                <div className="input-item">
                  <label className="custom">
                    <span>RETURN REQUIRED?</span>
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      alignItems: "center",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="returnRequired"
                        value="Yes"
                        checked={returnRequired === "Yes"}
                        onChange={(e) => {
                          setReturnRequired(e.target.value);
                          setPickupType("");
                        }}
                        required
                      />
                      YES
                    </label>
                    <label
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="returnRequired"
                        value="No"
                        checked={returnRequired === "No"}
                        onChange={(e) => {
                          setReturnRequired(e.target.value);
                          setPickupType("");
                        }}
                      />
                      <span style={{ textWrap: "nowrap" }}>
                        NO, VENDOR WAIVED RETURN
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {returnRequired === "Yes" && (
                <div className="input-row half">
                  <InputItem
                    label="PICKUP TYPE"
                    value={pickupType}
                    type="select"
                    required
                    onChange={(e) => setPickupType(e.target.value)}
                    selectOptions={["Vendor pickup"]}
                  />
                </div>
              )}

              {/* Expected Return Date */}
              {returnRequired === "Yes" && (
                <div className="input-row half">
                  <InputItem
                    label="EXPECTED RETURN DATE"
                    value={expectedReturnDate}
                    type="date"
                    required
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>
              )}

              <br />

              {/* Item Table */}
              <table className="items-table two-toned">
                <thead>
                  <tr>
                    <th>CATEGORY</th>
                    <th>SUBCATEGORY</th>
                    <th>ITEM</th>
                    <th>FAILED QTY</th>
                    <th>RETURN QTY</th>
                    <th>EXPECTED REFUND</th>
                    <th>ACTUAL REFUND</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{item.material_category}</td>
                    <td>{item.material_subcategory}</td>
                    <td>{item.material_description}</td>
                    <td>
                      {formatNumber(item.failed_quantity)} {item.unit}
                    </td>
                    <td>
                      {formatNumber(item.failed_quantity)} {item.unit}
                    </td>
                    <td>AED {expectedRefund.toFixed(2)}</td>
                    <td
                      style={{
                        width: "250px",
                      }}
                    >
                      <InputItem
                        label="" // Hidden label since table header shows it
                        value={actualRefund}
                        type="text" // Use text type to control display
                        required
                        disabled={false} // Keep editable
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow numbers with max 1 decimal
                          if (/^\d*\.?\d{0,1}$/.test(value)) {
                            setActualRefund(value);
                          }
                        }}
                        placeholder="ENTER ACTUAL REFUND"
                      />
                    </td>
                  </tr>
                </tbody>
                <tfoot
                  style={{
                    borderTop: "1px solid rgba(239, 239, 239, 1)",
                  }}
                >
                  <tr>
                    <td colSpan={5} />
                    <td style={{ fontWeight: "600" }}>TOTAL</td>
                    <td style={{ fontWeight: "600" }}>
                      AED {(Number(actualRefund) || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <br />

              {/* Variance Amount */}
              <div className="input-row half">
                <InputItem
                  label={"VARIANCE AMOUNT"}
                  value={
                    actualRefund === ""
                      ? "CALCULATING..."
                      : `AED ${varianceAmount.toFixed(2)}`
                  }
                  type={"text"}
                  onChange={() => {}}
                  disabled
                  required
                />

                <InputItem
                  label="REASON FOR VARIANCE"
                  value={reasonForVariance}
                  type="text"
                  onChange={(e) => setReasonForVariance(e.target.value)}
                />
              </div>

              {/* Expected Settlement Date + Refund Method */}
              <div className="input-row half">
                <InputItem
                  label="EXPECTED SETTLEMENT DATE"
                  value={expectedSettlementDate}
                  type="date"
                  onChange={(e) => setExpectedSettlementDate(e.target.value)}
                  required
                />
                <InputItem
                  label="REFUND METHOD"
                  value={refundMethod}
                  type="select"
                  onChange={(e) => setRefundMethod(e.target.value)}
                  selectOptions={["Debit", "Credit"]}
                  required
                />
              </div>

              {/* Remarks */}
              <div className="input-row half">
                <InputItem
                  label="REMARKS"
                  value={remarks}
                  type="textarea"
                  onChange={(e) => setRemarks(e.target.value)}
                />

                <SingleUploadFileBox
                  fileState={proofFile}
                  setFileState={setProofFile}
                  label="PROOF OF REFUND / CREDIT NOTE"
                  acceptedFileTypes=".png,.jpg,.jpeg,.pdf"
                  required
                />
              </div>
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
