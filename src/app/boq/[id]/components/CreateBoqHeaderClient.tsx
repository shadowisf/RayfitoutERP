"use client";

import Button from "@/app/components/Button";
import InputItem from "@/app/components/InputItem";
import { useState } from "react";

export default function CreateBoqHeaderClient({
  projectID,
}: {
  projectID: string;
}) {
  const [companyName, setCompanyName] = useState("RAYFITOUT CONTRACTING LLC");
  const [clientName, setClientName] = useState("");
  const [boqRefNumber, setBoqRefNumber] = useState<number | string>(projectID);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [currency, setCurrency] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validityTerms, setValidityTerms] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");

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
        date,
        currency,
        payment_terms: paymentTerms,
        validity_terms: validityTerms,
        terms_and_conditions: termsAndConditions,
      }),
    });

    if (res.ok) {
      alert("BOQ header added");

      setCompanyName("RAYFITOUT CONTRACTING LLC");
      setClientName("");
      setLocation("");
      setDate("");
      setPaymentTerms("");
      setValidityTerms("");
      setTermsAndConditions("");
    } else {
      alert("Failed to add BOQ header");
    }
  }

  return (
    <>
      <h2>CREATE BOQ HEADER</h2>

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
              label={"CLIENT NAME"}
              value={clientName}
              type={"text"}
              placeholder={"ENTER CLIENT NAME"}
              required
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
              required
              onChange={(e) => {
                setDate(e.target.value);
              }}
            />
          </div>

          <div className="input-row three-col">
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
              ADD BOQ HEADER
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
