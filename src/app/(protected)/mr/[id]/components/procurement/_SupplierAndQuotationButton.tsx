"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import RejectCommentPopUp from "../manager/RejectCommentPopUp";
import { MrHeader } from "../../types/mrHeader";
import { MrLine } from "../../types/mrLine";
import CreateSupplierButton from "../../../../vendor/components/_CreateSupplierButton";
import { useAuth } from "@/app/context/AuthContext";
import InputItem from "@/app/components/InputItem";

type SupplierQuotation = {
  id?: number;
  supplier_id: string | number;
  quotation_file: File | null;
  quotation_url: string;
  rating: string;
  unit_price: string;
  total_price: string;
  proposed_quantity: string;
  approval_status?: string;
  reject_comment?: string;
  supplier_name?: string;
  qs_approval_status?: string;
  qs_reject_comment?: string;
  created_by: string;
  isModified?: boolean;
};

type SupplierAndQuotationButtonProps = {
  mrHeader: MrHeader;
  mrLine: MrLine;
  initialOpen?: boolean;
  noTrigger?: boolean;
};

export default function SupplierAndQuotationButton({
  mrHeader,
  mrLine,
  initialOpen = false,
  noTrigger = false,
}: SupplierAndQuotationButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const plusIcon = "/icons/plus.svg";
  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [allSuppliersRejected, setAllSuppliersRejected] =
    useState<boolean>(false);
  const [allSuppliersPending, setAllSuppliersPending] =
    useState<boolean>(false);
  const [hasApprovedSupplier, setHasApprovedSupplier] =
    useState<boolean>(false);
  const [approvedSupplierName, setApprovedSupplierName] = useState<string>("");

  const [allSuppliersQSRejected, setAllSuppliersQSRejected] =
    useState<boolean>(false);
  const [allSuppliersQSPending, setAllSuppliersQSPending] =
    useState<boolean>(false);
  const [hasQSApprovedSupplier, setHasQSApprovedSupplier] =
    useState<boolean>(false);
  const [qsApprovedSupplierName, setQSApprovedSupplierName] =
    useState<string>("");

  const [rejectComments, setRejectComments] = useState<string>("");
  const [qsRejectComments, setQSRejectComments] = useState<string>("");
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [supplierQuotations, setSupplierQuotations] = useState<
    SupplierQuotation[]
  >([
    {
      supplier_id: "",
      quotation_file: null,
      quotation_url: "",
      rating: "",
      unit_price: "",
      total_price: "",
      proposed_quantity: "",
      created_by: "",
      isModified: false,
    },
  ]);

  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [globalLowestPrice, setGlobalLowestPrice] = useState<number | null>(
    null,
  );
  const [globalPriceCount, setGlobalPriceCount] = useState<number>(0);

  const formatNumber = (value: unknown): string => {
    const num = Number(value);
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) {
      return num.toString();
    }
    return parseFloat(num.toFixed(3)).toString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}kb`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  };

  async function fetchSuppliers() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error(err));
  }

  useEffect(() => {
    fetchSuppliers();
    checkExistingQuotations();
  }, []);

  useEffect(() => {
    checkExistingQuotations();
  }, [mrLine.id]);

  useEffect(() => {
    function handleQuotationsCreated() {
      checkExistingQuotations();
    }
    window.addEventListener("quotations-created", handleQuotationsCreated);
    return () =>
      window.removeEventListener("quotations-created", handleQuotationsCreated);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchGlobalLowestPrice() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getGlobalLowestPriceByMrLineID?mr_line_id=${mrLine.id}`,
        );
        if (res.ok) {
          const data = await res.json();
          setGlobalLowestPrice(
            data.global_lowest != null ? Number(data.global_lowest) : null,
          );
          setGlobalPriceCount(data.price_count ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch global lowest price:", err);
      }
    }
    fetchGlobalLowestPrice();
  }, [isOpen, mrLine.id]);

  async function checkExistingQuotations() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mrLine.id }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to check quotations");
      }

      const data = await res.json();

      if (data && data.length > 0) {
        setMode("edit");

        const allRejected = data.every(
          (q: SupplierQuotation) => q.approval_status === "Rejected",
        );
        setAllSuppliersRejected(allRejected);

        const allPending = data.every(
          (q: SupplierQuotation) =>
            !q.approval_status || q.approval_status === null,
        );
        setAllSuppliersPending(allPending);

        const hasApproved = data.some(
          (q: SupplierQuotation) => q.approval_status === "Approved",
        );
        setHasApprovedSupplier(hasApproved);

        if (hasApproved) {
          const approvedQuotation = data.find(
            (q: SupplierQuotation) => q.approval_status === "Approved",
          );
          setApprovedSupplierName(
            approvedQuotation?.supplier_name || "Approved",
          );
        }

        if (allRejected) {
          const firstRejected = data.find(
            (q: SupplierQuotation) => q.reject_comment,
          );
          setRejectComments(
            firstRejected?.reject_comment || "No comment provided",
          );
        }

        const allQSRejected = data.every(
          (q: SupplierQuotation) => q.qs_approval_status === "Rejected",
        );
        setAllSuppliersQSRejected(allQSRejected);

        const allQSPending = data.every(
          (q: SupplierQuotation) =>
            !q.qs_approval_status || q.qs_approval_status === null,
        );
        setAllSuppliersQSPending(allQSPending);

        const hasQSApproved = data.some(
          (q: SupplierQuotation) => q.qs_approval_status === "Approved",
        );
        setHasQSApprovedSupplier(hasQSApproved);

        if (hasQSApproved) {
          const qsApprovedQuotation = data.find(
            (q: SupplierQuotation) => q.qs_approval_status === "Approved",
          );
          setQSApprovedSupplierName(
            qsApprovedQuotation?.supplier_name || "Approved",
          );
        }

        if (allQSRejected) {
          const firstQSRejected = data.find(
            (q: SupplierQuotation) => q.qs_reject_comment,
          );
          setQSRejectComments(
            firstQSRejected?.qs_reject_comment || "No comment provided",
          );
        }
      } else {
        setAllSuppliersRejected(false);
        setAllSuppliersPending(false);
        setHasApprovedSupplier(false);
        setAllSuppliersQSRejected(false);
        setAllSuppliersQSPending(false);
        setHasQSApprovedSupplier(false);
        setMode("add");
      }
    } catch (error) {
      console.error("Error checking quotations:", error);
      setAllSuppliersRejected(false);
      setAllSuppliersPending(false);
      setHasApprovedSupplier(false);
      setAllSuppliersQSRejected(false);
      setAllSuppliersQSPending(false);
      setHasQSApprovedSupplier(false);
      setMode("add");
    }
  }

  async function fetchExistingQuotations() {
    if (mode !== "edit") return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mrLine.id }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch quotations");
      }

      const data = await res.json();

      if (data && data.length > 0) {
        const formattedQuotations = data.map((item: any) => ({
          id: item.id,
          supplier_id: item.supplier_id,
          quotation_file: null,
          quotation_url: Array.isArray(item.quotation_file)
            ? item.quotation_file[0]
            : item.quotation_file,
          rating: item.rating || "",
          unit_price: formatNumber(item.unit_price) || "",
          total_price: formatNumber(item.total_price) || "",
          proposed_quantity: formatNumber(item.proposed_quantity) || "",
          approval_status: item.approval_status,
          reject_comment: item.reject_comment,
          supplier_name: item.supplier_name,
          qs_approval_status: item.qs_approval_status,
          qs_reject_comment: item.qs_reject_comment,
          created_by: item.created_by,
          isModified: false,
        }));

        setSupplierQuotations(formattedQuotations);
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
        setSupplierQuotations([
          {
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
            proposed_quantity: "",
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
    setSupplierQuotations([
      ...supplierQuotations,
      {
        supplier_id: "",
        quotation_file: null,
        quotation_url: "",
        rating: "",
        unit_price: "",
        total_price: "",
        proposed_quantity: "",
        created_by: userInfo?.name || "",
        isModified: true,
      },
    ]);
  }

  function handleRemoveRow(index: number) {
    if (supplierQuotations.length <= 1) {
      toast("You must have at least 1 row", "error");
      return;
    }

    const newQuotations = supplierQuotations.filter(
      (_, i: number) => i !== index,
    );
    setSupplierQuotations(newQuotations);
  }

  function updateQuotation(
    index: number,
    field: keyof SupplierQuotation,
    value: string | number | File | null,
  ) {
    const newQuotations = [...supplierQuotations];
    newQuotations[index] = {
      ...newQuotations[index],
      [field]: value,
      isModified: true,
    };

    if (field === "unit_price" || field === "proposed_quantity") {
      const unitPrice = parseFloat(newQuotations[index].unit_price || "0");
      const proposedQty = parseFloat(
        newQuotations[index].proposed_quantity || "0",
      );

      const total = unitPrice * proposedQty;

      if (isNaN(total) || total === 0) {
        newQuotations[index].total_price = "";
      } else {
        newQuotations[index].total_price = formatNumber(total);
      }
    }

    setSupplierQuotations(newQuotations);
  }

  const handleNumericInput = (
    index: number,
    field: "unit_price" | "proposed_quantity",
    value: string,
  ) => {
    if (value === "") {
      updateQuotation(index, field, "");
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    if ((value.match(/\./g) || []).length > 1) {
      return;
    }

    updateQuotation(index, field, value);
  };

  function handleFileSelection(index: number, file: File) {
    updateQuotation(index, "quotation_file", file);
    console.log("File stored successfully:", file.name);
  }

  function handleRemoveFile(index: number) {
    const quotation = supplierQuotations[index];

    if (quotation.quotation_url && !quotation.quotation_file) {
      setFilesToDelete((prev) => [...prev, quotation.quotation_url]);
    }

    const newQuotations = [...supplierQuotations];
    newQuotations[index] = {
      ...newQuotations[index],
      quotation_file: null,
      quotation_url: "",
      isModified: true,
    };
    setSupplierQuotations(newQuotations);
  }

  async function uploadFilesToS3(quotations: SupplierQuotation[]) {
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
        formData.append("folder", "mr-quotations");

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

  async function handleSupplierAndQuotationSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validQuotations = supplierQuotations.filter(
      (q: SupplierQuotation) => q.supplier_id !== "",
    );

    for (let i = 0; i < validQuotations.length; i++) {
      const quotation = validQuotations[i];

      if (!quotation.supplier_id) {
        toast(`Please select a vendor`, "error");
        return;
      }

      if (!quotation.quotation_file && !quotation.quotation_url) {
        toast(`Please upload a quotation`, "error");
        return;
      }

      if (!quotation.unit_price || quotation.unit_price.trim() === "") {
        toast(`Please enter unit price`, "error");
        return;
      }

      if (!quotation.total_price || quotation.total_price.trim() === "") {
        toast(`Please enter total price`, "error");
        return;
      }

      if (Number(quotation.proposed_quantity) < mrLine.quantity) {
        toast(
          `Please enter proposed quantity greater than or equal to ${mrLine.quantity}`,
          "error",
        );
        return;
      }
    }

    try {
      if (filesToDelete.length > 0) {
        await deleteFilesFromS3(filesToDelete);
        console.log(`${filesToDelete.length} file(s) deleted from S3`);
      }

      const quotationsWithUrls = await uploadFilesToS3(validQuotations);

      const apiPayload =
        mode === "edit"
          ? {
              action: "updateSupplierAndQuotation",
              mr_line_id: mrLine.id,
              quotations: quotationsWithUrls.map((q) => ({
                id: q.id,
                supplier_id: q.supplier_id,
                quotation_file: q.quotation_url,
                rating: q.rating || null,
                unit_price: formatNumber(q.unit_price),
                total_price: formatNumber(q.total_price),
                proposed_quantity: formatNumber(q.proposed_quantity),
                created_by: q.isModified ? userInfo?.name || "" : q.created_by,
              })),
            }
          : {
              action: "addSupplierAndQuotation",
              mr_line_id: mrLine.id,
              quotations: quotationsWithUrls.map((q) => ({
                supplier_id: q.supplier_id,
                quotation_file: q.quotation_url,
                rating: q.rating || null,
                unit_price: formatNumber(q.unit_price),
                total_price: formatNumber(q.total_price),
                proposed_quantity: formatNumber(q.proposed_quantity),
                created_by: userInfo?.name || "",
              })),
            };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiPayload),
        },
      );

      if (res.ok) {
        toast(
          mode === "edit"
            ? `Vendors and quotations updated for ${mrLine.material_description}`
            : `Vendors and quotations added for ${mrLine.material_description}`,
          "success",
        );
        setIsOpen(false);

        setSupplierQuotations([
          {
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
            proposed_quantity: "",
            created_by: "",
            isModified: false,
          },
        ]);
        setFilesToDelete([]);

        await checkExistingQuotations();

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
      {!noTrigger && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {mrHeader.progress_id === 11 && allSuppliersRejected && (
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
                <span>All Vendors Rejected</span>
                <RejectCommentPopUp text={rejectComments} />
              </div>
            )}

            {(mrHeader.progress_id === 11 || mrHeader.progress_id === 10) &&
              allSuppliersPending &&
              !allSuppliersRejected && (
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

            {[10, 11].includes(mrHeader.progress_id) && hasApprovedSupplier && (
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
                <span>{approvedSupplierName}</span>
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

          {(mrHeader.progress_id == 11 || mrHeader.progress_id == 9) && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {allSuppliersQSRejected && (
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
                  <span>Rejected by QS</span>
                  <RejectCommentPopUp text={qsRejectComments} />
                </div>
              )}

              {allSuppliersQSPending && !allSuppliersQSRejected && (
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
                  <span>QS Approval Pending</span>
                </div>
              )}

              {hasQSApprovedSupplier && (
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
                  <span>Approved by QS</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isOpen &&
        (() => {
          return (
            <FormPopUp
              header={
                mode === "edit"
                  ? `UPDATE VENDORS & QUOTATIONS`
                  : `ADD VENDORS & QUOTATIONS`
              }
              setIsOpen={setIsOpen}
              handleSubmit={handleSupplierAndQuotationSubmit}
              addButtonLabel="CONFIRM"
              style={{ minWidth: "95dvw" }}
            >
              <>
                {/* Info card */}
                <div
                  style={{
                    border: "1px solid rgba(239,239,239,1)",
                    borderRadius: "10px",
                    padding: "18px 24px",
                    display: "flex",
                    gap: "48px",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <small>MR NUMBER</small>
                    <h2>
                      MR-
                      {mrHeader.identifier ||
                        String(mrHeader.id).toString().padStart(5, "0")}
                    </h2>
                  </div>
                  <div>
                    <small>PROJECT</small>
                    <h2>{mrHeader.project_name || "—"}</h2>
                  </div>
                  <div>
                    <small>ITEM(S)</small>
                    <h2>{mrLine.material_description}</h2>
                  </div>
                  <div>
                    <small>QUOTED BY</small>
                    <h2>{userInfo?.name}</h2>
                  </div>
                </div>

                <h4 style={{ marginBottom: "16px" }}>
                  VENDORS &amp; QUOTATIONS
                </h4>

                <table
                  className="items-table"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "75px" }} />
                    <col style={{ width: "225px" }} />
                    <col />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "275px" }} />
                    <col style={{ width: "225px" }} />
                    <col style={{ width: "225px" }} />
                    <col style={{ width: "125px" }} />
                    <col style={{ width: "125px" }} />
                    <col style={{ width: "100px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>VENDOR</th>
                      <th>QUOTATION</th>
                      <th>REQ. QTY</th>
                      <th>PROPOSED QTY</th>
                      <th>UNIT PRICE</th>
                      <th>TOTAL PRICE</th>
                      <th>LEAD TIME</th>
                      <th>PAYMENT TYPE</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierQuotations.map(
                      (quotation: SupplierQuotation, index: number) => {
                        const supplier = suppliers.find(
                          (s) => String(s.id) === String(quotation.supplier_id),
                        );
                        const unitVal = parseFloat(quotation.unit_price || "");
                        const totalVal = parseFloat(
                          quotation.total_price || "",
                        );
                        const totalAlert =
                          !isNaN(totalVal) &&
                          totalVal > 0 &&
                          globalLowestPrice !== null &&
                          globalPriceCount > 0
                            ? totalVal <= globalLowestPrice
                              ? "lowest"
                              : `+${Math.round(((totalVal - globalLowestPrice) / globalLowestPrice) * 100)}% vs lowest`
                            : null;

                        const hasFile =
                          quotation.quotation_file || quotation.quotation_url;
                        const fileName = quotation.quotation_file
                          ? quotation.quotation_file.name
                          : (quotation.quotation_url
                              .split("/")
                              .pop()
                              ?.split("?")[0] ?? "quotation");
                        const fileExt = (
                          fileName.split(".").pop() ?? "FILE"
                        ).toUpperCase();
                        const fileSize = quotation.quotation_file
                          ? formatFileSize(quotation.quotation_file.size)
                          : null;
                        const isImage = [
                          "JPG",
                          "JPEG",
                          "PNG",
                          "GIF",
                          "WEBP",
                        ].includes(fileExt);
                        const imagePreviewUrl = isImage
                          ? quotation.quotation_file
                            ? URL.createObjectURL(quotation.quotation_file)
                            : quotation.quotation_url
                          : null;

                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <SingleSelectDropdown
                                    label={"VENDOR"}
                                    selectedValue={quotation.supplier_id}
                                    onChange={(value) =>
                                      updateQuotation(
                                        index,
                                        "supplier_id",
                                        value,
                                      )
                                    }
                                    placeholder={"SELECT VENDOR"}
                                    dbData={suppliers}
                                    idField="id"
                                    labelField="name"
                                    noLabel
                                    required
                                    bottomButtonComponent={
                                      <CreateSupplierButton
                                        full
                                        onSuccess={() => fetchSuppliers()}
                                      />
                                    }
                                  />
                                </div>
                                <span
                                  style={{
                                    color: "red",
                                    fontSize: "12px",
                                    flexShrink: 0,
                                    lineHeight: 1,
                                  }}
                                >
                                  *
                                </span>
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                {hasFile ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "10px",
                                      border: "1px solid rgba(207,207,207,1)",
                                      borderRadius: "8px",
                                      padding: "0px 8px",
                                      height: "40px",
                                      boxSizing: "border-box",
                                      backgroundColor: "white",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {isImage ? (
                                        <img
                                          src={imagePreviewUrl!}
                                          alt="preview"
                                          style={{
                                            width: "32px",
                                            height: "32px",
                                            objectFit: "cover",
                                            borderRadius: "4px",
                                            flexShrink: 0,
                                          }}
                                        />
                                      ) : (
                                        <img
                                          src="/icons/pdf.svg"
                                          alt="file"
                                          style={{
                                            width: "24px",
                                            flexShrink: 0,
                                          }}
                                        />
                                      )}
                                      <div style={{ overflow: "hidden" }}>
                                        <div
                                          style={{
                                            fontWeight: 600,
                                            fontSize: "12px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {fileName}
                                        </div>
                                        {fileSize && (
                                          <div
                                            style={{
                                              color: "rgba(150,150,150,1)",
                                              fontSize: "10px",
                                            }}
                                          >
                                            {fileSize}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      componentType="button"
                                      style={{ padding: "7px 7px" }}
                                      onClick={() => handleRemoveFile(index)}
                                      bgColor={"rgba(239, 239, 239, 1)"}
                                      borderColor={"rgba(223, 223, 223, 1)"}
                                      textColor={"black"}
                                    >
                                      <img src={trashIcon} alt="remove" />
                                    </Button>
                                  </div>
                                ) : (
                                  <label
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent:
                                        dragOverIndex === index
                                          ? "center"
                                          : "space-between",
                                      gap: "10px",
                                      border: "1px dashed rgba(207,207,207,1)",
                                      borderRadius: "8px",
                                      padding: "0px 8px",
                                      height: "40px",
                                      cursor: "pointer",
                                      boxSizing: "border-box",
                                      backgroundColor:
                                        dragOverIndex === index
                                          ? "rgba(169,255,218,1)"
                                          : "white",
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      setDragOverIndex(index);
                                    }}
                                    onDragLeave={() => setDragOverIndex(null)}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setDragOverIndex(null);
                                      const file = e.dataTransfer.files?.[0];
                                      if (file)
                                        handleFileSelection(index, file);
                                    }}
                                  >
                                    <input
                                      type="file"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file)
                                          handleFileSelection(index, file);
                                        e.target.value = "";
                                      }}
                                    />
                                    {dragOverIndex === index ? (
                                      <span
                                        style={{
                                          color: "rgba(34,150,100,1)",
                                          fontSize: "12px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        DROP HERE
                                      </span>
                                    ) : (
                                      <>
                                        <span
                                          style={{
                                            color: "rgba(150,150,150,1)",
                                            fontSize: "12px",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          Select File or Drop
                                        </span>
                                        <Button
                                          componentType={"none"}
                                          bgColor={"black"}
                                          borderColor={"black"}
                                          textColor={"black"}
                                          style={{ padding: "7px 7px" }}
                                        >
                                          <img
                                            src="/icons/upload.svg"
                                            alt="upload"
                                          />
                                        </Button>
                                      </>
                                    )}
                                  </label>
                                )}
                                {!hasFile && (
                                  <span
                                    style={{
                                      color: "red",
                                      fontSize: "12px",
                                      flexShrink: 0,
                                      lineHeight: 1,
                                    }}
                                  >
                                    *
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {formatNumber(mrLine.quantity)} {mrLine.unit}
                            </td>
                            <td>
                              <InputItem
                                label={""}
                                value={quotation.proposed_quantity}
                                type={"text postfix"}
                                placeholder="ENTER PROPOSED QTY"
                                onChange={(e) => {
                                  handleNumericInput(
                                    index,
                                    "proposed_quantity",
                                    e.target.value,
                                  );
                                }}
                                required
                                postfixText={mrLine.unit}
                              />
                            </td>
                            <td>
                              {/* <div className="input-prefix right">
                                <span>AED</span>
                                <input
                                  style={{ paddingRight: "50px" }}
                                  type="text"
                                  placeholder="ENTER UNIT PRICE"
                                  value={quotation.unit_price}
                                  onChange={(e) => {
                                    handleNumericInput(
                                      index,
                                      "unit_price",
                                      e.target.value,
                                    );
                                  }}
                                  required
                                />
                              </div> */}
                              <InputItem
                                label={""}
                                placeholder="ENTER UNIT PRICE"
                                value={quotation.unit_price}
                                type={"text postfix"}
                                postfixText="AED"
                                onChange={(e) => {
                                  handleNumericInput(
                                    index,
                                    "unit_price",
                                    e.target.value,
                                  );
                                }}
                                required
                              />
                            </td>
                            <td>
                              {/* <div
                                className="input-prefix right"
                                style={{ backgroundColor: "white" }}
                              >
                                <span>AED</span>
                                <input
                                  style={{ paddingRight: "50px" }}
                                  type="text"
                                  placeholder="CALCULATING..."
                                  value={quotation.total_price}
                                  disabled
                                />
                              </div> */}

                              <InputItem
                                label={""}
                                placeholder="CALCULATING"
                                value={quotation.total_price}
                                type={"text postfix"}
                                postfixText="AED"
                                onChange={() => {}}
                                disabled
                              />

                              {totalAlert && (
                                <div
                                  style={{
                                    height: 0,
                                    overflow: "visible",
                                    position: "relative",
                                  }}
                                >
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "4px",
                                      left: 0,
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                      color:
                                        totalAlert === "lowest"
                                          ? "rgba(0,163,93,1)"
                                          : "rgba(220,38,38,1)",
                                    }}
                                  >
                                    {totalAlert === "lowest"
                                      ? "Lowest ✓"
                                      : totalAlert}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td>{supplier?.avg_lead_time || "-"}</td>
                            <td>{supplier?.type || "-"}</td>
                            {supplierQuotations.length > 1 && index > 0 ? (
                              <td>
                                <Button
                                  componentType="button"
                                  bgColor="rgba(239, 239, 239, 1)"
                                  borderColor="rgba(223, 223, 223, 1)"
                                  textColor="black"
                                  style={{ padding: "7px 7px" }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleRemoveRow(index);
                                  }}
                                >
                                  <img src={trashIcon} alt="trash icon" />
                                </Button>
                              </td>
                            ) : (
                              <td></td>
                            )}
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>

                <br />

                {!mrHeader.skip_approvals && (
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
                    + ADD MORE
                  </Button>
                )}

                <br />
              </>
            </FormPopUp>
          );
        })()}
    </>
  );
}
