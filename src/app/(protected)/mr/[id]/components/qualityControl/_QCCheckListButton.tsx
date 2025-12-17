"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { LPO } from "../../types/lpo";

type QCCheckListButtonProps = {
  mrHeader: MrHeader;
  item: MrLine;
  progressID: number;
};

type CheckpointResponse = "yes" | "no" | "na" | null;

type UploadedFile = {
  file: File;
  preview: string;
};

type CheckpointData = {
  response: CheckpointResponse;
  notes: string;
  attachments: string[]; // Existing S3 URLs
  pendingFiles: UploadedFile[]; // Files waiting to be uploaded on confirm
};

type GRN = {
  id: number;
  lpo_id: number;
  received_date: string;
  received_by: string;
  grn_lines: GRNLineItem[];
};

type GRNLineItem = {
  lpo_mr_line_id: number;
  received_quantity: string;
  packaging_condition: "good" | "bad" | null;
  notes: string;
};

type QCStatus = "pending" | "passed" | "failed" | null;

const checkpoints = [
  "Item matches purchase specifications",
  "Quantity matches GRN",
  "Dimensions as per approved drawings",
  "Material grade confirmed",
  "Visual inspection - no damage",
  "Finishing quality acceptable",
  "No corrosion / scratches",
  "Color matches approved sample",
  "Assembly/Functional test",
  "Correct labeling / barcode",
  "Proper packaging",
  "Safety compliance",
];

export default function QCCheckListButton({
  mrHeader,
  progressID,
  item,
}: QCCheckListButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const uploadIcon = "/icons/upload.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qcStatus, setQcStatus] = useState<QCStatus>("pending");
  const [existingQcId, setExistingQcId] = useState<number | null>(null);

  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);
  const [lpo, setLpo] = useState<LPO | null>(null);
  const [existingGrn, setExistingGrn] = useState<GRN | null>(null);
  const [receivedQuantity, setReceivedQuantity] = useState<string>("");
  const [lpoMrLineId, setLpoMrLineId] = useState<number | null>(null);

  const [checkpointData, setCheckpointData] = useState<{
    [key: number]: CheckpointData;
  }>({});

  const [acceptedQty, setAcceptedQty] = useState<string>("");
  const [qcStatusSelection, setQcStatusSelection] = useState<
    "passed" | "failed" | null
  >(null);

  const [failureReasons, setFailureReasons] = useState({
    physicalDamage: "",
    wrongSpecification: "",
    quantityPackagingIssues: "",
    functionalFailure: "",
    qualityIssues: "",
    complianceCertification: "",
  });

  // Track attachments marked for deletion
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);

  // File input refs for each checkpoint
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    const initialData: { [key: number]: CheckpointData } = {};
    checkpoints.forEach((_, index) => {
      initialData[index] = {
        response: null,
        notes: "",
        attachments: [],
        pendingFiles: [],
      };
    });
    setCheckpointData(initialData);
  }, []);

  // Fetch LPO when component mounts
  useEffect(() => {
    if (item?.approved_supplier_id) {
      checkExistingLpo();
    }
  }, [item, mrHeader.id]);

  // Check if QC already exists
  useEffect(() => {
    if (lpoMrLineId) {
      checkExistingQc();
    }
  }, [lpoMrLineId]);

  async function checkExistingQc() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lpo_mr_line_id: lpoMrLineId,
          }),
        }
      );
      const data = await res.json();

      if (data.success && data.data) {
        console.log("Found existing QC with ID:", data.data.id);
        setExistingQcId(data.data.id);
        setQcStatus(data.data.qc_status);
        setAcceptedQty(data.data.accepted_quantity?.toString() || "");
      } else {
        console.log("No existing QC found, will create new");
        setExistingQcId(null);
        setQcStatus("pending");
      }
    } catch (error) {
      console.error("Error checking for existing QC:", error);
    }
  }

  async function loadExistingQcData() {
    if (!lpoMrLineId) {
      console.log("No lpoMrLineId available");
      return;
    }

    setIsLoadingData(true);

    try {
      console.log("Loading QC data for lpoMrLineId:", lpoMrLineId);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lpo_mr_line_id: lpoMrLineId,
          }),
        }
      );
      const data = await res.json();

      console.log("QC data response:", data);

      if (data.success && data.data) {
        const qcData = data.data;

        setAcceptedQty(qcData.accepted_quantity?.toString() || "");
        setQcStatusSelection(qcData.qc_status);

        if (qcData.qc_status === "failed") {
          setFailureReasons({
            physicalDamage: qcData.physical_damage || "",
            wrongSpecification: qcData.wrong_specification || "",
            quantityPackagingIssues: qcData.quantity_packaging_issues || "",
            functionalFailure: qcData.functional_failure || "",
            qualityIssues: qcData.quality_issues || "",
            complianceCertification: qcData.compliance_certification || "",
          });
        }

        if (qcData.checkpoints && qcData.checkpoints.length > 0) {
          const loadedCheckpoints: { [key: number]: CheckpointData } = {};

          qcData.checkpoints.forEach((cp: any) => {
            const index = cp.checkpoint_number - 1;

            // Parse attachments safely
            let attachmentsArray: string[] = [];
            if (cp.attachments) {
              try {
                // Check if it's already a string starting with "http" (single URL)
                if (
                  typeof cp.attachments === "string" &&
                  cp.attachments.startsWith("http")
                ) {
                  attachmentsArray = [cp.attachments];
                } else if (typeof cp.attachments === "string") {
                  // Try to parse as JSON array
                  attachmentsArray = JSON.parse(cp.attachments);
                } else if (Array.isArray(cp.attachments)) {
                  // Already an array
                  attachmentsArray = cp.attachments;
                }
              } catch (error) {
                console.error(
                  "Error parsing attachments for checkpoint",
                  index,
                  ":",
                  error
                );
                console.log("Raw attachments value:", cp.attachments);
                attachmentsArray = [];
              }
            }

            loadedCheckpoints[index] = {
              response: cp.response,
              notes: cp.notes || "",
              attachments: attachmentsArray,
              pendingFiles: [],
            };

            console.log(
              `Loaded checkpoint ${index} with attachments:`,
              attachmentsArray
            );
          });

          setCheckpointData(loadedCheckpoints);
        }
      } else {
        console.error("Failed to load QC data:", data.message);
        toast("Failed to load existing QC data", "error");
      }
    } catch (error) {
      console.error("Error loading existing QC data:", error);
      toast("Error loading existing QC data", "error");
    } finally {
      setIsLoadingData(false);
    }
  }

  const handleEditClick = async () => {
    if (!existingQcId && lpoMrLineId) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lpo_mr_line_id: lpoMrLineId,
            }),
          }
        );
        const data = await res.json();

        if (data.success && data.data) {
          setExistingQcId(data.data.id);
        }
      } catch (error) {
        console.error("Error fetching QC ID:", error);
      }
    }

    setIsOpen(true);
    await loadExistingQcData();
  };

  async function checkExistingLpo() {
    try {
      const supplierId = item?.approved_supplier_id;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
          }),
        }
      );
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const lpoData: LPO = data.data[0];
        setExistingLpoId(lpoData.id);
        setLpo(lpoData);
      } else {
        setExistingLpoId(null);
      }
    } catch (error) {
      console.error("Error checking for existing LPO:", error);
    }
  }

  useEffect(() => {
    async function fetchGrn() {
      if (!existingLpoId) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: existingLpoId }),
          }
        );

        const data = await response.json();

        if (data.success && data.data && data.data.id) {
          setExistingGrn(data.data);
        } else {
          setExistingGrn(null);
        }
      } catch (error) {
        console.error("Error fetching GRN:", error);
      }
    }

    fetchGrn();
  }, [existingLpoId]);

  useEffect(() => {
    async function fetchLpoDetails() {
      if (!existingLpoId || !existingGrn) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: existingLpoId }),
          }
        );
        const data = await response.json();

        if (data.success && data.data && data.data.lpo_mr_lines) {
          const lpoLine = data.data.lpo_mr_lines.find(
            (line: any) => line.mr_line_id === item.id
          );

          if (lpoLine) {
            setLpoMrLineId(lpoLine.id);

            if (existingGrn.grn_lines) {
              const grnLine = existingGrn.grn_lines.find(
                (gl: any) => gl.lpo_mr_line_id === lpoLine.id
              );

              if (grnLine) {
                setReceivedQuantity(
                  grnLine.received_quantity?.toString() || "0"
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching LPO details:", error);
      }
    }

    fetchLpoDetails();
  }, [existingLpoId, existingGrn, item.id]);

  const handleResponseChange = (
    index: number,
    response: CheckpointResponse
  ) => {
    setCheckpointData((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        response: prev[index]?.response === response ? null : response,
      },
    }));
  };

  const handleNotesChange = (index: number, notes: string) => {
    setCheckpointData((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        notes,
      },
    }));
  };

  // Handle file selection
  const handleFileSelect = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];

    Array.from(files).forEach((file) => {
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";

      newFiles.push({
        file,
        preview,
      });
    });

    setCheckpointData((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        pendingFiles: [...(prev[index]?.pendingFiles || []), ...newFiles],
      },
    }));

    // Clear the input
    e.target.value = "";
  };

  // Remove pending file
  const removePendingFile = (checkpointIndex: number, fileIndex: number) => {
    setCheckpointData((prev) => ({
      ...prev,
      [checkpointIndex]: {
        ...prev[checkpointIndex],
        pendingFiles: prev[checkpointIndex].pendingFiles.filter(
          (_, i) => i !== fileIndex
        ),
      },
    }));
  };

  // Remove uploaded attachment - only marks for deletion
  const removeAttachment = (
    checkpointIndex: number,
    attachmentIndex: number
  ) => {
    const urlToDelete =
      checkpointData[checkpointIndex].attachments[attachmentIndex];

    // Mark the URL for deletion
    setAttachmentsToDelete((prev) => [...prev, urlToDelete]);

    // Remove from UI immediately
    setCheckpointData((prev) => ({
      ...prev,
      [checkpointIndex]: {
        ...prev[checkpointIndex],
        attachments: prev[checkpointIndex].attachments.filter(
          (_, i) => i !== attachmentIndex
        ),
      },
    }));
  };

  // Delete all marked attachments from S3
  const deleteMarkedAttachments = async () => {
    if (attachmentsToDelete.length === 0) return true;

    try {
      console.log("Deleting marked attachments:", attachmentsToDelete);

      // Delete each marked attachment from S3
      const deletePromises = attachmentsToDelete.map(async (url) => {
        const s3Response = await fetch("/api/s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            url: url,
          }),
        });

        if (!s3Response.ok) {
          throw new Error(`Failed to delete file from S3: ${url}`);
        }

        return url;
      });

      await Promise.all(deletePromises);
      console.log("All marked attachments deleted from S3");

      // Clear the deletion list
      setAttachmentsToDelete([]);

      return true;
    } catch (error) {
      console.error("Error deleting attachments:", error);
      toast("Failed to delete some attachments", "error");
      return false;
    }
  };

  const getFileNameFromUrl = (url: string) => {
    const urlParts = url.split("/");
    return decodeURIComponent(urlParts[urlParts.length - 1] || "file");
  };

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Upload all pending files for all checkpoints
  const uploadAllPendingFiles = async () => {
    const filesByCheckpoint: { [key: number]: File[] } = {};

    // Collect all files that need to be uploaded
    Object.keys(checkpointData).forEach((key) => {
      const checkpointIndex = parseInt(key);
      const checkpoint = checkpointData[checkpointIndex];

      if (checkpoint.pendingFiles && checkpoint.pendingFiles.length > 0) {
        filesByCheckpoint[checkpointIndex] = checkpoint.pendingFiles.map(
          (f) => f.file
        );
      }
    });

    // Upload all files
    if (Object.keys(filesByCheckpoint).length > 0) {
      try {
        const formData = new FormData();

        // Add all files to FormData
        Object.values(filesByCheckpoint)
          .flat()
          .forEach((file) => {
            formData.append("files", file);
          });

        // Add folder parameter
        formData.append("folder", "qc-attachments");

        console.log("Uploading files to S3...");

        // Upload to S3
        const response = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload files");
        }

        const result = await response.json();
        const uploadedUrls: string[] = result.urls;

        console.log("Files uploaded successfully:", uploadedUrls);

        // Create updated checkpoint data with new attachments
        const updatedCheckpointData = { ...checkpointData };
        let urlIndex = 0;

        Object.keys(filesByCheckpoint).forEach((key) => {
          const checkpointIndex = parseInt(key);
          const fileCount = filesByCheckpoint[checkpointIndex].length;
          const checkpointUrls = uploadedUrls.slice(
            urlIndex,
            urlIndex + fileCount
          );

          updatedCheckpointData[checkpointIndex] = {
            ...updatedCheckpointData[checkpointIndex],
            attachments: [
              ...updatedCheckpointData[checkpointIndex].attachments,
              ...checkpointUrls,
            ],
            pendingFiles: [],
          };

          console.log(
            `Checkpoint ${checkpointIndex} attachments:`,
            updatedCheckpointData[checkpointIndex].attachments
          );

          urlIndex += fileCount;
        });

        // Update state
        setCheckpointData(updatedCheckpointData);

        // Return the updated data
        return updatedCheckpointData;
      } catch (error) {
        console.error("Error uploading files:", error);
        toast("Failed to upload some files", "error");
        return null;
      }
    }

    // No files to upload, return current data
    return checkpointData;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!lpoMrLineId || !existingLpoId) {
      toast("Unable to submit: Missing LPO information", "error");
      return;
    }

    const unansweredCheckpoints = checkpoints.filter(
      (_, index) => !checkpointData[index]?.response
    );

    if (unansweredCheckpoints.length > 0) {
      toast("Please answer all checkpoints before submitting", "error");
      return;
    }

    if (!acceptedQty || acceptedQty === "0") {
      toast("Please enter accepted quantity", "error");
      return;
    }

    if (!qcStatusSelection) {
      toast("Please select QC status (Passed or Failed)", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Delete marked attachments from S3
      const deletionSuccess = await deleteMarkedAttachments();
      if (!deletionSuccess) {
        setIsSubmitting(false);
        return;
      }

      // Step 2: Upload all pending files and get updated checkpoint data
      const updatedCheckpointData = await uploadAllPendingFiles();

      if (!updatedCheckpointData) {
        setIsSubmitting(false);
        return;
      }

      console.log("Submitting QC with checkpoint data:", updatedCheckpointData);

      // Step 3: Submit the form with the updated checkpoint data
      const isUpdate = existingQcId !== null;

      const qcData = {
        action: isUpdate ? "" : "createQC",
        ...(isUpdate && { qc_id: existingQcId }),
        lpo_mr_line_id: lpoMrLineId,
        lpo_id: existingLpoId,
        checked_by: userInfo?.name || "",
        accepted_quantity: acceptedQty,
        qc_status: qcStatusSelection,
        checkpoints: updatedCheckpointData, // Use the updated data from upload
        ...(qcStatusSelection === "failed" && {
          failure_reasons: failureReasons,
        }),
      };

      console.log("QC Data being sent:", JSON.stringify(qcData, null, 2));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(qcData),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast(
          isUpdate
            ? "Quality control checklist updated"
            : "Quality control checklist created",
          "success"
        );
        setIsOpen(false);
        setQcStatus(qcStatusSelection);

        // Clear the attachments to delete list
        setAttachmentsToDelete([]);

        router.refresh();
      } else {
        toast(
          result.message || "Failed to create quality control checklist",
          "error"
        );
      }
    } catch (error) {
      console.error("Error submitting QC checklist:", error);
      toast(
        "An error occurred while creating a quality control checklist",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle modal close - restore attachments if not confirmed
  const handleModalClose = () => {
    // Restore any attachments that were marked for deletion but not confirmed
    if (attachmentsToDelete.length > 0) {
      loadExistingQcData();
      setAttachmentsToDelete([]);
    }
    setIsOpen(false);
  };

  // Render attachment cell content
  const renderAttachmentCell = (index: number) => {
    const checkpoint = checkpointData[index];
    const hasAttachments = checkpoint?.attachments?.length > 0;
    const hasPendingFiles = checkpoint?.pendingFiles?.length > 0;

    const gridStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(2, 50px)",
      gap: "4px",
      justifyContent: "center",
    };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {/* Uploaded attachments */}
        {hasAttachments && (
          <div style={gridStyle}>
            {checkpoint.attachments.map((url, attIndex) => (
              <div
                key={`att-${attIndex}`}
                style={{
                  position: "relative",
                  width: "50px",
                  overflow: "hidden",
                }}
              >
                {isImageFile(url) ? (
                  <img
                    src={url}
                    alt="attachment"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f3f4f6",
                    }}
                  >
                    {getFileNameFromUrl(url).split(".").pop()?.toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removeAttachment(index, attIndex)}
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending (not uploaded yet) */}
        {hasPendingFiles && (
          <div style={gridStyle}>
            {checkpoint.pendingFiles.map((uploadedFile, fileIndex) => (
              <div
                key={`pending-${fileIndex}`}
                style={{
                  position: "relative",
                  width: "50px",
                  overflow: "hidden",
                }}
              >
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt="preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    {uploadedFile.file.name.split(".").pop()?.toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removePendingFile(index, fileIndex)}
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload input */}
        <input
          type="file"
          ref={(el) => {
            fileInputRefs.current[index] = el;
          }}
          onChange={(e) => handleFileSelect(index, e)}
          accept="image/*"
          multiple
          style={{ display: "none" }}
        />

        <Button
          componentType="button"
          bgColor="black"
          borderColor="black"
          textColor="white"
          onClick={(e) => {
            e.preventDefault();
            fileInputRefs.current[index]?.click();
          }}
        >
          UPLOAD FILES
          <img
            src={uploadIcon}
            alt="upload"
            style={{ width: "12px", height: "12px" }}
          />
        </Button>
      </div>
    );
  };

  // Render the table row for a checkpoint
  const renderCheckpointRow = (checkpoint: string, index: number) => (
    <tr key={index}>
      <td style={{ textAlign: "center" }}>{index + 1}</td>
      <td>{checkpoint}</td>
      <td style={{ textAlign: "center" }}>
        <div
          onClick={() => handleResponseChange(index, "yes")}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "5px",
            border:
              checkpointData[index]?.response === "yes"
                ? "none"
                : "2px solid #d1d5db",
            backgroundColor:
              checkpointData[index]?.response === "yes"
                ? "#10b981"
                : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            margin: "0 auto",
          }}
        >
          {checkpointData[index]?.response === "yes" && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.6667 5L7.50004 14.1667L3.33337 10"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </td>
      <td style={{ textAlign: "center" }}>
        <div
          onClick={() => handleResponseChange(index, "no")}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "5px",
            border:
              checkpointData[index]?.response === "no"
                ? "none"
                : "2px solid #d1d5db",
            backgroundColor:
              checkpointData[index]?.response === "no"
                ? "#ef4444"
                : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            margin: "0 auto",
          }}
        >
          {checkpointData[index]?.response === "no" && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </td>
      <td style={{ textAlign: "center" }}>
        <div
          onClick={() => handleResponseChange(index, "na")}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "5px",
            border:
              checkpointData[index]?.response === "na"
                ? "none"
                : "2px solid #d1d5db",
            backgroundColor:
              checkpointData[index]?.response === "na"
                ? "#6b7280"
                : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            margin: "0 auto",
          }}
        >
          {checkpointData[index]?.response === "na" && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 10H15"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </td>
      <td>
        <InputItem
          label={""}
          value={checkpointData[index]?.notes || ""}
          type={"text"}
          placeholder={"ENTER NOTES"}
          required={false}
          onChange={(e) => handleNotesChange(index, e.target.value)}
        />
      </td>
      <td style={{ textAlign: "center" }}>{renderAttachmentCell(index)}</td>
    </tr>
  );

  // Form content
  const formContent = (
    <>
      <div className="input-row three-col">
        <InputItem
          label={"ORDERED QUANTITY"}
          value={item.quantity}
          type={"text"}
          placeholder={""}
          required
          disabled
          onChange={() => {}}
        />
        <InputItem
          label={"RECEIVED QUANTITY"}
          value={receivedQuantity}
          type={"text"}
          placeholder={""}
          required
          disabled
          onChange={() => {}}
        />
        <InputItem
          label={"CHECKED BY"}
          value={userInfo?.name || ""}
          type={"text"}
          placeholder={""}
          required
          disabled
          onChange={() => {}}
        />
      </div>

      <br />

      <table className="items-table alt">
        <thead>
          <tr>
            <th>#</th>
            <th>CHECKPOINT</th>
            <th>YES</th>
            <th>NO</th>
            <th>N/A</th>
            <th style={{ minWidth: "500px" }}>NOTES</th>
            <th>ATTACHMENT(S)</th>
          </tr>
        </thead>
        <tbody>
          {checkpoints.map((checkpoint, index) =>
            renderCheckpointRow(checkpoint, index)
          )}
        </tbody>
      </table>

      <br />
      <br />

      <div className="input-row three-col">
        <InputItem
          label={"ACCEPTED QUANTITY"}
          value={acceptedQty}
          type={"text"}
          placeholder={"ENTER ACCEPTED QUANTITY"}
          required
          onChange={(e) => setAcceptedQty(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
          <label>QC STATUS</label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="qc-status"
              checked={qcStatusSelection === "passed"}
              onChange={() => setQcStatusSelection("passed")}
              style={{
                width: "24px",
                height: "24px",
                cursor: "pointer",
              }}
            />
            <span>PASSED QC</span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="qc-status"
              checked={qcStatusSelection === "failed"}
              onChange={() => setQcStatusSelection("failed")}
              style={{
                width: "24px",
                height: "24px",
                cursor: "pointer",
              }}
            />
            <span>FAILED QC</span>
          </label>
        </div>
      </div>
    </>
  );

  // If QC status is passed
  if (qcStatus === "passed") {
    return (
      <>
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(34, 150, 100, 1)",
            color: "white",
          }}
        >
          <span>PASSED</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <img
              src={pencilIcon}
              alt="edit"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
              }}
              onClick={handleEditClick}
            />
          </div>
        </div>

        {isOpen && (
          <FormPopUp
            header="QUALITY CONTROL CHECKLIST"
            setIsOpen={handleModalClose}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
          >
            {formContent}
          </FormPopUp>
        )}
      </>
    );
  }

  // If QC status is failed
  if (qcStatus === "failed") {
    return (
      <>
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(185, 28, 28, 1)",
            color: "white",
          }}
        >
          <span>FAILED</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <img
              src={pencilIcon}
              alt="edit"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
                width: "14px",
              }}
              onClick={handleEditClick}
            />
          </div>
        </div>

        {isOpen && (
          <FormPopUp
            header="QUALITY CONTROL CHECKLIST"
            setIsOpen={handleModalClose}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
          >
            {formContent}
          </FormPopUp>
        )}
      </>
    );
  }

  // If pending, show the edit button
  return (
    <>
      <div style={{ display: "flex", gap: "10px", width: "200px" }}>
        <Button
          componentType={"button"}
          bgColor={"rgba(239, 239, 239, 1)"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          onClick={() => setIsOpen(true)}
          style={{ borderRadius: "5px", padding: "7px 7px" }}
        >
          <img src={pencilIcon} alt="pencil" />
        </Button>
      </div>

      {isOpen && (
        <FormPopUp
          header="QUALITY CONTROL CHECKLIST"
          setIsOpen={handleModalClose}
          handleSubmit={handleSubmit}
          addButtonLabel={isSubmitting ? "UPLOADING..." : "CONFIRM"}
        >
          {formContent}
        </FormPopUp>
      )}
    </>
  );
}
