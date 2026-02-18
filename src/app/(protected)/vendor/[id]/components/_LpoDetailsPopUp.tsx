"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import DownloadLPOButton from "@/app/(protected)/mr/[id]/components/procurement/_DownloadLPOButton";
import { toast } from "@/app/components/Toast";
import BoqReferencePopUp from "@/app/(protected)/mr/[id]/components/BoqReferencePopUp";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";

type LpoDetailsPopUpProps = {
  lpoId: number;
  mrId: number;
  mrHeader: MrHeader;
  paymentStatus: string | null;
  onClose: () => void;
  onPaymentComplete: () => void;
};

export default function LpoDetailsPopUp({
  lpoId,
  mrId,
  mrHeader,
  paymentStatus,
  onClose,
  onPaymentComplete,
}: LpoDetailsPopUpProps) {
  const { userInfo } = useAuth();

  const [lpoData, setLpoData] = useState<any>(null);
  const [flatLines, setFlatLines] = useState<any[]>([]);

  // File upload states
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isUploadingSignedLpo, setIsUploadingSignedLpo] = useState(false);
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);

  const downloadIcon = "/icons/download.svg";
  const uploadIcon = "/icons/upload.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  useEffect(() => {
    async function fetchLpoDetails() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOWithLines`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );

        const data = await res.json();
        if (data.success) {
          setLpoData(data.data.lpo);
          setFlatLines(data.data.flatLines || []);
        }
      } catch (error) {
        console.error("Error fetching LPO details:", error);
      }
    }

    fetchLpoDetails();
  }, [lpoId]);

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

  // ─── Helpers ───
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
    if (!file || !lpoData) return;
    setIsUploadingInvoice(true);
    try {
      const uploadedUrl = await uploadFileToS3(file, "lpo-invoices");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLPOInvoice",
          lpo_id: lpoId,
          mr_header_id: lpoData.mr_header_id,
          supplier_id: lpoData.supplier_id,
          invoice_file: JSON.stringify([uploadedUrl]),
        }),
      });
      if (!res.ok) throw new Error("Failed to update invoice");
      toast("Invoice uploaded", "success");
      setLpoData((prev: any) => ({
        ...prev,
        invoice_file: JSON.stringify([uploadedUrl]),
      }));
    } catch (error) {
      console.error(error);
      toast("Failed to upload invoice", "error");
    } finally {
      setIsUploadingInvoice(false);
    }
  }

  async function handleUploadSignedLpo(file: File) {
    if (!file || !lpoData) return;
    setIsUploadingSignedLpo(true);
    try {
      const uploadedUrl = await uploadFileToS3(file, "lpo-signed");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLPOSignedLpo",
          lpo_id: lpoId,
          mr_header_id: lpoData.mr_header_id,
          supplier_id: lpoData.supplier_id,
          signed_lpo_file: JSON.stringify([uploadedUrl]),
        }),
      });
      if (!res.ok) throw new Error("Failed to update signed LPO");
      toast("Signed LPO uploaded", "success");
      setLpoData((prev: any) => ({
        ...prev,
        signed_file: JSON.stringify([uploadedUrl]),
      }));
    } catch (error) {
      console.error(error);
      toast("Failed to upload signed LPO", "error");
    } finally {
      setIsUploadingSignedLpo(false);
    }
  }

  async function handleUploadPaymentReceipt(file: File) {
    if (!file || !lpoData) return;
    setIsUploadingPayment(true);
    try {
      const uploadedUrl = await uploadFileToS3(file, "lpo-payments");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approvePayment",
          lpo_id: lpoId,
          payment_file: JSON.stringify(uploadedUrl),
        }),
      });
      if (!res.ok) throw new Error("Failed to approve payment");
      toast(
        `Payment for LPO-${String(lpoId).padStart(5, "0")} approved`,
        "success",
      );
      setLpoData((prev: any) => ({
        ...prev,
        payment_status: "Approved",
        payment_file: JSON.stringify(uploadedUrl),
      }));
      onPaymentComplete();
    } catch (error) {
      console.error(error);
      toast("Failed to approve payment", "error");
    } finally {
      setIsUploadingPayment(false);
    }
  }

  // ─── Computed ───
  const invoiceUrl = lpoData ? parseFileUrl(lpoData.invoice_file) : null;
  const signedUrl = lpoData ? parseFileUrl(lpoData.signed_file) : null;
  const paymentUrl = lpoData ? parseFileUrl(lpoData.payment_file) : null;
  const isPaid =
    lpoData?.payment_status?.toLowerCase() === "approved" || !!paymentUrl;

  return (
    <FormPopUp
      header={
        <>
          MR-{String(mrId).padStart(5, "0")} &gt;{" "}
          <a href={`/mr/${mrId}/lpo/${lpoId}`}>
            LPO-{String(lpoId).padStart(5, "0")}
          </a>
        </>
      }
      setIsOpen={onClose}
    >
      {/* ─── Info Row ─── */}
      {lpoData && (
        <>
          <div
            style={{
              display: "flex",
              gap: "20px",
            }}
          >
            <div>
              <small>PROJECT</small>
              <h2>{lpoData.project_name || "-"}</h2>
            </div>
            <div>
              <small>PURPOSE</small>
              <h2>{lpoData.purpose_name || "-"}</h2>
            </div>
            <div>
              <small>REQUESTED BY</small>
              <h2>{lpoData.requested_by || "-"}</h2>
            </div>
            <div>
              <small>DEPARTMENT</small>
              <h2>{lpoData.department_name || "-"}</h2>
            </div>
            <div>
              <small>REQUIRED DATE</small>
              <h2>{formatDate(lpoData.required_date)}</h2>
            </div>
            <div>
              <small>DELIVERY DATE</small>
              <h2>{formatDate(lpoData.delivery_date)}</h2>
            </div>
          </div>

          <br />
          <br />

          {/* ─── File Actions Row ─── */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div></div>
            <div
              style={{
                display: "flex",
                gap: "5px",
                alignItems: "center",
              }}
            >
              {/* LPO Download */}
              <Button
                componentType={"none"}
                bgColor={"transparent"}
                borderColor={"rgb(207, 207, 207)"}
                textColor={"black"}
                style={{ padding: "7px 20px", borderRadius: "50px" }}
              >
                LPO
                <DownloadLPOButton lpoID={lpoId} />
              </Button>

              {/* Signed LPO: download or upload */}
              {signedUrl ? (
                <Button
                  componentType={"none"}
                  bgColor={"transparent"}
                  borderColor={"rgb(207, 207, 207)"}
                  textColor={"black"}
                  style={{ padding: "7px 20px", borderRadius: "50px" }}
                >
                  Signed LPO
                  <img
                    src={downloadIcon}
                    alt="download"
                    onClick={() =>
                      handleDownloadFile(
                        signedUrl,
                        `Signed-LPO-${String(lpoId).padStart(5, "0")}.pdf`,
                      )
                    }
                  />
                </Button>
              ) : (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <label
                    style={{
                      padding: "7px 20px",
                      borderRadius: "50px",
                      backgroundColor: "black",
                      color: "white",
                      border: "1px solid black",
                      cursor: isUploadingSignedLpo ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      opacity: isUploadingSignedLpo ? 0.6 : 1,
                    }}
                  >
                    Upload Signed LPO
                    <img src={uploadIcon} alt="upload" />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: "none" }}
                      disabled={isUploadingSignedLpo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadSignedLpo(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Invoice: download or upload */}
              {invoiceUrl ? (
                <Button
                  componentType={"none"}
                  bgColor={"transparent"}
                  borderColor={"rgb(207, 207, 207)"}
                  textColor={"black"}
                  style={{ padding: "7px 20px", borderRadius: "50px" }}
                >
                  Invoice
                  <img
                    src={downloadIcon}
                    alt="download"
                    onClick={() =>
                      handleDownloadFile(
                        invoiceUrl,
                        `Invoice-LPO-${String(lpoId).padStart(5, "0")}.pdf`,
                      )
                    }
                  />
                </Button>
              ) : (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <label
                    style={{
                      padding: "7px 20px",
                      borderRadius: "50px",
                      border: "1px solid black",
                      backgroundColor: "black",
                      color: "white",
                      cursor: isUploadingInvoice ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      opacity: isUploadingInvoice ? 0.6 : 1,
                    }}
                  >
                    Upload Invoice
                    <img src={uploadIcon} alt="upload" />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: "none" }}
                      disabled={isUploadingInvoice}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadInvoice(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Payment Receipt: download or upload (proceed payment) */}
              {isPaid && paymentUrl ? (
                <Button
                  componentType={"none"}
                  bgColor={"transparent"}
                  borderColor={"rgb(207, 207, 207)"}
                  textColor={"black"}
                  style={{ padding: "7px 20px", borderRadius: "50px" }}
                >
                  Payment Receipt
                  <img
                    src={downloadIcon}
                    alt="download"
                    onClick={() =>
                      handleDownloadFile(
                        paymentUrl,
                        `Receipt-LPO-${String(lpoId).padStart(5, "0")}.pdf`,
                      )
                    }
                  />
                </Button>
              ) : (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <label
                    style={{
                      padding: "7px 20px",
                      borderRadius: "50px",
                      border: "1px solid rgba(34, 150, 100, 1)",
                      backgroundColor: "rgba(34, 150, 100, 1)",
                      color: "white",
                      cursor: isUploadingPayment ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      opacity: isUploadingPayment ? 0.6 : 1,
                    }}
                  >
                    Proceed to Payment
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: "none" }}
                      disabled={isUploadingPayment}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadPaymentReceipt(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <br />

      {/* ─── LPO Lines Table ─── */}
      <table className="items-table two-toned">
        <thead>
          <tr>
            <th>#</th>
            <th>CATEGORY</th>
            <th>SUBCATEGORY</th>
            <th>ITEM</th>
            <th>QTY</th>
            <th>BOQ REF</th>
            <th>BRAND & SPECS</th>
            <th>ATTACHMENT</th>
            <th>UNIT PRICE</th>
            <th>TOTAL PRICE</th>
          </tr>
        </thead>
        <tbody>
          {flatLines.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: "center", padding: "20px" }}>
                No items found.
              </td>
            </tr>
          ) : (
            flatLines.map((line: any, index: number) => {
              // Parse attachment
              let attachmentUrl: string | null = null;
              if (line.attachment) {
                try {
                  const parsed =
                    typeof line.attachment === "string"
                      ? JSON.parse(line.attachment)
                      : line.attachment;
                  attachmentUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                } catch {
                  attachmentUrl = line.attachment;
                }
              }

              const brandSpecs = [line.brand, line.specification]
                .filter(Boolean)
                .join(" / ");

              return (
                <tr key={line.lpo_mr_line_id || line.id || index}>
                  <td>{index + 1}</td>
                  <td>{line.material_category || "-"}</td>
                  <td>{line.material_subcategory || "-"}</td>
                  <td>{line.material_description || "-"}</td>
                  <td>
                    {formatQuantity(line.quantity)} {line.unit || ""}
                  </td>
                  <td>
                    {line.boq_line_ids ? (
                      <BoqReferencePopUp item={line} mrHeader={mrHeader} />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {line.brand || line.specification ? (
                      <InfoPopUpButton
                        text={
                          <>
                            <small>BRAND</small>
                            <h2>{line.brand || "-"}</h2>

                            <br />

                            <small>SPECIFICATION</small>
                            <h2>{line.specification || "-"}</h2>
                          </>
                        }
                        header="BRAND & SPECIFICATION"
                      />
                    ) : (
                      "-"
                    )}
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

                  <td>{formatCurrency(line.lpo_unit_price)}</td>
                  <td>{formatCurrency(line.lpo_total_price)}</td>
                </tr>
              );
            })
          )}
        </tbody>
        {flatLines.length > 0 && lpoData && (
          <tfoot>
            <tr>
              <td colSpan={9} style={{ textAlign: "right", fontWeight: "600" }}>
                SUBTOTAL
              </td>
              <td style={{ fontWeight: "600" }}>
                {formatCurrency(
                  flatLines.reduce(
                    (sum: number, l: any) =>
                      sum + Number(l.lpo_total_price || 0),
                    0,
                  ),
                )}
              </td>
            </tr>
            <tr>
              <td colSpan={9} style={{ textAlign: "right", fontWeight: "600" }}>
                TOTAL WITH VAT
              </td>
              <td style={{ fontWeight: "600" }}>
                {formatCurrency(lpoData.total)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </FormPopUp>
  );
}
