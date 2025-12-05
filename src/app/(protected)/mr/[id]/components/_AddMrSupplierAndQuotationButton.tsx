"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type SupplierQuotation = {
  supplier_id: string | number;
  quotation_file: File | null;
  quotation_url: string; // Add this to store the S3 URL
  rating: string;
  unit_price: string;
  total_price: string;
};

type AddMrSupplierAndQuotationButtonProps = {
  mrLineID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  full?: boolean;
  style?: React.CSSProperties;
};

export default function AddMrSupplierAndQuotationButton({
  mrLineID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  style,
}: AddMrSupplierAndQuotationButtonProps) {
  const router = useRouter();

  const trashIcon = "/icons/trash.svg";
  const uploadIcon = "/icons/upload.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const closeIcon = "/icons/cross-small.svg";

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] =
    useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Array of supplier quotations (starts with 3 empty rows)
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

  // Refs for file inputs
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setIsMounted(true);

    fetch("/api/supplier", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error(err));

    fetch("/api/mr/getMaterialCategoryValues")
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (materialCategoryID.length > 0) {
      Promise.all(
        materialCategoryID.map((categoryId) =>
          fetch("/api/mr/getMaterialSubCategoryValuesByCategoryID", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category_id: categoryId,
            }),
          }).then((res) => res.json())
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

  // Get available suppliers for a specific row
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
    if (supplierQuotations.length > 3) {
      const newQuotations = supplierQuotations.filter(
        (_: SupplierQuotation, i: number) => i !== index
      );
      setSupplierQuotations(newQuotations);
    }
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

  function handleFileSelection(index: number, file: File | null) {
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast("Please upload PDF, Excel, or image files only", "error");
      return;
    }

    // Just store the file locally, don't upload yet
    updateQuotation(index, "quotation_file", file);
  }

  function handleRemoveFile(index: number) {
    // Clear the file locally since it hasn't been uploaded to S3 yet
    const newQuotations = [...supplierQuotations];
    newQuotations[index] = {
      ...newQuotations[index],
      quotation_file: null,
      quotation_url: "",
    };
    setSupplierQuotations(newQuotations);

    // Reset file input
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = "";
    }
  }

  function handleViewFile(quotation: SupplierQuotation) {
    // If file has been uploaded to S3, use the S3 URL
    if (quotation.quotation_url) {
      window.open(quotation.quotation_url, "_blank");
    }
    // Fallback to local file preview if S3 URL doesn't exist yet
    else if (quotation.quotation_file) {
      const fileUrl = URL.createObjectURL(quotation.quotation_file);
      window.open(fileUrl, "_blank");
    }
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

      fetch("/api/supplier", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => setSuppliers(data));

      router.refresh();
    } else {
      toast("Failed to create supplier", "error");
    }
  }

  async function uploadFilesToS3(quotations: SupplierQuotation[]) {
    const updatedQuotations = [...quotations];

    for (let i = 0; i < updatedQuotations.length; i++) {
      const quotation = updatedQuotations[i];

      // Skip if no file or already has URL
      if (!quotation.quotation_file || quotation.quotation_url) {
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

        // Update the quotation with S3 URL
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

  async function handleQuotationSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validQuotations = supplierQuotations.filter(
      (q: SupplierQuotation) => q.supplier_id !== ""
    );

    try {
      const quotationsWithUrls = await uploadFilesToS3(validQuotations);

      // Send to API to insert into database
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addSupplierAndQuotations",
            mr_line_id: mrLineID,
            quotations: quotationsWithUrls.map((q) => ({
              supplier_id: q.supplier_id,
              quotation_file: q.quotation_url, // S3 URL
              rating: q.rating || null,
              unit_price: q.unit_price,
              total_price: q.total_price,
            })),
          }),
        }
      );

      if (res.ok) {
        toast("Supplier and quotation added", "success");
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

        router.refresh();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add quotations");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast(error.message || "Failed to submit quotations", "error");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
        full={full ? true : false}
        style={style}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ADD SUPPLIER & QUOTATION"}
          setIsOpen={setIsOpen}
          handleSubmit={handleQuotationSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>SUPPLIER</th>
                <th>QUOTATION</th>
                <th>RATING</th>
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
                      {quotation.quotation_file && (
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
                              maxWidth: "100px",
                              display: "inline-block",
                            }}
                          >
                            {quotation.quotation_file.name}
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

                      <input
                        ref={(el) => {
                          fileInputRefs.current[index] = el;
                        }}
                        type="file"
                        style={{ display: "none" }}
                        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          console.log(
                            "File selected:",
                            file ? file.name : "none"
                          );
                          if (file) {
                            console.log("File details:", {
                              name: file.name,
                              size: file.size,
                              type: file.type,
                            });
                          }
                          handleFileSelection(index, file);
                        }}
                        disabled={isUploading}
                      />

                      {!quotation.quotation_file && (
                        <Button
                          componentType={"button"}
                          bgColor={"black"}
                          borderColor={"black"}
                          textColor={"white"}
                          onClick={() => fileInputRefs.current[index]?.click()}
                          full
                          style={{
                            padding: "5px 20px",
                            borderRadius: "25px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            textWrap: "nowrap",
                          }}
                        >
                          Attach Quotation
                          <img src={uploadIcon} alt="upload icon" />
                        </Button>
                      )}
                    </td>
                    <td style={{ minWidth: "150px" }}>
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
                    </td>
                    <td>
                      <div className="input-prefix right">
                        <span>AED</span>
                        <input
                          style={{ paddingRight: "50px" }}
                          type="text"
                          placeholder="ENTER UNIT PRICE"
                          value={quotation.unit_price}
                          onChange={(e) =>
                            updateQuotation(index, "unit_price", e.target.value)
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
                          onClick={() => handleRemoveRow(index)}
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

          <Button
            componentType={"button"}
            bgColor={"rgba(239, 239, 239, 1)"}
            borderColor={"rgba(239, 239, 239, 1)"}
            textColor={"black"}
            onClick={handleAddRow}
            full
          >
            + ADD MORE
          </Button>
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
            {/* Keep all your supplier form fields */}
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
              />

              <MultiSelectDropdown
                dbData={materialSubCategoryValues}
                selectedValues={materialSubCategoryID}
                onChange={setMaterialSubCategoryID}
                placeholder={"SELECT MATERIAL SUBCATEGORY"}
                label="MATERIAL SUBCATEGORY"
                disabled={materialCategoryID.length === 0}
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
