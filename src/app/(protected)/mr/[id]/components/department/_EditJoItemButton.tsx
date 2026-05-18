"use client";

import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ATTACHMENT_TYPES, JoLine } from "../../types/joLine";
import { BoqLine } from "@/app/(protected)/project/[id]/boq/[boqId]/types/boqLine";
import { formatPrice, formatPriceAED } from "@/lib/formatPrice";

type AttachmentItem = {
  id?: number;
  type: string;
  typeLabel: string;
  file?: File;
  url?: string;
  fileName?: string;
  isExisting?: boolean;
  previewUrl?: string;
};

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function isImageFile(fileName?: string): boolean {
  if (!fileName) return false;
  const lower = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatBudgetDisplay(val: string): string {
  if (!val) return "";
  const parts = val.split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

type props = {
  item: JoLine;
  projectID: number;
};

export default function EditJoItemButton({ item, projectID }: props) {
  const formatQty = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return num % 1 === 0
      ? num.toFixed(0)
      : parseFloat(num.toFixed(2)).toString();
  };

  const crossIcon = "/icons/cross-small.svg";

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pencilIcon = "/icons/pencil.svg";
  const trashIcon = "/icons/trash.svg";
  const externalLinkIcon = "/icons/external-link.svg";

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
  const [subcontractedQtys, setSubcontractedQtys] = useState<
    Record<number, string>
  >({});
  const [subcontractorBudget, setSubcontractorBudget] = useState<string>(
    item.budget_estimate ? String(item.budget_estimate) : "",
  );
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);
  const [qtyModes, setQtyModes] = useState<Record<number, "qty" | "pct">>({});
  const [pctValues, setPctValues] = useState<Record<number, string>>({});

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
              qtys[row.boq_line_id] = qty ? formatQty(qty) : "";
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
              const attType = ATTACHMENT_TYPES.find(
                (t) => t.key === att.attachment_type,
              );
              return {
                id: att.id,
                type: att.attachment_type,
                typeLabel: attType?.label || att.attachment_type,
                url: att.file_url,
                fileName: att.file_name,
                isExisting: true,
                previewUrl: isImageFile(att.file_name)
                  ? att.file_url
                  : undefined,
              };
            });
            setAttachments(existingAttachments);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const getActualSubcontractedQty = (boqId: number, boqQty: number) => {
    if (qtyModes[boqId] === "pct") {
      return ((Number(pctValues[boqId]) || 0) / 100) * boqQty;
    }
    return Number(subcontractedQtys[boqId]) || 0;
  };

  // Calculate sub-contracted works value
  const subcontractedWorksValue = selectedBoqLines.reduce((sum, boq) => {
    const qty = getActualSubcontractedQty(boq.id, Number(boq.quantity) || 0);
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
        const boq = lines.find((l) => l.id === id);
        newQtys[id] =
          subcontractedQtys[id] ||
          (boq?.quantity != null ? formatQty(boq.quantity) : "") ||
          "";
      });
      setSubcontractedQtys(newQtys);
    }
  };

  const removeBoqLine = (boqId: number) => {
    setBoqLineIDs((prev) => prev.filter((id) => id !== boqId));
    setSelectedBoqLines((prev) => prev.filter((boq) => boq.id !== boqId));
    setSubcontractedQtys((prev) => {
      const next = { ...prev };
      delete next[boqId];
      return next;
    });
  };

  // Handle attachment file upload from popup
  const handleAttachmentUpload = (
    typeKey: string,
    typeLabel: string,
    file: File,
  ) => {
    const previewUrl = isImageFile(file.name)
      ? URL.createObjectURL(file)
      : undefined;
    setAttachments((prev) => [
      ...prev,
      { type: typeKey, typeLabel, file, fileName: file.name, previewUrl },
    ]);
    setShowAttachmentPopup(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl && !removed.isExisting)
        URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
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
      const uploadedAttachments: {
        id?: number;
        type: string;
        url: string;
        file_name: string;
        isExisting?: boolean;
      }[] = [];

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
      const boqItems = boqLineIDs.map((id) => {
        const boq = selectedBoqLines.find((b) => b.id === id);
        return {
          boq_line_id: id,
          subcontracted_qty: getActualSubcontractedQty(
            id,
            Number(boq?.quantity) || 0,
          ),
        };
      });

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
          addButtonLabel={"CONFIRM"}
          style={{ width: "75dvw", height: "95dvh" }}
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
              itooltip="Define the exact scope of work including areas, materials, and exclusions. This will be shared with subcontractors for quotation and used as the reference for execution and billing."
            />
          </div>

          <br />

          {/* BOQ Section */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <label>BOQ REF.</label>
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
              <table
                className="items-table two-toned"
                style={{ width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ITEM</th>
                    <th>BOQ RATE</th>
                    <th>BOQ QTY</th>
                    <th>BOQ TOTAL PRICE</th>
                    <th style={{ width: "275px" }}>SUBCONTRACTED QTY</th>
                    <th>SUBCONTRACTED WORKS VALUE</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBoqLines.map((boq) => (
                    <tr key={boq.id}>
                      <td>{boq.item_number}</td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <strong>{boq.item_name}</strong>
                          {boq.item_description && (
                            <span
                              style={{
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {boq.item_description}
                            </span>
                          )}
                          {boq.location && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              <img
                                src="/icons/location-boq.svg"
                                alt="location"
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  marginBottom: "3px",
                                }}
                              />
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "rgba(105,105,105,1)",
                                }}
                              >
                                {boq.location}
                              </span>
                            </div>
                          )}
                          {boq.scope_of_work && (
                            <div>
                              <span
                                style={{
                                  backgroundColor: "rgba(225,225,225,1)",
                                  borderRadius: "50px",
                                  padding: "3px 10px",
                                  fontWeight: 600,
                                }}
                              >
                                {boq.scope_of_work}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatPrice(boq.rate_per_quantity)}
                      </td>
                      <td>
                        {formatQty(boq.quantity)} {boq.unit}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatPriceAED(boq.total_cost)}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            border: "1px solid rgba(217,217,217,1)",
                            borderRadius: "5px",
                            backgroundColor: "white",
                            overflow: "hidden",
                          }}
                        >
                          <input
                            type="text"
                            value={
                              qtyModes[boq.id] === "pct"
                                ? pctValues[boq.id] || ""
                                : subcontractedQtys[boq.id] || ""
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                if (qtyModes[boq.id] === "pct") {
                                  setPctValues((prev) => ({
                                    ...prev,
                                    [boq.id]: val,
                                  }));
                                } else {
                                  setSubcontractedQtys((prev) => ({
                                    ...prev,
                                    [boq.id]: val,
                                  }));
                                }
                              }
                            }}
                            placeholder={"ENTER SUBCONRACTED QTY"}
                            required
                            style={{
                              flex: 1,
                              border: "none",
                              borderRadius: 0,
                              padding: "7px",
                              background: "transparent",
                              width: "200px",
                            }}
                          />
                          <select
                            value={qtyModes[boq.id] === "pct" ? "pct" : "qty"}
                            onChange={(e) => {
                              const newMode = e.target.value as "qty" | "pct";
                              const boqQty = Number(boq.quantity) || 0;
                              if (newMode === "pct") {
                                const qty =
                                  Number(subcontractedQtys[boq.id]) || 0;
                                const pct =
                                  boqQty > 0 ? (qty / boqQty) * 100 : 0;
                                setPctValues((prev) => ({
                                  ...prev,
                                  [boq.id]: pct
                                    ? parseFloat(pct.toFixed(2)).toString()
                                    : "",
                                }));
                              } else {
                                const qty =
                                  ((Number(pctValues[boq.id]) || 0) / 100) *
                                  boqQty;
                                setSubcontractedQtys((prev) => ({
                                  ...prev,
                                  [boq.id]: qty
                                    ? parseFloat(qty.toFixed(4)).toString()
                                    : "",
                                }));
                              }
                              setQtyModes((prev) => ({
                                ...prev,
                                [boq.id]: newMode,
                              }));
                            }}
                            style={{
                              border: "none",
                              borderLeft: "none",
                              borderRadius: 0,
                              padding: "7px 4px",
                              background: "transparent",
                              cursor: "pointer",
                              width: "auto",
                              fontSize: "12px",
                            }}
                          >
                            <option value="qty">{boq.unit}</option>
                            <option value="pct">%</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatPriceAED(
                          (Number(boq.rate_per_quantity) || 0) *
                            getActualSubcontractedQty(
                              boq.id,
                              Number(boq.quantity) || 0,
                            ),
                        )}
                      </td>
                      <td>
                        <Button
                          componentType={"button"}
                          bgColor={"transparent"}
                          borderColor={"transparent"}
                          textColor={"black"}
                          style={{ padding: "0px" }}
                          onClick={() => removeBoqLine(boq.id)}
                        >
                          <img
                            src={crossIcon}
                            alt="remove"
                            style={{ marginBottom: "2px" }}
                          />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <br />
          <br />
          <br />

          {/* Sub-contracted Works Value + Subcontractor Budget */}
          <div className="input-row half">
            <InputItem
              label={"SUBCONTRACTED WORKS VALUE"}
              value={
                subcontractedWorksValue
                  ? formatPriceAED(subcontractedWorksValue)
                  : "CALCULATING..."
              }
              type={"text"}
              onChange={() => {}}
              postfixText={"AED"}
              required
              disabled
            />

            <InputItem
              label={"SUBCONTRACTOR BUDGET"}
              value={formatBudgetDisplay(subcontractorBudget)}
              type={"text postfix"}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                  setSubcontractorBudget(raw);
                }
              }}
              postfixText={"AED"}
              required
            />
          </div>

          <div className="input-row half">
            <div></div>
            {Number(subcontractorBudget) > 0 &&
              subcontractedWorksValue > 0 &&
              Number(subcontractorBudget) > subcontractedWorksValue && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <img src="/icons/warning.svg" alt="warning" />
                  <p style={{ color: "red" }}>
                    Subcontractor budget is higher than the subcontracted works
                    value.
                  </p>
                </div>
              )}
          </div>

          <br />
          <br />

          {/* Attachments Section */}
          <div>
            <label>ATTACHMENT</label>

            {attachments.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginTop: "10px",
                  marginBottom: "10px",
                }}
              >
                {attachments.map((att, i) => {
                  const attType = ATTACHMENT_TYPES.find(
                    (t) => t.key === att.type,
                  );
                  const fileSize = att.file?.size
                    ? att.file.size >= 1024 * 1024
                      ? `${(att.file.size / (1024 * 1024)).toFixed(1)}mb`
                      : `${(att.file.size / 1024).toFixed(0)}kb`
                    : null;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "15px 20px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(248,249,251,1)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        {attType?.icon && (
                          <img
                            src={attType.icon}
                            alt="icon"
                            style={{ width: "28px", height: "28px" }}
                          />
                        )}
                        <h4>{att.typeLabel}</h4>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "50px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "50px",
                            backgroundColor: "white",
                            borderRadius: "10px",
                            padding: "10px",
                            border: "1px solid rgba(217, 217, 217, 1)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              alignItems: "center",
                            }}
                          >
                            <img
                              src={
                                att.previewUrl
                                  ? att.previewUrl
                                  : "/icons/pdf.svg"
                              }
                              alt="file"
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: att.previewUrl
                                  ? "4px"
                                  : undefined,
                                objectFit: att.previewUrl ? "cover" : undefined,
                              }}
                            />
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span>{att.fileName?.toUpperCase()}</span>
                              {fileSize && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "rgba(128,128,128,1)",
                                  }}
                                >
                                  {fileSize}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "10px" }}>
                            {(att.url || att.previewUrl) && (
                              <Button
                                componentType={"link"}
                                bgColor={"rgba(239, 239, 239, 1)"}
                                borderColor={"rgba(223, 223, 223, 1)"}
                                textColor={"black"}
                                style={{ padding: "7px 7px" }}
                                href={att.url || att.previewUrl}
                              >
                                <img src={externalLinkIcon} alt="delete" />
                              </Button>
                            )}

                            <Button
                              componentType={"button"}
                              bgColor={"rgba(239, 239, 239, 1)"}
                              borderColor={"rgba(223, 223, 223, 1)"}
                              textColor={"black"}
                              style={{ padding: "7px 7px" }}
                              onClick={() => removeAttachment(i)}
                            >
                              <img src={trashIcon} alt="delete" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: "10px" }}>
              <Button
                componentType={"button"}
                bgColor={"rgba(248, 249, 251, 1)"}
                borderColor={"rgba(248, 249, 251, 1)"}
                textColor={"black"}
                onClick={(e) => {
                  e.preventDefault();
                  setShowAttachmentPopup(true);
                }}
                full
                style={{ padding: "32px" }}
              >
                ADD ATTACHMENT +
              </Button>
            </div>
          </div>
        </FormPopUp>
      )}

      {showAttachmentPopup && (
        <FormPopUp
          header={"ADD ATTACHMENT"}
          setIsOpen={setShowAttachmentPopup}
          style={{ minWidth: "700px" }}
        >
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
                  borderRadius: "5px",
                  padding: "32px",
                  display: "flex",
                  alignItems: "center",
                  gap: "30px",
                  backgroundColor: "rgba(248, 249, 251, 1)",
                }}
              >
                <img
                  src={attType.icon}
                  alt="icon"
                  style={{ width: "32px", height: "32px", flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: "3px" }}>{attType.label}</h3>
                  <span
                    style={{
                      color: "rgba(146, 144, 144, 1)",
                      fontStyle: "italic",
                    }}
                  >
                    {attType.description}
                  </span>
                </div>
                <label
                  style={{
                    cursor: "pointer",
                    backgroundColor: "black",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img src="/icons/upload.svg" alt="upload" />
                  <input
                    type="file"
                    accept=".pdf,.jpeg,.jpg,.png,.webp,.doc,.docx,.xls,.xlsx"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleAttachmentUpload(
                          attType.key,
                          attType.label,
                          file,
                        );
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </FormPopUp>
      )}
    </>
  );
}
