"use client";

import { useState, useEffect } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import UploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import BoqReferencePopUp from "@/app/(protected)/mr/[id]/components/BoqReferencePopUp";

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

// Type for items to support boq_line_ids and other fields
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
}: PaymentDetailsClientProps) {
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

  const formatCurrency = (value: number) =>
    `AED ${Number(value || 0).toFixed(2)}`;

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

    if (!response.ok) {
      throw new Error("Upload failed");
    }

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

      if (!updateRes.ok) {
        throw new Error("Failed to update LPO payment");
      }

      toast(
        `Payment for LPO-${String(selectedLpo.lpo_id).padStart(5, "0")} approved`,
        "success",
      );

      setData((prev) => {
        if (!prev || prev.entity !== "supplier") return prev;
        return {
          ...prev,
          lpos: prev.lpos.filter((l) => l.lpo_id !== selectedLpo.lpo_id),
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

      if (!res.ok) {
        throw new Error("Failed to reject payment");
      }

      toast(
        `Payment for LPO-${String(selectedLpo.lpo_id).padStart(5, "0")} rejected`,
        "success",
      );

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

      if (!updateRes.ok) {
        throw new Error("Failed to proceed JO payment");
      }

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
              <a href="/payment">PAYMENTS</a> &gt; {details.name}
            </h1>
          </div>

          <br />
          <br />

          {details.lpos.length === 0 && (
            <p style={{ padding: "10px 0" }}>No pending LPO payments.</p>
          )}

          {details.lpos.map((row) => (
            <div key={row.lpo_id} className="subcategory-section">
              <div className="subcategory-header">
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
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

                <div style={{ display: "flex", gap: "10px" }}>
                  {/* Signed LPO Download */}
                  {row.signed_lpo_files?.length > 0 && (
                    <Button
                      componentType="button"
                      bgColor="white"
                      borderColor="rgba(207, 207, 207, 1)"
                      textColor="black"
                      style={{ borderRadius: "25px", padding: "7px 20px" }}
                      onClick={() =>
                        handleSignedLpoDownload(
                          row.signed_lpo_files[0],
                          row.lpo_id,
                        )
                      }
                    >
                      Signed LPO
                      <img src={downloadIcon} alt="download" />
                    </Button>
                  )}

                  {/* Invoice Download */}
                  {row.invoice_files?.length > 0 && (
                    <Button
                      componentType="button"
                      bgColor="white"
                      borderColor="rgba(207, 207, 207, 1)"
                      textColor="black"
                      style={{ borderRadius: "25px", padding: "7px 20px" }}
                      onClick={() =>
                        handleInvoiceDownload(row.invoice_files[0], row.lpo_id)
                      }
                    >
                      Invoice
                      <img src={downloadIcon} alt="download" />
                    </Button>
                  )}

                  {/* Proceed / Reject */}
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
                  <Button
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
                  </Button>
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
          ))}
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

// Helper function to calculate total (similar to MrLinesView)
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

// Format number helper
const formatNumber = (value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return "";
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(3)).toString();
};

// Reusable JO items table - matching JoLinesView structure with approved_total_price subtotal
type JobOrderItemsTableProps = {
  joId: number;
  projectId?: number | null;
};

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

        if (!res.ok) {
          throw new Error("Failed to fetch JO details");
        }

        const json = await res.json();

        if (Array.isArray(json)) {
          setItems(json);
        } else if (json.success && json.data && json.data.jo_lines) {
          setItems(json.data.jo_lines);
        } else {
          setItems([]);
        }

        // Fetch MR Header for BOQ reference popup
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
              if (mrData.success && mrData.data && mrData.data.length > 0) {
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

    if (joId) {
      fetchItems();
    }
  }, [joId, projectId]);

  if (isLoading) {
    return <p style={{ padding: "10px 0" }}>Loading items...</p>;
  }

  if (!items.length) {
    return (
      <p style={{ padding: "10px 0", color: "rgba(150,150,150,1)" }}>
        No items found for this JO.
      </p>
    );
  }

  // Calculate total using approved_total_price (matching JoLinesView pattern)
  const totalApprovedPrice = items.reduce(
    (sum, item) => sum + (Number(item.approved_total_price) || 0),
    0,
  );

  // Check if any item has approved price to show/hide total row
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
                <>AED {Number(item.budget_estimate).toFixed(2)}</>
              ) : (
                "-"
              )}
            </td>
            <td>
              {item.approved_total_price ? (
                <>AED {Number(item.approved_total_price).toFixed(2)}</>
              ) : (
                "-"
              )}
            </td>
          </tr>
        ))}
      </tbody>

      {/* Subtotal Footer - Using approved_total_price like JoLinesView */}
      {hasAnyApprovedPrice && (
        <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
          <tr>
            <td colSpan={7} style={{ fontWeight: "600", padding: "15px 20px" }}>
              SUBTOTAL
            </td>
            <td style={{ fontWeight: "600", padding: "15px 20px" }}>
              AED {totalApprovedPrice.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// Reusable LPO items table with all columns matching JoLinesView style
type SupplierLpoItemsTableProps = {
  lpoId: number;
  mrHeaderId?: number | null;
};

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

        if (!res.ok) {
          throw new Error("Failed to fetch LPO details");
        }

        const json = await res.json();
        if (json.success && json.data && json.data.lpo_mr_lines) {
          setItems(json.data.lpo_mr_lines);
        } else {
          setItems([]);
        }

        // Fetch MR Header for BOQ reference popup
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

  if (isLoading) {
    return <p style={{ padding: "10px 0" }}>Loading items...</p>;
  }

  if (!items.length) {
    return (
      <p style={{ padding: "10px 0", color: "rgba(150,150,150,1)" }}>
        No items found for this LPO.
      </p>
    );
  }

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
                ? `AED ${item.unit_price.toFixed(2)}`
                : typeof item.unit_price === "string" && item.unit_price
                  ? `AED ${parseFloat(item.unit_price).toFixed(2)}`
                  : "-"}
            </td>
            <td>
              {typeof item.total_price === "number"
                ? `AED ${item.total_price.toFixed(2)}`
                : typeof item.total_price === "string" && item.total_price
                  ? `AED ${parseFloat(item.total_price).toFixed(2)}`
                  : "-"}
            </td>
          </tr>
        ))}
      </tbody>

      {/* Subtotal Footer - Matching JoLinesView/MrLinesView style */}
      <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
        <tr>
          <td colSpan={7} style={{ fontWeight: "600", padding: "15px 20px" }}>
            SUBTOTAL
          </td>
          <td style={{ fontWeight: "600", padding: "15px 20px" }}>
            AED {total.toFixed(2)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
