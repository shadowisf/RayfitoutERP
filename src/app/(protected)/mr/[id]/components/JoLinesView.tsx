"use client";

import { JoLine } from "../types/joLine";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import Button from "@/app/components/Button";
import AddJoItemButton from "./department/_AddJoItemButton";
import JoApprovalButtons from "./manager/_JoApprovalButtons";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import BoqReferencePopUp from "./BoqReferencePopUp";
import SubmitForQSApprovalButton from "./department/_SubmitForQSApprovalButton";
import SubmitForInitialApprovalButton from "./quantitySurveyor/_SubmitForInitialApprovalButton";
import SubmitForQuotationsButton from "./manager/_SubmitForQuotationsButton";
import SubmitForResubmissionButton from "./manager/_SubmitForInitialResubmissionButton";

type JoLinesViewProps = {
  joLines: JoLine[];
  mrHeader: MrHeader;
};

export default function JoLinesView({ joLines, mrHeader }: JoLinesViewProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";
  const trashIcon = "/icons/trash.svg";

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 9 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  const formatNumber = (value: unknown): string => {
    const num = Number(value);
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
  };

  // Check if all items have been reviewed (approved or rejected)
  const allItemsReviewed = joLines.every(
    (item) =>
      item.approval_status === "Approved" ||
      item.approval_status === "Rejected",
  );

  const allItemsApproved = joLines.every(
    (item) => item.approval_status === "Approved",
  );

  const hasRejectedItems = joLines.some(
    (item) => item.approval_status === "Rejected",
  );

  // Calculate total budget
  const totalBudget = joLines.reduce(
    (sum, item) => sum + (Number(item.budget_estimate) || 0),
    0,
  );

  return (
    <>
      <div className="subcategory-section">
        <div className="subcategory-header">
          <h2 style={{ textTransform: "uppercase" }}>JOB ITEMS</h2>

          <div className="right">
            {/* Department can add items in Draft (1) and Resubmission (5) */}
            {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
              userInfo?.departmentID === mrHeader.department_id && (
                <AddJoItemButton
                  mrHeaderID={mrHeader.id}
                  projectID={mrHeader.project_id}
                  bgColor="black"
                  borderColor="black"
                  textColor="white"
                >
                  ADD JOB ITEM +
                </AddJoItemButton>
              )}
          </div>
        </div>

        <br />

        <table className="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>SCOPE</th>
              <th>DESCRIPTION</th>
              <th>BOQ REF.</th>
              <th>QTY</th>
              <th>UNIT</th>
              {canSeePrice && <th>BUDGET EST.</th>}
              <th>START DATE</th>
              <th>END DATE</th>
              <th>ATTACHMENT</th>
              {/* Show approval column during Manager Approval (3) */}
              {mrHeader.progress_id === 3 && <th>APPROVAL</th>}
              {/* Show delete in Draft / Resubmission */}
              {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                userInfo?.departmentID === mrHeader.department_id && <th></th>}
            </tr>
          </thead>
          <tbody>
            {joLines.map((item: JoLine, index: number) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.job_scope_name || "-"}</td>
                <td style={{ maxWidth: "250px" }}>
                  {item.job_description ? (
                    item.job_description.length > 60 ? (
                      <InfoPopUpButton
                        text={
                          <>
                            <small>JOB DESCRIPTION</small>
                            <h2>{item.job_description}</h2>
                          </>
                        }
                        header="JOB DESCRIPTION"
                      />
                    ) : (
                      item.job_description
                    )
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {item.boq_line_ids ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>
                        {item.boq_item_numbers || "-"}
                      </span>
                      <BoqReferencePopUp item={item} mrHeader={mrHeader} />
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {formatNumber(item.quantity)} {item.unit}
                </td>
                <td>{item.unit}</td>
                {canSeePrice && (
                  <td>AED {Number(item.budget_estimate || 0).toFixed(2)}</td>
                )}
                <td>
                  {item.start_date
                    ? new Date(item.start_date).toLocaleDateString("en-US")
                    : "-"}
                </td>
                <td>
                  {item.end_date
                    ? new Date(item.end_date).toLocaleDateString("en-US")
                    : "-"}
                </td>
                <td>
                  {item.attachment ? (
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{ padding: "7px 7px" }}
                      href={item.attachment}
                      target="_blank"
                    >
                      <img src={externalLinkIcon} alt="external link" />
                    </Button>
                  ) : (
                    "-"
                  )}
                </td>

                {/* Approval buttons during Manager Approval stage */}
                {mrHeader.progress_id === 3 && (
                  <td>
                    <JoApprovalButtons item={item} />
                  </td>
                )}

                {/* Delete button in Draft / Resubmission */}
                {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                  userInfo?.departmentID === mrHeader.department_id && (
                    <td>
                      <DeleteJoItemButton itemId={item.id} />
                    </td>
                  )}
              </tr>
            ))}
          </tbody>

          {canSeePrice && (
            <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
              <tr>
                <td
                  colSpan={6}
                  style={{ fontWeight: "600", padding: "15px 20px" }}
                >
                  TOTAL BUDGET
                </td>
                <td style={{ fontWeight: "600", padding: "15px 20px" }}>
                  AED {totalBudget.toFixed(2)}
                </td>
                <td colSpan={10}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Bottom action nav — stage transitions */}

      {/* Draft (1) - Department submits for QS/Manager approval */}
      {mrHeader.progress_id === 1 &&
        userInfo?.departmentID === mrHeader.department_id &&
        joLines.length > 0 && (
          <div className="bottom-nav">
            <div></div>
            <SubmitForQSApprovalButton mrHeader={mrHeader} />
          </div>
        )}

      {/* QS Review (2) - For JO, QS forwards to Manager Approval */}
      {mrHeader.progress_id === 2 && userInfo?.departmentID === 16 && (
        <div className="bottom-nav">
          <div></div>
          <SubmitForInitialApprovalButton mrHeader={mrHeader} />
        </div>
      )}

      {/* Manager Approval (3) - Submit for quotations or resubmission */}
      {mrHeader.progress_id === 3 &&
        userInfo?.departmentID === 8 &&
        allItemsReviewed && (
          <div className="bottom-nav">
            <div></div>
            {hasRejectedItems ? (
              <SubmitForResubmissionButton mrHeader={mrHeader} />
            ) : (
              <SubmitForQuotationsButton mrHeader={mrHeader} />
            )}
          </div>
        )}
    </>
  );
}

// Simple inline delete button component
function DeleteJoItemButton({ itemId }: { itemId: number }) {
  const router = useRouter();
  const trashIcon = "/icons/trash.svg";

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this job line?")) return;

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteItem", id: itemId }),
    });

    if (res.ok) {
      toast("Job line deleted", "success");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "5px",
      }}
    >
      <img src={trashIcon} alt="delete" style={{ width: "14px" }} />
    </button>
  );
}
