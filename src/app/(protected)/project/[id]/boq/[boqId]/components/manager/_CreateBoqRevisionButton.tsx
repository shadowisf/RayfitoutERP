"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { BoqHeader } from "../../types/boqHeader";
import { useAuth } from "@/app/context/AuthContext";

type Props = {
  boqHeader: BoqHeader;
  revisionNumber: number; // next revision index (1-based)
  openImmediately?: boolean;
  hideButton?: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
};

export function CreateBoqRevisionButton({
  boqHeader,
  revisionNumber,
  openImmediately,
  hideButton,
  onSuccess,
  onClose,
}: Props) {
  const { userInfo } = useAuth();

  const formatDateForInput = (raw: string | null | undefined) => {
    if (!raw) return "";
    const d = new Date(raw);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [isOpen, setIsOpen] = useState(openImmediately ?? false);

  const handleSetIsOpen = (val: React.SetStateAction<boolean>) => {
    const resolved = typeof val === "function" ? val(isOpen) : val;
    setIsOpen(resolved);
    if (!resolved) onClose?.();
  };

  // Pre-fill from original BOQ
  const [name, setName] = useState(
    `${boqHeader.name} (R${revisionNumber})`,
  );
  const [companyName, setCompanyName] = useState(boqHeader.company_name || "");
  const [clientName, setClientName] = useState(boqHeader.client_name || "");
  const [location, setLocation] = useState(boqHeader.location || "");
  const [date, setDate] = useState(formatDateForInput(boqHeader.boq_date));
  const [discount, setDiscount] = useState(String(boqHeader.discount ?? ""));
  const [paymentTerms, setPaymentTerms] = useState(boqHeader.payment_terms || "");
  const [validityTerms, setValidityTerms] = useState(boqHeader.validity_terms || "");
  const [warranty, setWarranty] = useState(boqHeader.warranty || "");
  const [completion, setCompletion] = useState(boqHeader.completion || "");
  const [exclusion, setExclusion] = useState(boqHeader.exclusion || "");
  const [termsAndConditions, setTermsAndConditions] = useState(
    boqHeader.terms_and_conditions || "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createBoqRevision",
        revision_of: boqHeader.id,
        project_id: boqHeader.project_id,
        name,
        company_name: companyName,
        client_name: clientName,
        location,
        date,
        discount,
        payment_terms: paymentTerms,
        validity_terms: validityTerms,
        warranty,
        completion,
        exclusion,
        terms_and_conditions: termsAndConditions,
        created_by: userInfo?.name,
      }),
    });

    if (res.ok) {
      toast("Revision created", "success");
      handleSetIsOpen(false);
      onSuccess?.();
    } else {
      toast("Failed to create revision", "error");
    }
  };

  return (
    <>
      {!hideButton && (
        <Button
          componentType="button"
          bgColor="transparent"
          borderColor="transparent"
          textColor="black"
          onClick={() => setIsOpen(true)}
          full
          style={{ justifyContent: "flex-start" }}
        >
          <img src="/icons/pencil.svg" alt="revision" /> Create Revision
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header="CREATE BOQ REVISION"
          setIsOpen={handleSetIsOpen as React.Dispatch<React.SetStateAction<boolean>>}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
          style={{ width: "50dvw" }}
        >
          <div className="input-row three-col">
            <InputItem
              label="NAME"
              value={name}
              type="text"
              onChange={(e) => setName(e.target.value)}
              required
            />
            <InputItem
              label="COMPANY NAME"
              value={companyName}
              type="text"
              onChange={(e) => setCompanyName(e.target.value)}
              disabled
              required
            />
            <InputItem
              label="CLIENT NAME"
              value={clientName}
              type="text"
              placeholder="ENTER CLIENT NAME"
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label="LOCATION"
              value={location}
              type="text"
              placeholder="ENTER LOCATION"
              required
              onChange={(e) => setLocation(e.target.value)}
            />
            <InputItem
              label="DATE"
              value={date}
              type="date"
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="DISCOUNT"
              value={discount}
              type="text postfix"
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) setDiscount(val);
              }}
              postfixText={boqHeader.project_currency}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="PAYMENT TERMS"
              value={paymentTerms}
              type="textarea"
              placeholder="ENTER PAYMENT TERMS"
              required
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="VALIDITY TERMS"
              value={validityTerms}
              type="textarea"
              placeholder="ENTER VALIDITY TERMS"
              required
              onChange={(e) => setValidityTerms(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="WARRANTY"
              value={warranty}
              type="textarea"
              onChange={(e) => setWarranty(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="COMPLETION"
              value={completion}
              type="textarea"
              required
              onChange={(e) => setCompletion(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="EXCLUSIONS"
              value={exclusion}
              type="textarea"
              required
              onChange={(e) => setExclusion(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="TERMS & CONDITIONS"
              value={termsAndConditions}
              type="textarea"
              placeholder="ENTER TERMS & CONDITIONS"
              required
              onChange={(e) => setTermsAndConditions(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
