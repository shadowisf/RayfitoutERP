"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import FormContextHeader from "@/app/components/FormContextHeader";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { Supplier } from "../types/supplier";

type props = {
  supplier: Supplier;
  onSuccess?: () => void;
  iconOnly?: boolean;
};

export default function EditSupplierButton({
  supplier,
  onSuccess,
  iconOnly,
}: props) {
  const router = useRouter();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [categoriesManuallySelected, setCategoriesManuallySelected] =
    useState(false);
  const [userInitiatedCategorySelection, setUserInitiatedCategorySelection] =
    useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

  // Parse category and subcategory IDs from supplier
  const parseCategoryIds = (ids: string): (string | number)[] => {
    if (!ids) return [];
    return ids.split(",").map((id) => parseInt(id.trim()));
  };

  const [type, setType] = useState(supplier?.type);
  const [name, setName] = useState(supplier?.name);
  const [materialCategoryID, setMaterialCategoryID] = useState<
    (string | number)[]
  >(parseCategoryIds(supplier?.material_category_ids));
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState<
    (string | number)[]
  >(parseCategoryIds(supplier?.material_subcategory_ids));

  const [trn, setTrn] = useState(supplier?.trn_number);
  const [currency, setCurrency] = useState(supplier?.currency);
  const [status, setStatus] = useState(supplier?.status);
  const [creditLimit, setCreditLimit] = useState<number | string>(
    supplier?.credit_limit || "",
  );
  const [paymentTerms, setPaymentTerms] = useState(supplier?.payment_terms);
  const [openingBalance, setOpeningBalance] = useState<number | string>(
    supplier?.opening_balance || "",
  );
  const [contactPersonName, setContactPersonName] = useState(
    supplier?.contact_person_name,
  );
  const [phone, setPhone] = useState(supplier?.phone);
  const [email, setEmail] = useState(supplier?.email);
  const [address, setAddress] = useState(supplier?.address);
  const [website, setWebsite] = useState(supplier?.website);
  const [notes, setNotes] = useState(supplier?.notes || "");
  const [trnCertificateFile, setTrnCertificateFile] = useState<File | null>(
    null,
  );
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);

  // State to track existing file URLs
  const [existingTrnCertificate, setExistingTrnCertificate] = useState<
    string | null
  >(null);
  const [existingTradeLicense, setExistingTradeLicense] = useState<
    string | null
  >(null);

  // Parse JSON strings to get URLs
  useEffect(() => {
    if (supplier?.trn_certificate) {
      try {
        const parsed = JSON.parse(supplier.trn_certificate);
        setExistingTrnCertificate(parsed);
      } catch (e) {
        setExistingTrnCertificate(supplier.trn_certificate);
      }
    }

    if (supplier?.trade_license) {
      try {
        const parsed = JSON.parse(supplier.trade_license);
        setExistingTradeLicense(parsed);
      } catch (e) {
        setExistingTradeLicense(supplier.trade_license);
      }
    }
  }, [supplier]);

  // Fetch categories and subcategories on mount
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => console.error(err));

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setMaterialSubCategoryValues(data);
      })
      .catch((err) => console.error(err));
  }, []);

  // Filter subcategories based on categories
  useEffect(() => {
    if (materialCategoryID.length > 0 && userInitiatedCategorySelection) {
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
    }
  }, [materialCategoryID, userInitiatedCategorySelection]);

  // Helper function to delete S3 file
  const deleteS3File = async (url: string) => {
    try {
      await fetch("/api/s3", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch (error) {
      console.error("Error deleting file from S3:", error);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      let trnCertificateUrl = supplier.trn_certificate;

      // If new TRN certificate file uploaded, delete old one and upload new
      if (trnCertificateFile) {
        // Delete existing file if it exists
        if (existingTrnCertificate) {
          await deleteS3File(existingTrnCertificate);
        }

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
        trnCertificateUrl = JSON.stringify(trnUploadResult.urls[0]);
      }

      let tradeLicenseUrl = supplier.trade_license;

      // If new trade license file uploaded, delete old one and upload new
      if (tradeLicenseFile) {
        // Delete existing file if it exists
        if (existingTradeLicense) {
          await deleteS3File(existingTradeLicense);
        }

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
        tradeLicenseUrl = JSON.stringify(tradeUploadResult.urls[0]);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateSupplier",
            id: supplier.id,
            type,
            name,
            material_categories: materialCategoryID,
            material_subcategories: materialSubCategoryID,
            trn_number: trn,
            trn_certificate: JSON.stringify(trnCertificateUrl),
            trade_license: JSON.stringify(tradeLicenseUrl),
            avg_lead_time: supplier.avg_lead_time,
            supplier_rating: supplier.supplier_rating,
            currency,
            status,
            credit_limit: creditLimit,
            payment_terms: paymentTerms,
            opening_balance: openingBalance,
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
        toast("Vendor updated", "success");
        setIsOpen(false);
        onSuccess && onSuccess();
        router.refresh();
      } else {
        toast("Failed to update vendor", "error");
      }
    } catch (error: any) {
      console.error("Error updating supplier:", error);
      toast(error.message || "Failed to update vendor", "error");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={iconOnly ? "rgba(239, 239, 239, 1)" : "transparent"}
        borderColor={iconOnly ? "rgba(223, 223, 223, 1)" : "transparent"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        full={!iconOnly}
        style={
          iconOnly ? { padding: "7px 7px" } : { justifyContent: "flex-start" }
        }
      >
        <img src={pencilIcon} alt="pencil" />
        {!iconOnly && " Edit"}
      </Button>

      {isOpen && (
        <FormPopUp
          header="UPDATE VENDOR"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <FormContextHeader>VENDOR INFORMATION</FormContextHeader>
          <div className="input-row half">
            <InputItem
              label="VENDOR TYPE"
              type="select"
              value={type}
              required
              onChange={(e) => {
                setType(e.target.value);
              }}
              selectOptions={["Cash", "Credit", "Marketplace/online"]}
              disabled
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
                      setUserInitiatedCategorySelection(true);
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

                      if (subCategoryIds.length === 0) {
                        if (!categoriesManuallySelected) {
                          setMaterialCategoryID([]);
                        }
                        return;
                      }

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

                      if (categoriesManuallySelected) {
                        const mergedCategories = Array.from(
                          new Set([
                            ...materialCategoryID,
                            ...uniqueCategoryIds,
                          ]),
                        );
                        setMaterialCategoryID(mergedCategories);
                      } else {
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
                <div className="input-row half">
                  {/* <div className="input-item">
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
                  </div> */}
                  <InputItem
                    label={"TRN / TAX REGISTRATION NUMBER"}
                    value={trn}
                    type={"text"}
                    onChange={(e) => setTrn(e.target.value)}
                  />
                </div>
              )}

              <div className="input-row half">
                {(type.toLowerCase().includes("cash") ||
                  type.toLowerCase().includes("credit")) && (
                  <div>
                    <SingleUploadFileBox
                      fileState={trnCertificateFile}
                      setFileState={setTrnCertificateFile}
                      label={"TRN CERTIFICATE"}
                      acceptedFileTypes={".pdf"}
                      required={false}
                      existingFileUrl={existingTrnCertificate}
                    />
                  </div>
                )}

                <div>
                  <SingleUploadFileBox
                    fileState={tradeLicenseFile}
                    setFileState={setTradeLicenseFile}
                    label={"TRADE LICENSE"}
                    acceptedFileTypes={".pdf"}
                    required={false}
                    existingFileUrl={existingTradeLicense}
                  />
                </div>
              </div>

              {type.toLowerCase().includes("credit") && (
                <>
                  <br />
                  <FormContextHeader>CREDIT INFORMATION</FormContextHeader>
                </>
              )}
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

              {type.toLowerCase().includes("credit") && (
                <>
                  <div className="input-row half">
                    <InputItem
                      label={"CREDIT LIMIT"}
                      value={creditLimit}
                      type={"text postfix"}
                      onChange={(e) => {
                        let val = e.target.value;

                        // Remove any commas
                        val = val.replace(/,/g, "");

                        // Clear input if empty
                        if (val === "") {
                          setCreditLimit("");
                          return;
                        }

                        // Allow only numbers and a single decimal point
                        if (!/^\d*\.?\d*$/.test(val)) {
                          return;
                        }

                        // Set the value as-is (with decimal if present)
                        setCreditLimit(val);
                      }}
                      postfixText={currency}
                      required={type.toLowerCase().includes("credit")}
                    />
                    <InputItem
                      label={"PAYMENT TERMS"}
                      value={paymentTerms}
                      type={"select"}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      required={type.toLowerCase().includes("credit")}
                      selectOptions={["30 days", "60 days", "90 days"]}
                    />
                  </div>

                  <div className="input-row half">
                    <InputItem
                      label={"OPENING BALANCE"}
                      value={openingBalance}
                      type={"text postfix"}
                      onChange={(e) => {
                        let val = e.target.value;

                        // Remove any commas
                        val = val.replace(/,/g, "");

                        // Clear input if empty
                        if (val === "") {
                          setOpeningBalance("");
                          return;
                        }

                        // Allow only numbers and a single decimal point
                        if (!/^\d*\.?\d*$/.test(val)) {
                          return;
                        }

                        // Set the value as-is (with decimal if present)
                        setOpeningBalance(val);
                      }}
                      postfixText={currency}
                    />
                  </div>
                </>
              )}

              <br />

              <FormContextHeader>CONTACT INFORMATION</FormContextHeader>
              <div className="input-row full">
                <InputItem
                  label={"CONTACT PERSON NAME"}
                  value={contactPersonName}
                  type={"text"}
                  placeholder={"ENTER CONTACT PERSON NAME"}
                  onChange={(e) => {
                    setContactPersonName(e.target.value);
                  }}
                  required={!type.toLowerCase().includes("marketplace")}
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
                  required={!type.toLowerCase().includes("marketplace")}
                />

                <InputItem
                  label={"EMAIL"}
                  value={email}
                  type={"text"}
                  placeholder={"ENTER EMAIL"}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  required={!type.toLowerCase().includes("marketplace")}
                />

                <InputItem
                  label={"ADDRESS"}
                  value={address}
                  type={"text"}
                  placeholder={"ENTER ADDRESS"}
                  onChange={(e) => {
                    setAddress(e.target.value);
                  }}
                  required={!type.toLowerCase().includes("marketplace")}
                />
              </div>

              <div className="input-row full">
                <InputItem
                  label={"WEBSITE"}
                  value={website}
                  type={"text"}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <br />

              <FormContextHeader>ADDITIONAL INFORMATION</FormContextHeader>
              <div className="input-row full">
                <InputItem
                  label={"NOTES"}
                  value={notes}
                  type={"textarea"}
                  onChange={(e) => {
                    setNotes(e.target.value);
                  }}
                />
              </div>
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
