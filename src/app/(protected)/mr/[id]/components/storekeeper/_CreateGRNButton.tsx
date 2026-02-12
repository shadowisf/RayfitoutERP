"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MrLine } from "../../types/mrLine";
import { useAuth } from "@/app/context/AuthContext";
import { LpoHeader } from "../../types/lpoHeader";
import { MrHeader } from "../../types/mrHeader";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";

type CreateGRNButtonProps = {
  mrHeader: MrHeader;
  mrLines: MrLine[];
  progress_id: number;
};

type GRNLineItem = {
  lpo_mr_line_id: number;
  received_quantity: string;
  notes: string;
  attachment: string;
  attachmentFile?: File | null;
};

type GRN = {
  id: number;
  lpo_id: number;
  received_date: string;
  received_by: string;
  grn_lines: any[];
};

export default function CreateGRNButton({
  mrHeader,
  mrLines,
  progress_id,
}: CreateGRNButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const warningIcon = "/icons/warning.svg";
  const checkGreenIcon = "/icons/check-green.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const plusIcon = "/icons/plus.svg";
  const uploadIcon = "/icons/upload.svg";
  const crossIcon = "/icons/cross-small.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isUploadAttachmentOpen, setIsUploadAttachmentOpen] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState<
    number | null
  >(null);
  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);
  const [lpo, setLpo] = useState<LpoHeader | null>(null);
  const [lpoMrLines, setLpoMrLines] = useState<any[]>([]);
  const [existingGrn, setExistingGrn] = useState<GRN | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [receivedDate, setReceivedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [grnLines, setGrnLines] = useState<{ [key: number]: GRNLineItem }>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [qcAcceptedQuantities, setQcAcceptedQuantities] = useState<{
    [key: number]: number | null;
  }>({});

  // Helper function to format quantity
  const formatQuantity = (
    quantity: number | string | undefined | null,
  ): string => {
    if (quantity === undefined || quantity === null || quantity === "")
      return "0";
    const num = typeof quantity === "string" ? parseFloat(quantity) : quantity;
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(10)).toString();
  };

  // Helper to parse quantity for comparison
  const parseQuantity = (
    quantity: number | string | undefined | null,
  ): number => {
    if (quantity === undefined || quantity === null || quantity === "")
      return 0;
    const num = typeof quantity === "string" ? parseFloat(quantity) : quantity;
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    if (mrLines.length > 0 && mrLines[0]?.approved_supplier_id) {
      checkExistingLpo();
    }
  }, [mrHeader.id, mrLines]);

  useEffect(() => {
    if (mrHeader.progress_id >= 21 || mrHeader.progress_id === 16) {
      setIsViewMode(true);
    } else {
      setIsViewMode(false);
    }
  }, [mrHeader.progress_id]);

  async function checkExistingLpo() {
    try {
      const supplierId = mrLines[0]?.approved_supplier_id;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
          }),
        },
      );
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setExistingLpoId(data.data[0].id);
      } else {
        setExistingLpoId(null);
      }
    } catch (error) {
      console.error("Error checking for existing LPO:", error);
    }
  }

  useEffect(() => {
    async function fetchLpo() {
      if (!existingLpoId) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: existingLpoId }),
          },
        );
        const data = await response.json();
        if (data.success && data.data) {
          setLpo(data.data);
          if (data.data.lpo_mr_lines) {
            setLpoMrLines(data.data.lpo_mr_lines);
            const initialGrnLines: { [key: number]: GRNLineItem } = {};
            data.data.lpo_mr_lines.forEach((line: any, index: number) => {
              initialGrnLines[index] = {
                lpo_mr_line_id: line.id,
                received_quantity: "",
                notes: "",
                attachment: "",
              };
            });
            setGrnLines(initialGrnLines);
          }
        }
      } catch (error) {
        console.error("Error fetching LPO:", error);
      }
    }
    fetchLpo();
  }, [existingLpoId]);

  useEffect(() => {
    async function fetchQcAcceptedQuantities() {
      if (!existingLpoId || lpoMrLines.length === 0) return;
      try {
        const qcQuantities: { [key: number]: number | null } = {};
        for (let index = 0; index < lpoMrLines.length; index++) {
          const lpoMrLineId = lpoMrLines[index].id;
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lpo_mr_line_id: lpoMrLineId }),
            },
          );
          const data = await response.json();
          if (data.success && data.data && data.data.accepted_quantity) {
            qcQuantities[index] = data.data.accepted_quantity;
          } else {
            qcQuantities[index] = null;
          }
        }
        setQcAcceptedQuantities(qcQuantities);
      } catch (error) {
        console.error("Error fetching QC accepted quantities:", error);
      }
    }
    fetchQcAcceptedQuantities();
  }, [existingLpoId, lpoMrLines, isOpen]);

  async function checkExistingGrn() {
    if (!existingLpoId) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lpo_id: existingLpoId }),
        },
      );
      const data = await response.json();
      if (data.success && data.data && data.data.id) {
        setExistingGrn(data.data);
        if (!isViewMode) setIsEditMode(true);
      } else {
        setExistingGrn(null);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error("Error checking for existing GRN:", error);
      setExistingGrn(null);
      setIsEditMode(false);
    }
  }

  useEffect(() => {
    checkExistingGrn();
  }, [existingLpoId]);

  useEffect(() => {
    if (existingGrn && existingGrn.id && lpoMrLines.length > 0 && isOpen) {
      if (existingGrn.received_date) {
        const date = new Date(existingGrn.received_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        setReceivedDate(`${year}-${month}-${day}`);
      } else {
        setReceivedDate("");
      }

      const mappedGrnLines: { [key: number]: GRNLineItem } = {};
      lpoMrLines.forEach((lpoLine: any, index: number) => {
        const grnLine = existingGrn.grn_lines?.find(
          (gl: any) => gl.lpo_mr_line_id === lpoLine.id,
        );
        if (grnLine) {
          let attachmentUrl = "";
          if (grnLine.attachment) {
            try {
              attachmentUrl =
                typeof grnLine.attachment === "string"
                  ? JSON.parse(grnLine.attachment)
                  : grnLine.attachment;
            } catch (e) {
              attachmentUrl = grnLine.attachment;
            }
          }
          mappedGrnLines[index] = {
            lpo_mr_line_id: lpoLine.id,
            received_quantity: grnLine.received_quantity?.toString() || "",
            notes: grnLine.notes || "",
            attachment: attachmentUrl || "",
            attachmentFile: null,
          };
        } else {
          mappedGrnLines[index] = {
            lpo_mr_line_id: lpoLine.id,
            received_quantity: "",
            notes: "",
            attachment: "",
            attachmentFile: null,
          };
        }
      });
      setGrnLines(mappedGrnLines);
    }
  }, [existingGrn, lpoMrLines, isOpen]);

  const handleReceivedQuantityChange = (index: number, value: string) => {
    if (isViewMode) return;
    setGrnLines((prev) => ({
      ...prev,
      [index]: { ...prev[index], received_quantity: value },
    }));
  };

  const openNotesModal = (index: number) => {
    setCurrentNoteIndex(index);
    setIsNotesOpen(true);
  };

  const openAttachmentModal = (index: number) => {
    setCurrentAttachmentIndex(index);
    setAttachmentFile(null);
    setIsUploadAttachmentOpen(true);
  };

  const handleNotesSubmit = () => {
    if (currentNoteIndex !== null) {
      setIsNotesOpen(false);
      setCurrentNoteIndex(null);
    }
  };

  const handleNotesChange = (value: string) => {
    if (isViewMode) return;
    if (currentNoteIndex !== null) {
      setGrnLines((prev) => ({
        ...prev,
        [currentNoteIndex]: { ...prev[currentNoteIndex], notes: value },
      }));
    }
  };

  function handleAttachmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (currentAttachmentIndex === null) return;
    if (!attachmentFile) {
      toast("Please select a file to upload", "error");
      return;
    }
    setGrnLines((prev) => ({
      ...prev,
      [currentAttachmentIndex]: {
        ...prev[currentAttachmentIndex],
        attachmentFile: attachmentFile,
      },
    }));
    setIsUploadAttachmentOpen(false);
    setAttachmentFile(null);
    setCurrentAttachmentIndex(null);
  }

  function handleRemoveAttachmentFile(index: number) {
    if (isViewMode) return;
    setGrnLines((prev) => ({
      ...prev,
      [index]: { ...prev[index], attachmentFile: null },
    }));
  }

  async function handleRemoveAttachment(index: number) {
    if (isViewMode) return;
    const attachmentUrl = grnLines[index]?.attachment;
    if (!attachmentUrl) return;
    setIsUploading(true);
    try {
      await deleteFileFromS3(attachmentUrl);
      setGrnLines((prev) => ({
        ...prev,
        [index]: { ...prev[index], attachment: "" },
      }));
      toast("Attachment removed successfully", "success");
    } catch (error) {
      console.error("Error removing attachment:", error);
      toast("Failed to remove attachment", "error");
    } finally {
      setIsUploading(false);
    }
  }

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

  async function deleteFileFromS3(url: string): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", url: url }),
    });
    if (!response.ok) throw new Error("Failed to delete file from S3");
  }

  // FIXED: Proper quantity comparison with epsilon for floating point
  const checkQuantityMatch = (index: number) => {
    const receivedQty = parseQuantity(grnLines[index]?.received_quantity);
    const orderedQty = parseQuantity(mrLines[index]?.quantity);

    if (!grnLines[index]?.received_quantity) return null;

    const epsilon = 0.0001;
    return Math.abs(receivedQty - orderedQty) < epsilon;
  };

  const hasQuantityMismatch = () => {
    return Object.keys(grnLines).some((key) => {
      const index = parseInt(key);
      return checkQuantityMatch(index) === false;
    });
  };

  const resetForm = () => {
    setReceivedDate("");
    if (lpoMrLines.length > 0) {
      const initialGrnLines: { [key: number]: GRNLineItem } = {};
      lpoMrLines.forEach((line: any, index: number) => {
        initialGrnLines[index] = {
          lpo_mr_line_id: line.id,
          received_quantity: "",
          notes: "",
          attachment: "",
          attachmentFile: null,
        };
      });
      setGrnLines(initialGrnLines);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isViewMode) {
      setIsOpen(false);
      return;
    }

    const allLinesValid = Object.values(grnLines).every(
      (line) => line.received_quantity,
    );
    if (!allLinesValid) {
      toast("Please fill in all received quantities", "error");
      return;
    }

    const allLinesHaveAttachments = Object.values(grnLines).every(
      (line) => line.attachmentFile || line.attachment,
    );
    if (!allLinesHaveAttachments) {
      toast("Please upload an attachment for all items", "error");
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = Object.entries(grnLines).map(
        async ([index, line]) => {
          if (line.attachmentFile) {
            if (isEditMode && line.attachment) {
              await deleteFileFromS3(line.attachment);
            }
            const uploadedUrl = await uploadFileToS3(line.attachmentFile);
            return { index: parseInt(index), url: uploadedUrl };
          }
          return null;
        },
      );

      const uploadResults = await Promise.all(uploadPromises);
      const updatedGrnLines = { ...grnLines };
      uploadResults.forEach((result) => {
        if (result) {
          updatedGrnLines[result.index] = {
            ...updatedGrnLines[result.index],
            attachment: result.url,
          };
        }
      });

      const grnLinesArray = Object.values(updatedGrnLines).map((line) => ({
        lpo_mr_line_id: line.lpo_mr_line_id,
        received_quantity: line.received_quantity,
        notes: line.notes || null,
        attachment: line.attachment || null,
      }));

      const action = isEditMode ? "updateGRN" : "createGRN";
      const method = isEditMode ? "PUT" : "POST";
      const requestBody: any = {
        action,
        lpo_id: existingLpoId,
        received_date: receivedDate,
        received_by: userInfo?.name,
        grn_lines: grnLinesArray,
      };
      if (isEditMode && existingGrn?.id) requestBody.grn_id = existingGrn.id;

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/grn`, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        toast(
          isEditMode
            ? `Good received note updated for ${mrLines[0].approved_supplier_name}`
            : `Good received note created for ${mrLines[0].approved_supplier_name}`,
          "success",
        );
        setIsOpen(false);
        if (!isEditMode) resetForm();
        await checkExistingGrn();
        setTimeout(() => router.refresh(), 100);
      } else {
        toast(
          isEditMode ? "Failed to update GRN" : "Failed to create GRN",
          "error",
        );
      }
    } catch (error) {
      console.error("Error submitting GRN:", error);
      toast(
        isEditMode ? "Failed to update GRN" : "Failed to create GRN",
        "error",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      {!isViewMode && !isEditMode ? (
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
      ) : (
        <Button
          componentType={"none"}
          bgColor={"white"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          onClick={() => {}}
          style={{ padding: "5px 20px", borderRadius: "25px" }}
        >
          GRN
          {isViewMode && (
            <img
              src={externalLinkIcon}
              alt="external link"
              onClick={() => setIsOpen(true)}
            />
          )}
          {isEditMode && (
            <img
              src={pencilIcon}
              alt="pencil"
              onClick={() => setIsOpen(true)}
            />
          )}
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header={
            isViewMode
              ? "VIEW GOOD RECEIVED NOTE"
              : isEditMode
                ? "UPDATE GOOD RECEIVED NOTE"
                : "CREATE GOOD RECEIVED NOTE"
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={isViewMode ? "" : "CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"VENDOR NAME"}
              value={mrLines[0].approved_supplier_name}
              type={"text"}
              required
              onChange={() => {}}
              disabled
            />
          </div>

          <div className="input-row three-col">
            <InputItem
              label={"DELIVERY DATE"}
              value={
                lpo?.delivery_date
                  ? new Date(lpo.delivery_date).toISOString().split("T")[0]
                  : ""
              }
              type={"date"}
              placeholder={"ENTER DELIVERY DATE"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"RECEIVED DATE"}
              value={receivedDate}
              type={"date"}
              placeholder={"ENTER RECEIVED DATE"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"RECEIVED BY"}
              value={
                isEditMode
                  ? existingGrn?.received_by || ""
                  : userInfo?.name || ""
              }
              type={"text"}
              placeholder={"ENTER RECEIVED BY"}
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
                <th>DESCRIPTION</th>
                <th>ORDERED QUANTITY</th>
                <th>RECEIVED QUANTITY</th>
                {progress_id >= 21 && <th>ACCEPTED QUANTITY</th>}
                <th>NOTES</th>
                <th>ATTACHMENT</th>
              </tr>
            </thead>
            <tbody>
              {mrLines.map((mrLine, index) => {
                const quantityMatch = checkQuantityMatch(index);
                // FIXED: Use parseQuantity helper for both
                const receivedQty = parseQuantity(
                  grnLines[index]?.received_quantity,
                );
                const orderedQty = parseQuantity(mrLine.quantity);
                const acceptedQty = qcAcceptedQuantities[index];
                const hasAttachment = grnLines[index]?.attachment;
                const hasAttachmentFile = grnLines[index]?.attachmentFile;

                return (
                  <tr key={mrLine.id || index}>
                    <td>{index + 1}</td>
                    <td>{mrLine.material_description}</td>
                    <td>
                      {formatQuantity(mrLine.quantity)} {mrLine.unit}
                    </td>
                    <td>
                      {isViewMode ? (
                        `${formatQuantity(grnLines[index]?.received_quantity)} ${mrLine.unit}`
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <InputItem
                              label={""}
                              value={grnLines[index]?.received_quantity || ""}
                              type={"text"}
                              placeholder={"ENTER RECEIVED QUANTITY"}
                              required
                              onChange={(e) =>
                                handleReceivedQuantityChange(
                                  index,
                                  e.target.value,
                                )
                              }
                              style={{ minWidth: "200px", marginBottom: "0px" }}
                              disabled={isViewMode}
                            />
                            {quantityMatch !== null && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {quantityMatch ? (
                                  <img
                                    src={checkGreenIcon}
                                    alt="match"
                                    style={{ width: "32px" }}
                                  />
                                ) : (
                                  <img
                                    src={warningIcon}
                                    alt="warning"
                                    style={{ width: "32px" }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          {quantityMatch === false && (
                            <span
                              style={{
                                fontWeight: "500",
                                color: "rgba(248, 77, 77, 1)",
                                fontStyle: "italic",
                                paddingLeft: "4px",
                              }}
                            >
                              {receivedQty > orderedQty
                                ? "Excess quantity beyond the request"
                                : "Quantity is less than the request"}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    {progress_id >= 21 && (
                      <td>
                        {acceptedQty !== null && acceptedQty !== undefined ? (
                          `${formatQuantity(acceptedQty)} ${mrLine.unit}`
                        ) : (
                          <span style={{ color: "rgba(150, 150, 150, 1)" }}>
                            -
                          </span>
                        )}
                      </td>
                    )}
                    <td>
                      {isViewMode ? (
                        grnLines[index]?.notes ? (
                          <Button
                            componentType={"button"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ borderRadius: "5px", padding: "7px 7px" }}
                            onClick={(e) => {
                              e.preventDefault();
                              openNotesModal(index);
                            }}
                          >
                            <img src={externalLinkIcon} alt="notes" />
                          </Button>
                        ) : (
                          <span style={{ color: "rgba(150, 150, 150, 1)" }}>
                            -
                          </span>
                        )
                      ) : (
                        <Button
                          componentType={"button"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ borderRadius: "5px", padding: "7px 7px" }}
                          onClick={(e) => {
                            e.preventDefault();
                            openNotesModal(index);
                          }}
                        >
                          <img
                            src={grnLines[index]?.notes ? pencilIcon : plusIcon}
                            alt={
                              grnLines[index]?.notes
                                ? "edit notes"
                                : "add notes"
                            }
                          />
                        </Button>
                      )}
                    </td>
                    <td>
                      {hasAttachment || hasAttachmentFile ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                          }}
                        >
                          {hasAttachment ? (
                            <Button
                              componentType={"link"}
                              bgColor={"rgba(239, 239, 239, 1)"}
                              borderColor={"rgba(223, 223, 223, 1)"}
                              textColor={"black"}
                              style={{ padding: "7px 7px" }}
                              href={grnLines[index].attachment}
                              target="_blank"
                            >
                              <img src={externalLinkIcon} alt="view" />
                            </Button>
                          ) : hasAttachmentFile ? (
                            <Button
                              componentType={"button"}
                              bgColor={"rgba(239, 239, 239, 1)"}
                              borderColor={"rgba(223, 223, 223, 1)"}
                              textColor={"black"}
                              style={{ padding: "7px 7px" }}
                              onClick={(e) => {
                                e.preventDefault();
                                const fileUrl = URL.createObjectURL(
                                  grnLines[index].attachmentFile!,
                                );
                                window.open(fileUrl, "_blank");
                              }}
                            >
                              <img src={externalLinkIcon} alt="view" />
                            </Button>
                          ) : null}
                          {!isViewMode && (
                            <img
                              src={crossIcon}
                              alt="remove"
                              onClick={() =>
                                hasAttachment
                                  ? handleRemoveAttachment(index)
                                  : handleRemoveAttachmentFile(index)
                              }
                              style={{
                                cursor: isUploading ? "not-allowed" : "pointer",
                                opacity: isUploading ? 0.5 : 1,
                              }}
                            />
                          )}
                        </div>
                      ) : isViewMode ? (
                        <span style={{ color: "rgba(150, 150, 150, 1)" }}>
                          -
                        </span>
                      ) : (
                        <Button
                          componentType={"button"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ padding: "7px 7px" }}
                          onClick={(e) => {
                            e.preventDefault();
                            openAttachmentModal(index);
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
                );
              })}
            </tbody>
          </table>

          {!isViewMode && hasQuantityMismatch() && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "20px",
                padding: "12px 16px",
                backgroundColor: "rgba(248, 77, 77, 0.08)",
                borderRadius: "8px",
                border: "1px solid rgba(248, 77, 77, 0.2)",
              }}
            >
              <img
                src={warningIcon}
                alt="warning"
                style={{ width: "28px", height: "28px", flexShrink: 0 }}
              />
              <span
                style={{ color: "rgba(248, 77, 77, 1)", fontStyle: "italic" }}
              >
                Items that do not match the request will be returned to
                procurement
              </span>
            </div>
          )}
        </FormPopUp>
      )}

      {isNotesOpen && currentNoteIndex !== null && (
        <FormPopUp
          header={
            isViewMode ? "VIEW NOTES" : isEditMode ? "EDIT NOTES" : "ADD NOTES"
          }
          setIsOpen={setIsNotesOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            handleNotesSubmit();
          }}
          addButtonLabel={isViewMode ? "" : "CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"NOTES"}
              value={grnLines[currentNoteIndex]?.notes || ""}
              type={"textarea"}
              placeholder={"ENTER NOTES"}
              required={false}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={isViewMode}
            />
          </div>
        </FormPopUp>
      )}

      {isUploadAttachmentOpen && currentAttachmentIndex !== null && (
        <FormPopUp
          header={"UPLOAD ATTACHMENT"}
          setIsOpen={setIsUploadAttachmentOpen}
          handleSubmit={handleAttachmentSubmit}
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
