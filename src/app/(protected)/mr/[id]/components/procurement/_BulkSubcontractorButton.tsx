"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import AttachQuotationButton from "./_AttachQuotationButton";
import { useState, useEffect } from "react";
import { JoLine } from "../../types/joLine";
import { formatPriceAED } from "@/lib/formatPrice";
// import CreateSubcontractorButton from "../../../../vendor/components/_CreateSubcontractorButton";

export type BulkQuotationData = {
  subcontractor_id: number | string;
  quotation_file: File;
  subcontractor_name?: string;
};

type BulkSubcontractorButtonProps = {
  joLine: JoLine;
  onConfirm: (data: BulkQuotationData) => void;
  onDelete: () => void;
  currentData: BulkQuotationData | null;
};

export default function BulkSubcontractorButton({
  joLine,
  onConfirm,
  onDelete,
  currentData,
}: BulkSubcontractorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [subcontractorId, setSubcontractorId] = useState<number | string>("");
  const [quotationFile, setQuotationFile] = useState<File | null>(null);

  const closeIcon = "/icons/cross-small.svg";
  const pencilIcon = "/icons/pencil.svg";

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`)
      .then((r) => r.json())
      .then(setSubcontractors)
      .catch(console.error);
  }, []);

  function handleOpen() {
    if (currentData) {
      setSubcontractorId(currentData.subcontractor_id);
      setQuotationFile(currentData.quotation_file);
    } else {
      setSubcontractorId("");
      setQuotationFile(null);
    }
    setIsOpen(true);
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!subcontractorId || !quotationFile) return;
    const subName = subcontractors.find(
      (s) => String(s.id) === String(subcontractorId),
    )?.name;
    onConfirm({
      subcontractor_id: subcontractorId,
      quotation_file: quotationFile,
      subcontractor_name: subName,
    });
    setIsOpen(false);
  }

  return (
    <>
      {/* No data yet — black create button matching Create RFQ */}
      {!currentData && (
        <Button
          componentType="button"
          bgColor="black"
          borderColor="black"
          textColor="white"
          onClick={handleOpen}
          style={{ padding: "7px 20px", borderRadius: "25px" }}
        >
          Create Quotation +
        </Button>
      )}

      {/* Data set — pill with label, edit, delete */}
      {currentData && (
        <Button
          componentType="none"
          bgColor="white"
          borderColor="rgba(207, 207, 207, 1)"
          textColor="black"
          style={{ padding: "7px 20px", borderRadius: "25px" }}
        >
          Quotation
          <Button
            componentType="button"
            bgColor="transparent"
            borderColor="transparent"
            textColor="black"
            style={{ padding: "0px" }}
            onClick={handleOpen}
          >
            <img src={pencilIcon} alt="edit" />
          </Button>
          <Button
            componentType="button"
            bgColor="transparent"
            borderColor="transparent"
            textColor="black"
            style={{ padding: "0px" }}
            onClick={onDelete}
          >
            <img src={closeIcon} alt="delete" />
          </Button>
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header="ADD SUBCONTRACTOR & QUOTATION"
          setIsOpen={setIsOpen}
          handleSubmit={handleConfirm}
          addButtonLabel="CONFIRM"
          style={{ minWidth: "700px" }}
        >
          <>
            <div>
              <small style={{ fontWeight: 600 }}>BUDGET</small>
              <h3>{formatPriceAED(joLine.budget_estimate)}</h3>
            </div>

            <br />

            <table className="items-table">
              <thead>
                <tr>
                  <th>SUBCONTRACTOR</th>
                  <th>QUOTATION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ minWidth: "400px" }}>
                    <SingleSelectDropdown
                      label="SUBCONTRACTOR"
                      selectedValue={subcontractorId}
                      onChange={setSubcontractorId}
                      placeholder="SELECT SUBCONTRACTOR"
                      dbData={subcontractors}
                      idField="id"
                      labelField="name"
                      noLabel
                      required
                      // bottomButtonComponent={<CreateSubcontractorButton onSuccess={() => {}} full />}
                    />
                  </td>
                  <td>
                    {quotationFile ? (
                      <Button
                        componentType="none"
                        bgColor="white"
                        borderColor="rgba(223, 223, 223, 1)"
                        textColor="black"
                        style={{
                          padding: "7px 20px",
                          borderRadius: "25px",
                          minWidth: "200px",
                        }}
                      >
                        Quotation
                        <img
                          src={closeIcon}
                          alt="remove"
                          style={{ cursor: "pointer" }}
                          onClick={() => setQuotationFile(null)}
                        />
                      </Button>
                    ) : (
                      <AttachQuotationButton
                        onFileSelect={(file) => setQuotationFile(file)}
                      />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        </FormPopUp>
      )}
    </>
  );
}
