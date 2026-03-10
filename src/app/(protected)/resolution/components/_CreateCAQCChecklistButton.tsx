"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultipleUploadFileBox from "@/app/components/MultipleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type CreateCAQCChecklistButtonProps = {
  lpoMrLineId: number;
  lpoId: number;
  materialDescription: string;
  acceptedQuantity: number;
  receivedQuantity: number;
  orderedQuantity: number;
};

type CheckpointResponse = "yes" | "no" | "na" | null;

type UploadedFile = {
  file: File;
  preview: string;
};

type CheckpointData = {
  response: CheckpointResponse;
  notes: string;
  attachments: string[];
  pendingFiles: UploadedFile[];
};

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

const formatNumberWithoutTrailingZeros = (value: string | number): string => {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return parseFloat(num.toString()).toString();
};

export default function CreateCAQCChecklistButton({
  lpoMrLineId,
  lpoId,
  materialDescription,
  acceptedQuantity,
  receivedQuantity,
  orderedQuantity,
}: CreateCAQCChecklistButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const uploadIcon = "/icons/upload.svg";
  const trashIcon = "/icons/trash.svg";
  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [existingQcId, setExistingQcId] = useState<number | null>(null);

  const [checkpointData, setCheckpointData] = useState<{
    [key: number]: CheckpointData;
  }>({});

  const [reasonForAdequateProtection, setReasonForAdequateProtection] =
    useState("");

  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);

  // State for upload popup
  const [uploadPopupOpen, setUploadPopupOpen] = useState(false);
  const [currentUploadCheckpoint, setCurrentUploadCheckpoint] = useState<
    number | null
  >(null);
  const [tempUploadFiles, setTempUploadFiles] = useState<File[] | null>(null);

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
        setExistingQcId(data.data.id);
      } else {
        setExistingQcId(null);
      }
    } catch (error) {
      console.error("Error checking for existing QC:", error);
    }
  }

  async function loadExistingQcData() {
    if (!lpoMrLineId) return;

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
        const qcData = data.data;
        setExistingQcId(qcData.id);
        setReasonForAdequateProtection(
          qcData.reason_for_added_protection || "",
        );

        if (qcData.checkpoints && qcData.checkpoints.length > 0) {
          const loadedCheckpoints: { [key: number]: CheckpointData } = {};

          qcData.checkpoints.forEach((cp: any) => {
            const index = cp.checkpoint_number - 1;

            let attachmentUrls: string[] = [];
            if (cp.attachments) {
              try {
                if (typeof cp.attachments === "string") {
                  const parsed = JSON.parse(cp.attachments);
                  attachmentUrls = Array.isArray(parsed) ? parsed : [parsed];
                } else if (Array.isArray(cp.attachments)) {
                  attachmentUrls = cp.attachments;
                }
              } catch {
                attachmentUrls = [];
              }
            }

            loadedCheckpoints[index] = {
              response: cp.response,
              notes: cp.notes || "",
              attachments: attachmentUrls,
              pendingFiles: [],
            };
          });

          setCheckpointData(loadedCheckpoints);
        }
      }
    } catch (error) {
      console.error("Error loading existing QC data:", error);
    }
  }

  const handleEditClick = async () => {
    setIsOpen(true);
    if (existingQcId) {
      await loadExistingQcData();
    }
  };

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

  const openUploadPopup = (checkpointIndex: number) => {
    setCurrentUploadCheckpoint(checkpointIndex);
    setTempUploadFiles(null);
    setUploadPopupOpen(true);
  };

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

  const removeAttachment = (
    checkpointIndex: number,
    attachmentIndex: number,
  ) => {
    const urlToDelete =
      checkpointData[checkpointIndex].attachments[attachmentIndex];

    if (urlToDelete) {
      setAttachmentsToDelete((prev) => [...prev, urlToDelete]);

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

  const deleteMarkedAttachments = async () => {
    if (attachmentsToDelete.length === 0) return true;

    try {
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

  const uploadAllPendingFiles = async () => {
    const allFilesToUpload: File[] = [];
    const checkpointFileMap: { [checkpointIndex: number]: number[] } = {};

    Object.keys(checkpointData).forEach((key) => {
      const checkpointIndex = parseInt(key);
      const checkpoint = checkpointData[checkpointIndex];

      if (checkpoint.pendingFiles.length > 0) {
        const startIndex = allFilesToUpload.length;
        checkpoint.pendingFiles.forEach((pf) => {
          allFilesToUpload.push(pf.file);
        });
        const endIndex = allFilesToUpload.length;

        checkpointFileMap[checkpointIndex] = Array.from(
          { length: endIndex - startIndex },
          (_, i) => startIndex + i,
        );
      }
    });

    if (allFilesToUpload.length > 0) {
      try {
        const formData = new FormData();

        allFilesToUpload.forEach((file) => {
          formData.append("files", file);
        });

        formData.append("folder", "qc-attachments");

        const response = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload files");
        }

        const result = await response.json();
        const uploadedUrls: string[] = result.urls;

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

        setCheckpointData(updatedCheckpointData);
        return updatedCheckpointData;
      } catch (error) {
        console.error("Error uploading files:", error);
        toast("Failed to upload some files", "error");
        return null;
      }
    }

    return checkpointData;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const unansweredCheckpoints = checkpoints.filter(
      (_, index) => !checkpointData[index]?.response,
    );

    if (unansweredCheckpoints.length > 0) {
      toast("Please answer all checkpoints before submitting", "error");
      return;
    }

    try {
      const deletionSuccess = await deleteMarkedAttachments();
      if (!deletionSuccess) return;

      const updatedCheckpointData = await uploadAllPendingFiles();
      if (!updatedCheckpointData) return;

      const isUpdate = existingQcId !== null;

      const qcData = {
        action: isUpdate ? "updateQC" : "createQC",
        ...(isUpdate && { qc_id: existingQcId }),
        lpo_mr_line_id: lpoMrLineId,
        lpo_id: lpoId,
        checked_by: userInfo?.name || "",
        reason_for_added_protection: reasonForAdequateProtection,
        accepted_quantity: acceptedQuantity,
        qc_status: "passed",
        checkpoints: updatedCheckpointData,
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
        setReasonForAdequateProtection("");
        setAttachmentsToDelete([]);
        await checkExistingQc();
        router.refresh();
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

  const handleModalClose = () => {
    if (attachmentsToDelete.length > 0) {
      loadExistingQcData();
      setAttachmentsToDelete([]);
    }
    setIsOpen(false);
  };

  const renderAttachmentCell = (index: number) => {
    const checkpoint = checkpointData[index];
    const hasAttachments = checkpoint?.attachments.length > 0;
    const hasPendingFiles = checkpoint?.pendingFiles.length > 0;
    const response = checkpoint?.response;

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
                      -{" "}
                      {getFileNameFromUrl(attachmentUrl).substring(0, 20)}
                      ...
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
          noOptionalLabel
          onChange={(e) => handleNotesChange(index, e.target.value)}
        />
      </td>
      <td style={{ textAlign: "center" }}>{renderAttachmentCell(index)}</td>
    </tr>
  );

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

      <div className="input-row three-col">
        <InputItem
          label={"ORDERED QUANTITY"}
          value={formatNumberWithoutTrailingZeros(orderedQuantity)}
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
          value={formatNumberWithoutTrailingZeros(acceptedQuantity)}
          type={"text"}
          placeholder={""}
          required
          disabled
          onChange={() => {}}
        />
      </div>
    </>
  );

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={existingQcId ? handleEditClick : () => setIsOpen(true)}
        style={{ padding: "7px 20px", borderRadius: "25px" }}
      >
        {existingQcId ? (
          <>
            Edit QC Checklist{" "}
            <img src={pencilIcon} alt="edit" style={{ filter: "invert(1)" }} />
          </>
        ) : (
          <>Create QC Checklist +</>
        )}
      </Button>

      {isOpen && (
        <FormPopUp
          header={`QUALITY CONTROL CHECKLIST FOR ${materialDescription.toUpperCase()}`}
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
