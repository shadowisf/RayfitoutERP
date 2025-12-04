"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

type AddMrSupplierAndQuotationButtonProps = {
  mrHeaderID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  full?: boolean;
  style?: React.CSSProperties;
};

export default function AddMrSupplierAndQuotationButton({
  mrHeaderID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  style,
}: AddMrSupplierAndQuotationButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    []
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);
  const [trn1, setTrn1] = useState("");
  const [trn2, setTrn2] = useState("");
  const [trn3, setTrn3] = useState("");

  const [name, setName] = useState("");
  const [materialCategoryID, setMaterialCategoryID] = useState<
    (string | number)[]
  >([]);
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState<
    (string | number)[]
  >([]);
  const [trn, setTrn] = useState(`${trn1}-${trn2}-${trn3}`);
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/mr/getMaterialCategoryValues")
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (materialCategoryID.length > 0) {
      Promise.all(
        materialCategoryID.map((categoryId) =>
          fetch("/api/mr/getMaterialSubCategoryValuesByCategoryID", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category_id: categoryId,
            }),
          }).then((res) => res.json())
        )
      )
        .then((results) => {
          const allSubCategories = results.flat();
          const uniqueSubCategories = Array.from(
            new Map(
              allSubCategories.map((item: any) => [item.id, item])
            ).values()
          );
          setMaterialSubCategoryValues(uniqueSubCategories);
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      setMaterialSubCategoryValues([]);
      setMaterialSubCategoryID([]);
    }
  }, [materialCategoryID]);

  async function handleSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  async function handleQuotationSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
        full={full ? true : false}
        style={style}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ADD SUPPLIER & QUOTATION"}
          setIsOpen={setIsOpen}
          handleSubmit={handleQuotationSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>SUPPLIER</th>
                <th>QUOTATION</th>
                <th>RATING</th>
                <th>UNIT PRICE</th>
                <th>TOTAL PRICE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>
                  <Button
                    componentType={"button"}
                    bgColor={"black"}
                    borderColor={"black"}
                    textColor={"white"}
                    onClick={() => {
                      setIsSupplierModalOpen(true);
                    }}
                    style={{ padding: "7px 14px", borderRadius: "25px" }}
                  >
                    ADD SUPPLIER +
                  </Button>
                </td>
                <td>
                  <input type="text" />
                </td>
                <td>
                  <input type="number" />
                </td>
                <td>
                  <input type="text" />
                </td>
                <td>
                  <input type="text" />
                </td>
              </tr>
            </tbody>
          </table>
        </FormPopUp>
      )}

      {isMounted &&
        isSupplierModalOpen &&
        createPortal(
          <FormPopUp
            header="CREATE SUPPLIER"
            setIsOpen={setIsSupplierModalOpen}
            handleSubmit={handleSupplierSubmit}
            addButtonLabel="CONFIRM"
          >
            <div className="input-row full">
              <InputItem
                label="NAME"
                type="text"
                value={name}
                placeholder={"ENTER SUPPLIER NAME"}
                required
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </div>

            <div className="input-row half">
              <MultiSelectDropdown
                dbData={materialCategoryValues}
                selectedValues={materialCategoryID}
                onChange={setMaterialCategoryID}
                placeholder={"SELECT MATERIAL CATEGORY"}
                label="MATERIAL CATEGORY"
              />

              <MultiSelectDropdown
                dbData={materialSubCategoryValues}
                selectedValues={materialSubCategoryID}
                onChange={setMaterialSubCategoryID}
                placeholder={"SELECT MATERIAL SUBCATEGORY"}
                label="MATERIAL SUBCATEGORY"
                disabled={materialCategoryID.length === 0}
              />
            </div>

            <div className="input-row">
              <div className="input-item">
                <label>TRN / TAX REGISTRATION NUMBER</label>
                <div style={{ display: "flex", gap: "5px" }}>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="000"
                    style={{ width: "50px" }}
                    value={trn1}
                    onChange={(e) => setTrn1(e.target.value)}
                  />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    style={{ width: "75px" }}
                    value={trn2}
                    onChange={(e) => setTrn2(e.target.value)}
                  />
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="000"
                    style={{ width: "50px" }}
                    value={trn3}
                    onChange={(e) => setTrn3(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="input-row half">
              <InputItem
                label={"AVERAGE LEAD TIME"}
                value={""}
                type={"text"}
                placeholder={""}
                required={false}
                onChange={() => {}}
                disabled
              />
            </div>

            <div className="input-row half">
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
                label={"STATUS"}
                value={status}
                type={"select"}
                placeholder={"SELECT STATUS"}
                required
                onChange={(e) => {
                  setStatus(e.target.value);
                }}
                selectOptions={["Active", "Inactive", "Blacklisted"]}
              />
            </div>

            <div className="input-row full">
              <InputItem
                label={"CONTACT PERSON NAME"}
                value={contactPersonName}
                type={"text"}
                placeholder={"ENTER CONTACT PERSON NAME"}
                required
                onChange={(e) => {
                  setContactPersonName(e.target.value);
                }}
              />
            </div>

            <div className="input-row three-col">
              <InputItem
                label={"PHONE"}
                value={phone}
                type={"text"}
                placeholder={"ENTER PHONE"}
                required
                onChange={(e) => {
                  setPhone(e.target.value);
                }}
              />

              <InputItem
                label={"EMAIL"}
                value={email}
                type={"text"}
                placeholder={"ENTER EMAIL"}
                required
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />

              <InputItem
                label={"ADDRESS"}
                value={address}
                type={"text"}
                placeholder={"ENTER ADDRESS"}
                required
                onChange={(e) => {
                  setAddress(e.target.value);
                }}
              />
            </div>

            <div className="input-row full">
              <InputItem
                label={"NOTES"}
                value={notes}
                type={"textarea"}
                placeholder={"ENTER NOTES"}
                required
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
              />
            </div>
          </FormPopUp>,
          document.body
        )}
    </>
  );
}
