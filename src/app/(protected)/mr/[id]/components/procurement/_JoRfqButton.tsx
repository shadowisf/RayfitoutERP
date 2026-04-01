"use client";

import { useState, useEffect } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { pdf } from "@react-pdf/renderer";
import { JoRfqPDF } from "../JoRfqPDF";
import { MrHeader } from "../../types/mrHeader";

type RfqData = {
  id: number;
  mr_header_id: number;
  jo_line_ids: number[];
  submission_deadline: string | null;
  terms_and_conditions: string;
  submission_instructions: string;
};

type JoRfqButtonProps = {
  mrHeader: MrHeader;
  selectedIds: number[];
  onRfqLoaded: (rfq: RfqData | null) => void;
};

export default function JoRfqButton({
  mrHeader,
  selectedIds,
  onRfqLoaded,
}: JoRfqButtonProps) {
  const pencilIcon = "/icons/pencil.svg";
  const downloadIcon = "/icons/download.svg";
  const crossIcon = "/icons/cross-small.svg";

  const [rfqData, setRfqData] = useState<RfqData | null>(null);
  const [rfqLoading, setRfqLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  // Form state
  const [deadline, setDeadline] = useState("");
  const [terms, setTerms] = useState("");
  const [instructions, setInstructions] = useState("");

  // Fetch existing RFQ on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo/rfq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getRfqByMrHeaderID",
        mr_header_id: mrHeader.id,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          const parsed: RfqData = {
            ...data,
            jo_line_ids: Array.isArray(data.jo_line_ids)
              ? data.jo_line_ids
              : [],
          };
          setRfqData(parsed);
          onRfqLoaded(parsed);
        } else {
          onRfqLoaded(null);
        }
      })
      .catch(console.error);
  }, [mrHeader.id]);

  const openCreateForm = () => {
    setIsEdit(false);
    setDeadline("");
    setTerms("");
    setInstructions("");
    setShowForm(true);
  };

  const openEditForm = () => {
    if (!rfqData) return;
    setIsEdit(true);
    setDeadline(
      rfqData.submission_deadline
        ? new Date(rfqData.submission_deadline).toLocaleDateString("en-CA")
        : "",
    );
    setTerms(rfqData.terms_and_conditions || "");
    setInstructions(rfqData.submission_instructions || "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast("Please select at least one job item", "error");
      return;
    }
    setRfqLoading(true);
    try {
      const payload: any = {
        action: isEdit ? "updateRfq" : "createRfq",
        mr_header_id: mrHeader.id,
        jo_line_ids: selectedIds,
        submission_deadline: deadline || null,
        terms_and_conditions: terms,
        submission_instructions: instructions,
      };
      if (isEdit && rfqData) payload.id = rfqData.id;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/jo/rfq`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        const result = await res.json();
        toast(isEdit ? "RFQ updated" : "RFQ created", "success");
        setShowForm(false);
        const newRfq: RfqData = {
          id: isEdit ? rfqData!.id : result.id,
          mr_header_id: mrHeader.id,
          jo_line_ids: selectedIds,
          submission_deadline: deadline || null,
          terms_and_conditions: terms,
          submission_instructions: instructions,
        };
        setRfqData(newRfq);
        onRfqLoaded(newRfq);
      } else {
        toast("Failed to save RFQ", "error");
      }
    } catch {
      toast("Failed to save RFQ", "error");
    } finally {
      setRfqLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!rfqData) return;
    if (!confirm("Are you sure you want to delete this RFQ?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/jo/rfq`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteRfq", id: rfqData.id }),
        },
      );
      if (res.ok) {
        setRfqData(null);
        onRfqLoaded(null);
      } else {
        toast("Failed to delete RFQ", "error");
      }
    } catch {
      toast("Failed to delete RFQ", "error");
    }
  };

  const handleDownload = async () => {
    if (!rfqData) return;
    setRfqLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/jo/rfq`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getRfqWithDetails",
            id: rfqData.id,
          }),
        },
      );

      if (!res.ok) {
        toast("Failed to fetch RFQ details", "error");
        return;
      }

      const data = await res.json();

      const blob = await pdf(
        <JoRfqPDF
          purposeName={mrHeader.purpose_name || ""}
          joLines={data.jo_lines || []}
          submissionDeadline={data.submission_deadline}
          termsAndConditions={data.terms_and_conditions}
          submissionInstructions={data.submission_instructions}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `RFQ-JO-${String(mrHeader.id).padStart(5, "0")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("RFQ PDF error:", err);
      toast("Failed to generate PDF", "error");
    } finally {
      setRfqLoading(false);
    }
  };

  return (
    <>
      {/* Create RFQ button (no RFQ exists yet) */}
      {!rfqData && (
        <Button
          componentType={"button"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          onClick={openCreateForm}
          disabled={selectedIds.length === 0}
          style={{
            padding: "7px 20px",
            borderRadius: "25px",
            opacity: selectedIds.length === 0 ? 0.4 : 1,
            cursor: selectedIds.length === 0 ? "not-allowed" : "pointer",
            pointerEvents: selectedIds.length === 0 ? "none" : "auto",
          }}
        >
          {selectedIds.length === 0
            ? "Create RFQ"
            : `Create RFQ for ${selectedIds.length} Job
          ${selectedIds.length !== 1 ? "s" : ""} +`}
        </Button>
      )}

      {/* RFQ exists — pill with Edit / Download / Delete inside */}
      {rfqData && (
        <Button
          componentType={"none"}
          bgColor={"white"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          style={{ padding: "7px 20px", borderRadius: "25px" }}
        >
          RFQ for {selectedIds.length} Job{selectedIds.length !== 1 ? "s" : ""}
          <Button
            componentType={"button"}
            bgColor={"transparent"}
            borderColor={"transparent"}
            textColor={"black"}
            style={{ padding: "0px" }}
            onClick={openEditForm}
          >
            <img src={pencilIcon} alt="edit" />
          </Button>
          <Button
            componentType={"button"}
            bgColor={"transparent"}
            borderColor={"transparent"}
            textColor={"black"}
            style={{ padding: "0px" }}
            onClick={handleDownload}
            disabled={rfqLoading}
          >
            <img src={downloadIcon} alt="download" />
          </Button>
          <Button
            componentType={"button"}
            bgColor={"transparent"}
            borderColor={"transparent"}
            textColor={"black"}
            style={{ padding: "0px" }}
            onClick={handleDelete}
          >
            <img src={crossIcon} alt="delete" />
          </Button>
        </Button>
      )}

      {/* RFQ Form Popup */}
      {showForm && (
        <FormPopUp
          header={
            isEdit
              ? "EDIT RFQ"
              : `CREATE RFQ FOR ${selectedIds.length} ITEM${selectedIds.length !== 1 ? "S" : ""}`
          }
          setIsOpen={setShowForm}
          handleSubmit={handleSubmit}
          addButtonLabel={isEdit ? "SAVE CHANGES" : "CONFIRM"}
          style={{ minWidth: "700px" }}
        >
          <div className="input-row full">
            <InputItem
              label={"SUBMISSION DEADLINE"}
              value={deadline}
              type={"date"}
              placeholder={"SELECT DATE"}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"TERMS & CONDITIONS"}
              value={terms}
              type={"textarea"}
              onChange={(e) => setTerms(e.target.value)}
              required
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"SUBMISSION INSTRUCTIONS"}
              value={instructions}
              type={"textarea"}
              onChange={(e) => setInstructions(e.target.value)}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
