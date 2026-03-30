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
import { formatPriceAED } from "@/lib/formatPrice";

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

type ExistingResolution = {
  resolution_id: number;
  resolution_type: string;
  // Return/Refund
  return_quantity?: number;
  expected_refund?: number;
  actual_refund?: number;
  variance_amount?: number;
  reason_for_variance?: string;
  eta_delivery_date?: string;
  refund_method?: string;
  proof_of_payment_url?: string;
  // Replace
  replace_quantity?: number;
  replacement_type?: string;
  expected_replacement_date?: string;
  notes?: string;
  // Conditionally Accepted
  conditionally_accepted_quantity?: number;
  reason?: string;
  attachment?: string;
  // Reject/Scrap
  scrap_quantity?: number;
  scrap_reason?: string;
  return_not_possible_reason?: string;
  disposal_method?: string;
  scrap_attachment?: string;
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
  const downloadIcon = "/icons/download.svg";
  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingResolution, setExistingResolution] =
    useState<ExistingResolution | null>(null);
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

  // Get status badge configuration
  const getStatusBadge = () => {
    if (!existingResolution) return null;

    const configs = {
      "Return/refund": {
        bg: "rgba(87, 244, 176, 1)",
        text: "rgba(31, 101, 71, 1)",
        label: "Return / Refund",
      },
      Replace: {
        bg: "rgba(87, 244, 176, 1)",
        text: "rgba(31, 101, 71, 1)",
        label: "Replace",
      },
      "Conditionally accepted": {
        bg: "rgba(87, 244, 176, 1)",
        text: "rgba(31, 101, 71, 1)",
        label: "Conditionally Accepted",
      },
      "Reject/scrap": {
        bg: "rgba(255, 181, 181, 1)",
        text: "rgba(248, 77, 77, 1)",
        label: "Rejected",
      },
    };

    const config =
      configs[existingResolution.resolution_type as keyof typeof configs];
    if (!config) return null;

    return (
      <div style={{ display: "flex", gap: "10px" }}>
        <div
          style={{
            backgroundColor: config.bg,
            color: config.text,
            padding: "0px 10px",
            borderRadius: "5px",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>{config.label}</span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Button
            componentType={"button"}
            bgColor={"rgba(239, 239, 239, 1)"}
            borderColor={"rgba(223, 223, 223, 1)"}
            textColor={"black"}
            onClick={() => setIsOpen(true)}
            style={{ padding: "7px 7px" }}
          >
            <img src={pencilIcon} alt="edit" />
          </Button>
          <Button
            componentType={"button"}
            bgColor={"rgba(239, 239, 239, 1)"}
            borderColor={"rgba(223, 223, 223, 1)"}
            textColor={"black"}
            onClick={handleDownload}
            style={{ padding: "7px 7px" }}
          >
            <img src={downloadIcon} alt="download" />
          </Button>
          <Button
            componentType={"button"}
            bgColor={"rgba(239, 239, 239, 1)"}
            borderColor={"rgba(223, 223, 223, 1)"}
            textColor={"black"}
            onClick={handleDelete}
            style={{ padding: "7px 7px" }}
          >
            <img src={trashIcon} alt="delete" />
          </Button>
        </div>
      </div>
    );
  };

  // Handle download resolution
  const handleDownload = async () => {
    toast("Downloading resolution...", "info");
    // Add your download logic here
  };

  // Handle delete resolution
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this resolution?")) return;

    try {
      // Delete associated files from S3 before deleting the resolution
      if (existingResolution) {
        const filesToDelete: string[] = [];

        // Collect file URLs based on resolution type
        if (
          existingResolution.resolution_type === "Return/refund" &&
          existingResolution.proof_of_payment_url
        ) {
          try {
            const url =
              typeof existingResolution.proof_of_payment_url === "string"
                ? JSON.parse(existingResolution.proof_of_payment_url)
                : existingResolution.proof_of_payment_url;
            filesToDelete.push(url);
          } catch (e) {
            filesToDelete.push(existingResolution.proof_of_payment_url);
          }
        } else if (
          existingResolution.resolution_type === "Conditionally accepted" &&
          existingResolution.attachment
        ) {
          try {
            const url =
              typeof existingResolution.attachment === "string"
                ? JSON.parse(existingResolution.attachment)
                : existingResolution.attachment;
            filesToDelete.push(url);
          } catch (e) {
            filesToDelete.push(existingResolution.attachment);
          }
        } else if (
          existingResolution.resolution_type === "Reject/scrap" &&
          existingResolution.scrap_attachment
        ) {
          try {
            const url =
              typeof existingResolution.scrap_attachment === "string"
                ? JSON.parse(existingResolution.scrap_attachment)
                : existingResolution.scrap_attachment;
            filesToDelete.push(url);
          } catch (e) {
            filesToDelete.push(existingResolution.scrap_attachment);
          }
        }

        // Delete files from S3
        for (const fileUrl of filesToDelete) {
          try {
            await fetch("/api/s3", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: fileUrl }),
            });
          } catch (deleteError) {
            console.error("Error deleting file from S3:", deleteError);
            // Continue with deletion even if S3 delete fails
          }
        }
      }

      // Delete the resolution from database
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deleteQCResolution",
            resolution_id: existingResolution?.resolution_id,
            resolution_type: existingResolution?.resolution_type,
          }),
        },
      );

      if (response.ok) {
        toast("Resolution deleted successfully", "success");
        setExistingResolution(null);
        setIsEditMode(false);
        router.refresh();
      } else {
        toast("Failed to delete resolution", "error");
      }
    } catch (error) {
      console.error("Error deleting resolution:", error);
      toast("Failed to delete resolution", "error");
    }
  };

  // Check for existing resolution on component mount
  useEffect(() => {
    async function checkExistingResolution() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCResolutionByMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mr_header_id: mrHeader.id,
              mr_line_id: item.id,
            }),
          },
        );

        const data = await response.json();

        if (data.success && data.data) {
          setIsEditMode(true);
          setExistingResolution(data.data);
        } else {
          setIsEditMode(false);
          setExistingResolution(null);
        }
      } catch (error) {
        console.error("Error checking existing resolution:", error);
        setIsEditMode(false);
      }
    }

    checkExistingResolution();
  }, [mrHeader.id, item.id]);

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
          },
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
            },
          );

          const lpoDetailsData = await lpoDetailsResponse.json();

          if (
            lpoDetailsData.success &&
            lpoDetailsData.data &&
            lpoDetailsData.data.lpo_mr_lines
          ) {
            const lpoLine = lpoDetailsData.data.lpo_mr_lines.find(
              (line: any) => line.mr_line_id === item.id,
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
                },
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
                },
              );

              const grnDataResponse = await grnResponse.json();

              if (grnDataResponse.success && grnDataResponse.data) {
                const grnLine = grnDataResponse.data.grn_lines?.find(
                  (gl: any) => gl.lpo_mr_line_id === lpoLine.id,
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

  // Populate form with existing resolution data
  useEffect(() => {
    if (isEditMode && existingResolution && isOpen) {
      setResolutionType(existingResolution.resolution_type);

      if (existingResolution.resolution_type === "Return/refund") {
        setActualRefund(existingResolution.actual_refund?.toString() || "");
        setReasonForVariance(existingResolution.reason_for_variance || "");
        setEtaDeliveryDate(existingResolution.eta_delivery_date || "");
        setRefundMethod(existingResolution.refund_method || "");

        // Parse JSON string for proof of payment
        if (existingResolution.proof_of_payment_url) {
          try {
            const parsedUrl =
              typeof existingResolution.proof_of_payment_url === "string"
                ? JSON.parse(existingResolution.proof_of_payment_url)
                : existingResolution.proof_of_payment_url;

            setProofFilePreview(parsedUrl);
            setProofFileType(
              parsedUrl.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
            );
          } catch (e) {
            // If not JSON, use as-is
            setProofFilePreview(existingResolution.proof_of_payment_url);
            setProofFileType(
              existingResolution.proof_of_payment_url.endsWith(".pdf")
                ? "application/pdf"
                : "image/jpeg",
            );
          }
        }
      } else if (existingResolution.resolution_type === "Replace") {
        setReplacementType(existingResolution.replacement_type || "");
        setExpectedReplacementDate(
          existingResolution.expected_replacement_date || "",
        );
        setReplaceNotes(existingResolution.notes || "");
      } else if (
        existingResolution.resolution_type === "Conditionally accepted"
      ) {
        setConditionallyAcceptedReason(existingResolution.reason || "");

        // Parse JSON string for attachment
        if (existingResolution.attachment) {
          try {
            const parsedUrl =
              typeof existingResolution.attachment === "string"
                ? JSON.parse(existingResolution.attachment)
                : existingResolution.attachment;

            setAttachmentFilePreview(parsedUrl);
            setAttachmentFileType(
              parsedUrl.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
            );
          } catch (e) {
            // If not JSON, use as-is
            setAttachmentFilePreview(existingResolution.attachment);
            setAttachmentFileType(
              existingResolution.attachment.endsWith(".pdf")
                ? "application/pdf"
                : "image/jpeg",
            );
          }
        }
      } else if (existingResolution.resolution_type === "Reject/scrap") {
        setScrapReason(existingResolution.scrap_reason || "");
        setReturnNotPossibleReason(
          existingResolution.return_not_possible_reason || "",
        );
        setDisposalMethod(existingResolution.disposal_method || "");

        // Parse JSON string for scrap attachment
        if (existingResolution.scrap_attachment) {
          try {
            const parsedUrl =
              typeof existingResolution.scrap_attachment === "string"
                ? JSON.parse(existingResolution.scrap_attachment)
                : existingResolution.scrap_attachment;

            setScrapFilePreview(parsedUrl);
            setScrapFileType(
              parsedUrl.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
            );
          } catch (e) {
            // If not JSON, use as-is
            setScrapFilePreview(existingResolution.scrap_attachment);
            setScrapFileType(
              existingResolution.scrap_attachment.endsWith(".pdf")
                ? "application/pdf"
                : "image/jpeg",
            );
          }
        }
      }
    }
  }, [isEditMode, existingResolution, isOpen]);

  // Auto-populate actual refund with expected refund
  useEffect(() => {
    if (expectedRefund > 0 && !actualRefund && !isEditMode) {
      setActualRefund(expectedRefund.toFixed(2));
    }
  }, [expectedRefund, isEditMode]);

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
    e: React.ChangeEvent<HTMLInputElement>,
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

      // In edit mode, file is optional if it already exists
      if (!isEditMode && !proofFile) {
        toast("Please upload proof of payment or credit note", "error");
        return;
      }

      let proofUrl = existingResolution?.proof_of_payment_url || null;

      // Only upload if a new file is selected
      if (proofFile) {
        try {
          // Delete old file from S3 if it exists
          if (existingResolution?.proof_of_payment_url) {
            try {
              const oldUrl =
                typeof existingResolution.proof_of_payment_url === "string"
                  ? JSON.parse(existingResolution.proof_of_payment_url)
                  : existingResolution.proof_of_payment_url;

              await fetch("/api/s3", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: oldUrl }),
              });
            } catch (deleteError) {
              console.error("Error deleting old proof file:", deleteError);
              // Continue with upload even if delete fails
            }
          }

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
      }

      // Submit resolution
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/qc`, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEditMode ? "updateQCResolution" : "createQCResolution",
          resolution_id: existingResolution?.resolution_id,
          old_type: existingResolution?.resolution_type,
          mr_header_id: mrHeader.id,
          mr_line_id: item.id,
          type: resolutionType,
          failed_quantity: failedQuantity,
          return_quantity: failedQuantity,
          expected_refund: expectedRefund,
          actual_refund: parseFloat(actualRefund),
          variance_amount: varianceAmount,
          reason_for_variance: reasonForVariance,
          eta_delivery_date: etaDeliveryDate,
          refund_method: refundMethod,
          proof_of_payment: JSON.stringify(proofUrl),
        }),
      });

      if (res.ok) {
        toast(
          isEditMode ? "Resolution updated" : "Resolution created",
          "success",
        );
        setIsOpen(false);
        router.refresh();
      } else {
        toast("Failed to create resolution", "error");
      }
    }

    if (resolutionType === "Replace") {
      if (!replacementType) {
        toast("Please select a replacement type", "error");
        return;
      }

      if (!expectedReplacementDate) {
        toast("Please select expected replacement date", "error");
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/qc`, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEditMode ? "updateQCResolution" : "createQCResolution",
          resolution_id: existingResolution?.resolution_id,
          old_type: existingResolution?.resolution_type,
          mr_header_id: mrHeader.id,
          mr_line_id: item.id,
          type: resolutionType,
          failed_quantity: failedQuantity,
          replacement_quantity: failedQuantity,
          replacement_type: replacementType,
          expected_replacement_date: expectedReplacementDate,
          notes: replaceNotes,
          created_by: userInfo?.name,
        }),
      });

      if (res.ok) {
        toast(
          isEditMode ? "Resolution updated" : "Resolution created",
          "success",
        );
        setIsOpen(false);
        router.refresh();
      } else {
        toast("Failed to save resolution", "error");
      }
    }

    if (resolutionType === "Conditionally accepted") {
      if (!conditionallyAcceptedReason) {
        toast("Please enter a reason", "error");
        return;
      }

      let attachmentUrl = existingResolution?.attachment || null;

      // Only upload if a new file is selected
      if (attachmentFile) {
        try {
          // Delete old file from S3 if it exists
          if (existingResolution?.attachment) {
            try {
              const oldUrl =
                typeof existingResolution.attachment === "string"
                  ? JSON.parse(existingResolution.attachment)
                  : existingResolution.attachment;

              await fetch("/api/s3", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: oldUrl }),
              });
            } catch (deleteError) {
              console.error("Error deleting old attachment file:", deleteError);
              // Continue with upload even if delete fails
            }
          }

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

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/qc`, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEditMode ? "updateQCResolution" : "createQCResolution",
          resolution_id: existingResolution?.resolution_id,
          old_type: existingResolution?.resolution_type,
          mr_header_id: mrHeader.id,
          mr_line_id: item.id,
          type: resolutionType,
          failed_quantity: failedQuantity,
          conditionally_accepted_quantity: failedQuantity,
          reason: conditionallyAcceptedReason,
          attachment_url: attachmentUrl,
          created_by: userInfo?.name,
        }),
      });

      if (res.ok) {
        toast(
          isEditMode
            ? "Resolution updated successfully"
            : "Resolution created successfully",
          "success",
        );
        setIsOpen(false);
        router.refresh();
      } else {
        toast("Failed to save resolution", "error");
      }
    }

    if (resolutionType === "Reject/scrap") {
      if (!scrapReason) {
        toast("Please select a scrap reason", "error");
        return;
      }

      let scrapUrl = existingResolution?.scrap_attachment || null;

      // Only upload if a new file is selected
      if (scrapFile) {
        try {
          // Delete old file from S3 if it exists
          if (existingResolution?.scrap_attachment) {
            try {
              const oldUrl =
                typeof existingResolution.scrap_attachment === "string"
                  ? JSON.parse(existingResolution.scrap_attachment)
                  : existingResolution.scrap_attachment;

              await fetch("/api/s3", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: oldUrl }),
              });
            } catch (deleteError) {
              console.error("Error deleting old scrap file:", deleteError);
              // Continue with upload even if delete fails
            }
          }

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

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/qc`, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEditMode ? "updateQCResolution" : "createQCResolution",
          resolution_id: existingResolution?.resolution_id,
          old_type: existingResolution?.resolution_type,
          mr_header_id: mrHeader.id,
          mr_line_id: item.id,
          type: resolutionType,
          failed_quantity: failedQuantity,
          scrap_quantity: failedQuantity,
          scrap_reason: scrapReason,
          return_not_possible_reason: returnNotPossibleReason,
          disposal_method: disposalMethod,
          scrap_attachment_url: scrapUrl,
          created_by: userInfo?.name,
        }),
      });

      if (res.ok) {
        toast(
          isEditMode
            ? "Resolution updated successfully"
            : "Resolution created successfully",
          "success",
        );
        setIsOpen(false);
        router.refresh();
      } else {
        toast("Failed to save resolution", "error");
      }
    }
  }

  return (
    <>
      {existingResolution ? (
        getStatusBadge()
      ) : (
        <Button
          componentType={"button"}
          bgColor={"rgba(239, 239, 239, 1)"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          onClick={() => setIsOpen(true)}
          style={{ borderRadius: "5px", padding: "7px 7px" }}
        >
          <img src={plusIcon} alt="add" />
        </Button>
      )}

      {isOpen && (
        <FormPopUp
          header={isEditMode ? "EDIT RESOLUTION" : "CREATE RESOLUTION"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={isEditMode ? "UPDATE" : "CONFIRM"}
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
                    <td>{formatPriceAED(expectedRefund)}</td>
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
                    <td>{formatPriceAED(expectedRefund)}</td>
                    <td>{formatPriceAED(actualRefundAmount)}</td>
                  </tr>
                </tbody>
              </table>

              <br />
              <br />
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
                  <label>
                    PROOF OF PAYMENT / CREDIT NOTE{" "}
                    {isEditMode && proofFilePreview && "(Click to change)"}
                  </label>
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
                    {proofFile || proofFilePreview ? (
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
                              {proofFile?.name || "Existing file"}
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
              <br />
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
                  required={false}
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

              <br />
              <br />
              <br />

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
                  <label>
                    ATTACHMENTS{" "}
                    {isEditMode &&
                      attachmentFilePreview &&
                      "(Optional - Click to change)"}
                  </label>
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
                    {attachmentFile || attachmentFilePreview ? (
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
                              {attachmentFile?.name || "Existing file"}
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

              <br />
              <br />
              <br />

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

              {(scrapReason === "Supplier rejection refused" ||
                scrapReason === "Expired" ||
                scrapReason === "Damaged beyond repair") && (
                <div className="input-row half">
                  <div className="input-item">
                    <label>
                      {scrapReason === "Supplier rejection refused"
                        ? "SUPPLIER REJECTION EMAIL/CLAUSE"
                        : scrapReason === "Expired"
                          ? "EXPIRED LABEL/ITEM"
                          : "ATTACHMENTS"}{" "}
                      {isEditMode &&
                        scrapFilePreview &&
                        "(Optional - Click to change)"}
                    </label>
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
                      {scrapFile || scrapFilePreview ? (
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
                                {scrapFile?.name || "Existing file"}
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
