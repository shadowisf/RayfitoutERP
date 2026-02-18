"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";

type JoDetailsPopUpProps = {
  joId: number; // This is the mr_header_id
  mrNumber: string;
  joPaymentReceipt: string | null;
  joInvoiceFile: string | null;
  onClose: () => void;
  onPaymentComplete: () => void;
};

export default function JoDetailsPopUp({
  joId,
  mrNumber,
  joPaymentReceipt,
  joInvoiceFile,
  onClose,
  onPaymentComplete,
}: JoDetailsPopUpProps) {
  const { userInfo } = useAuth();

  const [joLines, setJoLines] = useState<any[]>([]);
  const [mrHeader, setMrHeader] = useState<any>(null);

  // File states
  const [invoiceFileLocal, setInvoiceFileLocal] = useState<string | null>(null);
  const [paymentReceiptLocal, setPaymentReceiptLocal] = useState<string | null>(
    null,
  );
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);

  const downloadIcon = "/icons/download.svg";
  const uploadIcon = "/icons/upload.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  useEffect(() => {
    // Parse initial file URLs
    setInvoiceFileLocal(parseFileUrl(joInvoiceFile));
    setPaymentReceiptLocal(parseFileUrl(joPaymentReceipt));
  }, [joInvoiceFile, joPaymentReceipt]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch JO lines and MR header in parallel
        const [linesRes, headerRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "getJoLinesByMrHeaderID",
              mr_header_id: joId,
            }),
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: joId }),
            },
          ),
        ]);

        const linesData = await linesRes.json();
        setJoLines(Array.isArray(linesData) ? linesData : []);

        const headerData = await headerRes.json();
        if (!headerData.error) {
          setMrHeader(headerData);
        }
      } catch (error) {
        console.error("Error fetching JO data:", error);
      }
    }

    fetchData();
  }, [joId]);

  const formatCurrency = (value: number | string) =>
    `AED ${Number(value || 0).toFixed(2)}`;

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB");
  };

  const formatQuantity = (qty: number) => {
    if (qty == null) return "-";
    const n = Number(qty);
    return n % 1 === 0 ? n.toFixed(0) : n.toString();
  };

  function parseFileUrl(raw: any): string | null {
    if (!raw) return null;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed[0] || null;
      return parsed;
    } catch {
      return typeof raw === "string" ? raw : null;
    }
  }

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

  async function handleDownloadFile(url: string, filename: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  }

  // ─── Upload handlers ───
  async function handleUploadInvoice(file: File) {
    setIsUploadingInvoice(true);
    try {
      const uploadedUrl = await uploadFileToS3(file, "jo-invoices");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateJoInvoice",
          id: joId,
          jo_invoice_file: JSON.stringify([uploadedUrl]),
        }),
      });
      if (!res.ok) throw new Error("Failed to update invoice");
      toast("Invoice uploaded", "success");
      setInvoiceFileLocal(uploadedUrl);
    } catch (error) {
      console.error(error);
      toast("Failed to upload invoice", "error");
    } finally {
      setIsUploadingInvoice(false);
    }
  }

  async function handleUploadPaymentReceipt(file: File) {
    setIsUploadingPayment(true);
    try {
      const uploadedUrl = await uploadFileToS3(file, "jo-payments");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateJoPaymentReceipt",
          id: joId,
          jo_payment_receipt: JSON.stringify([uploadedUrl]),
        }),
      });
      if (!res.ok) throw new Error("Failed to approve payment");
      toast(
        `Payment receipt for ${mrNumber} uploaded`,
        "success",
      );
      setPaymentReceiptLocal(uploadedUrl);
      onPaymentComplete();
    } catch (error) {
      console.error(error);
      toast("Failed to upload payment receipt", "error");
    } finally {
      setIsUploadingPayment(false);
    }
  }

  return (
    <FormPopUp
      header={
        <>
          <a href={`/mr/${joId}`}>{mrNumber}</a>
        </>
      }
      setIsOpen={onClose}
    >
      {/* ─── Info Row ─── */}
      {mrHeader && (
        <>
          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(150px, max-content))",
              columnGap: "40px",
              rowGap: "15px",
              marginBottom: "10px",
            }}
          >
            <div>
              <small>DUE DATE</small>
              <h2>{formatDate(mrHeader.required_date)}</h2>
            </div>
            <div>
              <small>PROJECT</small>
              <h2>{mrHeader.project_name || "-"}</h2>
            </div>
            <div>
              <small>PURPOSE</small>
              <h2>{mrHeader.purpose_name || "-"}</h2>
            </div>
            <div>
              <small>REQUESTED BY</small>
              <h2>{mrHeader.requested_by || "-"}</h2>
            </div>
            <div>
              <small>DEPARTMENT</small>
              <h2>{mrHeader.department_name || "-"}</h2>
            </div>
            <div>
              <small>REQUIRED DATE</small>
              <h2>{formatDate(mrHeader.required_date)}</h2>
            </div>
          </div>

          <br />
        </>
      )}

      {/* ─── File Actions Row ─── */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        {/* Invoice: download or upload */}
        {invoiceFileLocal ? (
          <Button
            componentType={"button"}
            bgColor={"transparent"}
            borderColor={"rgb(207, 207, 207)"}
            textColor={"black"}
            style={{ padding: "7px 20px", borderRadius: "50px" }}
            onClick={() =>
              handleDownloadFile(
                invoiceFileLocal,
                `Invoice-${mrNumber}.pdf`,
              )
            }
          >
            INVOICE
            <img src={downloadIcon} alt="download" style={{ width: "14px" }} />
          </Button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <label
              style={{
                padding: "7px 20px",
                borderRadius: "50px",
                border: "1px solid rgb(207, 207, 207)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
              }}
            >
              <img src={uploadIcon} alt="upload" style={{ width: "14px" }} />
              UPLOAD INVOICE
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadInvoice(file);
                }}
              />
            </label>
            {isUploadingInvoice && (
              <span style={{ fontSize: "12px" }}>Uploading...</span>
            )}
          </div>
        )}

        {/* Payment Receipt: download or upload */}
        {paymentReceiptLocal ? (
          <Button
            componentType={"button"}
            bgColor={"rgba(34, 150, 100, 1)"}
            borderColor={"rgba(34, 150, 100, 1)"}
            textColor={"white"}
            style={{ padding: "7px 20px", borderRadius: "50px" }}
            onClick={() =>
              handleDownloadFile(
                paymentReceiptLocal,
                `Receipt-${mrNumber}.pdf`,
              )
            }
          >
            PAYMENT RECEIPT
            <img
              src={downloadIcon}
              alt="download"
              style={{ width: "14px", filter: "invert(1)" }}
            />
          </Button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <label
              style={{
                padding: "7px 20px",
                borderRadius: "50px",
                border: "1px solid black",
                backgroundColor: "black",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
              }}
            >
              <img
                src={uploadIcon}
                alt="upload"
                style={{ width: "14px", filter: "invert(1)" }}
              />
              PROCEED PAYMENT
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadPaymentReceipt(file);
                }}
              />
            </label>
            {isUploadingPayment && (
              <span style={{ fontSize: "12px", color: "white" }}>
                Uploading...
              </span>
            )}
          </div>
        )}
      </div>

      <br />

      {/* ─── JO Lines Table ─── */}
      <table className="items-table two-toned">
        <thead>
          <tr>
            <th>#</th>
            <th>JOB SCOPE</th>
            <th>DESCRIPTION</th>
            <th>BOQ REF</th>
            <th>QTY</th>
            <th>BUDGET EST.</th>
            <th>TOTAL PRICE</th>
            <th>ATTACHMENT</th>
          </tr>
        </thead>
        <tbody>
          {joLines.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>
                No items found.
              </td>
            </tr>
          ) : (
            joLines.map((line: any, index: number) => {
              // Parse attachment
              let attachmentUrl: string | null = null;
              if (line.attachment) {
                try {
                  const parsed =
                    typeof line.attachment === "string"
                      ? JSON.parse(line.attachment)
                      : line.attachment;
                  attachmentUrl = Array.isArray(parsed)
                    ? parsed[0]
                    : parsed;
                } catch {
                  attachmentUrl = line.attachment;
                }
              }

              return (
                <tr key={line.id}>
                  <td>{index + 1}</td>
                  <td>{line.job_scope_name || "-"}</td>
                  <td>{line.job_description || "-"}</td>
                  <td>{line.boq_item_numbers || "-"}</td>
                  <td>
                    {formatQuantity(line.quantity)} {line.unit || ""}
                  </td>
                  <td>{formatCurrency(line.budget_estimate)}</td>
                  <td>
                    {line.approved_total_price
                      ? formatCurrency(line.approved_total_price)
                      : "-"}
                  </td>
                  <td>
                    {attachmentUrl ? (
                      <Button
                        componentType="link"
                        bgColor="rgba(239, 239, 239, 1)"
                        borderColor="rgba(223, 223, 223, 1)"
                        textColor="black"
                        style={{ padding: "5px 5px" }}
                        href={attachmentUrl}
                        target="_blank"
                      >
                        <img
                          src={externalLinkIcon}
                          alt="view"
                          style={{ width: "14px" }}
                        />
                      </Button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {joLines.length > 0 && (
          <tfoot>
            <tr>
              <td
                colSpan={5}
                style={{ textAlign: "right", fontWeight: "600" }}
              >
                TOTAL
              </td>
              <td style={{ fontWeight: "600" }}>
                {formatCurrency(
                  joLines.reduce(
                    (sum: number, l: any) =>
                      sum + Number(l.budget_estimate || 0),
                    0,
                  ),
                )}
              </td>
              <td style={{ fontWeight: "600" }}>
                {formatCurrency(
                  joLines.reduce(
                    (sum: number, l: any) =>
                      sum + Number(l.approved_total_price || 0),
                    0,
                  ),
                )}
              </td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </FormPopUp>
  );
}
