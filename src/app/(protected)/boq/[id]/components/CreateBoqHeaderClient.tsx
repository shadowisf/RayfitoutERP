"use client";

import Button from "@/app/components/Button";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateBoqHeaderClient({
  projectID,
}: {
  projectID: string;
}) {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("RAYFITOUT CONTRACTING LLC");
  const [clientName, setClientName] = useState("");
  const [boqRefNumber, setBoqRefNumber] = useState<number | string>(projectID);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validityTerms, setValidityTerms] = useState("");
  const [termsAndConditions, setTermsAndConditions] =
    useState(`i. Unconditional round the clock site access shall be ensured by the client.
ii. Final billing will be based on the actual quantities.
iii. Any deviation from the agreed scope shall be subjected to variation on time and cost.
iv. Progress of work will be according to the timely payment of the client.
v. Any delay in taking decisions/ approval from the clients side will not be our responsibility.
vi. Payments for the variations shall be issued on prorate basis as per the main payment terms.
vii. Contractor reserve the right to request for an extension of time for reasons beyond its control.`);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/boq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createBoqHeader",
        project_id: projectID,
        company_name: companyName,
        client_name: clientName,
        id: boqRefNumber,
        location,
        date: date || null,
        payment_terms: paymentTerms,
        validity_terms: validityTerms,
        terms_and_conditions: termsAndConditions,
      }),
    });

    if (res.ok) {
      toast("Bill of quantity header created", "success");

      setCompanyName("RAYFITOUT CONTRACTING LLC");
      setClientName("");
      setLocation("");
      setDate("");
      setPaymentTerms("");
      setValidityTerms("");
      setTermsAndConditions("");

      router.refresh();
    } else {
      toast("Failed to create bill of quantity header", "error");
    }
  }

  return (
    <>
      <h2>CREATE BILL OF QUANTITY HEADER</h2>

      <br />

      <div className="form-inner-container">
        <form onSubmit={handleSubmit}>
          <div className="input-row half">
            <InputItem
              label={"COMPANY NAME"}
              value={companyName}
              type={"text"}
              placeholder={"ENTER COMPANY NAME"}
              required
              onChange={(e) => setCompanyName(e.target.value)}
              disabled
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
              label={"CLIENT NAME (OPTIONAL)"}
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
              label={"DATE (OPTIONAL)"}
              value={date}
              type={"date"}
              placeholder={"ENTER DATE"}
              required={false}
              onChange={(e) => {
                setDate(e.target.value);
              }}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"PAYMENT TERMS"}
              value={paymentTerms}
              type={"select"}
              placeholder={"SELECT PAYMENT TERMS"}
              required
              onChange={(e) => {
                setPaymentTerms(e.target.value);
              }}
              selectOptions={["test"]}
            />

            <InputItem
              label={"VALIDITY TERMS"}
              value={validityTerms}
              type={"text"}
              placeholder={"SELECT VALIDITY TERMS"}
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

          <div className="button-container">
            <Button
              componentType={"button"}
              bgColor={"black"}
              borderColor={"black"}
              textColor={"white"}
              type="submit"
            >
              ADD BILL OF QUANTITY HEADER
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
