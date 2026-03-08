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
    if (resolutionType === "Replace") {
      getMaterialCategoriesAndSubcategories();
    }
  }, [resolutionType]);

  // Filter subcategories based on selected category
  useEffect(() => {
    if (resolutionType !== "Replace") return;

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

    if (resolutionType === "Replace") {
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

          {/* Replace Fields */}
          {resolutionType === "Replace" && (
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
        </FormPopUp>
      )}
    </>
  );
}
