"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AttachQuotationButton from "./_AttachQuotationButton";
import RejectCommentPopUp from "../manager/RejectCommentPopUp";
import { MrHeader } from "../../types/mrHeader";
import { JoLine } from "../../types/joLine";
import { useAuth } from "@/app/context/AuthContext";
import CreateSubcontractorButton from "../../../../subcontractor/components/_CreateSubcontractorButton";

type SubcontractorQuotation = {
  id?: number;
  subcontractor_id: string | number;
  quotation_file: File | null;
  quotation_url: string;
  rating: string;
  total_price: string;
  approval_status?: string;
  reject_comment?: string;
  subcontractor_name?: string;
  created_by: string;
  isModified?: boolean;
};

type SubcontractorAndQuotationButtonProps = {
  mrHeader: MrHeader;
  joLine: JoLine;
};

export default function SubcontractorAndQuotationButton({
  mrHeader,
  joLine,
}: SubcontractorAndQuotationButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const plusIcon = "/icons/plus.svg";
  const trashIcon = "/icons/trash.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const closeIcon = "/icons/cross-small.svg";

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [mode, setMode] = useState<"add" | "edit">("add");
  const [allSubcontractorsRejected, setAllSubcontractorsRejected] =
    useState<boolean>(false);
  const [allSubcontractorsPending, setAllSubcontractorsPending] =
    useState<boolean>(false);
  const [hasApprovedSubcontractor, setHasApprovedSubcontractor] =
    useState<boolean>(false);
  const [approvedSubcontractorName, setApprovedSubcontractorName] =
    useState<string>("");

  const [rejectComments, setRejectComments] = useState<string>("");
  const [subcontractors, setSubcontractors] = useState<any[]>([]);

  // Initialize with 3 empty rows instead of 1
  const [subcontractorQuotations, setSubcontractorQuotations] = useState<
    SubcontractorQuotation[]
  >([
    {
      subcontractor_id: "",
      quotation_file: null,
      quotation_url: "",
      rating: "",
      total_price: "",
      created_by: "",
      isModified: false,
    },
    {
      subcontractor_id: "",
      quotation_file: null,
      quotation_url: "",
      rating: "",
      total_price: "",
      created_by: "",
      isModified: false,
    },
    {
      subcontractor_id: "",
      quotation_file: null,
      quotation_url: "",
      rating: "",
      total_price: "",
      created_by: "",
      isModified: false,
    },
  ]);

  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  async function fetchSubcontractors() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setSubcontractors(data))
      .catch((err) => console.error(err));
  }

  useEffect(() => {
    fetchSubcontractors();
    checkExistingQuotations();
  }, []);

  useEffect(() => {
    checkExistingQuotations();
  }, [joLine.id]);

  async function checkExistingQuotations() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor/getAllSubcontractorAndQuotationByJoLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: joLine.id }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to check quotations");
      }

      const data = await res.json();

      if (data && data.length > 0) {
        setMode("edit");

        const allRejected = data.every(
          (q: SubcontractorQuotation) => q.approval_status === "Rejected",
        );
        setAllSubcontractorsRejected(allRejected);

        const allPending = data.every(
          (q: SubcontractorQuotation) =>
            !q.approval_status || q.approval_status === null,
        );
        setAllSubcontractorsPending(allPending);

        const hasApproved = data.some(
          (q: SubcontractorQuotation) => q.approval_status === "Approved",
        );
        setHasApprovedSubcontractor(hasApproved);

        if (hasApproved) {
          const approvedQuotation = data.find(
            (q: SubcontractorQuotation) => q.approval_status === "Approved",
          );
          setApprovedSubcontractorName(
            approvedQuotation?.subcontractor_name || "Approved",
          );
        }

        if (allRejected) {
          const firstRejected = data.find(
            (q: SubcontractorQuotation) => q.reject_comment,
          );
          setRejectComments(
            firstRejected?.reject_comment || "No comment provided",
          );
        }
      } else {
        setAllSubcontractorsRejected(false);
        setAllSubcontractorsPending(false);
        setHasApprovedSubcontractor(false);
        setMode("add");
      }
    } catch (error) {
      console.error("Error checking quotations:", error);
      setAllSubcontractorsRejected(false);
      setAllSubcontractorsPending(false);
      setHasApprovedSubcontractor(false);
      setMode("add");
    }
  }

  async function fetchExistingQuotations() {
    if (mode !== "edit") return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor/getAllSubcontractorAndQuotationByJoLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: joLine.id }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch quotations");
      }

      const data = await res.json();

      if (data && data.length > 0) {
        const formattedQuotations = data.map((item: any) => ({
          id: item.id,
          subcontractor_id: item.subcontractor_id,
          quotation_file: null,
          quotation_url: Array.isArray(item.quotation_file)
            ? item.quotation_file[0]
            : item.quotation_file,
          rating: item.rating || "",
          total_price: item.total_price || "",
          approval_status: item.approval_status,
          reject_comment: item.reject_comment,
          subcontractor_name: item.subcontractor_name,
          created_by: item.created_by,
          isModified: false,
        }));

        setSubcontractorQuotations(formattedQuotations);
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast("Failed to load existing quotations", "error");
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit") {
        fetchExistingQuotations();
      } else {
        // Reset to 3 empty rows in add mode
        setSubcontractorQuotations([
          {
            subcontractor_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            total_price: "",
            created_by: userInfo?.name || "",
            isModified: true,
          },
          {
            subcontractor_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            total_price: "",
            created_by: userInfo?.name || "",
            isModified: true,
          },
          {
            subcontractor_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            total_price: "",
            created_by: userInfo?.name || "",
            isModified: true,
          },
        ]);
      }
    }
  }, [isOpen, mode, userInfo]);

  useEffect(() => {
    if (!isOpen) {
      setFilesToDelete([]);
    }
  }, [isOpen]);

  function handleAddRow() {
    setSubcontractorQuotations([
      ...subcontractorQuotations,
      {
        subcontractor_id: "",
        quotation_file: null,
        quotation_url: "",
        rating: "",
        total_price: "",
        created_by: userInfo?.name || "",
        isModified: true,
      },
    ]);
  }

  function handleRemoveRow(index: number) {
    // Always require minimum 3 subcontractors
    if (subcontractorQuotations.length <= 3) {
      toast("You must have at least 3 subcontractors", "error");
      return;
    }

    const newQuotations = subcontractorQuotations.filter(
      (_: SubcontractorQuotation, i: number) => i !== index,
    );
    setSubcontractorQuotations(newQuotations);
  }

  function updateQuotation(
    index: number,
    field: keyof SubcontractorQuotation,
    value: string | number | File | null,
  ) {
    const newQuotations = [...subcontractorQuotations];
    newQuotations[index] = {
      ...newQuotations[index],
      [field]: value,
      isModified: true,
    };

    setSubcontractorQuotations(newQuotations);
  }

  function handleFileSelection(index: number, file: File) {
    updateQuotation(index, "quotation_file", file);
    console.log("File stored successfully:", file.name);
  }

  function handleRemoveFile(index: number) {
    const quotation = subcontractorQuotations[index];

    if (quotation.quotation_url && !quotation.quotation_file) {
      setFilesToDelete((prev) => [...prev, quotation.quotation_url]);
    }

    const newQuotations = [...subcontractorQuotations];
    newQuotations[index] = {
      ...newQuotations[index],
      quotation_file: null,
      quotation_url: "",
      isModified: true,
    };
    setSubcontractorQuotations(newQuotations);
  }

  async function uploadFilesToS3(quotations: SubcontractorQuotation[]) {
    const updatedQuotations = [...quotations];

    for (let i = 0; i < updatedQuotations.length; i++) {
      const quotation = updatedQuotations[i];

      if (!quotation.quotation_file) {
        continue;
      }

      try {
        const formData = new FormData();
        formData.append(
          "files",
          quotation.quotation_file,
          quotation.quotation_file.name,
        );
        formData.append("folder", "jo-quotations");

        console.log("Uploading file:", quotation.quotation_file.name);

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload file to S3");
        }

        const uploadData = await uploadResponse.json();
        const fileUrl = uploadData.urls?.[0];

        if (!fileUrl) {
          throw new Error("No URL returned from upload");
        }

        updatedQuotations[i].quotation_url = fileUrl;
        console.log("Upload successful:", fileUrl);
      } catch (error: any) {
        console.error("Upload error:", error);
        throw new Error(
          `Failed to upload ${quotation.quotation_file.name}: ${error.message}`,
        );
      }
    }

    return updatedQuotations;
  }

  async function deleteFilesFromS3(urls: string[]) {
    const deletePromises = urls.map(async (url) => {
      try {
        const deleteResponse = await fetch("/api/s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            url: url,
          }),
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || "Failed to delete file" };
          }
          console.error("Failed to delete file from S3:", errorData);
          throw new Error(`Failed to delete ${url}`);
        }
      } catch (error) {
        console.error(`Error deleting ${url}:`, error);
        throw error;
      }
    });

    await Promise.all(deletePromises);
  }

  async function handleSubcontractorAndQuotationSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Filter out empty rows (rows without subcontractor selected)
    const validQuotations = subcontractorQuotations.filter(
      (q: SubcontractorQuotation) => q.subcontractor_id !== "",
    );

    // ALWAYS require minimum 3 subcontractors
    if (validQuotations.length < 3) {
      toast("Minimum 3 subcontractors are required", "error");
      return;
    }

    // Validate all 3+ quotations
    for (let i = 0; i < validQuotations.length; i++) {
      const quotation = validQuotations[i];

      if (!quotation.subcontractor_id) {
        toast(`Please select a subcontractor for row ${i + 1}`, "error");
        return;
      }

      if (!quotation.quotation_file && !quotation.quotation_url) {
        toast(`Please upload a quotation for row ${i + 1}`, "error");
        return;
      }

      // Safely handle total_price (string or number)
      const totalPriceValue =
        typeof quotation.total_price === "string"
          ? quotation.total_price.trim()
          : String(quotation.total_price || "").trim();

      if (!totalPriceValue) {
        toast(`Please enter total price for row ${i + 1}`, "error");
        return;
      }

      // Extra validation (must be valid number)
      const parsed = parseFloat(totalPriceValue);
      if (isNaN(parsed)) {
        toast(`Total price must be a valid number in row ${i + 1}`, "error");
        return;
      }
    }

    try {
      if (filesToDelete.length > 0) {
        await deleteFilesFromS3(filesToDelete);
        console.log(`${filesToDelete.length} file(s) deleted from S3`);
      }

      const quotationsWithUrls = await uploadFilesToS3(validQuotations);

      // FIXED: Ensure all required fields are present and properly formatted
      const apiPayload =
        mode === "edit"
          ? {
              action: "updateSubcontractorQuotations",
              jo_line_id: joLine.id,
              quotations: quotationsWithUrls.map((q) => ({
                id: q.id,
                subcontractor_id: Number(q.subcontractor_id), // Ensure number
                quotation_file: q.quotation_url, // Use the URL from upload
                rating: q.rating || null,
                total_price: Number(q.total_price) || 0, // Ensure number
                created_by: q.isModified ? userInfo?.name || "" : q.created_by,
              })),
            }
          : {
              action: "addSubcontractorAndQuotation",
              jo_line_id: joLine.id,
              quotations: quotationsWithUrls.map((q) => ({
                subcontractor_id: Number(q.subcontractor_id), // Ensure number
                quotation_file: q.quotation_url, // Use the URL from upload
                rating: q.rating || null,
                total_price: Number(q.total_price) || 0, // Ensure number
                created_by: userInfo?.name || "",
              })),
            };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiPayload),
        },
      );

      if (res.ok) {
        toast(
          mode === "edit"
            ? `Subcontractors and quotations updated for ${joLine.job_description}`
            : `Subcontractors and quotations added for ${joLine.job_description}`,
          "success",
        );
        setIsOpen(false);

        // Reset to 3 empty rows
        setSubcontractorQuotations([
          {
            subcontractor_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            total_price: "",
            created_by: "",
            isModified: false,
          },
          {
            subcontractor_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            total_price: "",
            created_by: "",
            isModified: false,
          },
          {
            subcontractor_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            total_price: "",
            created_by: "",
            isModified: false,
          },
        ]);
        setFilesToDelete([]);

        await checkExistingQuotations();

        // Dispatch event so JoPriceApprovalButton can refresh
        window.dispatchEvent(new CustomEvent("joQuotationsUpdated"));

        router.refresh();
      } else {
        const errorData = await res.json();
        throw new Error(
          errorData.error ||
            `Failed to ${mode === "edit" ? "update" : "add"} quotations`,
        );
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast(
        error.message ||
          `Failed to ${mode === "edit" ? "update" : "submit"} quotations`,
        "error",
      );
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        {/* Approval Status Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {mrHeader.progress_id === 11 && allSubcontractorsRejected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "15px",
                padding: "5px 10px 5px 15px",
                backgroundColor: "rgba(185, 28, 28, 1)",
                color: "white",
                borderRadius: "25px",
                whiteSpace: "nowrap",
              }}
            >
              <span>All Subcontractors Rejected</span>
              <RejectCommentPopUp text={rejectComments} />
            </div>
          )}

          {(mrHeader.progress_id === 11 || mrHeader.progress_id === 10) &&
            allSubcontractorsPending &&
            !allSubcontractorsRejected && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "5px 15px",
                  backgroundColor: "rgba(128, 128, 128, 1)",
                  color: "white",
                  borderRadius: "25px",
                  whiteSpace: "nowrap",
                }}
              >
                <span>Manager Pending Approval</span>
              </div>
            )}

          {[10, 11].includes(mrHeader.progress_id) &&
            hasApprovedSubcontractor && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "5px 15px",
                  backgroundColor: "rgba(34, 150, 100, 1)",
                  color: "white",
                  borderRadius: "25px",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{approvedSubcontractorName}</span>
              </div>
            )}

          {(mrHeader.progress_id === 11 || mrHeader.progress_id === 7) &&
            (mode === "edit" ? (
              <Button
                componentType="button"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="rgba(223, 223, 223, 1)"
                textColor="black"
                onClick={() => setIsOpen(true)}
                style={{
                  padding: "7px 7px",
                }}
              >
                <img src={pencilIcon} alt="pencil" />
              </Button>
            ) : (
              <Button
                componentType="button"
                bgColor="rgba(239, 239, 239, 1)"
                textColor="white"
                borderColor="rgba(223, 223, 223, 1)"
                onClick={() => setIsOpen(true)}
                style={{
                  padding: "7px 7px",
                }}
              >
                <img src={plusIcon} alt="plus" />
              </Button>
            ))}
        </div>
      </div>

      {isOpen && (
        <FormPopUp
          header={
            mode === "edit"
              ? `UPDATE SUBCONTRACTORS & QUOTATIONS FOR ${joLine.job_description}`
              : `ADD SUBCONTRACTORS & QUOTATIONS FOR ${joLine.job_description}`
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSubcontractorAndQuotationSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ minWidth: "1350px" }}
        >
          <>
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SUBCONTRACTOR</th>
                  <th>QUOTATION</th>
                  <th>TOTAL PRICE</th>
                  <th>QUOTED BY</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {subcontractorQuotations.map(
                  (quotation: SubcontractorQuotation, index: number) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td style={{ minWidth: "400px" }}>
                        <SingleSelectDropdown
                          label={"SUBCONTRACTOR"}
                          selectedValue={quotation.subcontractor_id}
                          onChange={(value) =>
                            updateQuotation(index, "subcontractor_id", value)
                          }
                          placeholder={"SELECT SUBCONTRACTOR"}
                          dbData={subcontractors}
                          idField="id"
                          labelField="name"
                          noLabel
                          required
                          bottomButtonComponent={
                            <CreateSubcontractorButton
                              onSuccess={() => fetchSubcontractors()}
                              full
                            />
                          }
                        />
                      </td>
                      <td>
                        {(quotation.quotation_file ||
                          quotation.quotation_url) && (
                          <Button
                            componentType="none"
                            bgColor="white"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            style={{
                              padding: "7px 20px",
                              borderRadius: "25px",
                            }}
                          >
                            Quotation
                            <a
                              href={quotation.quotation_url}
                              target="_blank"
                              style={{ display: "flex" }}
                              rel="noreferrer"
                            >
                              <img src={externalLinkIcon} alt="view" />
                            </a>
                            <img
                              src={closeIcon}
                              alt="remove"
                              style={{
                                cursor: "pointer",
                              }}
                              onClick={() => handleRemoveFile(index)}
                            />
                          </Button>
                        )}

                        {!quotation.quotation_file &&
                          !quotation.quotation_url && (
                            <AttachQuotationButton
                              onFileSelect={(file) =>
                                handleFileSelection(index, file)
                              }
                            />
                          )}
                      </td>
                      <td>
                        <div className="input-prefix right">
                          <span>AED</span>
                          <input
                            style={{ paddingRight: "50px" }}
                            type="text"
                            placeholder="ENTER TOTAL PRICE"
                            value={quotation.total_price}
                            onChange={(e) => {
                              let val = e.target.value;

                              // Remove any commas
                              val = val.replace(/,/g, "");

                              // Clear input if empty
                              if (val === "") {
                                updateQuotation(index, "total_price", "");
                                return;
                              }

                              // Allow only numbers and a single decimal point
                              if (!/^\d*\.?\d*$/.test(val)) {
                                return;
                              }

                              updateQuotation(index, "total_price", val);
                            }}
                            required
                          />
                        </div>
                      </td>

                      <td>{quotation.created_by || "-"}</td>

                      {/* Show remove button only if more than 3 rows */}
                      {subcontractorQuotations.length > 3 && (
                        <td>
                          <Button
                            componentType={"button"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px" }}
                            onClick={(e) => {
                              e.preventDefault();
                              handleRemoveRow(index);
                            }}
                          >
                            <img src={trashIcon} alt="trash icon" />
                          </Button>
                        </td>
                      )}

                      {/* Empty cell for rows that don't have trash button */}
                      {subcontractorQuotations.length <= 3 && <td></td>}
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            <br />

            <Button
              componentType={"button"}
              bgColor={"rgba(239, 239, 239, 1)"}
              borderColor={"rgba(239, 239, 239, 1)"}
              textColor={"black"}
              onClick={(e) => {
                e.preventDefault();
                handleAddRow();
              }}
              full
              style={{ padding: "20px 0px" }}
            >
              ADD SUBCONTRACTOR +
            </Button>

            <br />

            {/* Visual indicator for minimum subcontractor requirement */}
            {/* {subcontractorQuotations.filter((q) => q.subcontractor_id !== "")
              .length < 3 && (
              <div
                style={{
                  padding: "10px 15px",
                  color: "rgba(248, 77, 77, 1)",
                  textAlign: "left",
                }}
              >
                Minimum 3 subcontractors are required
              </div>
            )} */}
          </>
        </FormPopUp>
      )}
    </>
  );
}
