"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useAuth } from "@/app/context/AuthContext";
// FormPopUp is still used for the Reject Payment modal
import { toast } from "@/app/components/Toast";
import { formatPriceAED } from "@/lib/formatPrice";
import BoqReferencePopUp from "@/app/(protected)/mr/components/BoqReferencePopUp";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import DocumentsPopup from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/storekeeper/_DocumentPopUpButton";
import RequisitionTimeline from "@/app/(protected)/mr/[id]/components/RequisitionTimeline";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import InputItem from "@/app/components/InputItem";
import CommentsSection from "@/app/components/CommentsSection";
import RecordPaymentForm from "@/app/(protected)/payment/components/_RecordPaymentForm";
import { useRefresh } from "@/app/context/RefreshContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type LpoMrLine = {
  lpo_mr_line_id: number;
  lpo_id: number;
  lpo_unit_price: number;
  lpo_total_price: number;
  material_description: string;
  specification: string;
  brand: string;
  qty: number;
  unit: string;
  boq_line_reference: string | null;
  boq_line_ids: string | null;
  mr_line_id: number;
};

type Payment = {
  id: number;
  lpo_id: number;
  payment_type: string;
  payment_method: string;
  reference_number: string | null;
  amount: number;
  receipt_file: string | null;
  recorded_by: string;
  created_at: string;
};

type LpoDetail = {
  id: number;
  mr_header_id: number;
  supplier_id: number;
  progress_id: number;
  payment_terms: string;
  subtotal: number;
  vat_rate: number;
  vat: number;
  total: number;
  invoice_file: string | string[];
  payment_file: string | string[];
  signed_file: string | string[];
  supplier_name: string;
  supplier_address: string;
  supplier_trn_number: string;
  supplier_type: string;
  supplier_contact_person: string;
  supplier_phone: string;
  supplier_email_address: string;
  payment_status: string | null;
  created_at: string;
  lpo_mr_lines: LpoMrLine[];
  payments: Payment[];
};

type Props = { mrHeaderId: number; mrHeader: MrHeader; children: ReactNode };

// ── File helpers ──────────────────────────────────────────────────────────────

function parseFiles(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const p = JSON.parse(raw as string);
    return Array.isArray(p) ? p.filter(Boolean) : [];
  } catch {
    return typeof raw === "string" && raw.startsWith("http") ? [raw] : [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FinanceDetailClient({
  mrHeaderId,
  mrHeader,
  children,
}: Props) {
  const { userInfo } = useAuth();
  const router = useRouter();
  const { refresh } = useRefresh();


  const externalLinkIcon = "/icons/external-link.svg";
  const lpoIcon = "/icons/search-lpo.svg";
  const invIcon = "/icons/search-inv.svg";

  const [lpos, setLpos] = useState<LpoDetail[]>([]);
  const [selectedLpoId, setSelectedLpoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Record payment modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  // Reject payment modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // LPO lines sort state
  const [lpoLinesSortCol, setLpoLinesSortCol] = useState<string | null>(null);
  const [lpoLinesSortDir, setLpoLinesSortDir] = useState<"asc" | "desc">("asc");

  // Vendor stats (all LPOs for selected supplier)
  const [vendorStats, setVendorStats] = useState<{
    totalOutstanding: number;
    totalSpent: number;
    avgLpoValue: number;
  } | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLpos = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getFinanceDetail",
            mr_header_id: mrHeaderId,
          }),
        },
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.lpos)) {
        setLpos(data.lpos);
        if (data.lpos.length > 0 && selectedLpoId === null) {
          setSelectedLpoId(data.lpos[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLpos();
  }, [mrHeaderId]); // eslint-disable-line

  const selectedLpo = lpos.find((l) => l.id === selectedLpoId) ?? null;

  // Fetch vendor-wide stats whenever the selected supplier changes
  useEffect(() => {
    if (!selectedLpo) return;
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getVendorStats",
        supplier_id: selectedLpo.supplier_id,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVendorStats(d);
      })
      .catch(console.error);
  }, [selectedLpo?.supplier_id]); // eslint-disable-line

  // ── Calculations ─────────────────────────────────────────────────────────
  const lpoValue = Number(selectedLpo?.total ?? 0);
  const isApproved =
    (selectedLpo?.payment_status ?? "").toLowerCase() === "approved";
  const totalPaid = isApproved
    ? lpoValue
    : (selectedLpo?.payments ?? []).reduce(
        (s, p) => s + Number(p.amount),
        0,
      );
  const balance = isApproved ? 0 : lpoValue - totalPaid;
  const paidPct = isApproved
    ? 100
    : lpoValue > 0
      ? Math.min((totalPaid / lpoValue) * 100, 100)
      : 0;

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openRecord = () => setIsRecordOpen(true);

  const handleRejectPayment = async () => {
    if (!selectedLpo) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rejectPayment",
            lpo_id: selectedLpo.id,
            mr_header_id: mrHeaderId,
            reason: rejectReason || null,
            rejected_by: userInfo?.name || userInfo?.email || "Finance",
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast("Payment rejected", "success");
        setIsRejectOpen(false);
        setRejectReason("");

        const remaining = lpos.filter((l) => l.id !== selectedLpo.id);
        if (remaining.length === 0) {
          router.push("/payment");
        } else {
          setLpos(remaining);
          setSelectedLpoId(remaining[0].id);
        }
      } else {
        toast("Failed to reject payment", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error rejecting payment", "error");
    }
  };

  // ── LPO lines sort handler ────────────────────────────────────────────────
  const handleLpoLinesSort = (col: string) => {
    if (lpoLinesSortCol === col) {
      if (lpoLinesSortDir === "asc") setLpoLinesSortDir("desc");
      else {
        setLpoLinesSortCol(null);
        setLpoLinesSortDir("asc");
      }
    } else {
      setLpoLinesSortCol(col);
      setLpoLinesSortDir("asc");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Full-page two-column grid ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "25px", alignItems: "flex-start" }}>
        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "25px",
            minWidth: 0,
          }}
        >
          {/* Server-rendered children: MR info bar */}
          {children}

          {/* ── Requisition Timeline — reactive to selected LPO ─────────── */}
          {selectedLpo && (
            <RequisitionTimeline
              mrHeaderId={mrHeaderId}
              lpoId={selectedLpo.id}
              currentProgressId={selectedLpo.progress_id}
              type="material"
            />
          )}

          {/* ── LPO selector + items table — ONE box ────────────────────── */}
          <div className="mr-with-id">
            {/* Radio cards */}
            {loading ? (
              <div>Loading LPOs…</div>
            ) : lpos.length === 0 ? (
              <div>No LPOs found for this MR.</div>
            ) : (
              lpos.map((lpo, idx) => {
                const lpoPaid = lpo.payments.reduce(
                  (s, p) => s + Number(p.amount),
                  0,
                );
                const lpoBalance = Number(lpo.total) - lpoPaid;
                const isSelected = lpo.id === selectedLpoId;
                const isLast = idx === lpos.length - 1;

                const sortedLines = lpoLinesSortCol
                  ? [...lpo.lpo_mr_lines].sort((a, b) => {
                      const av = Number((a as any)[lpoLinesSortCol]) || 0;
                      const bv = Number((b as any)[lpoLinesSortCol]) || 0;
                      return lpoLinesSortDir === "asc" ? av - bv : bv - av;
                    })
                  : lpo.lpo_mr_lines;

                return (
                  <div key={lpo.id}>
                    {/* Radio card */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedLpoId(lpo.id)}
                    >
                      <input
                        type="radio"
                        name="lpo-select"
                        value={lpo.id}
                        checked={isSelected}
                        onChange={() => setSelectedLpoId(lpo.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          accentColor: "black",
                          width: "16px",
                          height: "16px",
                          flexShrink: 0,
                        }}
                      />

                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          gap: "25px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <small>VENDOR</small>
                          <h2>
                            {String(lpo.supplier_name || "-").toUpperCase()}
                          </h2>
                        </div>
                        <div>
                          <small>PAYMENT TYPE</small>
                          <h2>
                            {String(lpo.supplier_type || "-").toUpperCase()}
                          </h2>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <small>LPO NUMBER</small>
                            <h2>LPO-{String(lpo.id).padStart(5, "0")}</h2>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              componentType={"link"}
                              bgColor={"rgba(239, 239, 239, 1)"}
                              borderColor={"rgba(223, 223, 223, 1)"}
                              textColor={"black"}
                              style={{ padding: "7px 7px" }}
                              href={`/mr/${mrHeaderId}/lpo/${lpo.id}`}
                              target="_blank"
                            >
                              <img src={externalLinkIcon} />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <DocumentsPopup lpoId={lpo.id} />
                      </div>
                    </div>

                    {/* Items table for this LPO */}
                    <div style={{ marginTop: "20px" }}>
                      {lpo.lpo_mr_lines.length > 0 ? (
                        <table
                          className="items-table"
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                          }}
                        >
                          <colgroup>
                            <col style={{ width: "50px" }} />
                            <col />
                            <col style={{ width: "150px" }} />
                            <col style={{ width: "150px" }} />
                            <col style={{ width: "125px" }} />
                            <col style={{ width: "150px" }} />
                            <col style={{ width: "150px" }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>MATERIAL</th>
                              <th>BRAND &amp; SPECS</th>
                              <th>BOQ REF</th>
                              <th
                                style={{
                                  cursor: "pointer",
                                  userSelect: "none",
                                }}
                                onClick={() => handleLpoLinesSort("qty")}
                              >
                                QTY
                                <span
                                  style={{
                                    marginLeft: 4,
                                    fontSize: 12,
                                    color: "rgba(166,166,166,1)",
                                  }}
                                >
                                  {lpoLinesSortCol === "qty"
                                    ? lpoLinesSortDir === "asc"
                                      ? "↑"
                                      : "↓"
                                    : "↕"}
                                </span>
                              </th>
                              <th
                                style={{
                                  cursor: "pointer",
                                  userSelect: "none",
                                }}
                                onClick={() =>
                                  handleLpoLinesSort("lpo_unit_price")
                                }
                              >
                                UNIT PRICE
                                <span
                                  style={{
                                    marginLeft: 4,
                                    fontSize: 12,
                                    color: "rgba(166,166,166,1)",
                                  }}
                                >
                                  {lpoLinesSortCol === "lpo_unit_price"
                                    ? lpoLinesSortDir === "asc"
                                      ? "↑"
                                      : "↓"
                                    : "↕"}
                                </span>
                              </th>
                              <th
                                style={{
                                  cursor: "pointer",
                                  userSelect: "none",
                                }}
                                onClick={() =>
                                  handleLpoLinesSort("lpo_total_price")
                                }
                              >
                                TOTAL PRICE
                                <span
                                  style={{
                                    marginLeft: 4,
                                    fontSize: 12,
                                    color: "rgba(166,166,166,1)",
                                  }}
                                >
                                  {lpoLinesSortCol === "lpo_total_price"
                                    ? lpoLinesSortDir === "asc"
                                      ? "↑"
                                      : "↓"
                                    : "↕"}
                                </span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedLines.map((line, lineIdx) => (
                              <tr key={line.lpo_mr_line_id}>
                                <td>{lineIdx + 1}</td>
                                <td>{line.material_description || "-"}</td>
                                <td style={{ padding: "12px 20px" }}>
                                  {line.brand || line.specification ? (
                                    <InfoPopUpButton
                                      header="BRAND & SPECIFICATION"
                                      text={
                                        <>
                                          <small>BRAND</small>
                                          <h2>{line.brand || "-"}</h2>
                                          <br />
                                          <small>SPECIFICATION</small>
                                          <h2>{line.specification || "-"}</h2>
                                        </>
                                      }
                                    />
                                  ) : (
                                    <span
                                      style={{ color: "rgba(150,150,150,1)" }}
                                    >
                                      -
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "12px 20px" }}>
                                  {line.boq_line_ids ? (
                                    <BoqReferencePopUp
                                      mrHeader={mrHeader}
                                      item={
                                        {
                                          id: line.mr_line_id,
                                          boq_line_ids: line.boq_line_ids,
                                        } as any
                                      }
                                    />
                                  ) : (
                                    <span
                                      style={{ color: "rgba(150,150,150,1)" }}
                                    >
                                      -
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {Number.isInteger(Number(line.qty))
                                    ? Number(line.qty)
                                    : parseFloat(
                                        Number(line.qty).toFixed(3),
                                      )}{" "}
                                  {line.unit}
                                </td>
                                <td>{formatPriceAED(line.lpo_unit_price)}</td>
                                <td>{formatPriceAED(line.lpo_total_price)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5} />
                              <td
                                style={{
                                  padding: "10px 20px",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                SUBTOTAL
                              </td>
                              <td
                                style={{
                                  padding: "10px 20px",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatPriceAED(lpo.subtotal)}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={5} />
                              <td
                                style={{
                                  padding: "13px 20px",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                SUBTOTAL W/ VAT
                              </td>
                              <td
                                style={{
                                  padding: "13px 20px",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatPriceAED(lpo.total)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      ) : (
                        <div
                          style={{
                            padding: "25px 20px",
                            color: "rgba(120,120,120,1)",
                            fontSize: "13px",
                          }}
                        >
                          No items found for this LPO.
                        </div>
                      )}
                    </div>

                    {/* Spacing between LPOs */}
                    {!isLast && <div style={{ marginBottom: "30px" }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
        <div
          style={{
            width: "340px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* PAYMENT SUMMARY */}
          <div className="mr-with-id">
            <h3>PAYMENT SUMMARY</h3>

            <br />

            {/* LPO VALUE */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 16px",
                marginLeft: "-16px",
                marginRight: "-16px",
                backgroundColor: "rgba(240, 240, 240, 1)",
                borderRadius: "10px",
              }}
            >
              <span
                style={{
                  fontWeight: "600",
                }}
              >
                LPO VALUE
              </span>
              <span style={{ fontSize: "13px", fontWeight: "600" }}>
                + {formatPriceAED(lpoValue)}
              </span>
            </div>

            <br />

            {/* PREVIOUSLY PAID */}
            {selectedLpo &&
              (isApproved || (selectedLpo.payments ?? []).length > 0) && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>PREVIOUSLY PAID</span>
                    <span style={{ fontWeight: "600" }}>
                      - {formatPriceAED(lpoValue)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                    }}
                  >
                    {isApproved ? (
                      // Approved LPO — single synthetic row linked to payment_file
                      (() => {
                        const paymentUrl =
                          parseFiles(selectedLpo.payment_file)[0] ?? null;
                        return (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <span>
                                PAY-{String(selectedLpo.id).padStart(4, "0")}
                              </span>
                              {paymentUrl && (
                                <a
                                  href={paymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img src={externalLinkIcon} alt="payment" />
                                </a>
                              )}
                            </div>
                            <span
                              style={{
                                fontWeight: 600,
                                color: "rgba(248,77,77,1)",
                              }}
                            >
                              - {formatPriceAED(lpoValue)}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      // Normal LPOs — real payment rows
                      selectedLpo.payments.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <span>PAY-{String(p.id).padStart(4, "0")}</span>
                            {p.receipt_file && (
                              <a
                                href={p.receipt_file}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img src={externalLinkIcon} alt="receipt" />
                              </a>
                            )}
                          </div>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "rgba(248,77,77,1)",
                            }}
                          >
                            - {formatPriceAED(p.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <br />
                </>
              )}

            {/* BALANCE */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "24px 16px",
                marginLeft: "-16px",
                marginRight: "-16px",
                backgroundColor: "rgba(65, 187, 135, 1)",
                borderRadius: "10px",
              }}
            >
              <span
                style={{
                  fontWeight: "600",
                  color: "white",
                  fontSize: "16px",
                }}
              >
                {balance <= 0 ? "FULLY PAID" : "BALANCE"}
              </span>
              <span
                style={{
                  fontWeight: "600",
                  color: "white",
                  fontSize: "16px",
                }}
              >
                {balance <= 0
                  ? formatPriceAED(0)
                  : `+ ${formatPriceAED(balance)}`}
              </span>
            </div>

            <br />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <Button
                componentType="button"
                bgColor="rgba(65, 187, 135, 1)"
                borderColor="rgba(65, 187, 135, 1)"
                textColor="white"
                style={{
                  borderRadius: "50px",
                  marginLeft: "-16px",
                }}
                onClick={openRecord}
                disabled={!selectedLpo || balance <= 0}
                full
              >
                Record Payment
              </Button>
              <Button
                componentType="button"
                bgColor="rgba(194, 60, 60, 1)"
                borderColor="rgba(194, 60, 60, 1)"
                textColor="white"
                style={{
                  borderRadius: "50px",
                  marginRight: "-16px",
                }}
                onClick={() => {
                  setRejectReason("");
                  setIsRejectOpen(true);
                }}
                disabled={!selectedLpo || balance <= 0}
                full
              >
                Reject Payment
              </Button>
            </div>
          </div>

          {/* VENDOR INFORMATION */}
          {selectedLpo && (
            <div className="mr-with-id">
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <h3>VENDOR INFORMATION</h3>
                <Button
                  componentType={"link"}
                  bgColor={"rgba(239, 239, 239, 1)"}
                  borderColor={"rgba(223, 223, 223, 1)"}
                  textColor={"black"}
                  style={{ padding: "7px 7px" }}
                  href={`/vendor/${selectedLpo.supplier_id}`}
                  target="_blank"
                >
                  <img src={externalLinkIcon} />
                </Button>
              </div>

              <br />

              <div>
                {[
                  { label: "TRN", value: selectedLpo.supplier_trn_number },
                  {
                    label: "TOTAL OUTSTANDING BALANCE",
                    value: vendorStats
                      ? formatPriceAED(vendorStats.totalOutstanding)
                      : "—",
                  },
                  {
                    label: "TOTAL SPENT",
                    value: vendorStats
                      ? formatPriceAED(vendorStats.totalSpent)
                      : "—",
                  },
                  {
                    label: "LAST PURCHASE DATE",
                    value: selectedLpo.created_at
                      ? new Date(selectedLpo.created_at).toLocaleDateString(
                          "en-GB",
                        )
                      : null,
                  },
                  {
                    label: "AVG. LPO VALUE",
                    value: vendorStats
                      ? formatPriceAED(vendorStats.avgLpoValue)
                      : "—",
                  },
                ]
                  .filter((f) => f.value)
                  .map((field) => (
                    <Fragment key={field.label}>
                      <br />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <h4>{field.label}</h4>
                        <h4 style={{ textAlign: "right" }}>{field.value}</h4>
                      </div>
                    </Fragment>
                  ))}
              </div>
            </div>
          )}

          {/* QUICK DOCUMENTS */}
          {selectedLpo &&
            (() => {
              const signedUrl = parseFiles(selectedLpo.signed_file)[0] ?? null;
              const invoiceUrl =
                parseFiles(selectedLpo.invoice_file)[0] ?? null;

              const docs = [
                {
                  key: "lpo",
                  icon: lpoIcon,
                  label: "SIGNED LPO",
                  url: signedUrl,
                },
                {
                  key: "inv",
                  icon: invIcon,
                  label: "INVOICE",
                  url: invoiceUrl,
                },
              ];

              return (
                <div className="mr-with-id">
                  <h3>QUICK DOCUMENTS</h3>

                  <br />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "15px",
                    }}
                  >
                    {docs.map((doc) => (
                      <a
                        key={doc.key}
                        href={doc.url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={
                          !doc.url ? (e) => e.preventDefault() : undefined
                        }
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "25px",
                          padding: "12px 12px",
                          backgroundColor: "white",
                          cursor: doc.url ? "pointer" : "not-allowed",
                          opacity: doc.url ? 1 : 0.35,
                        }}
                      >
                        <img
                          src={doc.icon}
                          alt={doc.label}
                          style={{ width: "72px", height: "auto" }}
                        />
                        <span
                          style={{
                            fontWeight: "600",
                            fontSize: "12px",
                            textAlign: "center",
                            textTransform: "uppercase",
                            letterSpacing: "0.02em",
                            color: "black",
                          }}
                        >
                          {doc.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* ── COMMENTS ────────────────────────────────────────────────────────── */}
      {selectedLpoId !== null && (
        <CommentsSection
          key={selectedLpoId}
          mrHeaderId={mrHeaderId}
          lpoId={selectedLpoId}
          stageName={
            selectedLpo?.supplier_name
              ? `LPO-${String(selectedLpoId).padStart(5, "0")} · ${selectedLpo.supplier_name}`
              : `LPO-${String(selectedLpoId).padStart(5, "0")}`
          }
        />
      )}

      {/* ── RECORD PAYMENT MODAL ────────────────────────────────────────────── */}
      {selectedLpo && (
        <RecordPaymentForm
          lpos={[
            {
              id: selectedLpo.id,
              mr_header_id: mrHeaderId,
              outstanding: balance,
            },
          ]}
          supplierName={selectedLpo.supplier_name}
          isOpen={isRecordOpen}
          setIsOpen={setIsRecordOpen}
          onSuccess={async () => {
            await fetchLpos();
            await refresh();
          }}
          recordedBy={userInfo?.name || userInfo?.email || "Finance"}
        />
      )}

      {/* ── REJECT PAYMENT MODAL ────────────────────────────────────────────── */}
      {isRejectOpen && selectedLpo && (
        <FormPopUp
          header="Reject Payment"
          setIsOpen={setIsRejectOpen}
          handleSubmit={handleRejectPayment}
          addButtonLabel="CONFIRM"
          style={{ maxWidth: "460px" }}
        >
          <div className="input-row half">
            <InputItem
              label="LPO NUMBER"
              type="text"
              value={`LPO-${String(selectedLpo.id).padStart(5, "0")}`}
              onChange={() => {}}
              disabled
              required
              noOptionalLabel
            />
            <InputItem
              label="VENDOR"
              type="text"
              value={selectedLpo.supplier_name || "-"}
              onChange={() => {}}
              disabled
              required
              noOptionalLabel
            />
          </div>
          <div className="input-row full">
            <InputItem
              label="REASON"
              type="textarea"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
