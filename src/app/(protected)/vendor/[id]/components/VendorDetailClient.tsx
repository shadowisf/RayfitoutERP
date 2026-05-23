"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import LpoDetailsPopUp from "./_LpoDetailsPopUp";
import Button from "@/app/components/Button";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import EditSupplierButton from "../../components/_EditSupplierButton";
import DeleteSupplierButton from "../../components/_DeleteSupplierButton";
import { useRefresh } from "@/app/context/RefreshContext";

type LpoRow = {
  lpo_id: number;
  mr_header_id: number;
  invoice_amount: number;
  payment_status: string | null;
  payment_file: string | null;
  invoice_file: string | null;
  signed_file: string | null;
  created_at: string;
  delivery_date: string;
  mr_number: string;
  total_paid: number;
  paid_at: string | null;
};

type VendorDetailClientProps = {
  supplier: any;
  lpos: LpoRow[];
};

export default function VendorDetailClient({
  supplier,
  lpos: initialLpos,
}: VendorDetailClientProps) {
  const { userInfo } = useAuth();
  const router = useRouter();
  const { refresh } = useRefresh();


  const [lpos, setLpos] = useState<LpoRow[]>(initialLpos);
  const [mrHeader, setMrHeader] = useState<MrHeader | null>(null);
  const [selectedLpo, setSelectedLpo] = useState<LpoRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const externalLinkIcon = "/icons/external-link.svg";
  const supplierContactPersonIcon = "/icons/supplier-contact-person.svg";
  const supplierNotesIcon = "/icons/supplier-notes.svg";
  const supplierTRNIcon = "/icons/supplier-trn.svg";

  const formatCurrency = (value: number) =>
    `AED ${Number(value || 0).toFixed(2)}`;

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB");
  };

  const getPaymentStatusStyle = (status: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") {
      return {
        backgroundColor: "rgba(34, 150, 100, 1)",
        color: "white",
        label: "PAID",
      };
    }
    if (s === "rejected") {
      return {
        backgroundColor: "rgba(185, 28, 28, 1)",
        color: "white",
        label: "REJECTED",
      };
    }
    return {
      backgroundColor: "rgba(255, 193, 7, 1)",
      color: "rgba(100, 65, 0, 1)",
      label: "UNPAID",
    };
  };

  const getSupplierTypeStyle = (type: string) => {
    const normalizedType = (type || "").toLowerCase();
    if (normalizedType === "cash") {
      return {
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    } else if (normalizedType === "credit") {
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    } else if (normalizedType === "marketplace/online") {
      return {
        backgroundColor: "rgba(189, 232, 255, 1)",
        color: "rgba(15, 86, 125, 1)",
      };
    }
    return { backgroundColor: "rgba(231, 231, 231, 1)", color: "black" };
  };

  // Refresh LPO list after payment
  async function refreshLpos() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getLPOsBySupplierID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplier_id: supplier.id }),
        },
      );
      const data = await res.json();
      setLpos(data);
    } catch (error) {
      console.error("Error refreshing LPOs:", error);
    }
  }

  const typeStyle = getSupplierTypeStyle(supplier.type);

  async function getMrHeader(mrHeaderId: number) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mrHeaderId }),
        },
      );
      const data = await res.json();
      setMrHeader(data);
    } catch (error) {
      console.error("Error getting MR Header:", error);
    }
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <h1>
          <a
            href="/vendor"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            VENDORS & SUBCONTRACTORS
          </a>{" "}
          &gt; {String(supplier.name).toUpperCase()}
        </h1>

        {(userInfo?.departmentID === 8 || userInfo?.departmentID === 9) && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <EditSupplierButton
              supplier={supplier}
              onSuccess={() => refresh()}
              iconOnly
            />
            <DeleteSupplierButton
              supplier={supplier}
              onSuccess={() => router.push("/vendor")}
              iconOnly
            />
          </div>
        )}
      </div>

      <br />
      <br />

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "25px" }}
      >
        <div
          className="widget-container"
          style={{
            display: "inline-grid",
            gridTemplateColumns: "repeat(3, max-content)",
            columnGap: "50px",
            rowGap: "30px",
          }}
        >
          <div>
            <small>NAME</small>
            <h2>{supplier.name}</h2>
          </div>

          <div>
            <small>VENDOR NUMBER</small>
            <h2>VEN-{supplier?.id.toString().padStart(5, "0")}</h2>
          </div>

          <div>
            <small>TYPE</small>
            <br />
            <div
              className="approval-pill normal-text"
              style={{
                backgroundColor: typeStyle.backgroundColor,
                color: typeStyle.color,
                textTransform: "uppercase",
              }}
            >
              {supplier.type}
            </div>
          </div>
          <div>
            <small>MATERIAL CATEGORIES</small>
            <h2>{supplier.material_categories || "-"}</h2>
          </div>
          <div>
            <small>MATERIAL SUBCATEGORIES</small>
            <h2>{supplier.material_subcategories || "-"}</h2>
          </div>
          <div></div>
          <div>
            <small>CURRENCY</small>
            <h2>{supplier.currency}</h2>
          </div>
          <div>
            <small>STATUS</small>
            <h2>{supplier.status}</h2>
          </div>
          <div></div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr", // 2 equal columns
            gap: "25px",
          }}
        >
          {/* CONTACT PERSON - spans full width */}
          <div
            className="widget-container"
            style={{
              gridColumn: "1 / -1", // Spans from column 1 to end
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <img src={supplierContactPersonIcon} alt="contact person" />
              <InfoPopUpButton
                text={
                  <>
                    <div>
                      <small>CONTACT PERSON NAME</small>
                      <h2>{supplier.contact_person_name || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>PHONE</small>
                      <h2>{supplier.phone || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>EMAIL</small>
                      <h2>{supplier.email || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>ADDRESS</small>
                      <h2>{supplier.address || "-"}</h2>
                    </div>
                  </>
                }
                header={"CONTACT PERSON"}
              />
            </div>
            <h2>CONTACT PERSON</h2>
          </div>

          {/* TRN/TAX DETAILS - left half */}
          <div
            className="widget-container"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <img src={supplierTRNIcon} alt="trn" />
              <InfoPopUpButton
                text={
                  <>
                    <div>
                      <small>TRN / TAX REGISTRATION NUMBER</small>
                      <h2>{supplier.trn_number || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>TRN CERTIFICATE</small>
                      <h2>
                        {supplier.trn_certificate ? (
                          <Button
                            componentType={"link"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px" }}
                            href={supplier.trn_certificate}
                            target="_blank"
                          >
                            <img src={externalLinkIcon} alt="external link" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </h2>
                    </div>
                    <br />
                    <div>
                      <small>TRADE LICENSE</small>
                      <h2>
                        {supplier.trade_license ? (
                          <Button
                            componentType={"link"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px" }}
                            href={supplier.trade_license}
                            target="_blank"
                          >
                            <img src={externalLinkIcon} alt="external link" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </h2>
                    </div>
                  </>
                }
                header={"TRN/TAX DETAILS"}
              />
            </div>
            <h2>TRN/TAX DETAILS</h2>
          </div>

          {/* NOTES - right half */}
          <div
            className="widget-container"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <img src={supplierNotesIcon} alt="notes" />
              <InfoPopUpButton
                text={
                  <div>
                    <small>NOTES</small>
                    <h2>{supplier.notes || "-"}</h2>
                  </div>
                }
                header={"NOTES"}
              />
            </div>
            <h2>NOTES</h2>
          </div>
        </div>
      </div>

      <br />
      <br />
      <br />

      {/* LPO History Table */}
      <h2>REQUEST HISTORY</h2>

      <br />

      <table className="items-table two-toned">
        <thead>
          <tr>
            <th>#</th>
            <th>PAID DATE</th>
            <th>MR NUMBER</th>
            <th>LPO NUMBER</th>
            <th>INVOICE AMOUNT</th>
            <th>TOTAL PAID</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lpos.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: "30px" }}>
                No LPOs found for this vendor.
              </td>
            </tr>
          ) : (
            lpos.map((lpo, index) => {
              return (
                <tr key={lpo.lpo_id}>
                  <td>{index + 1}</td>
                  <td>
                    {lpo.payment_status?.toLowerCase() === "approved"
                      ? formatDate(lpo.paid_at)
                      : "-"}
                  </td>
                  <td style={{ textWrap: "nowrap" }}>
                    {lpo.mr_number ||
                      `MR-${String(lpo.mr_header_id).padStart(5, "0")}`}
                  </td>
                  <td style={{ textWrap: "nowrap" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      LPO-{String(lpo.lpo_id).padStart(5, "0")}
                      {userInfo?.departmentID === 8 && (
                        <Button
                          componentType={"link"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          href={`/mr/${lpo.mr_header_id}/lpo/${lpo.lpo_id}`}
                          style={{ padding: "7px 7px" }}
                        >
                          <img src={externalLinkIcon} alt="view" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td>{formatCurrency(lpo.invoice_amount)}</td>
                  <td>{formatCurrency(lpo.total_paid)}</td>
                  <td>
                    <Button
                      onClick={() => {
                        setSelectedLpo(lpo);
                        getMrHeader(lpo.mr_header_id);
                        setIsDetailsOpen(true);
                      }}
                      style={{
                        padding: "7px 7px",
                      }}
                      componentType={"button"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                    >
                      <img src={externalLinkIcon} alt="view" />
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* LPO Details Popup */}
      {isDetailsOpen && selectedLpo && mrHeader && (
        <LpoDetailsPopUp
          lpoId={selectedLpo.lpo_id}
          mrId={selectedLpo.mr_header_id}
          mrHeader={mrHeader}
          paymentStatus={selectedLpo.payment_status}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedLpo(null);
          }}
          onPaymentComplete={() => {
            refreshLpos();
          }}
        />
      )}
    </div>
  );
}
