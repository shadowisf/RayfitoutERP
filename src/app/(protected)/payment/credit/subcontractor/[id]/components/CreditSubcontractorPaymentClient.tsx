"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { formatPriceAED } from "@/lib/formatPrice";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import Button from "@/app/components/Button";
import BoqReferencePopUp from "@/app/(protected)/mr/components/BoqReferencePopUp";
import RecordPrPaymentForm from "@/app/(protected)/payment/components/_RecordPrPaymentForm";

// ── Types ─────────────────────────────────────────────────────────────────────

type PrLine = {
  id: number;
  mr_header_id: number;
  boq_line_id: number;
  jo_line_id: number;
  subcontracted_qty: number | null;
  completed_qty: number | null;
  retention: number | null;
  attachment: string | null;
  item_name: string;
  item_description: string | null;
  rate_per_quantity: number;
  boq_qty: number;
  boq_unit: string;
  boq_approved_price: number | null;
  job_scope_name: string;
  job_description: string | null;
  contract_type: string | null;
};

type PrPayment = {
  id: number;
  pr_id: number;
  jo_line_id: number | null;
  payment_type: string;
  payment_method: string;
  amount: number;
  receipt_file: string | null;
  notes: string | null;
  recorded_by: string;
  created_at: string;
};

type PaymentRequest = {
  id: number;
  jo_header_id: number;
  requested_by: string;
  project_name: string | null;
  project_id: number | null;
  total_paid: number;
  outstanding: number;
  is_paid: 0 | 1;
  pr_lines: PrLine[];
  payments: PrPayment[];
};

type Subcontractor = {
  id: number;
  name: string;
  scope_of_work: string | null;
  material_categories: string | null;
  trn_number: string | null;
  trn_certificate: string | null;
  contract: string | null;
  trade_license: string | null;
  contact_person_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  bank_name: string | null;
  account_number: string | null;
  notes: string | null;
};

type Stats = {
  creditOutstanding: number;
  pastPayments: number;
  prCount: number;
};

type Props = { subcontractorId: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "-"
    : d
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .toUpperCase();
}

// Compute client-side after-retention total from boq_approved_price
function computeAfterRetention(lines: PrLine[]): number {
  const beforeRetention = lines.reduce((sum, b) => {
    const subQty = Number(b.subcontracted_qty) || 0;
    const approvedPrice = Number(b.boq_approved_price) || 0;
    const cQty = Number(b.completed_qty) || 0;
    if (subQty === 0 || approvedPrice === 0) return sum;
    return sum + (cQty / subQty) * approvedPrice;
  }, 0);
  const retention = lines.reduce((sum, b) => {
    const subQty = Number(b.subcontracted_qty) || 0;
    const approvedPrice = Number(b.boq_approved_price) || 0;
    const cQty = Number(b.completed_qty) || 0;
    const retPct = Number(b.retention) || 0;
    if (subQty === 0 || approvedPrice === 0) return sum;
    return sum + (cQty / subQty) * approvedPrice * (retPct / 100);
  }, 0);
  return beforeRetention - retention;
}

// Group pr_lines by jo_line_id
function groupByJoLine(lines: PrLine[]): Map<number, PrLine[]> {
  const map = new Map<number, PrLine[]>();
  for (const line of lines) {
    if (!map.has(line.jo_line_id)) map.set(line.jo_line_id, []);
    map.get(line.jo_line_id)!.push(line);
  }
  return map;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreditSubcontractorPaymentClient({
  subcontractorId,
}: Props) {
  const { userInfo } = useAuth();

  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(
    null,
  );
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    creditOutstanding: 0,
    pastPayments: 0,
    prCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Selection
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  // Tab
  const [activeTab, setActiveTab] = useState<"unpaid" | "history">("unpaid");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Record payment modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  // History sort
  const [histSortCol, setHistSortCol] = useState<"amount" | "created_at" | null>(null);
  const [histSortDir, setHistSortDir] = useState<"asc" | "desc">("desc");

  const externalLinkIcon = "/icons/external-link.svg";
  const contactPersonIcon = "/icons/supplier-contact-person.svg";
  const trnIcon = "/icons/supplier-trn.svg";
  const bankIcon = "/icons/supplier-bank.svg";

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getCreditSubcontractorData`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subcontractor_id: subcontractorId }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setSubcontractor(data.subcontractor);
        setPaymentRequests(data.paymentRequests);
        setStats(data.stats);
        const unpaidIds = (data.paymentRequests as PaymentRequest[])
          .filter((pr) => !pr.is_paid)
          .map((pr) => pr.id);
        setCheckedIds(new Set(unpaidIds));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [subcontractorId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Checkbox helpers ───────────────────────────────────────────────────────
  const unpaidPRs = paymentRequests.filter((pr) => !pr.is_paid);

  const searchQ = searchQuery.trim().toLowerCase();
  const filteredUnpaidPRs = searchQ
    ? unpaidPRs.filter(
        (pr) =>
          `pr-${String(pr.id).padStart(5, "0")}`.includes(searchQ) ||
          (pr.project_name ?? "").toLowerCase().includes(searchQ) ||
          (pr.requested_by ?? "").toLowerCase().includes(searchQ),
      )
    : unpaidPRs;

  const displayPRs =
    activeTab === "unpaid" ? filteredUnpaidPRs : paymentRequests;

  const toggleOne = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Selected PRs ──────────────────────────────────────────────────────────
  const selectedPRs = paymentRequests.filter((pr) => checkedIds.has(pr.id));
  const selectedOutstanding = selectedPRs.reduce((s, pr) => {
    const afterRetention = computeAfterRetention(pr.pr_lines);
    const totalPaid = pr.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return s + Math.max(0, afterRetention - totalPaid);
  }, 0);

  // ── Avatar letter ─────────────────────────────────────────────────────────
  const avatarLetter = (subcontractor?.name ?? "?")[0].toUpperCase();
  const avatarColor = "#1a1a1a";

  // ── History data: flatten all payments from all PRs ───────────────────────
  const allPayments: Array<PrPayment & { pr: PaymentRequest }> = [];
  for (const pr of paymentRequests) {
    for (const p of pr.payments) {
      allPayments.push({ ...p, pr });
    }
  }

  const handleHistSort = (col: "amount" | "created_at") => {
    if (histSortCol !== col) {
      setHistSortCol(col);
      setHistSortDir("desc");
    } else if (histSortDir === "desc") {
      setHistSortDir("asc");
    } else {
      setHistSortCol(null);
      setHistSortDir("desc");
    }
  };

  const histSortIcon = (col: "amount" | "created_at") => (
    <span style={{ marginLeft: 4, fontSize: 10, opacity: histSortCol === col ? 1 : 0.35 }}>
      {histSortCol === col ? (histSortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const allPaymentsSorted = histSortCol
    ? [...allPayments].sort((a, b) => {
        const aVal = histSortCol === "amount"
          ? Number(a.amount)
          : new Date(a.created_at).getTime();
        const bVal = histSortCol === "amount"
          ? Number(b.amount)
          : new Date(b.created_at).getTime();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return histSortDir === "asc" ? cmp : -cmp;
      })
    : allPayments;

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        Loading subcontractor data…
      </div>
    );
  }

  if (!subcontractor) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        Subcontractor not found.
      </div>
    );
  }

  return (
    <>
      {/* ── Subcontractor Header ────────────────────────────────────────────── */}
      <div className="mr-with-id" style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            height: "100%",
          }}
        >
          {/* Left: avatar + name + meta row grouped together */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "50px",
            }}
          >
            {/* Avatar + name */}
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: avatarColor,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  fontWeight: "600",
                  flexShrink: 0,
                }}
              >
                {avatarLetter}
              </div>

              <div>
                <small>SUBCONTRACTOR NAME</small>
                <h2>{subcontractor.name.toUpperCase()}</h2>
              </div>
            </div>

            {/* Meta row */}
            <div style={{ display: "flex", gap: "30px" }}>
              <div>
                <small>SUBCONTRACTOR NUMBER</small>
                <h2>SUB-{String(subcontractor.id).padStart(5, "0")}</h2>
              </div>
              <div>
                <small>SCOPE OF WORK</small>
                <h2>{subcontractor.scope_of_work || "N/A"}</h2>
              </div>
              <div>
                <small>NOTES</small>
                <h2>
                  <InfoPopUpButton
                    header="NOTES"
                    text={
                      <div>
                        <small>NOTES</small>
                        <h2 style={{ whiteSpace: "pre-wrap" }}>
                          {subcontractor.notes || "-"}
                        </h2>
                      </div>
                    }
                    bgColor="rgba(239,239,239,1)"
                    borderColor="rgba(223,223,223,1)"
                    textColor="black"
                    style={{ padding: "7px 7px" }}
                  >
                    <img src={externalLinkIcon} alt="view notes" />
                  </InfoPopUpButton>
                </h2>
              </div>
            </div>
          </div>

          {/* Right: info buttons */}
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            {[
              {
                icon: contactPersonIcon,
                alt: "contact person",
                label: "CONTACT PERSON",
                header: "CONTACT PERSON",
                content: (
                  <>
                    <div>
                      <small>NAME</small>
                      <h2>{subcontractor.contact_person_name || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>PHONE</small>
                      <h2>{subcontractor.phone || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>EMAIL</small>
                      <h2>{subcontractor.email || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>ADDRESS</small>
                      <h2>{subcontractor.address || "-"}</h2>
                    </div>
                  </>
                ),
              },
              {
                icon: trnIcon,
                alt: "trn",
                label: "TRN/TAX DETAILS",
                header: "TRN / TAX DETAILS",
                content: (
                  <>
                    <div>
                      <small>TRN NUMBER</small>
                      <h2>{subcontractor.trn_number || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>TRN CERTIFICATE</small>
                      <h2>
                        {subcontractor.trn_certificate ? (
                          <Button
                            componentType="link"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            href={subcontractor.trn_certificate}
                            style={{ padding: "7px 7px" }}
                          >
                            <img src={externalLinkIcon} alt="open" />
                          </Button>
                        ) : (
                          "N/A"
                        )}
                      </h2>
                    </div>
                    <br />
                    <div>
                      <small>TRADE LICENSE</small>
                      <h2>
                        {subcontractor.trade_license ? (
                          <Button
                            componentType="link"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            href={subcontractor.trade_license}
                            style={{ padding: "7px 7px" }}
                          >
                            <img src={externalLinkIcon} alt="open" />
                          </Button>
                        ) : (
                          "N/A"
                        )}
                      </h2>
                    </div>
                    <br />
                    <div>
                      <small>CONTRACT</small>
                      <h2>
                        {subcontractor.contract ? (
                          <Button
                            componentType="link"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            href={subcontractor.contract}
                            style={{ padding: "7px 7px" }}
                          >
                            <img src={externalLinkIcon} alt="open" />
                          </Button>
                        ) : (
                          "N/A"
                        )}
                      </h2>
                    </div>
                  </>
                ),
              },
              {
                icon: bankIcon,
                alt: "bank info",
                label: "BANK INFO",
                header: "BANK INFO",
                content: (
                  <>
                    <div>
                      <small>BANK NAME</small>
                      <h2>{subcontractor.bank_name || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>ACCOUNT NUMBER</small>
                      <h2>{subcontractor.account_number || "-"}</h2>
                    </div>
                  </>
                ),
              },
            ].map(({ icon, alt, label, header, content }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <InfoPopUpButton
                  header={header}
                  text={content}
                  bgColor="rgba(246, 246, 246, 1)"
                  borderColor="rgba(246, 246, 246, 1)"
                  textColor="black"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "10px",
                    padding: 0,
                  }}
                >
                  <img
                    src={icon}
                    alt={alt}
                    style={{ width: "44px", height: "44px" }}
                  />
                </InfoPopUpButton>
                <h2>{label}</h2>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs + actions row ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {/* Left: tab pills */}
        <div style={{ display: "flex", gap: "10px" }}>
          {(["unpaid", "history"] as const).map((tab) => (
            <Button
              key={tab}
              componentType="button"
              bgColor={activeTab === tab ? "black" : "transparent"}
              borderColor="black"
              textColor={activeTab === tab ? "white" : "black"}
              style={{ borderRadius: "25px", padding: "7px 20px" }}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery("");
              }}
            >
              {tab === "unpaid" ? "UNPAID PAYMENT" : "TRANSACTION HISTORY"}
            </Button>
          ))}
        </div>

        {/* Right: record payment button + search bar */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            componentType="button"
            bgColor={
              selectedPRs.length === 0
                ? "rgba(180,180,180,1)"
                : "rgba(0, 163, 93, 1)"
            }
            borderColor={
              selectedPRs.length === 0
                ? "rgba(180,180,180,1)"
                : "rgba(0, 163, 93, 1)"
            }
            textColor="white"
            disabled={selectedPRs.length === 0}
            onClick={() => {
              if (selectedPRs.length === 0) return;
              setIsRecordOpen(true);
            }}
          >
            RECORD PAYMENT ({formatPriceAED(selectedOutstanding)})
          </Button>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 240,
                padding: "7px 40px 7px 16px",
                borderRadius: 8,
                border: "1px solid rgba(223,223,223,1)",
                fontSize: 13,
                outline: "none",
                backgroundColor: "white",
              }}
            />
            <img
              src="/icons/search.svg"
              alt="search"
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 15,
                height: 15,
                opacity: 0.45,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "25px" }}>
        {[
          {
            label: "Outstanding Amount",
            value: `${formatAED(stats.creditOutstanding)} AED`,
          },
          {
            label: "Past Payments",
            value: `${formatAED(stats.pastPayments)} AED`,
          },
          {
            label: "Total Payment Requests",
            value: `${stats.prCount} PR${stats.prCount !== 1 ? "s" : ""}`,
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="widget-container"
            style={{
              width: "300px",
              height: "150px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "15px",
            }}
          >
            <h3 style={{ color: "rgba(74,85,101,1)" }}>{label}</h3>
            <div>
              <h2 style={{ fontSize: "28px" }}>{loading ? "..." : value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      {activeTab === "unpaid" ? (
        /* ── PR List ────────────────────────────────────────────────────────── */
        displayPRs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#aaa",
              padding: "40px",
              background: "white",
              borderRadius: "10px",
            }}
          >
            No unpaid payment requests.
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {displayPRs.map((pr) => {
              const isChecked = checkedIds.has(pr.id);
              const joGroups = groupByJoLine(pr.pr_lines);

              // Compute tfoot totals from boq_approved_price
              const totalBeforeRetention = pr.pr_lines.reduce((sum, b) => {
                const subQty = Number(b.subcontracted_qty) || 0;
                const approvedPrice = Number(b.boq_approved_price) || 0;
                const cQty = Number(b.completed_qty) || 0;
                if (subQty === 0 || approvedPrice === 0) return sum;
                return sum + (cQty / subQty) * approvedPrice;
              }, 0);
              const totalRetentionAmt = pr.pr_lines.reduce((sum, b) => {
                const subQty = Number(b.subcontracted_qty) || 0;
                const approvedPrice = Number(b.boq_approved_price) || 0;
                const cQty = Number(b.completed_qty) || 0;
                const retPct = Number(b.retention) || 0;
                if (subQty === 0 || approvedPrice === 0) return sum;
                return sum + (cQty / subQty) * approvedPrice * (retPct / 100);
              }, 0);
              const totalAfterRetention = totalBeforeRetention - totalRetentionAmt;

              return (
                <div key={pr.id} className="mr-with-id">
                  {/* PR header row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      marginBottom: "16px",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleOne(pr.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(pr.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="manager-checkbox"
                    />

                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        gap: "30px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {/* PR NUMBER */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <small>PR NUMBER</small>
                          <h2>PR-{String(pr.id).padStart(5, "0")}</h2>
                        </div>
                        <Button
                          componentType="link"
                          bgColor="rgba(239,239,239,1)"
                          borderColor="rgba(223,223,223,1)"
                          textColor="black"
                          style={{ padding: "7px 7px" }}
                          href={`/mr/${pr.id}`}
                          target="_blank"
                        >
                          <img src={externalLinkIcon} alt="external link" />
                        </Button>
                      </div>

                      {/* JO NUMBER */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <small>JO NUMBER</small>
                          <h2>JO-{String(pr.jo_header_id).padStart(5, "0")}</h2>
                        </div>
                        <Button
                          componentType="link"
                          bgColor="rgba(239,239,239,1)"
                          borderColor="rgba(223,223,223,1)"
                          textColor="black"
                          style={{ padding: "7px 7px" }}
                          href={`/mr/${pr.jo_header_id}`}
                          target="_blank"
                        >
                          <img src={externalLinkIcon} alt="external link" />
                        </Button>
                      </div>

                      {/* PROJECT */}
                      <div>
                        <small>PROJECT</small>
                        <h2>{pr.project_name || "-"}</h2>
                      </div>

                      {/* SCOPE */}
                      <div>
                        <small>SCOPE</small>
                        <h2>
                          {[
                            ...new Set(
                              pr.pr_lines
                                .map((l) => l.job_scope_name)
                                .filter(Boolean),
                            ),
                          ].join(", ") || "-"}
                        </h2>
                      </div>

                      {/* CONTRACT TYPE */}
                      <div>
                        <small>CONTRACT TYPE</small>
                        <h2>
                          {[
                            ...new Set(
                              pr.pr_lines
                                .map((l) => l.contract_type)
                                .filter(Boolean),
                            ),
                          ].join(", ") || "-"}
                        </h2>
                      </div>

                      {/* DESCRIPTION */}
                      <div>
                        <small>DESCRIPTION</small>
                        <h2>
                          <InfoPopUpButton
                            header="DESCRIPTION"
                            text={
                              <div>
                                <small>DESCRIPTION</small>
                                <h2 style={{ whiteSpace: "pre-wrap" }}>
                                  {[
                                    ...new Set(
                                      pr.pr_lines
                                        .map((l) => l.job_description)
                                        .filter(Boolean),
                                    ),
                                  ].join("\n\n") || "-"}
                                </h2>
                              </div>
                            }
                            bgColor="rgba(239,239,239,1)"
                            borderColor="rgba(223,223,223,1)"
                            textColor="black"
                            style={{ padding: "7px 7px" }}
                          >
                            <img
                              src={externalLinkIcon}
                              alt="view description"
                            />
                          </InfoPopUpButton>
                        </h2>
                      </div>

                      {/* BOQ REF */}
                      {pr.pr_lines.length > 0 && pr.project_id && (
                        <div>
                          <small>BOQ REF</small>
                          <h2>
                            <BoqReferencePopUp
                              mrHeader={
                                {
                                  id: pr.id,
                                  project_id: pr.project_id,
                                  project_name: pr.project_name,
                                } as any
                              }
                              item={
                                {
                                  id: pr.pr_lines[0].boq_line_id,
                                  boq_line_ids: pr.pr_lines
                                    .map((l) => l.boq_line_id)
                                    .join(","),
                                } as any
                              }
                            />
                          </h2>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PR lines table grouped by JO line */}
                  {pr.pr_lines.length > 0 && (
                    <div style={{ overflowX: "auto" }}>
                      <table className="items-table fixed-layout">
                        <colgroup>
                          <col style={{ width: "40px" }} />
                          <col style={{ width: "400px" }} />
                          {/* <col style={{ width: "160px" }} /> */}
                          <col style={{ width: "130px" }} />
                          <col style={{ width: "130px" }} />
                          <col style={{ width: "130px" }} />
                          <col style={{ width: "160px" }} />
                          <col style={{ width: "130px" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>BOQ ITEM</th>
                            {/* <th>SUBCONTRACTED QTY</th> */}
                            <th>SUBCONTRACTOR PRICE</th>
                            <th>COMPLETED QTY</th>
                            <th>RETENTION</th>
                            <th>AMOUNT</th>
                            <th>ATTACHMENT(S)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(joGroups.entries()).map(
                            ([joLineId, lines]) => {
                              const firstLine = lines[0];
                              return (
                                <React.Fragment key={joLineId}>
                                  {/* BOQ rows */}
                                  {lines.map((line, i) => {
                                    const subcontractedQty = Number(
                                      line.subcontracted_qty ?? 0,
                                    );
                                    const completedQty = Number(
                                      line.completed_qty ?? 0,
                                    );
                                    const approvedPrice = Number(
                                      line.boq_approved_price ?? 0,
                                    );
                                    const retentionPct = Number(
                                      line.retention ?? 0,
                                    );
                                    const proportion =
                                      subcontractedQty > 0
                                        ? completedQty / subcontractedQty
                                        : 0;
                                    const amount = proportion * approvedPrice;
                                    const retentionAmt =
                                      amount * (retentionPct / 100);
                                    const afterRetention =
                                      amount - retentionAmt;
                                    const attachmentUrl = line.attachment
                                      ? line.attachment.replace(/^"+|"+$/g, "")
                                      : null;
                                    return (
                                      <tr key={line.id}>
                                        <td>{i + 1}</td>
                                        <td>
                                          <div>
                                            <strong>{line.item_name}</strong>
                                            {line.item_description && (
                                              <>
                                                <br />
                                                <br />
                                                {line.item_description}
                                              </>
                                            )}
                                          </div>
                                        </td>
                                        {/* <td>
                                          {subcontractedQty} {line.boq_unit}
                                        </td> */}
                                        <td>
                                          {approvedPrice > 0
                                            ? formatPriceAED(approvedPrice)
                                            : "-"}
                                        </td>
                                        <td>
                                          {completedQty} {line.boq_unit}
                                        </td>
                                        <td>{retentionPct}%</td>
                                        <td>
                                          {formatPriceAED(afterRetention)}
                                        </td>
                                        <td>
                                          {attachmentUrl ? (
                                            <Button
                                              componentType="link"
                                              bgColor="rgba(239,239,239,1)"
                                              borderColor="rgba(223,223,223,1)"
                                              textColor="black"
                                              href={attachmentUrl}
                                              target="_blank"
                                              style={{
                                                padding: "5px 12px",
                                                borderRadius: "25px",
                                                fontSize: "12px",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              1{" "}
                                              <img
                                                src={externalLinkIcon}
                                                alt="open"
                                              />
                                            </Button>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            },
                          )}
                        </tbody>
                        <tfoot>
                          <tr style={{ color: "rgba(146,146,146,1)" }}>
                            <td colSpan={5} />
                            <td
                              style={{
                                padding: "10px 20px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              BEFORE RETENTION
                            </td>
                            <td
                              style={{
                                padding: "10px 20px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatPriceAED(totalBeforeRetention)}
                            </td>
                          </tr>
                          <tr style={{ color: "rgba(146,146,146,1)" }}>
                            <td colSpan={5} />
                            <td
                              style={{
                                padding: "10px 20px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              RETENTION
                            </td>
                            <td
                              style={{
                                padding: "10px 20px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatPriceAED(totalRetentionAmt)}
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
                              AFTER RETENTION
                            </td>
                            <td
                              style={{
                                padding: "13px 20px",
                                fontWeight: "600",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatPriceAED(totalAfterRetention)}
                            </td>
                          </tr>

                          {/* Payment rows */}
                          {pr.payments.map((p) => {
                            const receiptUrl = p.receipt_file
                              ? p.receipt_file.replace(/^"+|"+$/g, "")
                              : null;
                            return (
                              <tr key={p.id}>
                                <td colSpan={5} />
                                <td
                                  style={{
                                    padding: "10px 20px",
                                    fontWeight: "600",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                    }}
                                  >
                                    PAY-{String(p.id).padStart(5, "0")}
                                    {receiptUrl && (
                                      <Button
                                        componentType="link"
                                        bgColor="rgba(239,239,239,1)"
                                        borderColor="rgba(223,223,223,1)"
                                        textColor="black"
                                        href={receiptUrl}
                                        target="_blank"
                                        style={{ padding: "7px 7px" }}
                                      >
                                        <img
                                          src={externalLinkIcon}
                                          alt="receipt"
                                        />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                                <td
                                  style={{
                                    padding: "10px 20px",
                                    fontWeight: "600",
                                    whiteSpace: "nowrap",
                                    color: "red",
                                  }}
                                >
                                  - {formatPriceAED(p.amount)}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Balance row */}
                          {pr.payments.length > 0 && (
                            <tr>
                              <td colSpan={5} />
                              <td
                                style={{
                                  padding: "13px 20px",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                BALANCE
                              </td>
                              <td
                                style={{
                                  padding: "13px 20px",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatPriceAED(Math.max(0,
                                  computeAfterRetention(pr.pr_lines) -
                                  pr.payments.reduce((s, p) => s + Number(p.amount), 0)
                                ))}
                              </td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── History Tab ────────────────────────────────────────────────────── */
        <div>
          {allPayments.length === 0 ? (
            <p
              style={{ textAlign: "center", color: "#888", padding: "40px 0" }}
            >
              No payment history for this subcontractor.
            </p>
          ) : (
            <table
              className="items-table two-toned"
              style={{ width: "100%", tableLayout: "fixed" }}
            >
              <colgroup>
                <col style={{ width: "150px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "170px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "170px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>PR NUMBER</th>
                  <th>JO NUMBER</th>
                  <th>PROJECT</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleHistSort("amount")}
                  >
                    TOTAL AMOUNT{histSortIcon("amount")}
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleHistSort("created_at")}
                  >
                    PAYMENT DATE{histSortIcon("created_at")}
                  </th>
                  <th>PAYMENT</th>
                </tr>
              </thead>
              <tbody>
                {allPaymentsSorted.map((p) => {
                  const receiptUrl = p.receipt_file
                    ? p.receipt_file.replace(/^"+|"+$/g, "")
                    : null;
                  return (
                    <tr key={p.id}>
                      {/* PR NUMBER */}
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          PR-{String(p.pr_id).padStart(5, "0")}
                          <Button
                            componentType="link"
                            bgColor="rgba(239,239,239,1)"
                            borderColor="rgba(223,223,223,1)"
                            textColor="black"
                            style={{ padding: "7px 7px", flexShrink: 0 }}
                            href={`/mr/${p.pr_id}`}
                            target="_blank"
                          >
                            <img src={externalLinkIcon} alt="external link" />
                          </Button>
                        </div>
                      </td>

                      {/* JO NUMBER */}
                      <td>
                        {p.pr.jo_header_id ? (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            JO-{String(p.pr.jo_header_id).padStart(5, "0")}
                            <Button
                              componentType="link"
                              bgColor="rgba(239,239,239,1)"
                              borderColor="rgba(223,223,223,1)"
                              textColor="black"
                              style={{ padding: "7px 7px", flexShrink: 0 }}
                              href={`/mr/${p.pr.jo_header_id}`}
                              target="_blank"
                            >
                              <img src={externalLinkIcon} alt="external link" />
                            </Button>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                      {/* PROJECT */}
                      <td>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                        >
                          {p.pr.project_name || "-"}
                        </span>
                      </td>

                      {/* TOTAL AMOUNT */}
                      <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                        AED {formatAED(Number(p.amount))}
                      </td>

                      {/* PAYMENT DATE */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(p.created_at)}
                      </td>

                      {/* PAYMENT */}
                      <td>
                        {receiptUrl ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <span>PAY-{String(p.id).padStart(5, "0")}</span>
                            <Button
                              componentType="link"
                              bgColor="rgba(239,239,239,1)"
                              borderColor="rgba(223,223,223,1)"
                              textColor="black"
                              href={receiptUrl}
                              target="_blank"
                              style={{ padding: "7px 7px", flexShrink: 0 }}
                            >
                              <img src={externalLinkIcon} alt="open" />
                            </Button>
                          </div>
                        ) : (
                          <span style={{ color: "#aaa" }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} />
                  <td style={{ fontWeight: "600", whiteSpace: "nowrap" }}>
                    AED{" "}
                    {formatAED(
                      allPayments.reduce((s, p) => s + Number(p.amount), 0),
                    )}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* ── Record Payment Modal ─────────────────────────────────────────────── */}
      <RecordPrPaymentForm
        prs={selectedPRs.map((pr) => ({
          id: pr.id,
          outstanding: Math.max(
            0,
            computeAfterRetention(pr.pr_lines) -
              pr.payments.reduce((s, p) => s + Number(p.amount), 0),
          ),
        }))}
        subcontractorName={subcontractor?.name ?? ""}
        recordedBy={userInfo?.name || userInfo?.email || "Finance"}
        isOpen={isRecordOpen}
        setIsOpen={setIsRecordOpen}
        onSuccess={() => {
          setCheckedIds(new Set());
          fetchAll();
        }}
      />
    </>
  );
}
