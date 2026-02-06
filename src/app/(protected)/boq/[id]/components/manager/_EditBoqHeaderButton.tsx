import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { BoqHeader } from "../../types/boqHeader";
import { useAuth } from "@/app/context/AuthContext";

type props = {
  boqHeader: BoqHeader | null;
  onSuccess?: () => void;
  threeDotsMenu?: boolean;
};

export default function EditBoqHeaderButton({
  boqHeader,
  onSuccess,
  threeDotsMenu,
}: props) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  // Helper function to format date for input field
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [name, setName] = useState(boqHeader?.name || "");
  const [companyName, setCompanyName] = useState(boqHeader?.company_name || "");
  const [clientName, setClientName] = useState(boqHeader?.client_name || "");
  const [location, setLocation] = useState(boqHeader?.location || "");
  const [date, setDate] = useState(formatDateForInput(boqHeader?.boq_date));
  const [paymentTerms, setPaymentTerms] = useState(
    boqHeader?.payment_terms || "",
  );
  const [validityTerms, setValidityTerms] = useState(
    boqHeader?.validity_terms || "",
  );
  const [warranty, setWarranty] = useState(boqHeader?.warranty || "");
  const [completion, setCompletion] = useState(boqHeader?.completion || "");
  const [exclusion, setExclusion] = useState(boqHeader?.exclusion || "");
  const [termsAndConditions, setTermsAndConditions] = useState(
    boqHeader?.terms_and_conditions || "",
  );
  const [discount, setDiscount] = useState(boqHeader?.discount || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/boq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateBoqHeader",
        id: boqHeader?.id,
        project_id: boqHeader?.project_id,
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
        project_name: boqHeader?.project_name,
        updated_by: userInfo?.name,
      }),
    });

    if (res.ok) {
      setIsOpen(false);

      toast("Bill of quantity updated", "success");

      router.refresh();

      onSuccess && onSuccess();
    } else {
      toast("Failed to update bill of quantity. Something went wrong", "error");
    }
  }

  return (
    <>
      {threeDotsMenu ? (
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
      ) : (
        <Button
          componentType={"button"}
          bgColor={"rgba(239, 239, 239, 1)"}
          borderColor={"rgba(223, 223, 223, 1)"}
          textColor={"black"}
          onClick={() => setIsOpen(true)}
          style={{ padding: "7px 7px" }}
        >
          <img src={pencilIcon} alt="pencil" />
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header={"UPDATE BILL OF QUANTITY"}
          setIsOpen={setIsOpen}
          handleSubmit={(e) => handleSubmit(e)}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row three-col">
            <InputItem
              label={"NAME"}
              value={name}
              type={"text"}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <InputItem
              label={"COMPANY NAME"}
              value={companyName}
              type={"text"}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled
              required
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
              postfixText={boqHeader?.project_currency}
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
