"use client";

import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { JoLine } from "../../types/joLine";
import { BoqLine } from "@/app/(protected)/project/[id]/boq/[boqId]/types/boqLine";
import { formatPriceAED } from "@/lib/formatPrice";

const ATTACHMENT_TYPES = [
  { key: "design_drawings", label: "DESIGN & DRAWINGS", description: "e.g., Architectural Drawings, Structural Drawings, etc." },
  { key: "hse_compliance", label: "HSE & COMPLIANCE", description: "e.g., Site HSE plan, Insurance requirements" },
  { key: "scope_pricing", label: "SCOPE & PRICING", description: "e.g., BOQ bid form, scope of work document, rate schedule etc" },
  { key: "contract_commercial", label: "CONTRACT & COMMERCIAL", description: "e.g., Draft subcontract agreement, Payment terms schedule, etc" },
  { key: "technical_specifications", label: "TECHNICAL SPECIFICATIONS", description: "e.g., Project specification, Material approval schedule" },
  { key: "surveys_existing_conditions", label: "SURVEYS & EXISTING CONDITIONS", description: "e.g., Topographical survey, Soil investigation report" },
  { key: "programme_logistics", label: "PROGRAMME & LOGISTICS", description: "e.g., Master programme, Subcontract programme" },
  { key: "prequalification_admin", label: "PRE-QUALIFICATION & ADMIN", description: "e.g., Pre-qualification questionnaire, NDA" },
];

type AttachmentItem = {
  id?: number;
  type: string;
  typeLabel: string;
  file?: File;
  url?: string;
  fileName?: string;
  isExisting?: boolean;
};

type props = {
  item: JoLine;
  projectID: number;
};

export default function EditJoItemButton({ item, projectID }: props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pencilIcon = "/icons/pencil.svg";
  const trashIcon = "/icons/trash.svg";

  // Form state
  const [jobScope, setJobScope] = useState(item.job_scope_name || "");
  const [contractType, setContractType] = useState(item.contract_type || "");
  const [jobDescription, setJobDescription] = useState(item.job_description);
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>(() => {
    if (item.boq_line_ids) {
      if (typeof item.boq_line_ids === "string") {
        return item.boq_line_ids
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "")
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
      }
      if (typeof item.boq_line_ids === "number") {
        return [item.boq_line_ids];
      }
    }
    return [];
  });
  const [selectedBoqLines, setSelectedBoqLines] = useState<BoqLine[]>([]);
  const [subcontractedQtys, setSubcontractedQtys] = useState<Record<number, string>>({});
  const [subcontractorBudget, setSubcontractorBudget] = useState<string | number>(
    item.budget_estimate || "",
  );
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);

  // Fetch BOQ lines for the project to populate the selected items table
  useEffect(() => {
    if (isOpen && projectID) {
      // Fetch all BOQ lines for this project
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqLinesWithNumberRef`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectID }),
        },
      )
        .then((res) => res.json())
        .then((data: BoqLine[]) => {
          if (Array.isArray(data)) {
            const selected = data.filter((boq) => boqLineIDs.includes(boq.id));
            setSelectedBoqLines(selected);
          }
        })
        .catch(console.error);

      // Fetch subcontracted qtys from junction table
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getBoqItemsByJoLineID",
          jo_line_id: item.id,
        }),
      })
        .then((res) => res.json())
        .then((data: any[]) => {
          if (Array.isArray(data)) {
            const qtys: Record<number, string> = {};
            data.forEach((row) => {
              const qty = Number(row.subcontracted_qty);
              qtys[row.boq_line_id] = qty ? String(qty) : "";
            });
            setSubcontractedQtys(qtys);
          }
        })
        .catch(console.error);

      // Fetch existing attachments
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getAttachmentsByJoLineID",
          jo_line_id: item.id,
        }),
      })
        .then((res) => res.json())
        .then((data: any[]) => {
          if (Array.isArray(data)) {
            const existingAttachments: AttachmentItem[] = data.map((att) => {
              const attType = ATTACHMENT_TYPES.find((t) => t.key === att.attachment_type);
              return {
                id: att.id,
                type: att.attachment_type,
                typeLabel: attType?.label || att.attachment_type,
                url: att.file_url,
                fileName: att.file_name,
                isExisting: true,
              };
            });
            setAttachments(existingAttachments);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Calculate sub-contracted works value
  const subcontractedWorksValue = selectedBoqLines.reduce((sum, boq) => {
    const qty = Number(subcontractedQtys[boq.id]) || 0;
    const rate = Number(boq.rate_per_quantity) || 0;
    return sum + qty * rate;
  }, 0);

  // Handle BOQ selection
  const handleBoqSelect = (ids: number[], _info: string, lines?: BoqLine[]) => {
    setBoqLineIDs(ids);
    if (lines) {
      setSelectedBoqLines(lines);
      const newQtys: Record<number, string> = {};
      ids.forEach((id) => {
        newQtys[id] = subcontractedQtys[id] || "";
      });
      setSubcontractedQtys(newQtys);
    }
  };

  // Handle attachment file upload from popup
  const handleAttachmentUpload = (typeKey: string, typeLabel: string, file: File) => {
    setAttachments((prev) => [
      ...prev,
      { type: typeKey, typeLabel, file, fileName: file.name },
    ]);
    setShowAttachmentPopup(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (boqLineIDs.length === 0) {
      toast("Please select at least one BOQ item", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload new attachment files
      const uploadedAttachments: { id?: number; type: string; url: string; file_name: string; isExisting?: boolean }[] = [];

      for (const att of attachments) {
        if (att.isExisting && att.url) {
          // Keep existing attachments
          uploadedAttachments.push({
            id: att.id,
            type: att.type,
            url: att.url,
            file_name: att.fileName || "",
            isExisting: true,
          });
        } else if (att.file) {
          // Upload new file
          const formData = new FormData();
          formData.append("folder", "jo-attachments");
          formData.append("files", att.file);

          const uploadRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
            { method: "POST", body: formData },
          );

          if (!uploadRes.ok) {
            toast("Failed to upload attachment", "error");
            setIsSubmitting(false);
            return;
          }

          const uploadData = await uploadRes.json();
          const url = uploadData.urls?.[0] || uploadData.url;
          uploadedAttachments.push({
            type: att.type,
            url,
            file_name: att.fileName || att.file.name,
          });
        }
      }

      // Build boq_items with subcontracted qty
      const boqItems = boqLineIDs.map((id) => ({
        boq_line_id: id,
        subcontracted_qty: Number(subcontractedQtys[id]) || 0,
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateJoLine",
          id: item.id,
          job_scope: jobScope,
          contract_type: contractType,
          job_description: jobDescription,
          boq_items: boqItems,
          subcontracted_works_value: subcontractedWorksValue,
          subcontractor_budget: subcontractorBudget || 0,
          start_date: null,
          end_date: null,
          attachments: uploadedAttachments,
        }),
      });

      if (res.ok) {
        toast("Job updated", "success");
        router.refresh();
        setIsOpen(false);
      } else {
        toast("Failed to update job", "error");
      }
    } catch {
      toast("Failed to update job", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={pencilIcon} alt="edit" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"EDIT JOB"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"SAVE CHANGES"}
          style={{ minWidth: "1000px" }}
        >
          {/* Job Scope + Contract Type */}
          <div className="input-row half">
            <SingleSelectDropdown
              label={"JOB SCOPE"}
              selectedValue={jobScope}
              onChange={(val) => setJobScope(String(val))}
              placeholder={"SELECT TYPE"}
              selectOptions={[
                "Civil works",
                "Demolition",
                "MEP",
                "Finishes",
                "Fitout",
                "External works",
                "Specialist",
              ]}
              required
            />

            <SingleSelectDropdown
              label={"CONTRACT TYPE"}
              selectedValue={contractType}
              onChange={(val) => setContractType(String(val))}
              placeholder={"SELECT TYPE"}
              selectOptions={[
                "Labour only",
                "Supply & install",
                "Supply only",
                "Install only",
                "Full subcontract",
              ]}
              required
            />
          </div>

          {/* Job Description */}
          <div className="input-row full">
            <InputItem
              label={"JOB DESCRIPTION"}
              value={jobDescription}
              type={"textarea"}
              required
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          {/* BOQ Section */}
          <div style={{ marginBottom: "15px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <label style={{ fontWeight: 600, fontSize: "12px" }}>BOQ</label>
              {boqLineIDs.length > 0 && (
                <div style={{ width: "fit-content" }}>
                  <MultipleSelectBoqItemButton
                    projectID={projectID}
                    currentBoqLineIDs={boqLineIDs}
                    onSelectBoq={handleBoqSelect}
                    style={{ padding: "7px 15px", fontSize: "12px" }}
                  />
                </div>
              )}
            </div>

            {boqLineIDs.length === 0 && (
              <MultipleSelectBoqItemButton
                projectID={projectID}
                currentBoqLineIDs={boqLineIDs}
                onSelectBoq={handleBoqSelect}
              />
            )}

            {boqLineIDs.length > 0 && selectedBoqLines.length > 0 && (
              <table className="items-table alt two-toned" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>#</th>
                    <th>ITEM</th>
                    <th style={{ width: "120px" }}>QUANTITY</th>
                    <th style={{ width: "160px" }}>SUB-CONTRACTED QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBoqLines.map((boq) => (
                    <tr key={boq.id}>
                      <td>{boq.item_number}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <strong>{boq.item_name}</strong>
                          {boq.item_description && (
                            <span style={{ color: "rgba(105,105,105,1)", fontSize: "13px" }}>
                              {boq.item_description}
                            </span>
                          )}
                          {boq.location && (
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {boq.location.split(",").map((loc, i) => (
                                <span
                                  key={i}
                                  style={{
                                    backgroundColor: "rgba(240,240,240,1)",
                                    borderRadius: "4px",
                                    padding: "2px 8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: "rgba(80,80,80,1)",
                                  }}
                                >
                                  {loc.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          {boq.scope_of_work && (
                            <div>
                              <span
                                style={{
                                  backgroundColor: "black",
                                  color: "white",
                                  borderRadius: "4px",
                                  padding: "3px 10px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                {boq.scope_of_work}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {boq.quantity} {boq.unit}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={subcontractedQtys[boq.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              setSubcontractedQtys((prev) => ({
                                ...prev,
                                [boq.id]: val,
                              }));
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(223,223,223,1)",
                            fontSize: "14px",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sub-contracted Works Value + Subcontractor Budget */}
          <div className="input-row half">
            <div className="input-item">
              <label className="custom">
                <span>SUB-CONTRACTED WORKS VALUE</span>
              </label>
              <div
                style={{
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(223,223,223,1)",
                  backgroundColor: "rgba(245,245,245,1)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "rgba(80,80,80,1)",
                }}
              >
                {formatPriceAED(subcontractedWorksValue)}
              </div>
            </div>

            <InputItem
              label={"SUB-CONTRACTOR BUDGET"}
              value={subcontractorBudget}
              type={"text postfix"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setSubcontractorBudget(val);
                }
              }}
              postfixText={"AED"}
            />
          </div>

          {/* Attachments Section */}
          <div style={{ marginTop: "10px" }}>
            <label style={{ fontWeight: 600, fontSize: "12px" }}>ATTACHMENT</label>

            {attachments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px", marginBottom: "10px" }}>
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 15px",
                      borderRadius: "10px",
                      border: "1px solid rgba(223,223,223,1)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <strong style={{ fontSize: "13px" }}>{att.typeLabel}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          backgroundColor: "rgba(255,230,230,1)",
                          borderRadius: "8px",
                          padding: "6px 12px",
                        }}
                      >
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>
                          {att.fileName?.toUpperCase()}
                        </span>
                      </div>
                      {att.isExisting && att.url && (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            border: "1px solid rgba(223,223,223,1)",
                            borderRadius: "8px",
                            padding: "6px 8px",
                            display: "flex",
                            alignItems: "center",
                            textDecoration: "none",
                          }}
                        >
                          <img src="/icons/external-link.svg" alt="open" style={{ width: "16px" }} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        style={{
                          background: "none",
                          border: "1px solid rgba(223,223,223,1)",
                          borderRadius: "8px",
                          padding: "6px 8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <img src={trashIcon} alt="delete" style={{ width: "16px" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "10px" }}>
              <Button
                componentType={"button"}
                bgColor={"white"}
                borderColor={"rgba(223,223,223,1)"}
                textColor={"black"}
                onClick={(e) => {
                  e.preventDefault();
                  setShowAttachmentPopup(true);
                }}
                full
                style={{ padding: "12px", fontWeight: 600 }}
              >
                ADD ATTACHMENT +
              </Button>
            </div>
          </div>

          {/* Attachment Type Selection Popup */}
          {showAttachmentPopup &&
            typeof window !== "undefined" &&
            createPortal(
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 100000,
                }}
                onClick={() => setShowAttachmentPopup(false)}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "15px",
                    padding: "30px",
                    width: "700px",
                    maxHeight: "80vh",
                    overflowY: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "25px",
                    }}
                  >
                    <h3 style={{ margin: 0 }}>ADD ATTACHMENT</h3>
                    <button
                      type="button"
                      onClick={() => setShowAttachmentPopup(false)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "24px",
                        cursor: "pointer",
                        fontWeight: 300,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "15px",
                    }}
                  >
                    {ATTACHMENT_TYPES.map((attType) => (
                      <div
                        key={attType.key}
                        style={{
                          border: "1px solid rgba(223,223,223,1)",
                          borderRadius: "12px",
                          padding: "20px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "15px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>
                            {attType.label}
                          </strong>
                          <span style={{ fontSize: "11px", color: "rgba(128,128,128,1)" }}>
                            {attType.description}
                          </span>
                        </div>
                        <label
                          style={{
                            cursor: "pointer",
                            backgroundColor: "rgba(240,240,240,1)",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: "1px solid rgba(210,210,210,1)",
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <input
                            type="file"
                            accept=".pdf,.jpeg,.jpg,.png,.webp,.doc,.docx,.xls,.xlsx"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleAttachmentUpload(attType.key, attType.label, file);
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>,
              document.body,
            )}
        </FormPopUp>
      )}
    </>
  );
}
