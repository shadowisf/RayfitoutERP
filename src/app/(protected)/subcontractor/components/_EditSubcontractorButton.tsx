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
};

export default function EditSubcontractorButton({
  onSuccess,
  subcontractor,
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
  const [trn, setTrn] = useState(subcontractor?.trn_number || "");
  const [trnCertificateFile, setTrnCertificateFile] = useState<File | null>(
    null,
  );
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

  // State to track existing file URL
  const [existingTrnCertificate, setExistingTrnCertificate] = useState<
    string | null
  >(null);

  // Parse JSON string to get URL
  useEffect(() => {
    if (subcontractor?.trn_certificate) {
      try {
        const parsed = JSON.parse(subcontractor.trn_certificate);
        setExistingTrnCertificate(parsed);
      } catch (e) {
        setExistingTrnCertificate(subcontractor.trn_certificate);
      }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      let trnCertificateUrl = subcontractor.trn_certificate;

      // If new TRN certificate file uploaded, delete old one and upload new
      if (trnCertificateFile) {
        if (existingTrnCertificate) {
          await deleteS3File(existingTrnCertificate);
        }

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
        trnCertificateUrl = JSON.stringify(trnUploadResult.urls[0]);
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
            trn_number: trn || null,
            trn_certificate: trnCertificateUrl || null,
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
        toast("Subcontractor updated", "success");
        setIsOpen(false);
        onSuccess && onSuccess();
        router.refresh();
      } else {
        toast("Failed to update subcontractor", "error");
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
        bgColor={"transparent"}
        borderColor={"transparent"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        full
        style={{ justifyContent: "flex-start" }}
      >
        <img src={pencilIcon} alt="pencil" /> Edit
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
              required={false}
              existingFileUrl={existingTrnCertificate}
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
