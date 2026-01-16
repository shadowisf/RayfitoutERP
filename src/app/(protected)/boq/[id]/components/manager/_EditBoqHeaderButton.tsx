import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState } from "react";
import { BoqHeader } from "../../types/boqHeader";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";

type props = {
  boqHeader: BoqHeader;
};

export default function EditBoqHeaderButton({ boqHeader }: props) {
  const router = useRouter();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [companyName, setCompanyName] = useState(boqHeader.company_name || "");
  const [clientName, setClientName] = useState(boqHeader.client_name || "");
  const [boqRefNumber, setBoqRefNumber] = useState<number | string>(
    String(boqHeader.project_id).padStart(5, "0") || ""
  );
  const [location, setLocation] = useState(boqHeader.location || "");
  const [date, setDate] = useState(boqHeader.boq_date || "");
  const [paymentTerms, setPaymentTerms] = useState(
    boqHeader.payment_terms || ""
  );
  const [validityTerms, setValidityTerms] = useState(
    boqHeader.validity_terms || ""
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    boqHeader.terms_and_conditions || ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/boq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateBoqHeader",
        id: boqHeader.id,
        project_id: boqRefNumber,
        company_name: companyName,
        client_name: clientName,
        location,
        date,
        payment_terms: paymentTerms,
        validity_terms: validityTerms,
        terms_and_conditions: termsAndConditions,
      }),
    });

    if (res.ok) {
      setIsOpen(false);

      toast("Bill of quantity updated", "success");

      router.refresh();
    } else {
      toast("Failed to update bill of quantity. Something went wrong", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"transparent"}
        borderColor={"black"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
      >
        EDIT BOQ
        <img src={pencilIcon} alt="pencil" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE BILL OF QUANTITY"}
          setIsOpen={setIsOpen}
          handleSubmit={(e) => handleSubmit(e)}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row half">
            <InputItem
              label={"COMPANY NAME"}
              value={companyName}
              type={"text"}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <div className="input-item">
              <label>ID</label>
              <div className="input-prefix left">
                <span>BOQ-</span>
                <input
                  style={{ paddingLeft: "47px" }}
                  type="text"
                  value={boqRefNumber}
                  onChange={(e) => {
                    const val = e.target.value;

                    if (val === "" || (/^\d+$/.test(val) && val.length <= 3)) {
                      setBoqRefNumber(val === "" ? "" : Number(val));
                    }
                  }}
                  placeholder="000"
                  required
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="input-row three-col">
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
