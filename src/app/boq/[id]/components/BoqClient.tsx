"use client";

import InputItem from "@/app/components/InputItem";
import { useEffect, useState } from "react";

export default function BoqClient({ project_id }: { project_id: string }) {
  const [boqs, setBoqs] = useState<[] | null>(null);
  const [locationValues, setLocationValues] = useState<[]>([]);
  /* const [materialCategoryValues, setMaterialCategoryValues] = useState<[]>([]);
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    []
  >([]); */

  const [companyName, setCompanyName] = useState("RAYFITOUT CONTRACTING LLC");
  const [clientName, setClientName] = useState("");
  const [boqRefNumber, setBoqRefNumber] = useState(`BOQ-${project_id}`);
  const [locationID, setLocationID] = useState(0);
  const [date, setDate] = useState("");
  /* const [materialCategoryID, setMaterialCategoryID] = useState(0);
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState(0); */
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validityTerms, setValidityTerms] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");

  useEffect(() => {
    fetch("/api/boq/getBoqByID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: project_id }),
    })
      .then((res) => res.json())
      .then((data) => {
        setBoqs(data.length ? data : null);
      })
      .catch((err) => {
        console.error(err);
        setBoqs(null);
      });

    fetch("/api/boq/getLocationValues")
      .then((res) => res.json())
      .then((data) => setLocationValues(data))
      .catch((err) => console.error(err));

    /* fetch("/api/boq/getMaterialCategoryValues")
      .then((res) => res.json())
      .then((data) => setMaterialCategoryValues(data))
      .catch((err) => console.error(err));

    fetch("/api/boq/getMaterialSubCategoryValues")
      .then((res) => res.json())
      .then((data) => setMaterialSubCategoryValues(data))
      .catch((err) => console.error(err)); */
  }, [project_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/boq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id,
        company_name: companyName,
        client_name: clientName,
        id: project_id,
        location_id: locationID,
        date,
        /* material_category_id: materialCategoryID,
        material_subcategory_id: materialSubCategoryID, */
        payment_terms: paymentTerms,
        validity_terms: validityTerms,
        terms_and_conditions: termsAndConditions,
      }),
    });

    if (res.ok) {
      alert("BOQ header added");

      setCompanyName("RAYFITOUT CONTRACTING LLC");
      setClientName("");
      setLocationID(0);
      setDate("");
      /* setMaterialCategoryID(0);
      setMaterialSubCategoryID(0); */
      setPaymentTerms("");
      setValidityTerms("");
      setTermsAndConditions("");
    } else {
      alert("Failed to add BOQ header");
    }
  }

  /* async function handleCategoryChange(id: number) {
    fetch("/api/boq/getMaterialSubCategoryByCategoryID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    })
      .then((res) => res.json())
      .then((data) => setMaterialSubCategoryValues(data))
      .catch((err) => console.error(err));
  } */

  return (
    <main>
      {boqs ? (
        "THIS PROJECT HAS BOQ"
      ) : (
        <>
          <h2>CREATE BOQ</h2>

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
                />

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
              </div>

              <div className="input-row three-col">
                <InputItem
                  label={"BOQ REF NUMBER"}
                  value={boqRefNumber}
                  type={"text"}
                  placeholder={"ENTER BOQ REF NUMBER"}
                  required
                  disabled
                  onChange={(e) => {
                    setBoqRefNumber(e.target.value);
                  }}
                />

                <InputItem
                  label={"LOCATION"}
                  value={locationID}
                  type={"select"}
                  placeholder={"ENTER LOCATION"}
                  required
                  onChange={(e) => {
                    setLocationID(Number(e.target.value));
                  }}
                  dbMap={locationValues.map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.value}
                    </option>
                  ))}
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

              {/* <div className="input-row half">
                <InputItem
                  label={"MATERIAL CATEGORY"}
                  value={materialCategoryID}
                  type={"select"}
                  placeholder={"SELECT CATEGORY"}
                  required
                  onChange={(e) => {
                    const newID = Number(e.target.value);

                    setMaterialCategoryID(newID);

                    handleCategoryChange(newID);
                  }}
                  dbMap={materialCategoryValues.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.value}
                    </option>
                  ))}
                />

                <InputItem
                  label={"MATERIAL SUBCATEGORY"}
                  value={materialSubCategoryID}
                  type={"select"}
                  placeholder={"SELECT SUBCATEGORY"}
                  required
                  onChange={(e) => {
                    setMaterialSubCategoryID(Number(e.target.value));
                  }}
                  dbMap={materialSubCategoryValues.map((subCategory: any) => (
                    <option key={subCategory.id} value={subCategory.id}>
                      {subCategory.value}
                    </option>
                  ))}
                />
              </div> */}

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
                <button className="add-project-button" type="submit">
                  NEXT
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </main>
  );
}
