"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Project } from "../../../../project/[id]/types/project";

type props = {
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  style?: React.CSSProperties;
  project: Project | null;
  onSuccess?: () => void;
};

export default function CreateBoqHeaderButton({
  style = { borderRadius: "50px" },
  bgColor = "black",
  borderColor = "black",
  textColor = "white",
  project,
  onSuccess,
}: props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("RAYFITOUT CONTRACTING LLC");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validityTerms, setValidityTerms] = useState("");
  const [warranty, setWarranty] = useState("");
  const [completion, setCompletion] = useState("");
  const [exclusion, setExclusion] = useState("");
  const [termsAndConditions, setTermsAndConditions] =
    useState(`i. Unconditional round the clock site access shall be ensured by the client.
ii. Final billing will be based on the actual quantities.
iii. Any deviation from the agreed scope shall be subjected to variation on time and cost.
iv. Progress of work will be according to the timely payment of the client.
v. Any delay in taking decisions/ approval from the clients side will not be our responsibility.
vi. Payments for the variations shall be issued on prorate basis as per the main payment terms.
vii. Contractor reserve the right to request for an extension of time for reasons beyond its control.`);
  const [discount, setDiscount] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/boq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createBoqHeader",
        project_id: project?.id,
        name,
        company_name: companyName,
        client_name: clientName,
        location,
        date: date || null,
        discount,
        payment_terms: paymentTerms,
        validity_terms: validityTerms,
        warranty,
        completion,
        exclusion,
        terms_and_conditions: termsAndConditions,
        project_name: project?.name,
      }),
    });

    if (res.ok) {
      router.refresh();

      onSuccess && onSuccess();

      setIsOpen(false);

      toast("Bill of quantity created", "success");

      setCompanyName("RAYFITOUT CONTRACTING LLC");
      setName("");
      setClientName("");
      setLocation("");
      setDate("");
      setPaymentTerms("");
      setValidityTerms("");
      setWarranty("");
      setCompletion("");
      setExclusion("");
      setTermsAndConditions("");
      setDiscount("");
    } else {
      toast("Failed to create bill of quantity", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        style={style}
        onClick={() => setIsOpen(true)}
      >
        NEW BOQ +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CREATE BILL OF QUANTITY"}
          setIsOpen={setIsOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={handleSubmit}
        >
          <div className="input-row three-col">
            <InputItem
              label={"NAME"}
              value={name}
              type={"text"}
              required
              onChange={(e) => setName(e.target.value)}
            />
            <InputItem
              label={"COMPANY NAME"}
              value={companyName}
              type={"text"}
              placeholder={"ENTER COMPANY NAME"}
              required
              onChange={(e) => setCompanyName(e.target.value)}
              disabled
            />
            <InputItem
              label={"CLIENT NAME"}
              value={clientName}
              type={"text"}
              placeholder={"ENTER CLIENT NAME"}
              required={false}
              onChange={(e) => {
                setClientName(e.target.value);
              }}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"LOCATION"}
              value={location}
              type={"text"}
              placeholder={"ENTER LOCATION"}
              required
              onChange={(e) => {
                setLocation(e.target.value);
              }}
            />

            <InputItem
              label={"DATE"}
              value={date}
              type={"date"}
              placeholder={"ENTER DATE"}
              required={false}
              onChange={(e) => {
                setDate(e.target.value);
              }}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"DISCOUNT"}
              value={discount}
              type={"text postfix"}
              onChange={(e) => {
                const val = e.target.value;

                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setDiscount(val);
                }
              }}
              postfixText={project?.currency}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"PAYMENT TERMS"}
              value={paymentTerms}
              type={"textarea"}
              placeholder={"ENTER PAYMENT TERMS"}
              required
              onChange={(e) => {
                setPaymentTerms(e.target.value);
              }}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"VALIDITY TERMS"}
              value={validityTerms}
              type={"textarea"}
              placeholder={"ENTER VALIDITY TERMS"}
              required
              onChange={(e) => {
                setValidityTerms(e.target.value);
              }}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"WARRANTY"}
              value={warranty}
              type={"textarea"}
              onChange={(e) => {
                setWarranty(e.target.value);
              }}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"COMPLETION"}
              value={completion}
              type={"textarea"}
              required
              onChange={(e) => {
                setCompletion(e.target.value);
              }}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"EXCLUSIONS"}
              value={exclusion}
              type={"textarea"}
              required
              onChange={(e) => {
                setExclusion(e.target.value);
              }}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"TERMS & CONDITIONS"}
              value={termsAndConditions}
              type={"textarea"}
              placeholder={"ENTER TERMS & CONDITIONS"}
              required
              onChange={(e) => {
                setTermsAndConditions(e.target.value);
              }}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
