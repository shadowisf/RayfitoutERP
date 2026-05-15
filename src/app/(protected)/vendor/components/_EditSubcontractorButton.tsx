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

type props = {
  subcontractor: Subcontractor;
  onSuccess?: () => void;
  iconOnly?: boolean;
};

export default function EditSubcontractorButton({
  onSuccess,
  subcontractor,
  iconOnly,
}: props) {
  const router = useRouter();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );

  const parseCategoryIds = (ids: string): (string | number)[] => {
    if (!ids) return [];
    return ids.split(",").map((id) => parseInt(id.trim()));
  };

  const [name, setName] = useState(subcontractor?.name || "");
  const [materialCategoryID, setMaterialCategoryID] = useState<
    (string | number)[]
  >(parseCategoryIds(subcontractor?.material_category_ids));
  const [scopeOfWork, setScopeOfWork] = useState(
    subcontractor?.scope_of_work || "",
  );
  const [trn, setTrn] = useState(subcontractor?.trn_number || "");

  // New file states (for newly uploaded files)
  const [trnCertificateFile, setTrnCertificateFile] = useState<File | null>(
    null,
  );
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
  const [otherDocsFile, setOtherDocsFile] = useState<File | null>(null);

  const [contactPersonName, setContactPersonName] = useState(
    subcontractor?.contact_person_name || "",
  );
  const [phone, setPhone] = useState(subcontractor?.phone || "");
  const [email, setEmail] = useState(subcontractor?.email || "");
  const [address, setAddress] = useState(subcontractor?.address || "");
  const [website, setWebsite] = useState(subcontractor?.website || "");
  const [bankName, setBankName] = useState(subcontractor?.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(
    subcontractor?.account_number || "",
  );
  const [notes, setNotes] = useState(subcontractor?.notes || "");

  // State to track existing file URLs
  const [existingTrnCertificate, setExistingTrnCertificate] = useState<
    string | null
  >(null);
  const [existingContract, setExistingContract] = useState<string | null>(null);
  const [existingTradeLicense, setExistingTradeLicense] = useState<
    string | null
  >(null);
  const [existingOtherDocs, setExistingOtherDocs] = useState<string | null>(
    null,
  );

  // Helper to parse file URL (handles both JSON string and plain string)
  const parseFileUrl = (value: string | null): string | null => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed[0] : parsed;
    } catch (e) {
      return value;
    }
  };

  // Parse existing file URLs on mount
  useEffect(() => {
    if (subcontractor?.trn_certificate) {
      setExistingTrnCertificate(parseFileUrl(subcontractor.trn_certificate));
    }
    if (subcontractor?.contract) {
      setExistingContract(parseFileUrl(subcontractor.contract));
    }
    if (subcontractor?.trade_license) {
      setExistingTradeLicense(parseFileUrl(subcontractor.trade_license));
    }
    if (subcontractor?.other_docs) {
      setExistingOtherDocs(parseFileUrl(subcontractor.other_docs));
    }
  }, [subcontractor]);

  // Fetch categories on mount
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((data) => setMaterialCategoryValues(data))
      .catch((err) => console.error(err));
  }, []);

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

  // Helper function to upload a single file to S3
  async function uploadFileToS3(file: File, folder: string): Promise<string> {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("folder", folder);

    const response = await fetch("/api/s3", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file to ${folder}`);
    }

    const result = await response.json();
    return result.urls[0];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Track which files need to be uploaded and which old files need deletion
      const uploadPromises: Promise<{ type: string; url: string }>[] = [];
      const filesToDelete: string[] = [];

      // TRN Certificate
      let trnCertificateUrl = existingTrnCertificate;
      if (trnCertificateFile) {
        if (existingTrnCertificate) {
          filesToDelete.push(existingTrnCertificate);
        }
        uploadPromises.push(
          uploadFileToS3(
            trnCertificateFile,
            "subcontractor-trn-certificates",
          ).then((url) => ({ type: "trn", url })),
        );
      }

      // Contract
      let contractUrl = existingContract;
      if (contractFile) {
        if (existingContract) {
          filesToDelete.push(existingContract);
        }
        uploadPromises.push(
          uploadFileToS3(contractFile, "subcontractor-contracts").then(
            (url) => ({ type: "contract", url }),
          ),
        );
      }

      // Trade License
      let tradeLicenseUrl = existingTradeLicense;
      if (tradeLicenseFile) {
        if (existingTradeLicense) {
          filesToDelete.push(existingTradeLicense);
        }
        uploadPromises.push(
          uploadFileToS3(tradeLicenseFile, "subcontractor-trade-licenses").then(
            (url) => ({ type: "tradeLicense", url }),
          ),
        );
      }

      // Other Documents
      let otherDocsUrl = existingOtherDocs;
      if (otherDocsFile) {
        if (existingOtherDocs) {
          filesToDelete.push(existingOtherDocs);
        }
        uploadPromises.push(
          uploadFileToS3(otherDocsFile, "subcontractor-other-docs").then(
            (url) => ({ type: "otherDocs", url }),
          ),
        );
      }

      // Upload all new files concurrently
      const uploadedFiles = await Promise.all(uploadPromises);

      // Map uploaded URLs to their respective fields
      uploadedFiles.forEach((file) => {
        switch (file.type) {
          case "trn":
            trnCertificateUrl = file.url;
            break;
          case "contract":
            contractUrl = file.url;
            break;
          case "tradeLicense":
            tradeLicenseUrl = file.url;
            break;
          case "otherDocs":
            otherDocsUrl = file.url;
            break;
        }
      });

      // Delete old files from S3 after successful upload
      for (const url of filesToDelete) {
        await deleteS3File(url);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateSubcontractor",
            id: subcontractor.id,
            name,
            material_categories: materialCategoryID,
            scope_of_work: scopeOfWork || null,
            trn_number: trn,
            trn_certificate: trnCertificateUrl,
            contract: contractUrl,
            trade_license: tradeLicenseUrl,
            other_docs: otherDocsUrl || null,
            contact_person_name: contactPersonName,
            phone: phone || null,
            email: email || null,
            address: address || null,
            website: website || null,
            bank_name: bankName,
            account_number: accountNumber,
            notes: notes || null,
          }),
        },
      );

      if (res.ok) {
        toast("Subcontractor updated", "success");
        setIsOpen(false);
        onSuccess && onSuccess();
        router.refresh();
      } else {
        const errorData = await res.json();
        toast(errorData.error || "Failed to update subcontractor", "error");
      }
    } catch (error: any) {
      console.error("Error updating subcontractor:", error);
      toast(error.message || "Failed to update subcontractor", "error");
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
          header="UPDATE SUBCONTRACTOR"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
        >
          <FormContextHeader>SUBCONTRACTOR INFORMATION</FormContextHeader>

          <div className="input-row half">
            <InputItem
              label="SUBCONTRACTOR NAME"
              type="text"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-row half">
            {/* <MultiSelectDropdown
              dbData={materialCategoryValues}
              selectedValues={materialCategoryID}
              onChange={(categoryIds) => {
                setMaterialCategoryID(categoryIds);
              }}
              label="MATERIAL CATEGORIES"
              style={{ width: "410px" }}
              required
            /> */}
            <InputItem
              label={"SCOPE OF WORK"}
              value={scopeOfWork}
              type={"text"}
              onChange={(e) => setScopeOfWork(e.target.value)}
              required
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"TRN / TAX REGISTRATION NUMBER"}
              value={trn}
              type={"text"}
              onChange={(e) => setTrn(e.target.value)}
            />
          </div>

          <div className="input-row half">
            <UploadFileBox
              fileState={trnCertificateFile}
              setFileState={setTrnCertificateFile}
              label={"TRN CERTIFICATE"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
              required
              existingFileUrl={existingTrnCertificate}
            />
            <UploadFileBox
              fileState={contractFile}
              setFileState={setContractFile}
              label={"CONTRACT"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
              required
              existingFileUrl={existingContract}
            />
          </div>

          <div className="input-row half">
            <UploadFileBox
              fileState={tradeLicenseFile}
              setFileState={setTradeLicenseFile}
              label={"TRADE LICENSE"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
              required
              existingFileUrl={existingTradeLicense}
            />
            <UploadFileBox
              fileState={otherDocsFile}
              setFileState={setOtherDocsFile}
              label={"OTHER DOCUMENTS"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
              existingFileUrl={existingOtherDocs}
            />
          </div>

          <br />

          <FormContextHeader>CONTACT PERSON</FormContextHeader>
          <div className="input-row full">
            <InputItem
              label={"CONTACT PERSON NAME"}
              value={contactPersonName}
              type={"text"}
              onChange={(e) => setContactPersonName(e.target.value)}
              required
            />
          </div>

          <div className="input-row three-col">
            <InputItem
              label={"PHONE"}
              value={phone}
              type={"text"}
              placeholder={"ENTER PHONE"}
              onChange={(e) => setPhone(e.target.value)}
            />

            <InputItem
              label={"EMAIL"}
              value={email}
              type={"text"}
              placeholder={"ENTER EMAIL"}
              onChange={(e) => setEmail(e.target.value)}
            />

            <InputItem
              label={"ADDRESS"}
              value={address}
              type={"text"}
              placeholder={"ENTER ADDRESS"}
              onChange={(e) => setAddress(e.target.value)}
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

          <FormContextHeader>BANK INFORMATION</FormContextHeader>
          <div className="input-row full">
            <InputItem
              label={"BANK NAME"}
              value={bankName}
              type={"text"}
              onChange={(e) => setBankName(e.target.value)}
              required
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"ACCOUNT NUMBER"}
              value={accountNumber}
              type={"text"}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"NOTES"}
              value={notes}
              type={"textarea"}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
