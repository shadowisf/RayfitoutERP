"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultipleUploadFileBox from "@/app/components/MultipleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../../../types/mrLine";
import { MrHeader } from "../../../../types/mrHeader";
import { LpoHeader } from "../../../../types/lpoHeader";
import { useRefresh } from "@/app/context/RefreshContext";

type QCCheckListButtonProps = {
  mrHeader: MrHeader;
  item: MrLine;
};

type CheckpointResponse = "yes" | "no" | "na" | null;

type UploadedFile = {
  file: File;
  preview: string;
};

type CheckpointData = {
  response: CheckpointResponse;
  notes: string;
  attachments: string[]; // Changed to array
  pendingFiles: UploadedFile[]; // Changed to array
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
  "Dimensions as per approved drawings",
  "Material grade confirmed",
  "Visual inspection - no damage",
  "Finishing quality acceptable",
  "No corrosion / scratches",
  "Color matches approved sample",
  "Assembly/Functional test",
];

// Helper function to format numbers without trailing zeros
const formatNumberWithoutTrailingZeros = (value: string | number): string => {
  if (value === null || value === undefined || value === "") return "0";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "0";

  // Convert to number and let JavaScript handle trailing zeros
  // This removes unnecessary decimal places while preserving needed ones
  return parseFloat(num.toString()).toString();
};

export default function QCCheckListButton({
  mrHeader,
  item,
}: QCCheckListButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();

  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const uploadIcon = "/icons/upload.svg";
  const plusIcon = "/icons/plus.svg";
  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [qcStatus, setQcStatus] = useState<QCStatus>("pending");
  const [existingQcId, setExistingQcId] = useState<number | null>(null);

  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);
  const [existingGrn, setExistingGrn] = useState<GRN | null>(null);
  const [receivedQuantity, setReceivedQuantity] = useState<string>("");
  const [lpoMrLineId, setLpoMrLineId] = useState<number | null>(null);

  const [checkpointData, setCheckpointData] = useState<{
    [key: number]: CheckpointData;
  }>({});

  const [reasonForAdequateProtection, setReasonForAdequateProtection] =
    useState("");
  const [acceptedQty, setAcceptedQty] = useState("");
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

  useEffect(() => {
    const initialData: { [key: number]: CheckpointData } = {};
    checkpoints.forEach((_, index) => {
      initialData[index] = {
        response: null,
        notes: "",
        attachments: [], // Initialize as array
        pendingFiles: [], // Initialize as array
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
        },
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
        },
      );
      const data = await res.json();

      if (data.success && data.data) {
        const qcData = data.data;

        setAcceptedQty(qcData.accepted_quantity?.toString() || "");
        setQcStatusSelection(qcData.qc_status);
        setReasonForAdequateProtection(qcData.reason_for_added_protection);

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

            // Parse attachments (now expecting an array)
            let attachmentUrls: string[] = [];
            if (cp.attachments) {
              try {
                if (typeof cp.attachments === "string") {
                  const parsed = JSON.parse(cp.attachments);
                  attachmentUrls = Array.isArray(parsed) ? parsed : [parsed];
                } else if (Array.isArray(cp.attachments)) {
                  attachmentUrls = cp.attachments;
                }
              } catch (error) {
                console.error(
                  "Error parsing attachments for checkpoint",
                  index,
                  ":",
                  error,
                );
                attachmentUrls = [];
              }
            }

            loadedCheckpoints[index] = {
              response: cp.response,
              notes: cp.notes || "",
              attachments: attachmentUrls,
              pendingFiles: [],
            };

            console.log(
              `Loaded checkpoint ${index} with ${attachmentUrls.length} attachments:`,
              attachmentUrls,
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
          },
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
        },
      );
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const lpoData: LpoHeader = data.data[0];
        setExistingLpoId(lpoData.id);
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
          },
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
          },
        );
        const data = await response.json();

        if (data.success && data.data && data.data.lpo_mr_lines) {
          const lpoLine = data.data.lpo_mr_lines.find(
            (line: any) => line.mr_line_id === item.id,
          );

          if (lpoLine) {
            setLpoMrLineId(lpoLine.id);

            if (existingGrn.grn_lines) {
              const grnLine = existingGrn.grn_lines.find(
                (gl: any) => gl.lpo_mr_line_id === lpoLine.id,
              );

              if (grnLine) {
                setReceivedQuantity(
                  grnLine.received_quantity?.toString() || "0",
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
    response: CheckpointResponse,
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

  // Handle multiple file selection
  const handleFileSelect = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
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
        pendingFiles: [...prev[index].pendingFiles, ...newFiles],
      },
    }));

    // Clear the input
    e.target.value = "";
  };

  // Remove pending file by index
  const removePendingFile = (checkpointIndex: number, fileIndex: number) => {
    setCheckpointData((prev) => ({
      ...prev,
      [checkpointIndex]: {
        ...prev[checkpointIndex],
        pendingFiles: prev[checkpointIndex].pendingFiles.filter(
          (_, idx) => idx !== fileIndex,
        ),
      },
    }));
  };

  // Remove uploaded attachment by index
  const removeAttachment = (
    checkpointIndex: number,
    attachmentIndex: number,
  ) => {
    const urlToDelete =
      checkpointData[checkpointIndex].attachments[attachmentIndex];

    if (urlToDelete) {
      // Mark the URL for deletion
      setAttachmentsToDelete((prev) => [...prev, urlToDelete]);

      // Remove from UI immediately
      setCheckpointData((prev) => ({
        ...prev,
        [checkpointIndex]: {
          ...prev[checkpointIndex],
          attachments: prev[checkpointIndex].attachments.filter(
            (_, idx) => idx !== attachmentIndex,
          ),
        },
      }));
    }
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
    const allFilesToUpload: File[] = [];
    const checkpointFileMap: { [checkpointIndex: number]: number[] } = {};

    // Collect all files that need to be uploaded
    Object.keys(checkpointData).forEach((key) => {
      const checkpointIndex = parseInt(key);
      const checkpoint = checkpointData[checkpointIndex];

      if (checkpoint.pendingFiles.length > 0) {
        const startIndex = allFilesToUpload.length;
        checkpoint.pendingFiles.forEach((pf) => {
          allFilesToUpload.push(pf.file);
        });
        const endIndex = allFilesToUpload.length;

        // Map which uploaded URLs belong to which checkpoint
        checkpointFileMap[checkpointIndex] = Array.from(
          { length: endIndex - startIndex },
          (_, i) => startIndex + i,
        );
      }
    });

    // Upload all files
    if (allFilesToUpload.length > 0) {
      try {
        const formData = new FormData();

        // Add all files to FormData
        allFilesToUpload.forEach((file) => {
          formData.append("files", file);
        });

        // Add folder parameter
        formData.append("folder", "qc-attachments");

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

        Object.keys(checkpointFileMap).forEach((key) => {
          const checkpointIndex = parseInt(key);
          const fileIndices = checkpointFileMap[checkpointIndex];

          const newUrls = fileIndices.map((idx) => uploadedUrls[idx]);

          updatedCheckpointData[checkpointIndex] = {
            ...updatedCheckpointData[checkpointIndex],
            attachments: [
              ...updatedCheckpointData[checkpointIndex].attachments,
              ...newUrls,
            ],
            pendingFiles: [],
          };
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
      (_, index) => !checkpointData[index]?.response,
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

    try {
      // Step 1: Delete marked attachments from S3
      const deletionSuccess = await deleteMarkedAttachments();
      if (!deletionSuccess) {
        return;
      }

      // Step 2: Upload all pending files and get updated checkpoint data
      const updatedCheckpointData = await uploadAllPendingFiles();

      if (!updatedCheckpointData) {
        return;
      }

      console.log("Submitting QC with checkpoint data:", updatedCheckpointData);

      // Step 3: Submit the form with the updated checkpoint data
      const isUpdate = existingQcId !== null;

      const qcData = {
        action: isUpdate ? "updateQC" : "createQC",
        ...(isUpdate && { qc_id: existingQcId }),
        lpo_mr_line_id: lpoMrLineId,
        lpo_id: existingLpoId,
        checked_by: userInfo?.name || "",
        reason_for_added_protection: reasonForAdequateProtection,
        accepted_quantity: acceptedQty,
        qc_status: qcStatusSelection,
        checkpoints: updatedCheckpointData,
        ...(qcStatusSelection === "failed" && {
          failure_reasons: failureReasons,
        }),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(qcData),
        },
      );

      const result = await response.json();

      if (result.success) {
        toast(
          isUpdate
            ? "Quality control checklist updated"
            : "Quality control checklist created",
          "success",
        );
        setIsOpen(false);
        setQcStatus(qcStatusSelection);
        setReasonForAdequateProtection("");

        // Clear the attachments to delete list
        setAttachmentsToDelete([]);

        await refresh();
      } else {
        toast(
          result.message || "Failed to create quality control checklist",
          "error",
        );
      }
    } catch (error) {
      console.error("Error submitting QC checklist:", error);
      toast(
        "An error occurred while creating a quality control checklist",
        "error",
      );
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

  // State for upload popup
  const [uploadPopupOpen, setUploadPopupOpen] = useState(false);
  const [currentUploadCheckpoint, setCurrentUploadCheckpoint] = useState<
    number | null
  >(null);
  const [tempUploadFiles, setTempUploadFiles] = useState<File[] | null>(null);

  // Open upload popup
  const openUploadPopup = (checkpointIndex: number) => {
    setCurrentUploadCheckpoint(checkpointIndex);
    setTempUploadFiles(null);
    setUploadPopupOpen(true);
  };

  // Confirm upload from popup
  const confirmUpload = () => {
    if (
      currentUploadCheckpoint === null ||
      !tempUploadFiles ||
      tempUploadFiles.length === 0
    ) {
      toast("Please select files to upload", "error");
      return;
    }

    const newFiles: UploadedFile[] = tempUploadFiles.map((file) => {
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";

      return {
        file,
        preview,
      };
    });

    setCheckpointData((prev) => ({
      ...prev,
      [currentUploadCheckpoint]: {
        ...prev[currentUploadCheckpoint],
        pendingFiles: [
          ...prev[currentUploadCheckpoint].pendingFiles,
          ...newFiles,
        ],
      },
    }));

    setUploadPopupOpen(false);
    setCurrentUploadCheckpoint(null);
    setTempUploadFiles(null);
  };

  // Render attachment cell content
  const renderAttachmentCell = (index: number) => {
    const checkpoint = checkpointData[index];
    const hasAttachments = checkpoint?.attachments.length > 0;
    const hasPendingFiles = checkpoint?.pendingFiles.length > 0;
    const response = checkpoint?.response;

    // Always show upload button if response is "no"
    const showUploadButton = response === "no";

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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              width: "100%",
            }}
          >
            {checkpoint.attachments.map((attachmentUrl, attachmentIndex) => (
              <div
                key={`attachment-${attachmentIndex}`}
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {isImageFile(attachmentUrl) ? (
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <img
                      src={attachmentUrl}
                      alt="attachment"
                      style={{
                        maxHeight: "100px",
                        borderRadius: "5px",
                        objectFit: "contain",
                      }}
                    />
                    <Button
                      componentType={"button"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        padding: "7px 7px",
                        minWidth: "auto",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        removeAttachment(index, attachmentIndex);
                      }}
                    >
                      <img
                        src={trashIcon}
                        alt="remove"
                        style={{ width: "12px", height: "12px" }}
                      />
                    </Button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "8px",
                      width: "100%",
                      maxWidth: "300px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                      {getFileNameFromUrl(attachmentUrl)
                        .split(".")
                        .pop()
                        ?.toUpperCase()}{" "}
                      - {getFileNameFromUrl(attachmentUrl).substring(0, 20)}...
                    </div>
                    <Button
                      componentType={"button"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{
                        padding: "7px 7px",
                        minWidth: "auto",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        removeAttachment(index, attachmentIndex);
                      }}
                    >
                      <img
                        src={trashIcon}
                        alt="remove"
                        style={{ width: "12px", height: "12px" }}
                      />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending files (not uploaded yet) */}
        {hasPendingFiles && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              width: "100%",
            }}
          >
            {checkpoint.pendingFiles.map((pendingFile, fileIndex) => (
              <div
                key={`pending-${fileIndex}`}
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {pendingFile.preview ? (
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <img
                      src={pendingFile.preview}
                      alt="preview"
                      style={{
                        maxHeight: "100px",
                        borderRadius: "5px",
                        objectFit: "contain",
                      }}
                    />
                    <Button
                      componentType={"button"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        padding: "7px 7px",
                        minWidth: "auto",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        removePendingFile(index, fileIndex);
                      }}
                    >
                      <img
                        src={trashIcon}
                        alt="remove"
                        style={{ width: "12px", height: "12px" }}
                      />
                    </Button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      width: "100%",
                      maxWidth: "300px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                      {pendingFile.file.name.split(".").pop()?.toUpperCase()} -{" "}
                      {pendingFile.file.name.substring(0, 20)}...
                    </div>
                    <Button
                      componentType={"button"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{
                        padding: "7px 7px",
                        minWidth: "auto",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        removePendingFile(index, fileIndex);
                      }}
                    >
                      <img
                        src={trashIcon}
                        alt="remove"
                        style={{ width: "12px", height: "12px" }}
                      />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload button - shown when response is "no" */}
        {showUploadButton && (
          <Button
            componentType="button"
            bgColor="rgba(239, 239, 239, 1)"
            borderColor="rgba(223, 223, 223, 1)"
            textColor="black"
            onClick={(e) => {
              e.preventDefault();
              openUploadPopup(index);
            }}
            style={{ padding: "7px 7px" }}
          >
            <img
              src={uploadIcon}
              alt="upload"
              style={{ filter: "invert(1)" }}
            />
          </Button>
        )}
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
              xmlns="http://www.w3.org/2000/svg "
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
              xmlns="http://www.w3.org/2000/svg "
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
              xmlns="http://www.w3.org/2000/svg "
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
          noOptionalLabel
          onChange={(e) => handleNotesChange(index, e.target.value)}
        />
      </td>
      <td style={{ textAlign: "center" }}>{renderAttachmentCell(index)}</td>
    </tr>
  );

  // Form content
  const formContent = (
    <>
      <div className="input-row half">
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
            <th>ATTACHMENTS</th>
          </tr>
        </thead>
        <tbody>
          {checkpoints.map((checkpoint, index) =>
            renderCheckpointRow(checkpoint, index),
          )}
        </tbody>
      </table>

      <br />
      <br />

      <div className="input-row full">
        <InputItem
          label={"REASON FOR ADDING ADEQUATE WRAPPING / PROTECTION"}
          value={reasonForAdequateProtection}
          type={"text"}
          onChange={(e) => setReasonForAdequateProtection(e.target.value)}
        />
      </div>

      <div className="input-row four-col">
        <InputItem
          label={"ORDERED QUANTITY"}
          value={formatNumberWithoutTrailingZeros(item.quantity)}
          type={"text"}
          placeholder={""}
          required
          disabled
          onChange={() => {}}
        />
        <InputItem
          label={"RECEIVED QUANTITY"}
          value={formatNumberWithoutTrailingZeros(receivedQuantity)}
          type={"text"}
          placeholder={""}
          required
          disabled
          onChange={() => {}}
        />
        <InputItem
          label={"ACCEPTED QUANTITY"}
          value={acceptedQty}
          type={"text"}
          placeholder={"ENTER ACCEPTED QUANTITY"}
          required
          onChange={(e) => setAcceptedQty(e.target.value)}
        />

        <div className="input-item">
          <label>QC STATUS</label>
          <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
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
                required
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
          Passed
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
            header={`QUALITY CONTROL CHECKLIST FOR ${item.material_description}`}
            setIsOpen={handleModalClose}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
          >
            {formContent}
          </FormPopUp>
        )}

        {uploadPopupOpen && (
          <FormPopUp
            header="UPLOAD ATTACHMENTS"
            setIsOpen={() => {
              setUploadPopupOpen(false);
              setCurrentUploadCheckpoint(null);
              setTempUploadFiles(null);
            }}
            handleSubmit={(e) => {
              e.preventDefault();
              confirmUpload();
            }}
            addButtonLabel={"CONFIRM"}
          >
            <div className="input-row full">
              <MultipleUploadFileBox
                fileState={tempUploadFiles}
                setFileState={setTempUploadFiles}
                label="ATTACHMENTS"
                required={false}
                acceptedFileTypes=".jpg,.jpeg,.png,.webp"
                buttonLabel="UPLOAD FILES"
              />
            </div>
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
          Failed
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <img
              src={pencilIcon}
              alt="edit"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
                width: "12px",
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

        {uploadPopupOpen && (
          <FormPopUp
            header="UPLOAD ATTACHMENTS"
            setIsOpen={() => {
              setUploadPopupOpen(false);
              setCurrentUploadCheckpoint(null);
              setTempUploadFiles(null);
            }}
            handleSubmit={(e) => {
              e.preventDefault();
              confirmUpload();
            }}
            addButtonLabel={"ADD FILES"}
          >
            <MultipleUploadFileBox
              fileState={tempUploadFiles}
              setFileState={setTempUploadFiles}
              label="ATTACHMENTS"
              required={false}
              acceptedFileTypes="image/*,.pdf"
              buttonLabel="UPLOAD FILES"
            />
          </FormPopUp>
        )}
      </>
    );
  }

  // If pending, show the edit button
  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: "5px", padding: "7px 7px" }}
      >
        <img src={plusIcon} alt="plus" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={`QUALITY CONTROL CHECKLIST FOR ${item.material_description}`}
          setIsOpen={handleModalClose}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          {formContent}
        </FormPopUp>
      )}

      {uploadPopupOpen && (
        <FormPopUp
          header="UPLOAD ATTACHMENTS"
          setIsOpen={() => {
            setUploadPopupOpen(false);
            setCurrentUploadCheckpoint(null);
            setTempUploadFiles(null);
          }}
          handleSubmit={(e) => {
            e.preventDefault();
            confirmUpload();
          }}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <MultipleUploadFileBox
              fileState={tempUploadFiles}
              setFileState={setTempUploadFiles}
              label="ATTACHMENTS"
              required={false}
              acceptedFileTypes=".jpg,.jpeg,.png,.webp"
              buttonLabel="UPLOAD FILES"
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
