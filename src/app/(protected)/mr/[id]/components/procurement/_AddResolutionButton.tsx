"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { LpoHeader } from "../../types/lpoHeader";

type ResolutionButtonProps = {
  mrHeader: MrHeader;
  item: MrLine;
};

type LpoMrLine = {
  id: number;
  mr_line_id: number;
  unit_price: number;
  total_price: number;
};

type QCData = {
  accepted_quantity: number;
  qc_status: "passed" | "failed";
};

type GRNData = {
  received_quantity: number;
};

export default function ResolutionButton({
  mrHeader,
  item,
}: ResolutionButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const uploadIcon = "/icons/upload.svg";
  const plusIcon = "/icons/plus.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState("");

  const [lpoMrLine, setLpoMrLine] = useState<LpoMrLine | null>(null);
  const [qcData, setQcData] = useState<QCData | null>(null);
  const [grnData, setGRNData] = useState<GRNData | null>(null);

  /* return or refund */
  const [actualRefund, setActualRefund] = useState("");
  const [reasonForVariance, setReasonForVariance] = useState("");
  const [etaDeliveryDate, setEtaDeliveryDate] = useState("");
  const [refundMethod, setRefundMethod] = useState("");

  /* replace */
  const [replacementType, setReplacementType] = useState("");
  const [expectedReplacementDate, setExpectedReplacementDate] = useState("");
  const [replaceNotes, setReplaceNotes] = useState("");

  /* conditionally accepted */
  const [conditionallyAcceptedReason, setConditionallyAcceptedReason] =
    useState("");

  /* reject or scrap */
  const [scrapReason, setScrapReason] = useState("");
  const [returnNotPossibleReason, setReturnNotPossibleReason] = useState("");
  const [disposalMethod, setDisposalMethod] = useState("");

  // Separate file states for proof of payment
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFilePreview, setProofFilePreview] = useState<string | null>(null);
  const [proofFileType, setProofFileType] = useState<string>("");
  const proofFileInputRef = useRef<HTMLInputElement | null>(null);

  // Separate file states for conditionally accepted attachments
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentFilePreview, setAttachmentFilePreview] = useState<
    string | null
  >(null);
  const [attachmentFileType, setAttachmentFileType] = useState<string>("");
  const attachmentFileInputRef = useRef<HTMLInputElement | null>(null);

  // Separate file states for reject/scrap attachments
  const [scrapFile, setScrapFile] = useState<File | null>(null);
  const [scrapFilePreview, setScrapFilePreview] = useState<string | null>(null);
  const [scrapFileType, setScrapFileType] = useState<string>("");
  const scrapFileInputRef = useRef<HTMLInputElement | null>(null);

  // Calculate derived values
  const receivedQuantity = grnData?.received_quantity || 0;
  const acceptedQuantity = qcData?.accepted_quantity || 0;
  const failedQuantity = receivedQuantity - acceptedQuantity;
  const unitPrice = lpoMrLine?.unit_price || 0;
  const expectedRefund = failedQuantity * unitPrice;
  const actualRefundAmount = parseFloat(actualRefund) || 0;
  const varianceAmount = expectedRefund - actualRefundAmount;

  // Fetch LPO data
  useEffect(() => {
    async function fetchLpoData() {
      if (!item.approved_supplier_id) return;

      try {
        // Get LPO
        const lpoResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mr_header_id: mrHeader.id,
              supplier_id: item.approved_supplier_id,
            }),
          }
        );

        const lpoData = await lpoResponse.json();

        if (lpoData.success && lpoData.data && lpoData.data.length > 0) {
          const lpo = lpoData.data[0];

          // Get LPO Details to find the specific line
          const lpoDetailsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lpo_id: lpo.id }),
            }
          );

          const lpoDetailsData = await lpoDetailsResponse.json();

          if (
            lpoDetailsData.success &&
            lpoDetailsData.data &&
            lpoDetailsData.data.lpo_mr_lines
          ) {
            const lpoLine = lpoDetailsData.data.lpo_mr_lines.find(
              (line: any) => line.mr_line_id === item.id
            );

            if (lpoLine) {
              setLpoMrLine(lpoLine);

              // Get QC Data
              const qcResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    lpo_mr_line_id: lpoLine.id,
                  }),
                }
              );

              const qcDataResponse = await qcResponse.json();

              if (qcDataResponse.success && qcDataResponse.data) {
                setQcData({
                  accepted_quantity: qcDataResponse.data.accepted_quantity,
                  qc_status: qcDataResponse.data.qc_status,
                });
              }

              // Get GRN Data
              const grnResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ lpo_id: lpo.id }),
                }
              );

              const grnDataResponse = await grnResponse.json();

              if (grnDataResponse.success && grnDataResponse.data) {
                const grnLine = grnDataResponse.data.grn_lines?.find(
                  (gl: any) => gl.lpo_mr_line_id === lpoLine.id
                );

                if (grnLine) {
                  setGRNData({
                    received_quantity: grnLine.received_quantity,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching LPO/QC/GRN data:", error);
      }
    }

    if (isOpen) {
      fetchLpoData();
    }
  }, [item, mrHeader.id, isOpen]);

  // Auto-populate actual refund with expected refund
  useEffect(() => {
    if (expectedRefund > 0 && !actualRefund) {
      setActualRefund(expectedRefund.toFixed(2));
    }
  }, [expectedRefund]);

  const handleActualRefundChange = (value: string) => {
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setActualRefund(value);
    }
  };

  // Proof of Payment file handlers
  const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB", "error");
      return;
    }

    setProofFile(selectedFile);
    setProofFileType(selectedFile.type);

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setProofFilePreview(null);
    }
  };

  const removeProofFile = () => {
    setProofFile(null);
    setProofFilePreview(null);
    setProofFileType("");
    if (proofFileInputRef.current) {
      proofFileInputRef.current.value = "";
    }
  };

  const handleProofDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleProofDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (droppedFile.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB", "error");
      return;
    }

    setProofFile(droppedFile);
    setProofFileType(droppedFile.type);

    if (droppedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofFilePreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    } else {
      setProofFilePreview(null);
    }
  };

  // Conditionally Accepted Attachment file handlers
  const handleAttachmentFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB", "error");
      return;
    }

    setAttachmentFile(selectedFile);
    setAttachmentFileType(selectedFile.type);

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setAttachmentFilePreview(null);
    }
  };

  const removeAttachmentFile = () => {
    setAttachmentFile(null);
    setAttachmentFilePreview(null);
    setAttachmentFileType("");
    if (attachmentFileInputRef.current) {
      attachmentFileInputRef.current.value = "";
    }
  };

  const handleAttachmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAttachmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (droppedFile.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB", "error");
      return;
    }

    setAttachmentFile(droppedFile);
    setAttachmentFileType(droppedFile.type);

    if (droppedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentFilePreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    } else {
      setAttachmentFilePreview(null);
    }
  };

  // Scrap/Reject file handlers
  const handleScrapFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB", "error");
      return;
    }

    setScrapFile(selectedFile);
    setScrapFileType(selectedFile.type);

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScrapFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setScrapFilePreview(null);
    }
  };

  const removeScrapFile = () => {
    setScrapFile(null);
    setScrapFilePreview(null);
    setScrapFileType("");
    if (scrapFileInputRef.current) {
      scrapFileInputRef.current.value = "";
    }
  };

  const handleScrapDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleScrapDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (droppedFile.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB", "error");
      return;
    }

    setScrapFile(droppedFile);
    setScrapFileType(droppedFile.type);

    if (droppedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScrapFilePreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    } else {
      setScrapFilePreview(null);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!resolutionType) {
      toast("Please select a resolution type", "error");
      return;
    }

    if (resolutionType === "Return/refund") {
      if (!actualRefund || parseFloat(actualRefund) <= 0) {
        toast("Please enter a valid actual refund amount", "error");
        return;
      }

      if (!reasonForVariance) {
        toast("Please enter a reason for variance", "error");
        return;
      }

      if (!etaDeliveryDate) {
        toast("Please enter an ETA delivery date", "error");
        return;
      }

      if (!refundMethod) {
        toast("Please select a refund method", "error");
        return;
      }

      if (!proofFile) {
        toast("Please upload proof of payment or credit note", "error");
        return;
      }

      let proofUrl = null;

      // Upload proof of payment to qc-failed-proof-of-payments folder
      try {
        const formData = new FormData();
        formData.append("files", proofFile);
        formData.append("folder", "qc-failed-proof-of-payments");

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload proof of payment");
        }

        const uploadResult = await uploadResponse.json();
        proofUrl = uploadResult.urls[0];
      } catch (error) {
        console.error("Error uploading proof:", error);
        toast("Failed to upload proof of payment", "error");
        return;
      }

      // Submit resolution
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/resolution`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createResolution",
            mr_header_id: mrHeader.id,
            mr_line_id: item.id,
            lpo_mr_line_id: lpoMrLine?.id,
            type: resolutionType,
            failed_quantity: failedQuantity,
            return_quantity: failedQuantity,
            unit_price: unitPrice,
            expected_refund: expectedRefund,
            actual_refund: parseFloat(actualRefund),
            variance_amount: varianceAmount,
            reason_for_variance: reasonForVariance,
            eta_delivery_date: etaDeliveryDate,
            refund_method: refundMethod,
            proof_of_payment_url: proofUrl,
            created_by: userInfo?.name,
          }),
        }
      );

      if (res.ok) {
        toast("Resolution created", "success");
        setIsOpen(false);
        setResolutionType("");
        setActualRefund("");
        setReasonForVariance("");
        setEtaDeliveryDate("");
        setRefundMethod("");
        setProofFile(null);
        setProofFilePreview(null);
        setProofFileType("");
        router.refresh();
      } else {
        toast("Failed to create resolution", "error");
      }
    } else if (resolutionType === "Conditionally accepted") {
      if (!conditionallyAcceptedReason) {
        toast("Please enter a reason", "error");
        return;
      }

      let attachmentUrl = null;

      // Upload attachment to qc-failed-conditionally-accepted folder (if provided)
      if (attachmentFile) {
        try {
          const formData = new FormData();
          formData.append("files", attachmentFile);
          formData.append("folder", "qc-failed-conditionally-accepted");

          const uploadResponse = await fetch("/api/s3", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload attachment");
          }

          const uploadResult = await uploadResponse.json();
          attachmentUrl = uploadResult.urls[0];
        } catch (error) {
          console.error("Error uploading attachment:", error);
          toast("Failed to upload attachment", "error");
          return;
        }
      }

      // Submit resolution
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/resolution`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createResolution",
            mr_header_id: mrHeader.id,
            mr_line_id: item.id,
            lpo_mr_line_id: lpoMrLine?.id,
            type: resolutionType,
            failed_quantity: failedQuantity,
            conditionally_accepted_quantity: failedQuantity,
            reason: conditionallyAcceptedReason,
            attachment_url: attachmentUrl,
            created_by: userInfo?.name,
          }),
        }
      );

      if (res.ok) {
        toast("Resolution created", "success");
        setIsOpen(false);
        setResolutionType("");
        setConditionallyAcceptedReason("");
        setAttachmentFile(null);
        setAttachmentFilePreview(null);
        setAttachmentFileType("");
        router.refresh();
      } else {
        toast("Failed to create resolution", "error");
      }
    } else if (resolutionType === "Reject/scrap") {
      if (!scrapReason) {
        toast("Please select a scrap reason", "error");
        return;
      }

      let scrapUrl = null;

      // Upload scrap attachment to qc-failed-scrap-reject folder (if provided)
      if (scrapFile) {
        try {
          const formData = new FormData();
          formData.append("files", scrapFile);
          formData.append("folder", "qc-failed-scrap-reject");

          const uploadResponse = await fetch("/api/s3", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload scrap attachment");
          }

          const uploadResult = await uploadResponse.json();
          scrapUrl = uploadResult.urls[0];
        } catch (error) {
          console.error("Error uploading scrap attachment:", error);
          toast("Failed to upload scrap attachment", "error");
          return;
        }
      }

      // Submit resolution
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/resolution`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createResolution",
            mr_header_id: mrHeader.id,
            mr_line_id: item.id,
            lpo_mr_line_id: lpoMrLine?.id,
            type: resolutionType,
            failed_quantity: failedQuantity,
            scrap_quantity: failedQuantity,
            scrap_reason: scrapReason,
            return_not_possible_reason: returnNotPossibleReason,
            disposal_method: disposalMethod,
            scrap_attachment_url: scrapUrl,
            created_by: userInfo?.name,
          }),
        }
      );

      if (res.ok) {
        toast("Resolution created", "success");
        setIsOpen(false);
        setResolutionType("");
        setScrapReason("");
        setReturnNotPossibleReason("");
        setDisposalMethod("");
        setScrapFile(null);
        setScrapFilePreview(null);
        setScrapFileType("");
        router.refresh();
      } else {
        toast("Failed to create resolution", "error");
      }
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: "5px", padding: "7px 7px" }}
      >
        <img src={plusIcon} alt="plus" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="CREATE RESOLUTION"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"RESOLUTION TYPE"}
              value={resolutionType}
              type={"select"}
              placeholder={"SELECT TYPE"}
              required
              onChange={(e) => setResolutionType(e.target.value)}
              selectOptions={[
                "Return/refund",
                "Replace",
                "Conditionally accepted",
                "Reject/scrap",
              ]}
            />
          </div>

          {resolutionType === "Return/refund" && (
            <>
              <br />
              <br />

              <table className="items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>DESCRIPTION</th>
                    <th>FAILED QUANTITY</th>
                    <th>RETURN QUANTITY</th>
                    <th>EXPECTED REFUND</th>
                    <th style={{ width: "300px" }}>ACTUAL REFUND</th>
                  </tr>
                </thead>
                <tbody>
                  <tr key={item.id}>
                    <td>1</td>
                    <td>{item.material_description}</td>
                    <td>
                      {failedQuantity} {item.unit}
                    </td>
                    <td>
                      {failedQuantity} {item.unit}
                    </td>
                    <td>{expectedRefund.toFixed(2)} AED</td>
                    <td>
                      <div className="input-prefix right">
                        <span>AED</span>
                        <input
                          type="text"
                          placeholder="ENTER ACTUAL REFUND"
                          value={actualRefund}
                          onChange={(e) =>
                            handleActualRefundChange(e.target.value)
                          }
                          required
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      <b>TOTAL</b>
                    </td>
                    <td>{expectedRefund.toFixed(2)} AED</td>
                    <td>{actualRefundAmount.toFixed(2)} AED</td>
                  </tr>
                </tbody>
              </table>

              <br />

              <div className="input-row half">
                <div className="input-item">
                  <label>VARIANCE AMOUNT</label>
                  <div className="input-prefix right">
                    <span>AED</span>
                    <input
                      type="text"
                      placeholder="VARIANCE AMOUNT"
                      value={varianceAmount.toFixed(2)}
                      disabled
                    />
                  </div>
                </div>
                <InputItem
                  label={"REASON FOR VARIANCE"}
                  value={reasonForVariance}
                  type={"text"}
                  placeholder={"ENTER REASON FOR VARIANCE"}
                  required
                  onChange={(e) => setReasonForVariance(e.target.value)}
                />
              </div>

              <div className="input-row half">
                <InputItem
                  label={"ETA DELIVERY DATE"}
                  value={etaDeliveryDate}
                  type={"date"}
                  placeholder={"ENTER ETA DELIVERY DATE"}
                  required
                  onChange={(e) => setEtaDeliveryDate(e.target.value)}
                />
                <InputItem
                  label={"REFUND METHOD"}
                  value={refundMethod}
                  type={"select"}
                  placeholder={"SELECT REFUND METHOD"}
                  required
                  onChange={(e) => setRefundMethod(e.target.value)}
                  selectOptions={["Debit", "Credit"]}
                />
              </div>

              <div className="input-row half">
                <div className="input-item">
                  <label>PROOF OF PAYMENT / CREDIT NOTE</label>
                  <div
                    onDragOver={handleProofDragOver}
                    onDrop={handleProofDrop}
                    style={{
                      border: "1px dashed #d1d5db",
                      borderRadius: "5px",
                      padding: "40px",
                      textAlign: "center",
                      backgroundColor: "#f9fafb",
                      flexDirection: "column",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    {proofFile ? (
                      <div style={{ width: "100%" }}>
                        {proofFileType.startsWith("image/") &&
                        proofFilePreview ? (
                          <div style={{ position: "relative" }}>
                            <img
                              src={proofFilePreview}
                              alt="Preview"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "300px",
                                borderRadius: "5px",
                              }}
                            />
                            <button
                              type="button"
                              onClick={removeProofFile}
                              style={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                border: "none",
                                backgroundColor: "rgba(0,0,0,0.6)",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "18px",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "16px",
                              backgroundColor: "white",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              {proofFile.name}
                            </div>
                            <button
                              type="button"
                              onClick={removeProofFile}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                border: "none",
                                backgroundColor: "black",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "18px",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        UPLOAD OR DRAG ATTACHMENT
                        <br />
                        <br />
                        <input
                          ref={proofFileInputRef}
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                          onChange={handleProofFileSelect}
                          style={{ display: "none" }}
                        />
                        <Button
                          componentType="button"
                          bgColor="black"
                          borderColor="black"
                          textColor="white"
                          onClick={(e) => {
                            e.preventDefault();
                            proofFileInputRef.current?.click();
                          }}
                        >
                          <img src={uploadIcon} alt="upload" />
                          UPLOAD FILE
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {resolutionType === "Replace" && (
            <>
              <br />
              <br />

              <table className="items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>DESCRIPTION</th>
                    <th>FAILED QUANTITY</th>
                    <th>REPLACED QUANTITY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr key={item.id}>
                    <td>1</td>
                    <td>{item.material_description}</td>
                    <td>
                      {failedQuantity} {item.unit}
                    </td>
                    <td>
                      {failedQuantity} {item.unit}
                    </td>
                  </tr>
                </tbody>
              </table>

              <br />

              <div className="input-row half">
                <InputItem
                  label={"REPLACEMENT TYPE"}
                  value={replacementType}
                  type={"select"}
                  placeholder={"SELECT REPLACEMENT TYPE"}
                  required
                  onChange={(e) => setReplacementType(e.target.value)}
                  selectOptions={["Like-for-like", "Revised specifications"]}
                />
                <InputItem
                  label={"EXPECTED REPLACEMENT DATE"}
                  value={expectedReplacementDate}
                  type={"date"}
                  placeholder={"SELECT REPLACEMENT DATE"}
                  required
                  onChange={(e) => setExpectedReplacementDate(e.target.value)}
                />
              </div>

              <div className="input-row full">
                <InputItem
                  label={"NOTES (OPTIONAL)"}
                  value={replaceNotes}
                  type={"textarea"}
                  placeholder={"ENTER NOTES"}
                  required
                  onChange={(e) => setReplaceNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {resolutionType === "Conditionally accepted" && (
            <>
              <br />
              <br />

              <table className="items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>DESCRIPTION</th>
                    <th>FAILED QUANTITY</th>
                    <th>CONDITIONALLY ACCEPTED QUANTITY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr key={item.id}>
                    <td>1</td>
                    <td>{item.material_description}</td>
                    <td>
                      {failedQuantity} {item.unit}
                    </td>
                    <td>
                      {failedQuantity} {item.unit}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="input-row full">
                <InputItem
                  label={"REASON"}
                  value={conditionallyAcceptedReason}
                  type={"textarea"}
                  placeholder={"ENTER REASON"}
                  required
                  onChange={(e) =>
                    setConditionallyAcceptedReason(e.target.value)
                  }
                />
              </div>

              <div className="input-row half">
                <div className="input-item">
                  <label>ATTACHMENTS</label>
                  <div
                    onDragOver={handleAttachmentDragOver}
                    onDrop={handleAttachmentDrop}
                    style={{
                      border: "1px dashed #d1d5db",
                      borderRadius: "5px",
                      padding: "40px",
                      textAlign: "center",
                      backgroundColor: "#f9fafb",
                      flexDirection: "column",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    {attachmentFile ? (
                      <div style={{ width: "100%" }}>
                        {attachmentFileType.startsWith("image/") &&
                        attachmentFilePreview ? (
                          <div style={{ position: "relative" }}>
                            <img
                              src={attachmentFilePreview}
                              alt="Preview"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "300px",
                                borderRadius: "5px",
                              }}
                            />
                            <button
                              type="button"
                              onClick={removeAttachmentFile}
                              style={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                border: "none",
                                backgroundColor: "rgba(0,0,0,0.6)",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "18px",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "16px",
                              backgroundColor: "white",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              {attachmentFile.name}
                            </div>
                            <button
                              type="button"
                              onClick={removeAttachmentFile}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                border: "none",
                                backgroundColor: "black",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "18px",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        UPLOAD OR DRAG ATTACHMENT
                        <br />
                        <br />
                        <input
                          ref={attachmentFileInputRef}
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                          onChange={handleAttachmentFileSelect}
                          style={{ display: "none" }}
                        />
                        <Button
                          componentType="button"
                          bgColor="black"
                          borderColor="black"
                          textColor="white"
                          onClick={(e) => {
                            e.preventDefault();
                            attachmentFileInputRef.current?.click();
                          }}
                        >
                          <img src={uploadIcon} alt="upload" />
                          UPLOAD FILE
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {resolutionType === "Reject/scrap" && (
            <>
              <br />
              <br />

              <table className="items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>DESCRIPTION</th>
                    <th>FAILED QUANTITY</th>
                    <th>SCRAP QUANTITY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr key={item.id}>
                    <td>1</td>
                    <td>{item.material_description}</td>
                    <td>
                      {failedQuantity} {item.unit}
                    </td>
                    <td>
                      {failedQuantity} {item.unit}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="input-row half">
                <InputItem
                  label={"SCRAP REASON"}
                  value={scrapReason}
                  type={"select"}
                  placeholder={"SELECT SCRAP REASON"}
                  required
                  onChange={(e) => setScrapReason(e.target.value)}
                  selectOptions={[
                    "Supplier rejection refused",
                    "Expired",
                    "Damaged beyond repair",
                    "Custom-fabricated item (non-returnable)",
                  ]}
                />
              </div>

              {scrapReason === "Supplier rejection refused" && (
                <div className="input-row half">
                  <div className="input-item">
                    <label>SUPPLIER REJECTION EMAIL/CLAUSE</label>
                    <div
                      onDragOver={handleScrapDragOver}
                      onDrop={handleScrapDrop}
                      style={{
                        border: "1px dashed #d1d5db",
                        borderRadius: "5px",
                        padding: "40px",
                        textAlign: "center",
                        backgroundColor: "#f9fafb",
                        flexDirection: "column",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      {scrapFile ? (
                        <div style={{ width: "100%" }}>
                          {scrapFileType.startsWith("image/") &&
                          scrapFilePreview ? (
                            <div style={{ position: "relative" }}>
                              <img
                                src={scrapFilePreview}
                                alt="Preview"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "300px",
                                  borderRadius: "5px",
                                }}
                              />
                              <button
                                type="button"
                                onClick={removeScrapFile}
                                style={{
                                  position: "absolute",
                                  top: "10px",
                                  right: "10px",
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  border: "none",
                                  backgroundColor: "rgba(0,0,0,0.6)",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "18px",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px",
                                backgroundColor: "white",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                {scrapFile.name}
                              </div>
                              <button
                                type="button"
                                onClick={removeScrapFile}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  border: "none",
                                  backgroundColor: "black",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "18px",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          UPLOAD OR DRAG ATTACHMENT
                          <br />
                          <br />
                          <input
                            ref={scrapFileInputRef}
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleScrapFileSelect}
                            style={{ display: "none" }}
                          />
                          <Button
                            componentType="button"
                            bgColor="black"
                            borderColor="black"
                            textColor="white"
                            onClick={(e) => {
                              e.preventDefault();
                              scrapFileInputRef.current?.click();
                            }}
                          >
                            <img src={uploadIcon} alt="upload" />
                            UPLOAD FILE
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {scrapReason === "Expired" && (
                <div className="input-row half">
                  <div className="input-item">
                    <label>EXPIRED LABEL/ITEM</label>
                    <div
                      onDragOver={handleScrapDragOver}
                      onDrop={handleScrapDrop}
                      style={{
                        border: "1px dashed #d1d5db",
                        borderRadius: "5px",
                        padding: "40px",
                        textAlign: "center",
                        backgroundColor: "#f9fafb",
                        flexDirection: "column",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      {scrapFile ? (
                        <div style={{ width: "100%" }}>
                          {scrapFileType.startsWith("image/") &&
                          scrapFilePreview ? (
                            <div style={{ position: "relative" }}>
                              <img
                                src={scrapFilePreview}
                                alt="Preview"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "300px",
                                  borderRadius: "5px",
                                }}
                              />
                              <button
                                type="button"
                                onClick={removeScrapFile}
                                style={{
                                  position: "absolute",
                                  top: "10px",
                                  right: "10px",
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  border: "none",
                                  backgroundColor: "rgba(0,0,0,0.6)",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "18px",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px",
                                backgroundColor: "white",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                {scrapFile.name}
                              </div>
                              <button
                                type="button"
                                onClick={removeScrapFile}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  border: "none",
                                  backgroundColor: "black",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "18px",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          UPLOAD OR DRAG ATTACHMENT
                          <br />
                          <br />
                          <input
                            ref={scrapFileInputRef}
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleScrapFileSelect}
                            style={{ display: "none" }}
                          />
                          <Button
                            componentType="button"
                            bgColor="black"
                            borderColor="black"
                            textColor="white"
                            onClick={(e) => {
                              e.preventDefault();
                              scrapFileInputRef.current?.click();
                            }}
                          >
                            <img src={uploadIcon} alt="upload" />
                            UPLOAD FILE
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {scrapReason === "Damaged beyond repair" && (
                <div className="input-row half">
                  <div className="input-item">
                    <label>ATTACHMENTS</label>
                    <div
                      onDragOver={handleScrapDragOver}
                      onDrop={handleScrapDrop}
                      style={{
                        border: "1px dashed #d1d5db",
                        borderRadius: "5px",
                        padding: "40px",
                        textAlign: "center",
                        backgroundColor: "#f9fafb",
                        flexDirection: "column",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      {scrapFile ? (
                        <div style={{ width: "100%" }}>
                          {scrapFileType.startsWith("image/") &&
                          scrapFilePreview ? (
                            <div style={{ position: "relative" }}>
                              <img
                                src={scrapFilePreview}
                                alt="Preview"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "300px",
                                  borderRadius: "5px",
                                }}
                              />
                              <button
                                type="button"
                                onClick={removeScrapFile}
                                style={{
                                  position: "absolute",
                                  top: "10px",
                                  right: "10px",
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  border: "none",
                                  backgroundColor: "rgba(0,0,0,0.6)",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "18px",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px",
                                backgroundColor: "white",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                {scrapFile.name}
                              </div>
                              <button
                                type="button"
                                onClick={removeScrapFile}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  border: "none",
                                  backgroundColor: "black",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "18px",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          UPLOAD OR DRAG ATTACHMENT
                          <br />
                          <br />
                          <input
                            ref={scrapFileInputRef}
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleScrapFileSelect}
                            style={{ display: "none" }}
                          />
                          <Button
                            componentType="button"
                            bgColor="black"
                            borderColor="black"
                            textColor="white"
                            onClick={(e) => {
                              e.preventDefault();
                              scrapFileInputRef.current?.click();
                            }}
                          >
                            <img src={uploadIcon} alt="upload" />
                            UPLOAD FILE
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="input-row full">
                <InputItem
                  label={"WHY IS RETURN NOT POSSIBLE?"}
                  value={returnNotPossibleReason}
                  type={"textarea"}
                  placeholder={"ENTER REASON FOR RETURN NOT POSSIBLE"}
                  required={false}
                  onChange={(e) => setReturnNotPossibleReason(e.target.value)}
                />
              </div>

              <div className="input-row half">
                <InputItem
                  label={"DISPOSAL METHOD"}
                  value={disposalMethod}
                  type={"select"}
                  placeholder={"SELECT DISPOSAL METHOD"}
                  required={false}
                  onChange={(e) => setDisposalMethod(e.target.value)}
                  selectOptions={["Destroyed", "Recycled", "Sold at scrap"]}
                />
              </div>
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
