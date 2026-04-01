"use client";

import { useState, useEffect } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import BoqReferencePopUp from "@/app/(protected)/mr/components/BoqReferencePopUp";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/_DownloadLPOButton";
import RejectCommentPopUp from "@/app/(protected)/mr/[id]/components/manager/RejectCommentPopUp";
import { useAuth } from "@/app/context/AuthContext";
import { formatPriceAED } from "@/lib/formatPrice";

type EntityType = "supplier" | "subcontractor";

type SupplierLpoRow = {
  lpo_id: number;
  mr_header_id: number | null;
  total_amount: number;
  delivery_date: string | null;
  invoice_files: string[];
  signed_lpo_files: string[];
  payment_receipts: string[];
  payment_status: string | null;
  payment_reject_comment: string | null;
  has_grn: boolean;
};

type SupplierDetails = {
  success: boolean;
  entity: "supplier";
  id: number;
  name: string;
  type: string;
  lpos: SupplierLpoRow[];
};

type JobOrderRow = {
  jo_id: number;
  project_id: number | null;
  total_amount: number;
  due_date: string | null;
  invoice_files: string[];
  payment_receipts: string[];
};

type SubcontractorDetails = {
  success: boolean;
  entity: "subcontractor";
  id: number;
  name: string;
  jobOrders: JobOrderRow[];
};

type PaymentDetailsClientProps = {
  initialData: SupplierDetails | SubcontractorDetails;
  entity: EntityType;
  id: number;
};

type GrnData = {
  id: number;
  lpo_id: number;
  received_date: string | null;
  received_by: string | null;
  grn_lines: {
    id: number;
    lpo_mr_line_id: number;
    received_quantity: number;
    notes: string | null;
    attachment: string | null;
  }[];
};

type LpoItem = {
  id: number;
  material_description: string;
  quantity: number;
  unit?: string;
  unit_price: number | string;
  total_price: number | string;
  boq_line_ids?: string | null;
  brand?: string | null;
  specification?: string | null;
  attachment?: string | null;
};

type JoItem = {
  id: number;
  job_scope_name?: string;
  job_description?: string;
  quantity: number;
  unit?: string;
  budget_estimate?: number;
  approved_total_price?: number;
  boq_line_ids?: string | null;
  brand?: string | null;
  specification?: string | null;
  attachment?: string | null;
};

export default function PaymentDetailsClient({
  initialData,
  entity,
  id,
}: PaymentDetailsClientProps) {
  const { userInfo } = useAuth();
  const [data, setData] = useState<SupplierDetails | SubcontractorDetails>(
    initialData,
  );

  const [isLpoProceedOpen, setIsLpoProceedOpen] = useState(false);
  const [isLpoRejectOpen, setIsLpoRejectOpen] = useState(false);
  const [selectedLpo, setSelectedLpo] = useState<SupplierLpoRow | null>(null);
  const [lpoPaymentFile, setLpoPaymentFile] = useState<File | null>(null);
  const [lpoRejectComment, setLpoRejectComment] = useState("");

  const [isJoPaymentOpen, setIsJoPaymentOpen] = useState(false);
  const [selectedJo, setSelectedJo] = useState<JobOrderRow | null>(null);
  const [joPaymentFile, setJoPaymentFile] = useState<File | null>(null);

  const [isGrnOpen, setIsGrnOpen] = useState(false);

  const downloadIcon = "/icons/download.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const uploadIcon = "/icons/upload.svg";
  const closeIcon = "/icons/cross-small.svg";

  const formatCurrency = (value: number) => formatPriceAED(value);

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB");
  };

  async function uploadFileToS3(file: File, folder: string): Promise<string> {
    const formData = new FormData();
    formData.append("folder", folder);
    formData.append("files", file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");
    const resData = await response.json();
    return resData.urls[0];
  }

  async function handleConfirmLpoPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLpo) {
      toast("No LPO selected", "error");
      return;
    }
    if (!lpoPaymentFile) {
      toast("Please upload a payment receipt", "error");
      return;
    }

    try {
      const uploadedUrl = await uploadFileToS3(lpoPaymentFile, "lpo-payments");
      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approvePayment",
            lpo_id: selectedLpo.lpo_id,
            payment_file: JSON.stringify(uploadedUrl),
          }),
        },
      );

      if (!updateRes.ok) throw new Error("Failed to update LPO payment");

      toast(
        `Payment for LPO-${String(selectedLpo.lpo_id).padStart(5, "0")} approved`,
        "success",
      );

      setData((prev) => {
        if (!prev || prev.entity !== "supplier") return prev;
        return {
          ...prev,
          lpos: prev.lpos.map((l) =>
            l.lpo_id === selectedLpo.lpo_id
              ? {
                  ...l,
                  payment_status: "approved",
                  payment_receipts: [uploadedUrl],
                }
              : l,
          ),
        };
      });

      setIsLpoProceedOpen(false);
      setSelectedLpo(null);
      setLpoPaymentFile(null);
    } catch (error) {
      console.error("Error approving LPO payment:", error);
      toast("Failed to approve payment", "error");
    }
  }

  async function handleRejectLpoPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLpo) {
      toast("No LPO selected", "error");
      return;
    }
    if (!lpoRejectComment.trim()) {
      toast("Please enter a reason for rejection", "error");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rejectPayment",
          lpo_id: selectedLpo.lpo_id,
          reject_comment: lpoRejectComment,
        }),
      });

      if (!res.ok) throw new Error("Failed to reject payment");

      toast(
        `Payment for LPO-${String(selectedLpo.lpo_id).padStart(5, "0")} rejected`,
        "success",
      );

      setData((prev) => {
        if (!prev || prev.entity !== "supplier") return prev;
        return {
          ...prev,
          lpos: prev.lpos.map((l) =>
            l.lpo_id === selectedLpo.lpo_id
              ? {
                  ...l,
                  payment_status: "rejected",
                  payment_reject_comment: lpoRejectComment,
                }
              : l,
          ),
        };
      });

      setIsLpoRejectOpen(false);
      setLpoRejectComment("");
      setSelectedLpo(null);
    } catch (error) {
      console.error("Error rejecting LPO payment:", error);
      toast("Failed to reject payment", "error");
    }
  }

  async function handleConfirmJoPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJo) {
      toast("No JO selected", "error");
      return;
    }
    if (!joPaymentFile) {
      toast("Please upload a payment receipt", "error");
      return;
    }

    try {
      const uploadedUrl = await uploadFileToS3(joPaymentFile, "jo-payments");
      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateJoPaymentReceipt",
            id: selectedJo.jo_id,
            jo_payment_receipt: JSON.stringify([uploadedUrl]),
          }),
        },
      );

      if (!updateRes.ok) throw new Error("Failed to proceed JO payment");

      toast(
        `Payment receipt approved for JO-${String(selectedJo.jo_id).padStart(5, "0")}`,
        "success",
      );

      setData((prev) => {
        if (!prev || prev.entity !== "subcontractor") return prev;
        return {
          ...prev,
          jobOrders: prev.jobOrders.filter(
            (jo) => jo.jo_id !== selectedJo.jo_id,
          ),
        };
      });

      setIsJoPaymentOpen(false);
      setSelectedJo(null);
      setJoPaymentFile(null);
    } catch (error) {
      console.error("Error proceeding JO payment:", error);
      toast("Failed to proceed payment", "error");
    }
  }

  async function handleSignedLpoDownload(url: string, lpoID: number) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch signed LPO");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Signed-LPO-${String(lpoID).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading signed LPO:", error);
      toast("Failed to download signed LPO", "error");
    }
  }

  async function handleInvoiceDownload(
    url: string,
    id: number,
    prefix: string = "LPO",
  ) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch invoice");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Invoice-${prefix}-${String(id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast("Failed to download invoice", "error");
    }
  }

  // Upload handlers for LPO
  async function handleUploadInvoice(lpo: SupplierLpoRow, file: File) {
    try {
      const uploadedUrl = await uploadFileToS3(file, "lpo-invoices");
      const updatedFiles = [...lpo.invoice_files, uploadedUrl];

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLPOInvoice",
          lpo_id: lpo.lpo_id,
          invoice_files: JSON.stringify(updatedFiles),
        }),
      });

      if (!res.ok) throw new Error("Failed to update invoice");

      toast("Invoice uploaded successfully", "success");

      setData((prev) => {
        if (!prev || prev.entity !== "supplier") return prev;
        return {
          ...prev,
          lpos: prev.lpos.map((l) =>
            l.lpo_id === lpo.lpo_id ? { ...l, invoice_files: updatedFiles } : l,
          ),
        };
      });
    } catch (error) {
      console.error("Error uploading invoice:", error);
      toast("Failed to upload invoice", "error");
    }
  }

  async function handleUploadSignedLpo(lpo: SupplierLpoRow, file: File) {
    try {
      const uploadedUrl = await uploadFileToS3(file, "lpo-signed");
      const updatedFiles = [...lpo.signed_lpo_files, uploadedUrl];

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLPOSignedLpo",
          lpo_id: lpo.lpo_id,
          signed_lpo_files: JSON.stringify(updatedFiles),
        }),
      });

      if (!res.ok) throw new Error("Failed to update signed LPO");

      toast("Signed LPO uploaded successfully", "success");

      setData((prev) => {
        if (!prev || prev.entity !== "supplier") return prev;
        return {
          ...prev,
          lpos: prev.lpos.map((l) =>
            l.lpo_id === lpo.lpo_id
              ? { ...l, signed_lpo_files: updatedFiles }
              : l,
          ),
        };
      });
    } catch (error) {
      console.error("Error uploading signed LPO:", error);
      toast("Failed to upload signed LPO", "error");
    }
  }

  async function handleDeleteInvoice(lpo: SupplierLpoRow, url: string) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", url }),
      });

      const updatedFiles = lpo.invoice_files.filter((f) => f !== url);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLPOInvoice",
          lpo_id: lpo.lpo_id,
          invoice_files: JSON.stringify(updatedFiles),
        }),
      });

      if (!res.ok) throw new Error("Failed to delete invoice");

      toast("Invoice deleted", "success");

      setData((prev) => {
        if (!prev || prev.entity !== "supplier") return prev;
        return {
          ...prev,
          lpos: prev.lpos.map((l) =>
            l.lpo_id === lpo.lpo_id ? { ...l, invoice_files: updatedFiles } : l,
          ),
        };
      });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast("Failed to delete invoice", "error");
    }
  }

  async function handleDeleteSignedLpo(lpo: SupplierLpoRow, url: string) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", url }),
      });

      const updatedFiles = lpo.signed_lpo_files.filter((f) => f !== url);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLPOSignedLpo",
          lpo_id: lpo.lpo_id,
          signed_lpo_files: JSON.stringify(updatedFiles),
        }),
      });

      if (!res.ok) throw new Error("Failed to delete signed LPO");

      toast("Signed LPO deleted", "success");

      setData((prev) => {
        if (!prev || prev.entity !== "supplier") return prev;
        return {
          ...prev,
          lpos: prev.lpos.map((l) =>
            l.lpo_id === lpo.lpo_id
              ? { ...l, signed_lpo_files: updatedFiles }
              : l,
          ),
        };
      });
    } catch (error) {
      console.error("Error deleting signed LPO:", error);
      toast("Failed to delete signed LPO", "error");
    }
  }

  // Reset payment status back to pending
  async function handleResetPayment(lpo: SupplierLpoRow) {
    try {
      // Delete payment receipt from S3 if exists
      if (lpo.payment_receipts?.length > 0) {
        for (const url of lpo.payment_receipts) {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", url }),
          });
        }
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetPayment",
          lpo_id: lpo.lpo_id,
        }),
      });

      if (!res.ok) throw new Error("Failed to reset payment");

      toast(
        `Payment for LPO-${String(lpo.lpo_id).padStart(5, "0")} reset to pending`,
        "success",
      );

      setData((prev) => {
        if (!prev || prev.entity !== "supplier") return prev;
        return {
          ...prev,
          lpos: prev.lpos.map((l) =>
            l.lpo_id === lpo.lpo_id
              ? {
                  ...l,
                  payment_status: null,
                  payment_reject_comment: null,
                  payment_receipts: [],
                }
              : l,
          ),
        };
      });
    } catch (error) {
      console.error("Error resetting payment:", error);
      toast("Failed to reset payment", "error");
    }
  }

  // Helper to get payment status display
  const getPaymentStatusDisplay = (lpo: SupplierLpoRow) => {
    const status = lpo.payment_status?.toLowerCase();
    const canReset =
      userInfo?.departmentID === 10 || userInfo?.departmentID === 8; // Only finance can reset

    if (status === "approved") {
      return (
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(34, 150, 100, 1)",
            color: "white",
            padding: "7px 20px",
            borderRadius: "25px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <span>Paid</span>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {lpo.payment_receipts?.length > 0 && (
              <img
                src={downloadIcon}
                alt="download"
                onClick={() =>
                  handleInvoiceDownload(
                    lpo.payment_receipts[0],
                    lpo.lpo_id,
                    "Receipt",
                  )
                }
                style={{
                  cursor: "pointer",
                  width: "12px",
                  filter: "invert(1)",
                }}
              />
            )}
            {canReset && (
              <img
                src={closeIcon}
                alt="reset"
                onClick={() => handleResetPayment(lpo)}
                style={{
                  cursor: "pointer",
                  width: "12px",
                  filter: "invert(1)",
                }}
              />
            )}
          </div>
        </div>
      );
    }

    if (status === "rejected") {
      return (
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(185, 28, 28, 1)",
            color: "white",
            padding: "7px 20px",
            borderRadius: "25px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "14px",
          }}
        >
          <span>Rejected</span>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <RejectCommentPopUp
              text={lpo.payment_reject_comment || "No comment provided"}
            />
            {canReset && (
              <img
                src={closeIcon}
                alt="reset"
                onClick={() => handleResetPayment(lpo)}
                style={{
                  cursor: "pointer",
                  width: "12px",
                  filter: "invert(1)",
                }}
              />
            )}
          </div>
        </div>
      );
    }

    return null; // pending - show action buttons
  };

  const renderSupplierView = (details: SupplierDetails) => {
    return (
      <>
        <div className="dashboard">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <h1>
              <a href="/payment">PAYMENTS</a> &gt;{" "}
              {String(details.name).toUpperCase()}
            </h1>
          </div>

          <br />
          <br />

          {details.lpos.length === 0 && (
            <p style={{ padding: "10px 0" }}>No pending LPO payments.</p>
          )}

          {details.lpos.map((row) => {
            const paymentStatus = row.payment_status?.toLowerCase();
            const isRejected = paymentStatus === "rejected";
            const isApproved = paymentStatus === "approved";
            const isPending = !paymentStatus || paymentStatus === "pending";

            return (
              <div key={row.lpo_id} className="subcategory-section">
                <div className="subcategory-header">
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <h2>{`LPO-${String(row.lpo_id).padStart(5, "0")}`}</h2>
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{ padding: "7px 7px" }}
                      href={`/mr/${row.mr_header_id}/lpo/${row.lpo_id}`}
                    >
                      <img src={externalLinkIcon} alt="external link" />
                    </Button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {/* Download LPO Button */}
                    <Button
                      componentType={"none"}
                      bgColor={"white"}
                      borderColor={"rgba(207, 207, 207, 1)"}
                      textColor={"black"}
                      style={{ borderRadius: "25px", padding: "7px 20px" }}
                    >
                      LPO
                      <DownloadLPOButton lpoID={row.lpo_id} />
                    </Button>

                    {/* Upload Signed LPO Button - Only show if not rejected */}
                    {!isRejected && (
                      <>
                        {row.signed_lpo_files?.length > 0 ? (
                          row.signed_lpo_files.map((url, idx) => (
                            <Button
                              key={idx}
                              componentType="none"
                              bgColor="white"
                              borderColor="rgba(207, 207, 207, 1)"
                              textColor="black"
                              style={{
                                borderRadius: "25px",
                                padding: "7px 20px",
                              }}
                            >
                              Signed LPO
                              <img
                                src={downloadIcon}
                                alt="download"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSignedLpoDownload(url, row.lpo_id);
                                }}
                              />
                              <img
                                src={closeIcon}
                                alt="remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSignedLpo(row, url);
                                }}
                                style={{
                                  cursor: "pointer",
                                }}
                              />
                            </Button>
                          ))
                        ) : (
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "7px 20px",
                              borderRadius: "25px",
                              backgroundColor: "black",
                              color: "white",
                              border: "1px solid black",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Upload Signed LPO
                            <img src={uploadIcon} alt="upload" />
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadSignedLpo(row, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </>
                    )}

                    {/* Upload Invoice Button - Only show if not rejected */}
                    {!isRejected && (
                      <>
                        {row.invoice_files?.length > 0 ? (
                          row.invoice_files.map((url, idx) => (
                            <Button
                              key={idx}
                              componentType="none"
                              bgColor="white"
                              borderColor="rgba(207, 207, 207, 1)"
                              textColor="black"
                              style={{
                                borderRadius: "25px",
                                padding: "7px 20px",
                              }}
                            >
                              Invoice
                              <img
                                src={downloadIcon}
                                alt="download"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInvoiceDownload(url, row.lpo_id);
                                }}
                              />
                              <img
                                src={closeIcon}
                                alt="remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteInvoice(row, url);
                                }}
                                style={{
                                  cursor: "pointer",
                                }}
                              />
                            </Button>
                          ))
                        ) : (
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "7px 20px",
                              borderRadius: "25px",
                              backgroundColor: "black",
                              color: "white",
                              border: "1px solid black",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Upload Invoice
                            <img src={uploadIcon} alt="upload" />
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadInvoice(row, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </>
                    )}

                    {/* Payment Status or Action Buttons */}
                    {isApproved || isRejected ? (
                      getPaymentStatusDisplay(row)
                    ) : isPending ? (
                      <>
                        <Button
                          componentType={"button"}
                          bgColor={"rgba(34, 150, 100, 1)"}
                          borderColor={"rgba(34, 150, 100, 1)"}
                          textColor={"white"}
                          style={{
                            borderRadius: "25px",
                            padding: "7px 20px",
                            textWrap: "nowrap" as any,
                          }}
                          onClick={() => {
                            setSelectedLpo(row);
                            setIsLpoProceedOpen(true);
                          }}
                        >
                          Proceed to Payment
                        </Button>
                        {/* <Button
                          componentType={"button"}
                          bgColor={"rgba(185, 28, 28, 1)"}
                          borderColor={"rgba(185, 28, 28, 1)"}
                          textColor={"white"}
                          style={{
                            borderRadius: "25px",
                            padding: "7px 20px",
                            textWrap: "nowrap" as any,
                          }}
                          onClick={() => {
                            setSelectedLpo(row);
                            setIsLpoRejectOpen(true);
                          }}
                        >
                          Reject Payment
                        </Button> */}
                      </>
                    ) : null}
                  </div>
                </div>

                <br />
                <SupplierLpoItemsTable
                  lpoId={row.lpo_id}
                  mrHeaderId={row.mr_header_id}
                />
                <br />
                <br />
              </div>
            );
          })}
        </div>

        {isLpoProceedOpen && (
          <FormPopUp
            header="PROCEED PAYMENT"
            setIsOpen={setIsLpoProceedOpen}
            handleSubmit={handleConfirmLpoPayment}
            addButtonLabel="CONFIRM"
          >
            <UploadFileBox
              fileState={lpoPaymentFile}
              setFileState={setLpoPaymentFile}
              label=""
              acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp"
              required
              placeholder=""
              buttonLabel="UPLOAD PAYMENT RECEIPT"
            />
          </FormPopUp>
        )}

        {isLpoRejectOpen && (
          <FormPopUp
            header="REJECT PAYMENT"
            setIsOpen={setIsLpoRejectOpen}
            handleSubmit={handleRejectLpoPayment}
            addButtonLabel="CONFIRM"
          >
            <div className="input-row full">
              <InputItem
                label={"COMMENTS"}
                value={lpoRejectComment}
                type={"textarea"}
                placeholder={"ENTER COMMENTS"}
                required
                onChange={(e) => setLpoRejectComment(e.target.value)}
              />
            </div>
          </FormPopUp>
        )}
      </>
    );
  };

  const renderSubcontractorView = (details: SubcontractorDetails) => {
    return (
      <>
        <div className="dashboard">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <h1>
              <a href="/payment">PAYMENTS</a> &gt; {details.name}
            </h1>
          </div>

          <br />
          <br />

          {details.jobOrders.length === 0 && (
            <p style={{ padding: "10px 0" }}>No pending job order payments.</p>
          )}

          {details.jobOrders.map((row) => (
            <div key={row.jo_id} className="subcategory-section">
              <div className="subcategory-header">
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <h2>{`JO-${String(row.jo_id).padStart(5, "0")}`}</h2>
                  <Button
                    componentType={"link"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"rgba(223, 223, 223, 1)"}
                    textColor={"black"}
                    style={{ padding: "7px 7px" }}
                    href={`/mr/${row.jo_id}`}
                  >
                    <img src={externalLinkIcon} alt="external link" />
                  </Button>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  {/* Invoice Download */}
                  {row.invoice_files?.length > 0 && (
                    <Button
                      componentType="button"
                      bgColor="white"
                      borderColor="rgba(207, 207, 207, 1)"
                      textColor="black"
                      style={{ borderRadius: "25px", padding: "7px 20px" }}
                      onClick={() =>
                        handleInvoiceDownload(
                          row.invoice_files[0],
                          row.jo_id,
                          "JO",
                        )
                      }
                    >
                      Invoice
                      <img src={downloadIcon} alt="download" />
                    </Button>
                  )}

                  {/* Record Payment */}
                  <Button
                    componentType={"button"}
                    bgColor={"rgba(34, 150, 100, 1)"}
                    borderColor={"rgba(34, 150, 100, 1)"}
                    textColor={"white"}
                    style={{
                      borderRadius: "25px",
                      padding: "7px 20px",
                      textWrap: "nowrap" as any,
                    }}
                    onClick={() => {
                      setSelectedJo(row);
                      setIsJoPaymentOpen(true);
                    }}
                  >
                    Proceed Payment
                  </Button>
                </div>
              </div>

              <br />
              <JobOrderItemsTable joId={row.jo_id} projectId={row.project_id} />
              <br />
              <br />
            </div>
          ))}
        </div>

        {isJoPaymentOpen && (
          <FormPopUp
            header="RECORD JO PAYMENT"
            setIsOpen={setIsJoPaymentOpen}
            handleSubmit={handleConfirmJoPayment}
            addButtonLabel="CONFIRM"
          >
            <UploadFileBox
              fileState={joPaymentFile}
              setFileState={setJoPaymentFile}
              label=""
              acceptedFileTypes=".pdf,.jpeg,.jpg,.png,.webp"
              required
              placeholder=""
              buttonLabel="UPLOAD PAYMENT RECEIPT"
            />
          </FormPopUp>
        )}
      </>
    );
  };

  return (
    <>
      {data && data.entity === "supplier" && renderSupplierView(data)}
      {data && data.entity === "subcontractor" && renderSubcontractorView(data)}
    </>
  );
}

// Helper function to calculate total
function calculateItemsTotal(
  items: Array<{
    unit_price?: number | string;
    total_price?: number | string;
    quantity?: number;
  }>,
): number {
  let total = 0;
  items.forEach((item) => {
    let itemTotal = 0;
    if (typeof item.total_price === "number") {
      itemTotal = item.total_price;
    } else if (typeof item.total_price === "string" && item.total_price) {
      itemTotal = parseFloat(item.total_price) || 0;
    } else if (
      typeof item.unit_price === "number" &&
      typeof item.quantity === "number"
    ) {
      itemTotal = item.unit_price * item.quantity;
    } else if (
      typeof item.unit_price === "string" &&
      item.unit_price &&
      typeof item.quantity === "number"
    ) {
      itemTotal = (parseFloat(item.unit_price) || 0) * item.quantity;
    }
    total += itemTotal;
  });
  return Number(total.toFixed(2));
}

const formatNumber = (value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return "";
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(3)).toString();
};

type JobOrderItemsTableProps = { joId: number; projectId?: number | null };

function JobOrderItemsTable({ joId, projectId }: JobOrderItemsTableProps) {
  const [items, setItems] = useState<JoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mrHeader, setMrHeader] = useState<any>(null);

  useEffect(() => {
    async function fetchItems() {
      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getJoLinesByMrHeaderID",
            mr_header_id: joId,
          }),
        });

        if (!res.ok) throw new Error("Failed to fetch JO details");
        const json = await res.json();

        if (Array.isArray(json)) {
          setItems(json);
        } else if (json.success && json.data?.jo_lines) {
          setItems(json.data.jo_lines);
        } else {
          setItems([]);
        }

        if (projectId) {
          try {
            const mrRes = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMRByProjectID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_id: projectId }),
              },
            );
            if (mrRes.ok) {
              const mrData = await mrRes.json();
              if (mrData.success && mrData.data?.length > 0) {
                setMrHeader(mrData.data[0]);
              }
            }
          } catch (e) {
            console.error("Error fetching MR header:", e);
          }
        }
      } catch (error) {
        console.error("Error fetching JO items:", error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (joId) fetchItems();
  }, [joId, projectId]);

  if (isLoading) return <p style={{ padding: "10px 0" }}>Loading items...</p>;
  if (!items.length)
    return (
      <p style={{ padding: "10px 0", color: "rgba(150,150,150,1)" }}>
        No items found for this JO.
      </p>
    );

  const totalApprovedPrice = items.reduce(
    (sum, item) => sum + (Number(item.approved_total_price) || 0),
    0,
  );
  const hasAnyApprovedPrice = items.some(
    (item) =>
      item.approved_total_price != null &&
      Number(item.approved_total_price) > 0,
  );

  return (
    <table className="items-table two-toned">
      <thead>
        <tr>
          <th>#</th>
          <th>SCOPE</th>
          <th>DESCRIPTION</th>
          <th>BOQ REF.</th>
          <th>QTY</th>
          <th>ATTACHMENT</th>
          <th>BUDGET EST.</th>
          <th>TOTAL PRICE</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={item.id || index}>
            <td>{index + 1}</td>
            <td>{item.job_scope_name || "-"}</td>
            <td>
              {item.job_description ? (
                <InfoPopUpButton
                  text={item.job_description}
                  header="JOB DESCRIPTION"
                />
              ) : (
                "-"
              )}
            </td>
            <td>
              {item.boq_line_ids && mrHeader ? (
                <BoqReferencePopUp item={item as any} mrHeader={mrHeader} />
              ) : (
                "-"
              )}
            </td>
            <td>
              {formatNumber(item.quantity)} {item.unit}
            </td>
            <td>
              {item.attachment ? (
                <Button
                  componentType={"link"}
                  bgColor={"rgba(239, 239, 239, 1)"}
                  borderColor={"rgba(223, 223, 223, 1)"}
                  textColor={"black"}
                  style={{ padding: "7px 7px" }}
                  href={item.attachment}
                  target="_blank"
                >
                  <img src="/icons/external-link.svg" alt="external link" />
                </Button>
              ) : (
                "-"
              )}
            </td>
            <td>
              {item.budget_estimate ? (
                <>{formatPriceAED(item.budget_estimate)}</>
              ) : (
                "-"
              )}
            </td>
            <td>
              {item.approved_total_price ? (
                <>{formatPriceAED(item.approved_total_price)}</>
              ) : (
                "-"
              )}
            </td>
          </tr>
        ))}
      </tbody>
      {hasAnyApprovedPrice && (
        <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
          <tr>
            <td colSpan={7} style={{ fontWeight: "600", padding: "15px 20px" }}>
              SUBTOTAL
            </td>
            <td style={{ fontWeight: "600", padding: "15px 20px" }}>
              {formatPriceAED(totalApprovedPrice)}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

type SupplierLpoItemsTableProps = { lpoId: number; mrHeaderId?: number | null };

function SupplierLpoItemsTable({
  lpoId,
  mrHeaderId,
}: SupplierLpoItemsTableProps) {
  const [items, setItems] = useState<LpoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mrHeader, setMrHeader] = useState<any>(null);

  useEffect(() => {
    async function fetchItems() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );

        if (!res.ok) throw new Error("Failed to fetch LPO details");
        const json = await res.json();
        if (json.success && json.data?.lpo_mr_lines) {
          setItems(json.data.lpo_mr_lines);
        } else {
          setItems([]);
        }

        if (mrHeaderId) {
          try {
            const mrRes = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMRByID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: mrHeaderId }),
              },
            );
            if (mrRes.ok) {
              const mrData = await mrRes.json();
              if (mrData.success && mrData.data) {
                setMrHeader(mrData.data);
              }
            }
          } catch (e) {
            console.error("Error fetching MR header:", e);
          }
        }
      } catch (error) {
        console.error("Error fetching LPO items:", error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchItems();
  }, [lpoId, mrHeaderId]);

  if (isLoading) return <p style={{ padding: "10px 0" }}>Loading items...</p>;
  if (!items.length)
    return (
      <p style={{ padding: "10px 0", color: "rgba(150,150,150,1)" }}>
        No items found for this LPO.
      </p>
    );

  const total = calculateItemsTotal(items);

  return (
    <table className="items-table two-toned">
      <thead>
        <tr>
          <th>#</th>
          <th>DESCRIPTION</th>
          <th>BOQ REF.</th>
          <th>QTY</th>
          <th>BRAND & SPECS</th>
          <th>ATTACHMENT</th>
          <th>UNIT PRICE</th>
          <th>TOTAL PRICE</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={item.id || index}>
            <td>{index + 1}</td>
            <td>{item.material_description || "-"}</td>
            <td>
              {item.boq_line_ids && mrHeader ? (
                <BoqReferencePopUp item={item as any} mrHeader={mrHeader} />
              ) : (
                "-"
              )}
            </td>
            <td>
              {formatNumber(item.quantity)} {item.unit || "-"}
            </td>
            <td>
              {item.brand || item.specification ? (
                <InfoPopUpButton
                  text={
                    <>
                      <small>BRAND</small>
                      <h2>{item.brand || "-"}</h2>
                      <br />
                      <small>SPECIFICATION</small>
                      <h2>{item.specification || "-"}</h2>
                    </>
                  }
                  header="BRAND & SPECIFICATION"
                />
              ) : (
                "-"
              )}
            </td>
            <td>
              {item.attachment ? (
                <Button
                  componentType={"link"}
                  bgColor={"rgba(239, 239, 239, 1)"}
                  borderColor={"rgba(223, 223, 223, 1)"}
                  textColor={"black"}
                  style={{ padding: "7px 7px" }}
                  href={item.attachment}
                  target="_blank"
                >
                  <img src="/icons/external-link.svg" alt="external link" />
                </Button>
              ) : (
                "-"
              )}
            </td>
            <td>
              {typeof item.unit_price === "number"
                ? formatPriceAED(item.unit_price)
                : typeof item.unit_price === "string" && item.unit_price
                  ? formatPriceAED(item.unit_price)
                  : "-"}
            </td>
            <td>
              {typeof item.total_price === "number"
                ? formatPriceAED(item.total_price)
                : typeof item.total_price === "string" && item.total_price
                  ? formatPriceAED(item.total_price)
                  : "-"}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
        <tr>
          <td colSpan={7} style={{ fontWeight: "600", padding: "15px 20px" }}>
            SUBTOTAL
          </td>
          <td style={{ fontWeight: "600", padding: "15px 20px" }}>
            {formatPriceAED(total)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
