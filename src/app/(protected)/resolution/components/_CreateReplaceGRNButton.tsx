"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import DownloadGRNButton from "@/app/(protected)/resolution/components/_DownloadGRNButton";

type ReplaceDetail = {
  id: number;
  qc_mr_line_id: number;
  lpo_id: number;
  lpo_mr_line_id: number;
  replaced_quantity: number;
  replacement_type: string;
  material_description: string;
  new_material_name: string | null;
  unit: string;
  supplier_name: string;
  replacement_grn_id: number | null;
  replacement_grn: {
    id: number;
    received_date: string;
    received_by: string;
    grn_lines: any[];
  } | null;
};

type CreateReplaceGRNButtonProps = {
  detail: ReplaceDetail;
  onRefresh?: () => void;
};

export default function CreateReplaceGRNButton({
  detail,
  onRefresh,
}: CreateReplaceGRNButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const plusIcon = "/icons/plus.svg";
  const uploadIcon = "/icons/upload.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const crossIcon = "/icons/cross-small.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isUploadAttachmentOpen, setIsUploadAttachmentOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [receivedDate, setReceivedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [receivedQty, setReceivedQty] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const isEditMode = !!detail.replacement_grn;
  const existingGrn = detail.replacement_grn;

  const formatQuantity = useCallback(
    (quantity: number | string | undefined | null): string => {
      if (quantity === undefined || quantity === null || quantity === "")
        return "";
      const num =
        typeof quantity === "string" ? parseFloat(quantity) : quantity;
      if (isNaN(num)) return "";
      if (Number.isInteger(num)) return num.toString();
      const withFixed = num.toFixed(10);
      const trimmed = withFixed.replace(/\.?0+$/, "");
      if (!trimmed.includes(".")) return trimmed;
      return trimmed;
    },
    [],
  );

  // Load existing GRN data when modal opens
  useEffect(() => {
    if (existingGrn && isOpen) {
      if (existingGrn.received_date) {
        const date = new Date(existingGrn.received_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        setReceivedDate(`${year}-${month}-${day}`);
      }

      const grnLine = existingGrn.grn_lines?.find(
        (gl: any) => gl.lpo_mr_line_id === detail.lpo_mr_line_id,
      );
      if (grnLine) {
        setReceivedQty(formatQuantity(grnLine.received_quantity));
        setNotes(grnLine.notes || "");
        if (grnLine.attachment) {
          try {
            const parsed =
              typeof grnLine.attachment === "string"
                ? JSON.parse(grnLine.attachment)
                : grnLine.attachment;
            setAttachmentUrl(Array.isArray(parsed) ? parsed[0] : parsed || "");
          } catch {
            setAttachmentUrl(grnLine.attachment);
          }
        }
      }
    }
  }, [existingGrn, isOpen, detail.lpo_mr_line_id, formatQuantity]);

  async function uploadFileToS3(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("folder", "grn-attachments");
    formData.append("files", file);
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Upload failed");
    const data = await response.json();
    return data.urls[0];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!receivedQty) {
      toast("Please enter received quantity", "error");
      return;
    }

    if (!attachmentFile && !attachmentUrl) {
      toast("Please upload an attachment", "error");
      return;
    }

    setIsUploading(true);
    try {
      let finalAttachmentUrl = attachmentUrl;
      if (attachmentFile) {
        finalAttachmentUrl = await uploadFileToS3(attachmentFile);
      }

      const grnLinesArray = [
        {
          lpo_mr_line_id: detail.lpo_mr_line_id,
          received_quantity: receivedQty,
          notes: notes || null,
          attachment: finalAttachmentUrl || null,
        },
      ];

      if (isEditMode && existingGrn) {
        // Update existing replacement GRN
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/grn`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateGRN",
            grn_id: existingGrn.id,
            lpo_id: detail.lpo_id,
            received_date: receivedDate,
            received_by: userInfo?.name,
            grn_lines: grnLinesArray,
          }),
        });

        if (res.ok) {
          toast("Good received note updated", "success");
          setIsOpen(false);
          onRefresh?.();
          setTimeout(() => router.refresh(), 100);
        } else {
          toast("Failed to update GRN", "error");
        }
      } else {
        // Create new replacement GRN
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/grn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createGRN",
            lpo_id: detail.lpo_id,
            received_date: receivedDate,
            received_by: userInfo?.name,
            grn_lines: grnLinesArray,
          }),
        });

        if (res.ok) {
          const grnData = await res.json();
          const newGrnId = grnData.grnId;

          // Save the new GRN ID to the resolution record
          if (newGrnId) {
            await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "setReplacementGrnId",
                  resolution_id: detail.id,
                  grn_id: newGrnId,
                }),
              },
            );
          }

          toast("Good received note created", "success");
          setIsOpen(false);
          onRefresh?.();
          setTimeout(() => router.refresh(), 100);
        } else {
          toast("Failed to create GRN", "error");
        }
      }
    } catch (error) {
      console.error("Error submitting GRN:", error);
      toast("Failed to create GRN", "error");
    } finally {
      setIsUploading(false);
    }
  }

  const handleReceivedQuantityChange = (value: string) => {
    if (value === "") {
      setReceivedQty("");
      return;
    }
    let sanitized = value.replace(/[^\d.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) {
      sanitized = parts[0] + "." + parts.slice(1).join("");
    }
    if (parts.length === 2 && parts[1].length > 3) {
      sanitized = parts[0] + "." + parts[1].slice(0, 3);
    }
    const shouldFormat = !sanitized.endsWith(".");
    const finalValue = shouldFormat ? formatQuantity(sanitized) : sanitized;
    setReceivedQty(finalValue);
  };

  return (
    <>
      {detail.replacement_grn_id ? (
        <DownloadGRNButton
          grnId={detail.replacement_grn_id}
          bgColor="white"
          style={{ padding: "5px 10px", borderRadius: "25px" }}
        />
      ) : (
        <Button
          componentType={"button"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          onClick={() => setIsOpen(true)}
          style={{ padding: "7px 20px", borderRadius: "25px" }}
          disabled={isUploading}
        >
          Create GRN +
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header={
            isEditMode
              ? "UPDATE GOOD RECEIVED NOTE"
              : "CREATE GOOD RECEIVED NOTE"
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"VENDOR NAME"}
              value={detail.supplier_name}
              type={"text"}
              required
              onChange={() => {}}
              disabled
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"RECEIVED DATE"}
              value={receivedDate}
              type={"date"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"RECEIVED BY"}
              value={userInfo?.name || ""}
              type={"text"}
              required
              onChange={() => {}}
              disabled
            />
          </div>

          <br />

          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ITEM</th>
                <th>REPLACED QTY</th>
                <th>RECEIVED QTY</th>
                <th>NOTES</th>
                <th>ATTACHMENT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>
                  {detail.replacement_type === "Approved alternative" && detail.new_material_name
                    ? detail.new_material_name
                    : detail.material_description}
                </td>
                <td>
                  {formatQuantity(detail.replaced_quantity)} {detail.unit}
                </td>
                <td>
                  <InputItem
                    label={""}
                    value={receivedQty}
                    type={"text"}
                    placeholder={"ENTER RECEIVED QTY"}
                    required
                    onChange={(e) =>
                      handleReceivedQuantityChange(e.target.value)
                    }
                    style={{ minWidth: "200px", marginBottom: "0px" }}
                  />
                </td>
                <td>
                  <Button
                    componentType={"button"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"rgba(223, 223, 223, 1)"}
                    textColor={"black"}
                    style={{ borderRadius: "5px", padding: "7px 7px" }}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsNotesOpen(true);
                    }}
                  >
                    <img
                      src={notes ? pencilIcon : plusIcon}
                      alt={notes ? "edit notes" : "add notes"}
                    />
                  </Button>
                </td>
                <td>
                  {attachmentUrl || attachmentFile ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      {attachmentUrl && (
                        <Button
                          componentType={"link"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ padding: "7px 7px" }}
                          href={attachmentUrl}
                          target="_blank"
                        >
                          <img src={externalLinkIcon} alt="view" />
                        </Button>
                      )}
                      {attachmentFile && !attachmentUrl && (
                        <Button
                          componentType={"button"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ padding: "7px 7px" }}
                          onClick={(e) => {
                            e.preventDefault();
                            const fileUrl = URL.createObjectURL(attachmentFile);
                            window.open(fileUrl, "_blank");
                          }}
                        >
                          <img src={externalLinkIcon} alt="view" />
                        </Button>
                      )}
                      <img
                        src={crossIcon}
                        alt="remove"
                        onClick={() => {
                          setAttachmentFile(null);
                          setAttachmentUrl("");
                        }}
                        style={{
                          cursor: isUploading ? "not-allowed" : "pointer",
                          opacity: isUploading ? 0.5 : 1,
                        }}
                      />
                    </div>
                  ) : (
                    <Button
                      componentType={"button"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{ padding: "7px 7px" }}
                      onClick={(e) => {
                        e.preventDefault();
                        setIsUploadAttachmentOpen(true);
                      }}
                      disabled={isUploading}
                    >
                      <img
                        src={uploadIcon}
                        style={{ filter: "invert(1)" }}
                        alt="upload"
                      />
                    </Button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </FormPopUp>
      )}

      {isNotesOpen && (
        <FormPopUp
          header={notes ? "EDIT NOTES" : "ADD NOTES"}
          setIsOpen={setIsNotesOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            setIsNotesOpen(false);
          }}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <InputItem
              label={"NOTES"}
              value={notes}
              type={"textarea"}
              placeholder={"ENTER NOTES"}
              required={false}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}

      {isUploadAttachmentOpen && (
        <FormPopUp
          header={"UPLOAD ATTACHMENT"}
          setIsOpen={setIsUploadAttachmentOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            if (!attachmentFile) {
              toast("Please select a file to upload", "error");
              return;
            }
            setIsUploadAttachmentOpen(false);
          }}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <SingleUploadFileBox
              fileState={attachmentFile}
              setFileState={setAttachmentFile}
              label={""}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png,.webp"}
              placeholder=""
              buttonLabel="SELECT OR DROP FILE"
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
