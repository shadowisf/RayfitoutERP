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
  onSuccess?: () => void;
  full?: boolean;
};

export default function CreateSubcontractorButton({ onSuccess, full }: props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );

  const [name, setName] = useState("");
  const [materialCategoryID, setMaterialCategoryID] = useState<
    (string | number)[]
  >([]);
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [trn, setTrn] = useState("");
  const [trnCertificateFile, setTrnCertificateFile] = useState<File | null>(
    null,
  );
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
  const [otherDocsFile, setOtherDocsFile] = useState<File | null>(null);
  const [contactPersonName, setContactPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch categories on mount
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((data) => setMaterialCategoryValues(data))
      .catch((err) => console.error(err));
  }, []);

  function resetForm() {
    setName("");
    setMaterialCategoryID([]);
    setTrn("");
    setTrnCertificateFile(null);
    setContractFile(null);
    setTradeLicenseFile(null);
    setOtherDocsFile(null);
    setContactPersonName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setWebsite("");
    setBankName("");
    setAccountNumber("");
    setNotes("");
  }

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
      // Upload all files concurrently
      const uploadPromises: Promise<{ type: string; url: string }>[] = [];

      if (trnCertificateFile) {
        uploadPromises.push(
          uploadFileToS3(
            trnCertificateFile,
            "subcontractor-trn-certificates",
          ).then((url) => ({ type: "trn", url })),
        );
      }

      if (contractFile) {
        uploadPromises.push(
          uploadFileToS3(contractFile, "subcontractor-contracts").then(
            (url) => ({ type: "contract", url }),
          ),
        );
      }

      if (tradeLicenseFile) {
        uploadPromises.push(
          uploadFileToS3(tradeLicenseFile, "subcontractor-trade-licenses").then(
            (url) => ({ type: "tradeLicense", url }),
          ),
        );
      }

      if (otherDocsFile) {
        uploadPromises.push(
          uploadFileToS3(otherDocsFile, "subcontractor-other-docs").then(
            (url) => ({ type: "otherDocs", url }),
          ),
        );
      }

      // Wait for all uploads to complete
      const uploadedFiles = await Promise.all(uploadPromises);

      // Build file URLs object
      const fileUrls: {
        trn_certificate?: string;
        contract?: string;
        trade_license?: string;
        other_docs?: string;
      } = {};

      uploadedFiles.forEach((file) => {
        switch (file.type) {
          case "trn":
            fileUrls.trn_certificate = file.url;
            break;
          case "contract":
            fileUrls.contract = file.url;
            break;
          case "tradeLicense":
            fileUrls.trade_license = file.url;
            break;
          case "otherDocs":
            fileUrls.other_docs = file.url;
            break;
        }
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createSubcontractor",
            name,
            /* material_categories: materialCategoryID, */
            scope_of_work: scopeOfWork,
            trn_number: trn,
            trn_certificate: fileUrls.trn_certificate || null,
            contract: fileUrls.contract || null,
            trade_license: fileUrls.trade_license || null,
            other_docs: fileUrls.other_docs || null,
            contact_person_name: contactPersonName,
            phone,
            email,
            address,
            website,
            bank_name: bankName,
            account_number: accountNumber,
            notes,
          }),
        },
      );

      if (res.ok) {
        toast("Subcontractor created", "success");

        resetForm();
        setIsOpen(false);

        onSuccess && onSuccess();

        router.refresh();
      } else {
        const errorData = await res.json();
        toast(errorData.error || "Failed to create subcontractor", "error");
      }
    } catch (error: any) {
      console.error("Error creating subcontractor:", error);
      toast(error.message || "Failed to create subcontractor", "error");
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
        NEW SUBCONTRACTOR +
      </Button>

      {isOpen && (
        <FormPopUp
          header="CREATE SUBCONTRACTOR"
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
              required
            />
          </div>

          <div className="input-row half">
            <UploadFileBox
              fileState={trnCertificateFile}
              setFileState={setTrnCertificateFile}
              label={"TRN CERTIFICATE"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
              required
            />
            <UploadFileBox
              fileState={contractFile}
              setFileState={setContractFile}
              label={"CONTRACT"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
              required
            />
          </div>

          <div className="input-row half">
            <UploadFileBox
              fileState={tradeLicenseFile}
              setFileState={setTradeLicenseFile}
              label={"TRADE LICENSE"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
              required
            />
            <UploadFileBox
              fileState={otherDocsFile}
              setFileState={setOtherDocsFile}
              label={"OTHER DOCUMENTS"}
              acceptedFileTypes={".pdf,.jpeg,.jpg,.png"}
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
