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
  const [trn, setTrn] = useState("");
  const [trnCertificateFile, setTrnCertificateFile] = useState<File | null>(
    null,
  );
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
    setContactPersonName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setWebsite("");
    setBankName("");
    setAccountNumber("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      let trnCertificateUrl = null;

      if (trnCertificateFile) {
        const trnFormData = new FormData();
        trnFormData.append("files", trnCertificateFile);
        trnFormData.append("folder", "subcontractor-trn-certificates");

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

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createSubcontractor",
            name,
            material_categories: materialCategoryID,
            trn_number: trn || null,
            trn_certificate: trnCertificateUrl
              ? JSON.stringify(trnCertificateUrl)
              : null,
            contact_person_name: contactPersonName || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            website: website || null,
            bank_name: bankName || null,
            account_number: accountNumber || null,
            notes: notes || null,
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
        toast("Failed to create subcontractor", "error");
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
            <MultiSelectDropdown
              dbData={materialCategoryValues}
              selectedValues={materialCategoryID}
              onChange={(categoryIds) => {
                setMaterialCategoryID(categoryIds);
              }}
              label="MATERIAL CATEGORIES"
              style={{ width: "410px" }}
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
