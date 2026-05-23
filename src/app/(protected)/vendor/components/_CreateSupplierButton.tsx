"use client";

import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import FormContextHeader from "@/app/components/FormContextHeader";
import Button from "@/app/components/Button";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  onSuccess?: () => void;
  full?: boolean;
};

export default function CreateSupplierButton({ onSuccess, full }: props) {
  const router = useRouter();
  const { refresh } = useRefresh();


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

  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [materialCategoryID, setMaterialCategoryID] = useState<
    (string | number)[]
  >([]);
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState<
    (string | number)[]
  >([]);
  const [trn, setTrn] = useState("");
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState("");
  const [creditLimit, setCreditLimit] = useState<number | string>("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number | string>("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [trnCertificateFile, setTrnCertificateFile] = useState<File | null>(
    null,
  );
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);

  // Reset form when type changes
  useEffect(() => {
    setName("");
    setMaterialCategoryID([]);
    setMaterialSubCategoryID([]);
    setTrn("");
    setCurrency("");
    setStatus("");
    setCreditLimit("");
    setPaymentTerms("");
    setOpeningBalance("");
    setContactPersonName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setWebsite("");
    setTrnCertificateFile(null);
    setTradeLicenseFile(null);
    setCategoriesManuallySelected(false);
    setUserInitiatedCategorySelection(false);
  }, [type]);

  // Fetch categories and subcategories on mount
  useEffect(() => {
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
    } else {
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
  }, [materialCategoryID, userInitiatedCategorySelection]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

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
            trn_number: trn,
            trn_certificate: JSON.stringify(trnCertificateUrl),
            trade_license: JSON.stringify(tradeLicenseUrl),
            avg_lead_time: null,
            supplier_rating: null,
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
        toast("Vendor created", "success");

        // Reset form
        setType("");
        setName("");
        setMaterialCategoryID([]);
        setMaterialSubCategoryID([]);
        setTrn("");
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

        setIsOpen(false);

        onSuccess && onSuccess();

        await refresh();
      } else {
        toast("Failed to create vendor", "error");
      }
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      toast(error.message || "Failed to create vendor", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
        full={full}
      >
        NEW VENDOR +
      </Button>

      {isOpen && (
        <FormPopUp
          header="CREATE VENDOR"
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
                      selectOptions={["30 days", "60 days", "90 days"]}
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
