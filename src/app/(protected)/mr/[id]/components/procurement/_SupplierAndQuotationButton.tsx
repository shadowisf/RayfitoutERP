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
import { MrLine } from "../../types/mrLine";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import FormContextHeader from "@/app/components/FormContextHeader";

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
  mrLine: MrLine;
};

export default function SupplierAndQuotationButton({
  mrHeader,
  mrLine,
}: SupplierAndQuotationButtonProps) {
  const router = useRouter();

  const pencilIcon = "/icons/pencil.svg";
  const plusIcon = "/icons/plus.svg";
  const trashIcon = "/icons/trash.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const closeIcon = "/icons/cross-small.svg";

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [isSupplierModalOpen, setIsSupplierModalOpen] =
    useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [mode, setMode] = useState<"add" | "edit">("add");
  const [allSuppliersRejected, setAllSuppliersRejected] =
    useState<boolean>(false);
  const [allSuppliersPending, setAllSuppliersPending] =
    useState<boolean>(false);
  const [hasApprovedSupplier, setHasApprovedSupplier] =
    useState<boolean>(false);
  const [approvedSupplierName, setApprovedSupplierName] = useState<string>("");

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
  ]);

  const [categoriesManuallySelected, setCategoriesManuallySelected] =
    useState(false);
  const [userInitiatedCategorySelection, setUserInitiatedCategorySelection] =
    useState(false);

  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );

  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [materialCategoryID, setMaterialCategoryID] = useState<
    (string | number)[]
  >([]);
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState<
    (string | number)[]
  >([]);
  const [trn1, setTrn1] = useState("");
  const [trn2, setTrn2] = useState("");
  const [trn3, setTrn3] = useState("");
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");

  // File states for TRN Certificate
  const [trnCertificateFile, setTrnCertificateFile] = useState<File | null>(
    null,
  );
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);

  useEffect(() => {
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
    setWebsite("");
    setTrnCertificateFile(null);
    setTradeLicenseFile(null);
  }, [type]);

  useEffect(() => {
    setIsMounted(true);

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error(err));

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((data) => setMaterialCategoryValues(data))
      .catch((err) => console.error(err));

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    )
      .then((res) => res.json())
      .then((data) => setMaterialSubCategoryValues(data))
      .catch((err) => console.error(err));

    checkExistingQuotations();
  }, [mrLine.id]);

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
      } else {
        setAllSuppliersRejected(false);
        setAllSuppliersPending(false);
        setHasApprovedSupplier(false);
        setMode("add");
      }
    } catch (error) {
      console.error("Error checking quotations:", error);
      setAllSuppliersRejected(false);
      setAllSuppliersPending(false);
      setHasApprovedSupplier(false);
      setMode("add");
    }
  }

  useEffect(() => {
    // Only filter subcategories if categories were manually selected
    if (materialCategoryID.length > 0 && categoriesManuallySelected) {
      Promise.all(
        materialCategoryID.map((categoryId: any) =>
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category_id: categoryId,
              }),
            },
          ).then((res) => res.json()),
        ),
      )
        .then((results) => {
          const allSubCategories = results.flat();
          const uniqueSubCategories = Array.from(
            new Map(
              allSubCategories.map((item: any) => [item.id, item]),
            ).values(),
          );
          setMaterialSubCategoryValues(uniqueSubCategories);
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      // When no categories are selected OR categories were auto-populated, show ALL subcategories
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      )
        .then((res) => res.json())
        .then((data) => setMaterialSubCategoryValues(data))
        .catch((err) => console.error(err));
    }
  }, [materialCategoryID, categoriesManuallySelected]);

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
          unit_price: item.unit_price || "",
          total_price: item.total_price || "",
          approval_status: item.approval_status,
          reject_comment: item.reject_comment,
          supplier_name: item.supplier_name,
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
          },
        ]);
      }
    }
  }, [isOpen, mode]);

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
      },
    ]);
  }

  function handleRemoveRow(index: number) {
    if (supplierQuotations.length <= 1) {
      toast("You must have at least 1 row", "error");
      return;
    }

    const newQuotations = supplierQuotations.filter(
      (_: SupplierQuotation, i: number) => i !== index,
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
    };

    // Automatically calculate total price when unit_price changes (without decimals)
    if (field === "unit_price") {
      const unitPrice = parseFloat(value as string);
      const quantity = parseFloat(mrLine.quantity as any) || 0;
      const totalPrice = Math.round(unitPrice * quantity);

      newQuotations[index].total_price = isNaN(totalPrice)
        ? ""
        : totalPrice.toString();
    }

    setSupplierQuotations(newQuotations);
  }

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
    };
    setSupplierQuotations(newQuotations);
  }

  async function handleSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trn_number = `${trn1}${trn2}${trn3}`;

    try {
      let trnCertificateUrl = null;
      if (trnCertificateFile) {
        const trnFormData = new FormData();
        trnFormData.append("files", trnCertificateFile);
        trnFormData.append("folder", "supplier-trn-certificates");

        const trnUploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: trnFormData,
        });

        if (!trnUploadResponse.ok) {
          throw new Error("Failed to upload TRN certificate");
        }

        const trnUploadResult = await trnUploadResponse.json();
        trnCertificateUrl = trnUploadResult.urls[0];
      }

      let tradeLicenseUrl = null;
      if (tradeLicenseFile) {
        const tradeFormData = new FormData();
        tradeFormData.append("files", tradeLicenseFile);
        tradeFormData.append("folder", "supplier-trade-licenses");

        const tradeUploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: tradeFormData,
        });

        if (!tradeUploadResponse.ok) {
          throw new Error("Failed to upload trade license");
        }

        const tradeUploadResult = await tradeUploadResponse.json();
        tradeLicenseUrl = tradeUploadResult.urls[0];
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createSupplier",
            type,
            name,
            material_categories: materialCategoryID,
            material_subcategories: materialSubCategoryID,
            trn_number,
            trn_certificate: JSON.stringify(trnCertificateUrl),
            trade_license: JSON.stringify(tradeLicenseUrl),
            avg_lead_time: null,
            supplier_rating: null,
            currency,
            status,
            contact_person_name: contactPersonName,
            phone,
            email,
            website,
            address,
            notes,
          }),
        },
      );

      if (res.ok) {
        toast("Vendor created", "success");

        setType("");
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
        setWebsite("");
        setTrnCertificateFile(null);
        setTradeLicenseFile(null);

        setIsSupplierModalOpen(false);

        fetch("/api/supplier", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
          .then((res) => res.json())
          .then((data) => setSuppliers(data))
          .catch((err) => console.error(err));

        router.refresh();
      } else {
        toast("Failed to create vendor", "error");
      }
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      toast(error.message || "Failed to create vendor", "error");
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

    // Check if any quotation has total price >= 900
    const hasHighValueQuotation = validQuotations.some(
      (q: { total_price: string }) => {
        const totalPrice = parseFloat(q.total_price);
        return !isNaN(totalPrice) && totalPrice >= 900;
      },
    );

    // If any quotation is >= 900 AED, require minimum 3 vendors
    if (hasHighValueQuotation && validQuotations.length < 3) {
      toast(
        "Minimum 3 vendors required for quotations with total price greater than or equal to 900 AED",
        "error",
      );
      return;
    }

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
    }

    setIsUploading(true);

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
                unit_price: q.unit_price,
                total_price: q.total_price,
              })),
            }
          : {
              action: "addSupplierAndQuotation",
              mr_line_id: mrLine.id,
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

      {isOpen && (
        <FormPopUp
          header={
            mode === "edit"
              ? `UPDATE VENDORS & QUOTATIONS FOR ${mrLine.material_description}`
              : `ADD VENDORS & QUOTATIONS FOR ${mrLine.material_description}`
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSupplierAndQuotationSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ minWidth: "1500px" }}
        >
          <>
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SUPPLIER</th>
                  <th>QUOTATION</th>
                  <th>UNIT PRICE</th>
                  <th>TOTAL PRICE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {supplierQuotations.map(
                  (quotation: SupplierQuotation, index: number) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td style={{ minWidth: "400px" }}>
                        <SingleSelectDropdown
                          label={"SUPPLIER"}
                          selectedValue={quotation.supplier_id}
                          onChange={(value) =>
                            updateQuotation(index, "supplier_id", value)
                          }
                          placeholder={"SELECT SUPPLIER"}
                          dbData={suppliers}
                          idField="id"
                          labelField="name"
                          noLabel
                          showCreateButton={true}
                          createButtonLabel="NEW VENDOR +"
                          onCreateClick={() => setIsSupplierModalOpen(true)}
                          required
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
                              isUploading={isUploading}
                            />
                          )}
                      </td>
                      <td>
                        <div className="input-prefix right">
                          <span>AED</span>
                          <input
                            style={{ paddingRight: "50px" }}
                            type="text"
                            placeholder="ENTER UNIT PRICE"
                            value={quotation.unit_price}
                            onChange={(e) => {
                              const val = e.target.value;

                              if (val === "" || /^\d+$/.test(val)) {
                                updateQuotation(
                                  index,
                                  "unit_price",
                                  e.target.value,
                                );
                              }
                            }}
                            required
                          />
                        </div>
                      </td>
                      <td>
                        <div className="input-prefix right">
                          <span>AED</span>
                          <input
                            style={{ paddingRight: "50px" }}
                            type="text"
                            placeholder=""
                            value={quotation.total_price}
                            disabled
                          />
                        </div>
                      </td>

                      {/* Show remove button only if: more than 1 row AND not the first row */}
                      {supplierQuotations.length > 1 && index > 0 && (
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
                      {(supplierQuotations.length === 1 || index === 0) && (
                        <td></td>
                      )}
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
              ADD VENDOR +
            </Button>

            <br />

            {/* Visual indicator for minimum vendor requirement */}
            {(() => {
              const validQuotations = supplierQuotations.filter(
                (q: SupplierQuotation) => q.supplier_id !== "",
              );

              const hasHighValueQuotation = validQuotations.some(
                (q: { total_price: string }) => {
                  const totalPrice = parseFloat(q.total_price);
                  return !isNaN(totalPrice) && totalPrice >= 900;
                },
              );

              if (hasHighValueQuotation && validQuotations.length < 3) {
                return (
                  <div
                    style={{
                      padding: "10px 15px",
                      color: "rgba(248, 77, 77, 1)",
                      textAlign: "left",
                    }}
                  >
                    Total price is greater than or equal to 900 AED. Minimum 3
                    vendors required
                  </div>
                );
              }
              return null;
            })()}
          </>
        </FormPopUp>
      )}

      {isMounted &&
        isSupplierModalOpen &&
        createPortal(
          <FormPopUp
            header="CREATE VENDOR"
            setIsOpen={setIsSupplierModalOpen}
            handleSubmit={handleSupplierSubmit}
            addButtonLabel="CONFIRM"
          >
            <FormContextHeader>VENDOR INFORMATION</FormContextHeader>
            <div className="input-row full">
              <InputItem
                label="VENDOR TYPE"
                type="select"
                value={type}
                required
                onChange={(e) => {
                  setType(e.target.value);
                }}
                selectOptions={["Cash", "Credit", "Marketplace/online"]}
              />
            </div>

            {type && (
              <>
                <div className="input-row full">
                  <InputItem
                    label="VENDOR NAME"
                    type="text"
                    value={name}
                    required
                    onChange={(e) => {
                      setName(e.target.value);
                    }}
                  />
                </div>

                {(type.toLowerCase().includes("cash") ||
                  type.toLowerCase().includes("credit")) && (
                  <div className="input-row half">
                    <MultiSelectDropdown
                      dbData={materialCategoryValues}
                      selectedValues={materialCategoryID}
                      onChange={(categoryIds) => {
                        setCategoriesManuallySelected(true);
                        setUserInitiatedCategorySelection(true); // Mark as user-initiated
                        setMaterialCategoryID(categoryIds);
                      }}
                      label="MATERIAL CATEGORIES"
                      style={{ width: "410px" }}
                      required={
                        type.toLowerCase().includes("cash") ||
                        type.toLowerCase().includes("credit")
                      }
                    />

                    <MultiSelectDropdown
                      dbData={materialSubCategoryValues}
                      selectedValues={materialSubCategoryID}
                      onChange={(subCategoryIds) => {
                        setMaterialSubCategoryID(subCategoryIds);

                        // If all subcategories are deselected
                        if (subCategoryIds.length === 0) {
                          // Only clear categories if they weren't manually selected
                          if (!categoriesManuallySelected) {
                            setMaterialCategoryID([]);
                          }
                          return;
                        }

                        // Get all unique category IDs from selected subcategories
                        const categoryIdsFromSubcategories = subCategoryIds
                          .map((subCatId: any) => {
                            const subCategory = materialSubCategoryValues.find(
                              (sc: any) => sc.id === subCatId,
                            );
                            return subCategory?.category_id;
                          })
                          .filter((catId: any) => catId !== undefined);

                        const uniqueCategoryIds = Array.from(
                          new Set(categoryIdsFromSubcategories),
                        );

                        // If categories were manually selected, merge with auto-detected ones
                        if (categoriesManuallySelected) {
                          // Keep manually selected categories that are still valid
                          const mergedCategories = Array.from(
                            new Set([
                              ...materialCategoryID,
                              ...uniqueCategoryIds,
                            ]),
                          );
                          setMaterialCategoryID(mergedCategories);
                        } else {
                          // Auto-populate categories from subcategories (NOT user-initiated)
                          setMaterialCategoryID(uniqueCategoryIds);
                        }
                      }}
                      label="MATERIAL SUBCATEGORIES"
                      style={{ width: "410px" }}
                      required={
                        type.toLowerCase().includes("cash") ||
                        type.toLowerCase().includes("credit")
                      }
                    />
                  </div>
                )}

                {(type.toLowerCase().includes("cash") ||
                  type.toLowerCase().includes("credit")) && (
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
                )}

                <div className="input-row half">
                  {(type.toLowerCase().includes("cash") ||
                    type.toLowerCase().includes("credit")) && (
                    <UploadFileBox
                      fileState={trnCertificateFile}
                      setFileState={setTrnCertificateFile}
                      label={"TRN CERTIFICATE"}
                      acceptedFileTypes={".pdf"}
                      required={
                        type.toLowerCase().includes("cash") ||
                        type.toLowerCase().includes("credit")
                      }
                    />
                  )}

                  <UploadFileBox
                    fileState={tradeLicenseFile}
                    setFileState={setTradeLicenseFile}
                    label={"TRADE LICENSE"}
                    acceptedFileTypes={".pdf"}
                    required={
                      type.toLowerCase().includes("cash") ||
                      type.toLowerCase().includes("credit")
                    }
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

                <br />

                <FormContextHeader>CONTACT INFORMATION</FormContextHeader>
                <div className="input-row full">
                  <InputItem
                    label={"CONTACT PERSON NAME"}
                    value={contactPersonName}
                    type={"text"}
                    placeholder={"ENTER CONTACT PERSON NAME"}
                    required={
                      type.toLowerCase().includes("cash") ||
                      type.toLowerCase().includes("credit")
                    }
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
                    onChange={(e) => {
                      setPhone(e.target.value);
                    }}
                    required={
                      type.toLowerCase().includes("cash") ||
                      type.toLowerCase().includes("credit")
                    }
                  />

                  <InputItem
                    label={"EMAIL"}
                    value={email}
                    type={"text"}
                    placeholder={"ENTER EMAIL"}
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                    required={
                      type.toLowerCase().includes("cash") ||
                      type.toLowerCase().includes("credit")
                    }
                  />

                  <InputItem
                    label={"ADDRESS"}
                    value={address}
                    type={"text"}
                    placeholder={"ENTER ADDRESS"}
                    onChange={(e) => {
                      setAddress(e.target.value);
                    }}
                    required={
                      type.toLowerCase().includes("cash") ||
                      type.toLowerCase().includes("credit")
                    }
                  />
                </div>

                <div className="input-row full">
                  <InputItem
                    label={"WEBSITE"}
                    value={website}
                    type={"text"}
                    required={
                      type.toLowerCase().includes("cash") ||
                      type.toLowerCase().includes("credit")
                    }
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="input-row full">
                  <InputItem
                    label={"NOTES"}
                    value={notes}
                    type={"textarea"}
                    required={false}
                    onChange={(e) => {
                      setNotes(e.target.value);
                    }}
                  />
                </div>
              </>
            )}
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
