import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CreateVendorButtonProps = {
  full?: boolean;
  onSuccess?: () => void;
};

export default function CreateVendorButton({
  full,
  onSuccess,
}: CreateVendorButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [categoriesManuallySelected, setCategoriesManuallySelected] =
    useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    []
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
  const [trnCertificateFile, setTrnCertificateFile] = useState<File | null>(
    null
  );
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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
        }
      );

      if (res.ok) {
        toast("Vendor created", "success");

        {
          onSuccess && onSuccess();
        }

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

        setIsOpen(false);

        router.refresh();
      } else {
        toast("Failed to create vendor", "error");
      }
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      toast(error.message || "Failed to create vendor", "error");
    }
  }

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`
    )
      .then((res) => res.json())
      .then((data) => setMaterialCategoryValues(data))
      .catch((err) => console.error(err));

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    )
      .then((res) => res.json())
      .then((data) => setMaterialSubCategoryValues(data))
      .catch((err) => console.error(err));
  }, []);

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
          <div className="input-row full">
            <InputItem
              label="VENDOR TYPE"
              type="select"
              value={type}
              required
              onChange={(e) => {
                setType(e.target.value);
              }}
              selectOptions={["Local vendor", "Marketplace/online"]}
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

              {type === "Local vendor" && (
                <div className="input-row half">
                  <MultiSelectDropdown
                    dbData={materialCategoryValues}
                    selectedValues={materialCategoryID}
                    onChange={(categoryIds) => {
                      setCategoriesManuallySelected(true);
                      setMaterialCategoryID(categoryIds);
                    }}
                    label="MATERIAL CATEGORIES"
                    style={{ width: "410px" }}
                    required={type === "Local vendor"}
                  />

                  <MultiSelectDropdown
                    dbData={materialSubCategoryValues}
                    selectedValues={materialSubCategoryID}
                    onChange={(subCategoryIds) => {
                      setCategoriesManuallySelected(false);
                      setMaterialSubCategoryID(subCategoryIds);

                      // If all subcategories are deselected, clear categories
                      if (subCategoryIds.length === 0) {
                        setMaterialCategoryID([]);
                        return;
                      }

                      // Get all unique category IDs from selected subcategories
                      const categoryIdsFromSubcategories = subCategoryIds
                        .map((subCatId: any) => {
                          const subCategory = materialSubCategoryValues.find(
                            (sc: any) => sc.id === subCatId
                          );
                          return subCategory?.category_id;
                        })
                        .filter((catId: any) => catId !== undefined);

                      // Use only the category IDs from the selected subcategories
                      const uniqueCategoryIds = Array.from(
                        new Set(categoryIdsFromSubcategories)
                      );

                      // Update category selection with only the categories from selected subcategories
                      setMaterialCategoryID(uniqueCategoryIds);
                    }}
                    label="MATERIAL SUBCATEGORIES"
                    style={{ width: "410px" }}
                    required={type === "Local vendor"}
                  />
                </div>
              )}

              {type === "Local vendor" && (
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
                {type === "Local vendor" && (
                  <SingleUploadFileBox
                    fileState={trnCertificateFile}
                    setFileState={setTrnCertificateFile}
                    label={"TRN CERTIFICATE"}
                    acceptedFileTypes={".pdf"}
                    required={type === "Local vendor"}
                  />
                )}

                <SingleUploadFileBox
                  fileState={tradeLicenseFile}
                  setFileState={setTradeLicenseFile}
                  label={"TRADE LICENSE"}
                  acceptedFileTypes={".pdf"}
                  required={type === "Local vendor"}
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
                  required={type === "Local vendor"}
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
                  required={type === "Local vendor"}
                />

                <InputItem
                  label={"EMAIL"}
                  value={email}
                  type={"text"}
                  placeholder={"ENTER EMAIL"}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  required={type === "Local vendor"}
                />

                <InputItem
                  label={"ADDRESS"}
                  value={address}
                  type={"text"}
                  placeholder={"ENTER ADDRESS"}
                  onChange={(e) => {
                    setAddress(e.target.value);
                  }}
                  required={type === "Local vendor"}
                />
              </div>

              <div className="input-row full">
                <InputItem
                  label={"WEBSITE"}
                  value={website}
                  type={"text"}
                  placeholder={"ENTER DESCRIPTION"}
                  required={type === "Local vendor"}
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
        </FormPopUp>
      )}
    </>
  );
}
