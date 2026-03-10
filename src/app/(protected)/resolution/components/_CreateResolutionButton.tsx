"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import Button from "@/app/components/Button";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import CreateCategoryButton from "@/app/(protected)/mr/[id]/components/department/_CreateCategoryButton";
import CreateSubCategoryButton from "@/app/(protected)/mr/[id]/components/department/_CreateSubcategoryButton";

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
  onSuccess?: () => void;
};

export default function CreateResolutionButton({
  item,
  onSuccess,
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

  // Replace fields
  const [replacedQty, setReplacedQty] = useState("");
  const [replacementType, setReplacementType] = useState("");
  const [expectedReplacementDate, setExpectedReplacementDate] = useState("");
  const [replaceNotes, setReplaceNotes] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialCategoryId, setNewMaterialCategoryId] = useState<
    string | number
  >("");
  const [newMaterialSubcategoryIds, setNewMaterialSubcategoryIds] = useState<
    (string | number)[]
  >([]);
  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

  // Scrap/Discard fields
  const [scrapReason, setScrapReason] = useState("");
  const [scrapAttachmentFile, setScrapAttachmentFile] = useState<File | null>(
    null,
  );
  const [returnNotPossibleReason, setReturnNotPossibleReason] = useState("");
  const [disposalMethod, setDisposalMethod] = useState("");

  // Conditionally Accept fields
  const [caReason, setCaReason] = useState("");
  const [caAttachmentFile, setCaAttachmentFile] = useState<File | null>(null);
  // Commercial deduction/penalty
  const [penaltyType, setPenaltyType] = useState("");
  const [penaltyValue, setPenaltyValue] = useState("");
  // Deviation approval
  const [deviationType, setDeviationType] = useState("");
  const [deviationDescription, setDeviationDescription] = useState("");
  const [requiresNameChange, setRequiresNameChange] = useState("");
  // Client/consultant approval
  const [approvalSource, setApprovalSource] = useState("");
  // Extended warranty/guarantees
  const [warrantyType, setWarrantyType] = useState("");
  const [caRemarks, setCaRemarks] = useState("");

  // Category/subcategory cascading state (matching _AddMrItemButton pattern)
  const [categoriesManuallySelected, setCategoriesManuallySelected] =
    useState(false);
  const [userInitiatedCategorySelection, setUserInitiatedCategorySelection] =
    useState(false);

  const expectedRefund = item.unit_price * item.failed_quantity;
  const varianceAmount = expectedRefund - (Number(actualRefund) || 0);

  // --- Category/Subcategory cascading logic (same as _AddMrItemButton) ---

  async function refreshSubcategories() {
    if (newMaterialCategoryId && userInitiatedCategorySelection) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_id: newMaterialCategoryId }),
        },
      );
      const data = await res.json();
      setMaterialSubCategoryValues(data);
    } else {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await res.json();
      setMaterialSubCategoryValues(data);
    }
  }

  async function getMaterialCategoriesAndSubcategories() {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((data) => setMaterialCategoryValues(data))
      .catch((err) => console.error(err));

    await refreshSubcategories();
  }

  // Fetch categories + subcategories when Replace type is selected
  useEffect(() => {
    if (resolutionType === "Replace from vendor") {
      getMaterialCategoriesAndSubcategories();
    }
  }, [resolutionType]);

  // Filter subcategories based on selected category
  useEffect(() => {
    if (resolutionType !== "Replace from vendor") return;

    if (newMaterialCategoryId && userInitiatedCategorySelection) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_id: newMaterialCategoryId }),
        },
      )
        .then((res) => res.json())
        .then((data) => setMaterialSubCategoryValues(data))
        .catch((err) => console.error(err));
    } else if (!newMaterialCategoryId) {
      fetch("/api/mr/getMaterialSubCategoryValues", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => setMaterialSubCategoryValues(data));
    }
  }, [newMaterialCategoryId, userInitiatedCategorySelection]);

  // Handle category change
  const handleCategoryChange = (categoryId: string | number) => {
    setCategoriesManuallySelected(true);
    setUserInitiatedCategorySelection(true);
    setNewMaterialCategoryId(categoryId);
  };

  // Handle subcategory change - auto-select category if needed (matching _AddMrItemButton)
  const handleSubCategoryChange = (selectedIds: (string | number)[]) => {
    setNewMaterialSubcategoryIds(selectedIds);

    // If subcategories are cleared
    if (selectedIds.length === 0) {
      if (!categoriesManuallySelected) {
        setNewMaterialCategoryId("");
      }
      // Reset to all subcategories
      fetch("/api/mr/getMaterialSubCategoryValues", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        });
      return;
    }

    // Get category from first selected subcategory
    const firstSelectedSubCategory = materialSubCategoryValues.find(
      (sc: any) => sc.id === selectedIds[0],
    ) as any;

    if (firstSelectedSubCategory?.category_id) {
      if (categoriesManuallySelected && newMaterialCategoryId) {
        // Don't override the manually selected category
      } else {
        // Auto-select the category based on subcategory
        setNewMaterialCategoryId(firstSelectedSubCategory.category_id);
      }
    }
  };

  function resetAllFields() {
    // Return/refund
    setReturnRequired("");
    setPickupType("");
    setExpectedReturnDate("");
    setActualRefund("");
    setReasonForVariance("");
    setExpectedSettlementDate("");
    setRefundMethod("");
    setRemarks("");
    setProofFile(null);
    // Replace
    setReplacedQty("");
    setReplacementType("");
    setExpectedReplacementDate("");
    setReplaceNotes("");
    setNewMaterialName("");
    setNewMaterialCategoryId("");
    setNewMaterialSubcategoryIds([]);
    setCategoriesManuallySelected(false);
    setUserInitiatedCategorySelection(false);
    // Scrap/Discard
    setScrapReason("");
    setScrapAttachmentFile(null);
    setReturnNotPossibleReason("");
    setDisposalMethod("");
    // Conditionally Accept
    setCaReason("");
    setCaAttachmentFile(null);
    setPenaltyType("");
    setPenaltyValue("");
    setDeviationType("");
    setDeviationDescription("");
    setRequiresNameChange("");
    setApprovalSource("");
    setWarrantyType("");
    setCaRemarks("");
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

    if (resolutionType === "Replace from vendor") {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "createReplace",
              qc_mr_line_id: item.qc_id,
              replaced_quantity: Number(replacedQty) || item.failed_quantity,
              replacement_type: replacementType,
              expected_replacement_date: expectedReplacementDate,
              notes: replaceNotes || null,
              new_material_name:
                replacementType === "Approved alternative"
                  ? newMaterialName || null
                  : null,
              new_material_category_id:
                replacementType === "Approved alternative"
                  ? newMaterialCategoryId || null
                  : null,
              new_material_subcategory_ids:
                replacementType === "Approved alternative"
                  ? newMaterialSubcategoryIds
                  : [],
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

    if (resolutionType === "Scrap/discard") {
      try {
        // Upload scrap attachment to S3 if present
        let scrapAttachmentUrl: string[] = [];
        if (scrapAttachmentFile) {
          const formData = new FormData();
          formData.append("files", scrapAttachmentFile);
          formData.append("folder", "qc-resolution-scrap");

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
          scrapAttachmentUrl = uploadResult.urls || [];
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "createScrapDiscard",
              qc_mr_line_id: item.qc_id,
              scrap_quantity: item.failed_quantity,
              scrap_reason: scrapReason,
              return_not_possible_reason: returnNotPossibleReason || null,
              disposal_method: disposalMethod || null,
              scrap_attachment: scrapAttachmentUrl,
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

    if (resolutionType === "Conditionally accept") {
      try {
        // Upload attachment to S3 if present
        let caAttachmentUrl: string[] = [];
        if (caAttachmentFile) {
          const formData = new FormData();
          formData.append("files", caAttachmentFile);
          formData.append("folder", "qc-resolution-conditionally-accepted");

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
          caAttachmentUrl = uploadResult.urls || [];
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "createConditionallyAccepted",
              qc_mr_line_id: item.qc_id,
              conditionally_accepted_quantity: item.failed_quantity,
              reason: caReason,
              penalty_type:
                caReason === "Commercial deduction/penalty"
                  ? penaltyType
                  : null,
              penalty_value:
                caReason === "Commercial deduction/penalty"
                  ? Number(penaltyValue) || 0
                  : null,
              deviation_type:
                caReason === "Deviation approval" ? deviationType : null,
              deviation_description:
                caReason === "Deviation approval" ? deviationDescription : null,
              requires_name_change:
                caReason === "Deviation approval" ? requiresNameChange : null,
              approval_source:
                caReason === "Client/consultant approval"
                  ? approvalSource
                  : null,
              warranty_type:
                caReason === "Extended warranty/guarantees"
                  ? warrantyType
                  : null,
              remarks: caRemarks || null,
              attachment: caAttachmentUrl,
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

    onSuccess && onSuccess();
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
              label="TYPE"
              value={resolutionType}
              type="select"
              required
              onChange={handleTypeChange}
              selectOptions={[
                "Return/refund",
                "Replace from vendor",
                "Conditionally accept",
                "Scrap/discard",
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

          {/* Scrap/Discard Fields */}
          {resolutionType === "Scrap/discard" && (
            <>
              <br />

              {/* Item Table */}
              <table className="items-table two-toned">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ITEM</th>
                    <th>FAILED QTY</th>
                    <th>SCRAP QTY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>{item.material_description}</td>
                    <td>
                      {formatNumber(item.failed_quantity)} {item.unit}
                    </td>
                    <td>
                      {formatNumber(item.failed_quantity)} {item.unit}
                    </td>
                  </tr>
                </tbody>
              </table>

              <br />

              {/* Scrap Reason */}
              <div className="input-row half">
                <InputItem
                  label="SCRAP REASON"
                  value={scrapReason}
                  type="select"
                  required
                  onChange={(e) => {
                    setScrapReason(e.target.value);
                    setScrapAttachmentFile(null);
                  }}
                  selectOptions={[
                    "Vendor rejection refused",
                    "Expired",
                    "Damaged beyond repair",
                    "Custom-fabricated item (non-returnable)",
                  ]}
                />
              </div>

              {/* Conditional Upload based on Scrap Reason */}
              {scrapReason === "Vendor rejection refused" && (
                <div className="input-row half">
                  <SingleUploadFileBox
                    fileState={scrapAttachmentFile}
                    setFileState={setScrapAttachmentFile}
                    label="VENDOR REJECTION EMAIL/CLAUSE"
                    acceptedFileTypes=".png,.jpg,.jpeg,.pdf"
                    required
                  />
                </div>
              )}

              {scrapReason === "Expired" && (
                <div className="input-row half">
                  <SingleUploadFileBox
                    fileState={scrapAttachmentFile}
                    setFileState={setScrapAttachmentFile}
                    label="EXPIRED LABEL/ITEM"
                    acceptedFileTypes=".png,.jpg,.jpeg,.pdf"
                    required
                  />
                </div>
              )}

              {scrapReason === "Damaged beyond repair" && (
                <div className="input-row half">
                  <SingleUploadFileBox
                    fileState={scrapAttachmentFile}
                    setFileState={setScrapAttachmentFile}
                    label="PROOF OF DAMAGE"
                    acceptedFileTypes=".png,.jpg,.jpeg,.pdf"
                    required
                  />
                </div>
              )}

              {/* Reason Return Not Possible */}
              <div className="input-row full">
                <InputItem
                  label="REASON FOR RETURN NOT POSSIBLE"
                  value={returnNotPossibleReason}
                  type="textarea"
                  required
                  onChange={(e) => setReturnNotPossibleReason(e.target.value)}
                />
              </div>

              {/* Disposal Method */}
              <div className="input-row half">
                <InputItem
                  label="DISPOSAL METHOD"
                  value={disposalMethod}
                  type="select"
                  required
                  onChange={(e) => setDisposalMethod(e.target.value)}
                  selectOptions={["Destroy", "Recycle", "Sold at scrap"]}
                />
              </div>
            </>
          )}

          {/* Replace Fields */}
          {resolutionType === "Replace from vendor" && (
            <>
              <br />

              {/* Item Table */}
              <table className="items-table two-toned">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ITEM</th>
                    <th>FAILED QTY</th>
                    <th>REPLACED QTY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>{item.material_description}</td>
                    <td>
                      {formatNumber(item.failed_quantity)} {item.unit}
                    </td>
                    <td style={{ width: "250px" }}>
                      <InputItem
                        label=""
                        value={replacedQty}
                        type="text"
                        required
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*\.?\d{0,1}$/.test(value)) {
                            setReplacedQty(value);
                          }
                        }}
                        placeholder="ENTER REPLACED QTY"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <br />

              {/* Replacement Type */}
              <div className="input-row half">
                <InputItem
                  label="REPLACEMENT TYPE"
                  value={replacementType}
                  type="select"
                  required
                  onChange={(e) => {
                    setReplacementType(e.target.value);
                    if (e.target.value !== "Approved alternative") {
                      setNewMaterialName("");
                      setNewMaterialCategoryId("");
                      setNewMaterialSubcategoryIds([]);
                    }
                  }}
                  selectOptions={["Like-for-like", "Approved alternative"]}
                />

                <InputItem
                  label="EXPECTED REPLACEMENT DATE"
                  value={expectedReplacementDate}
                  type="date"
                  required
                  onChange={(e) => setExpectedReplacementDate(e.target.value)}
                />
              </div>

              {/* Approved Alternative Fields */}
              {replacementType === "Approved alternative" && (
                <>
                  <div className="input-row full">
                    <InputItem
                      label="NEW MATERIAL NAME"
                      value={newMaterialName}
                      type="text"
                      required
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      placeholder="ENTER NEW MATERIAL NAME"
                    />
                  </div>

                  <div className="input-row half">
                    <SingleSelectDropdown
                      label={"NEW MATERIAL CATEGORY"}
                      dbData={materialCategoryValues}
                      selectedValue={newMaterialCategoryId}
                      onChange={handleCategoryChange}
                      placeholder="SELECT CATEGORY"
                      required
                      bottomButtonComponent={
                        <CreateCategoryButton
                          onSuccess={() => {
                            getMaterialCategoriesAndSubcategories();
                          }}
                        />
                      }
                    />

                    <MultiSelectDropdown
                      label={"NEW MATERIAL SUBCATEGORIES"}
                      dbData={materialSubCategoryValues}
                      selectedValues={newMaterialSubcategoryIds}
                      onChange={handleSubCategoryChange}
                      placeholder="SELECT SUBCATEGORIES"
                      required
                      style={{ width: "350px" }}
                      bottomButtonComponent={
                        <CreateSubCategoryButton
                          materialCategoryID={Number(newMaterialCategoryId)}
                          onSuccess={() => {
                            refreshSubcategories();
                          }}
                        />
                      }
                    />
                  </div>
                </>
              )}

              {/* Notes */}
              <div className="input-row full">
                <InputItem
                  label="NOTES"
                  value={replaceNotes}
                  type="textarea"
                  onChange={(e) => setReplaceNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Conditionally Accept Fields */}
          {resolutionType === "Conditionally accept" && (
            <>
              <br />

              {/* Item Table */}
              <table className="items-table two-toned">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ITEM</th>
                    <th>FAILED QTY</th>
                    <th>CONDITIONALLY ACCEPTED QTY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>{item.material_description}</td>
                    <td>
                      {formatNumber(item.failed_quantity)} {item.unit}
                    </td>
                    <td>
                      {formatNumber(item.failed_quantity)} {item.unit}
                    </td>
                  </tr>
                </tbody>
              </table>

              <br />

              {/* Reason */}
              <div className="input-row half">
                <InputItem
                  label="REASON"
                  value={caReason}
                  type="select"
                  required
                  onChange={(e) => {
                    setCaReason(e.target.value);
                    setCaAttachmentFile(null);
                    setPenaltyType("");
                    setPenaltyValue("");
                    setDeviationType("");
                    setDeviationDescription("");
                    setRequiresNameChange("");
                    setApprovalSource("");
                    setWarrantyType("");
                    setCaRemarks("");
                  }}
                  selectOptions={[
                    "Commercial deduction/penalty",
                    "Deviation approval",
                    "Client/consultant approval",
                    "Extended warranty/guarantees",
                  ]}
                />
              </div>

              {/* Commercial Deduction/Penalty Fields */}
              {caReason === "Commercial deduction/penalty" && (
                <>
                  <div className="input-row half">
                    <InputItem
                      label="PENALTY TYPE"
                      value={penaltyType}
                      type="select"
                      required
                      onChange={(e) => setPenaltyType(e.target.value)}
                      selectOptions={["Credit", "Debit"]}
                    />
                    <InputItem
                      label="PENALTY VALUE"
                      value={penaltyValue}
                      type="text"
                      required
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(value)) {
                          setPenaltyValue(value);
                        }
                      }}
                      placeholder="ENTER PENALTY VALUE"
                    />
                  </div>

                  <div className="input-row half">
                    <SingleUploadFileBox
                      fileState={caAttachmentFile}
                      setFileState={setCaAttachmentFile}
                      label="COMMERCIAL AGREEMENT EVIDENCE"
                      acceptedFileTypes=".png,.jpg,.jpeg,.pdf"
                      required
                    />
                  </div>
                </>
              )}

              {/* Deviation Approval Fields */}
              {caReason === "Deviation approval" && (
                <>
                  <div className="input-row half">
                    <InputItem
                      label="DEVIATION TYPE"
                      value={deviationType}
                      type="select"
                      required
                      onChange={(e) => setDeviationType(e.target.value)}
                      selectOptions={[
                        "Specification",
                        "Finish",
                        "Dimension/tolerance",
                        "Other",
                      ]}
                    />
                  </div>

                  <div className="input-row full">
                    <InputItem
                      label="DEVIATION DESCRIPTION"
                      value={deviationDescription}
                      type="textarea"
                      required
                      onChange={(e) => setDeviationDescription(e.target.value)}
                    />
                  </div>

                  <div className="input-row full">
                    <div className="input-item">
                      <label className="custom">
                        <span>DOES ITEM REQUIRE NAME CHANGE?</span>
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
                            name="requiresNameChange"
                            value="Yes"
                            checked={requiresNameChange === "Yes"}
                            onChange={(e) =>
                              setRequiresNameChange(e.target.value)
                            }
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
                            name="requiresNameChange"
                            value="No"
                            checked={requiresNameChange === "No"}
                            onChange={(e) =>
                              setRequiresNameChange(e.target.value)
                            }
                          />
                          NO
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="input-row half">
                    <SingleUploadFileBox
                      fileState={caAttachmentFile}
                      setFileState={setCaAttachmentFile}
                      label="SUPPORTING DOCUMENTATION"
                      acceptedFileTypes=".png,.jpg,.jpeg,.pdf"
                      required
                    />
                  </div>
                </>
              )}

              {/* Client/Consultant Approval Fields */}
              {caReason === "Client/consultant approval" && (
                <>
                  <div className="input-row half">
                    <InputItem
                      label="APPROVAL SOURCE"
                      value={approvalSource}
                      type="select"
                      required
                      onChange={(e) => setApprovalSource(e.target.value)}
                      selectOptions={["Client", "Consultant", "Manager"]}
                    />
                  </div>

                  <div className="input-row half">
                    <SingleUploadFileBox
                      fileState={caAttachmentFile}
                      setFileState={setCaAttachmentFile}
                      label="APPROVAL DOCUMENT"
                      acceptedFileTypes=".png,.jpg,.jpeg,.pdf"
                      required
                    />
                  </div>
                </>
              )}

              {/* Extended Warranty/Guarantees Fields */}
              {caReason === "Extended warranty/guarantees" && (
                <>
                  <div className="input-row half">
                    <InputItem
                      label="TYPE"
                      value={warrantyType}
                      type="select"
                      required
                      onChange={(e) => setWarrantyType(e.target.value)}
                      selectOptions={["Warranty", "Guarantees"]}
                    />
                  </div>

                  <div className="input-row full">
                    <InputItem
                      label="REMARKS"
                      value={caRemarks}
                      type="textarea"
                      onChange={(e) => setCaRemarks(e.target.value)}
                    />
                  </div>

                  <div className="input-row half">
                    <SingleUploadFileBox
                      fileState={caAttachmentFile}
                      setFileState={setCaAttachmentFile}
                      label="SUPPORTING DOCUMENTS"
                      acceptedFileTypes=".png,.jpg,.jpeg,.pdf"
                      required
                    />
                  </div>
                </>
              )}
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
