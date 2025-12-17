"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import AttachQuotationButton from "./_AttachQuotationButton";
import RejectCommentPopUp from "../manager/RejectCommentPopUp";
import { MrHeader } from "../../types/mrHeader";

type SupplierQuotation = {
  id?: number;
  supplier_id: string | number;
  quotation_file: File | null;
  quotation_url: string;
  rating: string;
  unit_price: string;
  total_price: string;
  approval_status?: string;
  reject_comment?: string;
  supplier_name?: string;
};

type SupplierAndQuotationButtonProps = {
  mrHeader: MrHeader;
  mrLineID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  full?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export default function SupplierAndQuotationButton({
  mrHeader,
  mrLineID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  full,
  style,
  children,
}: SupplierAndQuotationButtonProps) {
  const router = useRouter();

  const trashIcon = "/icons/trash.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const closeIcon = "/icons/cross-small.svg";

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] =
    useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState<boolean>(true);

  const [mode, setMode] = useState<"add" | "edit">("add");
  const [hasExistingQuotations, setHasExistingQuotations] =
    useState<boolean>(false);
  const [allSuppliersRejected, setAllSuppliersRejected] =
    useState<boolean>(false);
  const [allSuppliersPending, setAllSuppliersPending] =
    useState<boolean>(false);
  const [hasApprovedSupplier, setHasApprovedSupplier] =
    useState<boolean>(false);
  const [approvedSupplierName, setApprovedSupplierName] = useState<string>("");

  // State for rejection comments
  const [rejectComments, setRejectComments] = useState<string>("");

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
    },
    {
      supplier_id: "",
      quotation_file: null,
      quotation_url: "",
      rating: "",
      unit_price: "",
      total_price: "",
    },
    {
      supplier_id: "",
      quotation_file: null,
      quotation_url: "",
      rating: "",
      unit_price: "",
      total_price: "",
    },
  ]);

  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    []
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

  const [name, setName] = useState<string>("");
  const [materialCategoryID, setMaterialCategoryID] = useState<
    (string | number)[]
  >([]);
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState<
    (string | number)[]
  >([]);
  const [trn1, setTrn1] = useState<string>("");
  const [trn2, setTrn2] = useState<string>("");
  const [trn3, setTrn3] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [contactPersonName, setContactPersonName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Check if quotations exist on mount
  useEffect(() => {
    setIsMounted(true);

    // Fetch suppliers
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error(err));

    // Fetch material categories
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`
    )
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error(err);
      });

    // Check for existing quotations
    checkExistingQuotations();
  }, [mrLineID]);

  // Check if quotations already exist for this MR line
  async function checkExistingQuotations() {
    setIsCheckingExisting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mrLineID }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to check quotations");
      }

      const data = await res.json();

      if (data && data.length > 0) {
        setHasExistingQuotations(true);
        setMode("edit");

        // Check if all suppliers are rejected
        const allRejected = data.every(
          (q: SupplierQuotation) => q.approval_status === "Rejected"
        );
        setAllSuppliersRejected(allRejected);

        // Check if all suppliers are pending (null or undefined approval_status)
        const allPending = data.every(
          (q: SupplierQuotation) =>
            !q.approval_status || q.approval_status === null
        );
        setAllSuppliersPending(allPending);

        const hasApproved = data.some(
          (q: SupplierQuotation) => q.approval_status === "Approved"
        );
        setHasApprovedSupplier(hasApproved);

        // Store the approved supplier name
        if (hasApproved) {
          const approvedQuotation = data.find(
            (q: SupplierQuotation) => q.approval_status === "Approved"
          );
          setApprovedSupplierName(
            approvedQuotation?.supplier_name || "Approved"
          );
        }

        if (allRejected) {
          const firstRejected = data.find(
            (q: SupplierQuotation) => q.reject_comment
          );

          setRejectComments(
            firstRejected?.reject_comment || "No comment provided"
          );
        }
      } else {
        setHasExistingQuotations(false);
        setAllSuppliersRejected(false);
        setAllSuppliersPending(false);
        setHasApprovedSupplier(false);
        setMode("add");
      }
    } catch (error) {
      console.error("Error checking quotations:", error);
      setHasExistingQuotations(false);
      setAllSuppliersRejected(false);
      setAllSuppliersPending(false);
      setHasApprovedSupplier(false);
      setMode("add");
    } finally {
      setIsCheckingExisting(false);
    }
  }

  useEffect(() => {
    if (materialCategoryID.length > 0) {
      Promise.all(
        materialCategoryID.map((categoryId) =>
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category_id: categoryId,
              }),
            }
          ).then((res) => res.json())
        )
      )
        .then((results) => {
          const allSubCategories = results.flat();
          const uniqueSubCategories = Array.from(
            new Map(
              allSubCategories.map((item: any) => [item.id, item])
            ).values()
          );
          setMaterialSubCategoryValues(uniqueSubCategories);
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      setMaterialSubCategoryValues([]);
      setMaterialSubCategoryID([]);
    }
  }, [materialCategoryID]);

  // Fetch existing quotations when modal opens in edit mode
  async function fetchExistingQuotations() {
    if (mode !== "edit") return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mrLineID }),
        }
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
          unit_price: item.unit_price || "",
          total_price: item.total_price || "",
          approval_status: item.approval_status,
          reject_comment: item.reject_comment,
          supplier_name: item.supplier_name,
        }));

        // Ensure at least 3 rows
        while (formattedQuotations.length < 3) {
          formattedQuotations.push({
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
          });
        }

        setSupplierQuotations(formattedQuotations);
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast("Failed to load existing quotations", "error");
    } finally {
      setIsLoading(false);
    }
  }

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit") {
        fetchExistingQuotations();
      } else {
        // Reset to default empty rows for add mode
        setSupplierQuotations([
          {
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
          },
          {
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
          },
          {
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
          },
        ]);
      }
    }
  }, [isOpen, mode]);

  // Reset filesToDelete when modal closes without confirming
  useEffect(() => {
    if (!isOpen) {
      setFilesToDelete([]);
    }
  }, [isOpen]);

  function getAvailableSuppliers(currentIndex: number) {
    const selectedSupplierIds = supplierQuotations
      .map((q: SupplierQuotation, idx: number) => {
        if (idx === currentIndex) return null;
        return q.supplier_id;
      })
      .filter((id) => id !== null && id !== "");

    return suppliers.filter(
      (supplier) => !selectedSupplierIds.includes(supplier.id)
    );
  }

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
      },
    ]);
  }

  function handleRemoveRow(index: number) {
    if (supplierQuotations.length <= 3) {
      toast("You must have at least 3 rows", "error");
      return;
    }

    const newQuotations = supplierQuotations.filter(
      (_: SupplierQuotation, i: number) => i !== index
    );
    setSupplierQuotations(newQuotations);
  }

  function updateQuotation(
    index: number,
    field: keyof SupplierQuotation,
    value: string | number | File | null
  ) {
    const newQuotations = [...supplierQuotations];
    newQuotations[index] = {
      ...newQuotations[index],
      [field]: value,
    };
    setSupplierQuotations(newQuotations);
  }

  function handleFileSelection(index: number, file: File) {
    updateQuotation(index, "quotation_file", file);
    console.log("File stored successfully:", file.name);
  }

  function handleRemoveFile(index: number) {
    const quotation = supplierQuotations[index];

    // If there's an existing URL (file from S3), mark it for deletion
    if (quotation.quotation_url && !quotation.quotation_file) {
      setFilesToDelete((prev) => [...prev, quotation.quotation_url]);
    }

    // Clear the quotation file data immediately in the UI
    const newQuotations = [...supplierQuotations];
    newQuotations[index] = {
      ...newQuotations[index],
      quotation_file: null,
      quotation_url: "",
    };
    setSupplierQuotations(newQuotations);
  }

  function handleViewFile(quotation: SupplierQuotation) {
    if (quotation.quotation_file) {
      const fileUrl = URL.createObjectURL(quotation.quotation_file);
      window.open(fileUrl, "_blank");
    } else if (quotation.quotation_url) {
      window.open(quotation.quotation_url, "_blank");
    }
  }

  function getFileName(quotation: SupplierQuotation): string {
    if (quotation.quotation_file) {
      return quotation.quotation_file.name;
    } else if (quotation.quotation_url) {
      const urlParts = quotation.quotation_url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      // Decode URL-encoded filename
      return decodeURIComponent(fileName) || "View File";
    }
    return "";
  }

  async function handleSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trn_number = `${trn1}-${trn2}-${trn3}`;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          material_categories: materialCategoryID,
          material_subcategories: materialSubCategoryID,
          trn_number,
          avg_lead_time: null,
          supplier_rating: null,
          currency,
          status,
          contact_person_name: contactPersonName,
          phone,
          email,
          address,
          notes,
        }),
      }
    );

    if (res.ok) {
      toast("Supplier created", "success");

      setName("");
      setMaterialCategoryID([]);
      setMaterialSubCategoryID([]);
      setTrn1("");
      setTrn2("");
      setTrn3("");
      setCurrency("");
      setStatus("");
      setContactPersonName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setNotes("");

      setIsSupplierModalOpen(false);

      // Refresh suppliers list
      fetch("/api/supplier", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => setSuppliers(data))
        .catch((err) => console.error(err));

      router.refresh();
    } else {
      toast("Failed to create supplier", "error");
    }
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
          quotation.quotation_file.name
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
          `Failed to upload ${quotation.quotation_file.name}: ${error.message}`
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
      (q: SupplierQuotation) => q.supplier_id !== ""
    );

    if (validQuotations.length < 3) {
      toast("Please fill in at least 3 suppliers", "error");
      return;
    }

    for (let i = 0; i < validQuotations.length; i++) {
      const quotation = validQuotations[i];
      const originalIndex = supplierQuotations.findIndex(
        (q) => q === quotation
      );

      if (!quotation.supplier_id) {
        toast(`Please select a supplier`, "error");
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
    }

    setIsUploading(true);

    try {
      // First, delete marked files from S3
      if (filesToDelete.length > 0) {
        await deleteFilesFromS3(filesToDelete);
        console.log(`${filesToDelete.length} file(s) deleted from S3`);
      }

      // Then upload new files
      const quotationsWithUrls = await uploadFilesToS3(validQuotations);

      const apiPayload =
        mode === "edit"
          ? {
              action: "updateSupplierAndQuotation",
              mr_line_id: mrLineID,
              quotations: quotationsWithUrls.map((q) => ({
                id: q.id,
                supplier_id: q.supplier_id,
                quotation_file: q.quotation_url,
                rating: q.rating || null,
                unit_price: q.unit_price,
                total_price: q.total_price,
              })),
            }
          : {
              action: "addSupplierAndQuotation",
              mr_line_id: mrLineID,
              quotations: quotationsWithUrls.map((q) => ({
                supplier_id: q.supplier_id,
                quotation_file: q.quotation_url,
                rating: q.rating || null,
                unit_price: q.unit_price,
                total_price: q.total_price,
              })),
            };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiPayload),
        }
      );

      if (res.ok) {
        toast(
          mode === "edit"
            ? "Suppliers and quotations updated"
            : "Suppliers and quotations added",
          "success"
        );
        setIsOpen(false);

        // Reset form and deletion tracking
        setSupplierQuotations([
          {
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
          },
          {
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
          },
          {
            supplier_id: "",
            quotation_file: null,
            quotation_url: "",
            rating: "",
            unit_price: "",
            total_price: "",
          },
        ]);
        setFilesToDelete([]);

        // Re-check if quotations exist after submit
        await checkExistingQuotations();

        router.refresh();
      } else {
        const errorData = await res.json();
        throw new Error(
          errorData.error ||
            `Failed to ${mode === "edit" ? "update" : "add"} quotations`
        );
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast(
        error.message ||
          `Failed to ${mode === "edit" ? "update" : "submit"} quotations`,
        "error"
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
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
            <span>All Suppliers Rejected</span>
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
              <span>Pending Approval</span>
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
              bgColor="white"
              borderColor="black"
              textColor="black"
              onClick={() => setIsOpen(true)}
              full={full || false}
              style={style}
            >
              Edit Suppliers & Quotations
            </Button>
          ) : (
            <Button
              componentType="button"
              bgColor={bgColor}
              borderColor={borderColor}
              textColor={textColor}
              onClick={() => setIsOpen(true)}
              full={full || false}
              style={style}
            >
              {children}
            </Button>
          ))}
      </div>

      {isOpen && (
        <FormPopUp
          header={
            mode === "edit"
              ? "EDIT SUPPLIERS & QUOTATIONS"
              : "ADD SUPPLIERS & QUOTATIONS"
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSupplierAndQuotationSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <>
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SUPPLIER</th>
                  <th>QUOTATION</th>
                  {/* <th>RATING</th> */}
                  <th>UNIT PRICE</th>
                  <th>TOTAL PRICE</th>
                  {supplierQuotations.length > 3 && <th>ACTION</th>}
                </tr>
              </thead>
              <tbody>
                {supplierQuotations.map(
                  (quotation: SupplierQuotation, index: number) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td style={{ minWidth: "250px" }}>
                        <SingleSelectDropdown
                          label={"SUPPLIER"}
                          selectedValue={quotation.supplier_id}
                          onChange={(value) =>
                            updateQuotation(index, "supplier_id", value)
                          }
                          placeholder={"SELECT SUPPLIER"}
                          dbData={getAvailableSuppliers(index)}
                          idField="id"
                          labelField="name"
                          noLabel
                          showCreateButton={true}
                          createButtonLabel="+ NEW SUPPLIER"
                          onCreateClick={() => setIsSupplierModalOpen(true)}
                          required
                        />
                      </td>
                      <td>
                        {(quotation.quotation_file ||
                          quotation.quotation_url) && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "5px 20px",
                              border: "1px solid rgba(223, 223, 223, 1)",
                              borderRadius: "25px",
                              backgroundColor: "white",
                              gap: "10px",
                            }}
                          >
                            <span
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                minWidth: "100px",
                                maxWidth: "100px",
                                display: "inline-block",
                              }}
                            >
                              View Quotation
                            </span>
                            <div style={{ display: "flex", gap: "10px" }}>
                              <img
                                src={externalLinkIcon}
                                alt="view"
                                style={{
                                  cursor: "pointer",
                                }}
                                onClick={() => handleViewFile(quotation)}
                              />
                              <img
                                src={closeIcon}
                                alt="remove"
                                style={{
                                  cursor: "pointer",
                                }}
                                onClick={() => handleRemoveFile(index)}
                              />
                            </div>
                          </div>
                        )}

                        {!quotation.quotation_file &&
                          !quotation.quotation_url && (
                            <AttachQuotationButton
                              onFileSelect={(file) =>
                                handleFileSelection(index, file)
                              }
                              isUploading={isUploading}
                            />
                          )}
                      </td>
                      {/* <td style={{ minWidth: "150px" }}>
                        <input
                          type="number"
                          value={quotation.rating}
                          onChange={(e) =>
                            updateQuotation(index, "rating", e.target.value)
                          }
                          placeholder="RATING"
                          step="1"
                          min="0"
                          max="5"
                          disabled
                        />
                      </td> */}
                      <td>
                        <div className="input-prefix right">
                          <span>AED</span>
                          <input
                            style={{ paddingRight: "50px" }}
                            type="text"
                            placeholder="ENTER UNIT PRICE"
                            value={quotation.unit_price}
                            onChange={(e) =>
                              updateQuotation(
                                index,
                                "unit_price",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <div className="input-prefix right">
                          <span>AED</span>
                          <input
                            style={{ paddingRight: "50px" }}
                            type="text"
                            placeholder="ENTER TOTAL PRICE"
                            value={quotation.total_price}
                            onChange={(e) =>
                              updateQuotation(
                                index,
                                "total_price",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </td>

                      {supplierQuotations.length > 3 && index >= 3 && (
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

                      {supplierQuotations.length > 3 && index < 3 && <td></td>}
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <br />

            {mode !== "edit" && (
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
              >
                + ADD MORE
              </Button>
            )}
          </>
        </FormPopUp>
      )}

      {isMounted &&
        isSupplierModalOpen &&
        createPortal(
          <FormPopUp
            header="CREATE SUPPLIER"
            setIsOpen={setIsSupplierModalOpen}
            handleSubmit={handleSupplierSubmit}
            addButtonLabel="CONFIRM"
          >
            <div className="input-row full">
              <InputItem
                label="NAME"
                type="text"
                value={name}
                placeholder={"ENTER SUPPLIER NAME"}
                required
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </div>

            <div className="input-row half">
              <MultiSelectDropdown
                dbData={materialCategoryValues}
                selectedValues={materialCategoryID}
                onChange={setMaterialCategoryID}
                placeholder={"SELECT MATERIAL CATEGORY"}
                label="MATERIAL CATEGORY"
                style={{ maxWidth: "410px" }}
              />

              <MultiSelectDropdown
                dbData={materialSubCategoryValues}
                selectedValues={materialSubCategoryID}
                onChange={setMaterialSubCategoryID}
                placeholder={"SELECT MATERIAL SUBCATEGORY"}
                label="MATERIAL SUBCATEGORY"
                disabled={materialCategoryID.length === 0}
                style={{ maxWidth: "410px" }}
              />
            </div>

            <div className="input-row">
              <div className="input-item">
                <label>TRN / TAX REGISTRATION NUMBER</label>
                <div style={{ display: "flex", gap: "5px" }}>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="000"
                    style={{ width: "50px" }}
                    value={trn1}
                    onChange={(e) => setTrn1(e.target.value)}
                  />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    style={{ width: "75px" }}
                    value={trn2}
                    onChange={(e) => setTrn2(e.target.value)}
                  />
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="000"
                    style={{ width: "50px" }}
                    value={trn3}
                    onChange={(e) => setTrn3(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="input-row half">
              <InputItem
                label={"AVERAGE LEAD TIME"}
                value={""}
                type={"text"}
                placeholder={""}
                required={false}
                onChange={() => {}}
                disabled
              />

              <InputItem
                label={"SUPPLIER RATING"}
                value={""}
                type={"text"}
                placeholder={""}
                required={false}
                onChange={() => {}}
                disabled
              />
            </div>

            <div className="input-row half">
              <InputItem
                label={"CURRENCY"}
                value={currency}
                type={"select"}
                placeholder={"SELECT CURRENCY"}
                required
                onChange={(e) => {
                  setCurrency(e.target.value);
                }}
                selectOptions={[
                  "AED",
                  "USD",
                  "EUR",
                  "GBP",
                  "SAR",
                  "KES",
                  "JPY",
                  "CAD",
                  "CHF",
                  "AUD",
                  "CNY",
                ]}
              />

              <InputItem
                label={"STATUS"}
                value={status}
                type={"select"}
                placeholder={"SELECT STATUS"}
                required
                onChange={(e) => {
                  setStatus(e.target.value);
                }}
                selectOptions={["Active", "Inactive", "Blacklisted"]}
              />
            </div>

            <div className="input-row full">
              <InputItem
                label={"CONTACT PERSON NAME"}
                value={contactPersonName}
                type={"text"}
                placeholder={"ENTER CONTACT PERSON NAME"}
                required
                onChange={(e) => {
                  setContactPersonName(e.target.value);
                }}
              />
            </div>

            <div className="input-row three-col">
              <InputItem
                label={"PHONE"}
                value={phone}
                type={"text"}
                placeholder={"ENTER PHONE"}
                required
                onChange={(e) => {
                  setPhone(e.target.value);
                }}
              />

              <InputItem
                label={"EMAIL"}
                value={email}
                type={"text"}
                placeholder={"ENTER EMAIL"}
                required
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />

              <InputItem
                label={"ADDRESS"}
                value={address}
                type={"text"}
                placeholder={"ENTER ADDRESS"}
                required
                onChange={(e) => {
                  setAddress(e.target.value);
                }}
              />
            </div>

            <div className="input-row full">
              <InputItem
                label={"NOTES"}
                value={notes}
                type={"textarea"}
                placeholder={"ENTER NOTES"}
                required={false}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
              />
            </div>
          </FormPopUp>,
          document.body
        )}
    </>
  );
}
