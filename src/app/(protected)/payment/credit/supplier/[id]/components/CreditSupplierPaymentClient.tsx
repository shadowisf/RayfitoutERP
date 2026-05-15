"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/app/context/AuthContext";
import { formatPriceAED } from "@/lib/formatPrice";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import RecordPaymentForm from "@/app/(protected)/payment/components/_RecordPaymentForm";
import DocumentsPopup from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/storekeeper/_DocumentPopUpButton";
import BoqReferencePopUp from "@/app/(protected)/mr/components/BoqReferencePopUp";
import InputItem from "@/app/components/InputItem";

// ── Types ─────────────────────────────────────────────────────────────────────

type LpoLine = {
  lpo_mr_line_id: number;
  lpo_id: number;
  mr_line_id: number;
  lpo_unit_price: number;
  lpo_total_price: number;
  material_description: string;
  specification: string;
  brand: string;
  qty: number;
  unit: string;
  material_category: string | null;
  material_subcategory: string | null;
  boq_line_reference: string | null;
  boq_line_ids: string | null;
};

type Payment = {
  id: number;
  lpo_id: number;
  amount: number;
  payment_type: string;
  payment_method: string;
  receipt_file: string | null;
  supplier_statement: string | null;
  created_at: string;
};

type Lpo = {
  id: number;
  mr_header_id: number;
  supplier_id: number;
  progress_id: number;
  payment_status: string | null;
  payment_terms: string | null;
  total: number;
  outstanding: number;
  total_paid: number;
  is_paid: number;
  invoice_file: string | null;
  payment_file: string | null;
  signed_file: string | null;
  project_id: number | null;
  project_name: string | null;
  requested_by: string | null;
  required_date: string | null;
  created_at: string;
  lpo_mr_lines: LpoLine[];
  payments: Payment[];
};

type Supplier = {
  id: number;
  name: string;
  type: string;
  payment_terms: string | null;
  due_date: string | null;
  credit_limit: number | null;
  contact_person_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  trn_number: string | null;
  trn_certificate: string | null;
  trade_license: string | null;
  notes: string | null;
  material_categories: string | null;
  material_subcategories: string | null;
};

type Stats = {
  creditOutstanding: number;
  pastPayments: number;
  lpoCount: number;
};

type Transaction = {
  lpo_id: number;
  payment_entry_id: number | null;
  mr_header_id: number;
  display_id: string;
  vendor_name: string;
  vendor_type: string;
  requester: string;
  project_name: string;
  payment_status: string | null;
  total: number;
  payment_date: string | null;
  created_at: string;
  payment_file: string | null;
  supplier_statement: string | null;
  material_categories: string[];
};

const ITEMS_PER_PAGE = 30;

type Props = { supplierId: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(raw: string | null): string {
  if (!raw) return "N/A";
  const d = new Date(raw);
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function parseFiles(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter(Boolean) : [];
  } catch {
    return raw.startsWith("http") ? [raw] : [];
  }
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreditSupplierPaymentClient({ supplierId }: Props) {
  const { userInfo } = useAuth();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [lpos, setLpos] = useState<Lpo[]>([]);
  const [stats, setStats] = useState<Stats>({
    creditOutstanding: 0,
    pastPayments: 0,
    lpoCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Selection
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  // Tab
  const [activeTab, setActiveTab] = useState<"unpaid" | "history">("unpaid");

  // History transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [txSortCol, setTxSortCol] = useState<string | null>(null);
  const [txSortDir, setTxSortDir] = useState<"asc" | "desc">("desc");

  // Record payment modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  // Due date edit
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState("");
  const [dueDateSaving, setDueDateSaving] = useState(false);

  const externalLinkIcon = "/icons/external-link.svg";
  const contactPersonIcon = "/icons/supplier-contact-person.svg";
  const trnIcon = "/icons/supplier-trn.svg";
  const bankIcon = "/icons/supplier-bank.svg";
  const pencilIcon = "/icons/pencil.svg";

  // ── Fetch both in parallel ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [lpoRes, txRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getCreditSupplierData`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supplier_id: supplierId }),
          },
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getSupplierTransactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supplier_id: supplierId }),
          },
        ),
      ]);
      const [lpoData, txData] = await Promise.all([
        lpoRes.json(),
        txRes.json(),
      ]);
      if (lpoData.success) {
        setSupplier(lpoData.supplier);
        setLpos(lpoData.lpos);
        setStats(lpoData.stats);
        const unpaidIds = (lpoData.lpos as Lpo[])
          .filter((l) => !l.is_paid)
          .map((l) => l.id);
        setCheckedIds(new Set(unpaidIds));
      }
      if (txData.success) setTransactions(txData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Due date save ──────────────────────────────────────────────────────────
  const handleSaveDueDate = async () => {
    if (!dueDateInput) return;
    setDueDateSaving(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/updateSupplierDueDate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: supplierId,
            due_date: dueDateInput,
          }),
        },
      );
      setDueDateOpen(false);
      fetchAll();
    } finally {
      setDueDateSaving(false);
    }
  };

  // ── Checkbox helpers ───────────────────────────────────────────────────────
  const unpaidLpos = lpos.filter((l) => !l.is_paid);
  const paidLpos = lpos.filter((l) => l.is_paid);

  const searchQ = txSearchQuery.trim().toLowerCase();
  const filteredUnpaidLpos = searchQ
    ? unpaidLpos.filter(
        (l) =>
          `lpo-${String(l.id).padStart(5, "0")}`.includes(searchQ) ||
          (l.project_name ?? "").toLowerCase().includes(searchQ) ||
          (l.requested_by ?? "").toLowerCase().includes(searchQ),
      )
    : unpaidLpos;
  const displayLpos = activeTab === "unpaid" ? filteredUnpaidLpos : paidLpos;

  const allChecked =
    displayLpos.length > 0 && displayLpos.every((l) => checkedIds.has(l.id));
  const someChecked = displayLpos.some((l) => checkedIds.has(l.id));

  const toggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(displayLpos.map((l) => l.id)));
    }
  };

  const toggleOne = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Selected LPOs total outstanding ───────────────────────────────────────
  const selectedLpos = lpos.filter((l) => checkedIds.has(l.id));
  const selectedOutstanding = selectedLpos.reduce(
    (s, l) => s + Number(l.outstanding),
    0,
  );

  // ── Avatar letter ──────────────────────────────────────────────────────────
  const avatarLetter = (supplier?.name ?? "?")[0].toUpperCase();

  // ── Supplier initial / avatar color ───────────────────────────────────────
  const avatarColor = "#1a1a1a";

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        Loading supplier data…
      </div>
    );
  }

  if (!supplier) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        Supplier not found.
      </div>
    );
  }

  return (
    <>
      {/* ── Supplier Header ─────────────────────────────────────────────────── */}
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
                <small>VENDOR NAME</small>
                <h2>{supplier.name.toUpperCase()}</h2>
              </div>
            </div>

            {/* Meta row — moved inside left group */}
            <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
              <div>
                <small>VENDOR NUMBER</small>
                <h2>VEN-{String(supplier.id).padStart(5, "0")}</h2>
              </div>
              <div>
                <small>CATEGORIES</small>
                <h2>{supplier.material_categories || "N/A"}</h2>
              </div>
              <div>
                <small>VENDOR TYPE</small>
                <h2>{supplier.type}</h2>
              </div>
              <div>
                <small>CREDIT TERMS</small>
                <h2>{supplier.payment_terms || "N/A"}</h2>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div>
                  <small>DUE DATE</small>
                  <h2>
                    {supplier.due_date
                      ? new Date(supplier.due_date).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "N/A"}
                  </h2>
                </div>
                <Button
                  componentType={"button"}
                  bgColor="rgba(239,239,239,1)"
                  borderColor="rgba(223,223,223,1)"
                  textColor={"black"}
                  onClick={() => {
                    setDueDateInput(
                      supplier.due_date
                        ? new Date(supplier.due_date)
                            .toISOString()
                            .split("T")[0]
                        : "",
                    );
                    setDueDateOpen(true);
                  }}
                  style={{ padding: "7px 7px" }}
                >
                  <img src={pencilIcon} alt="edit" />
                </Button>
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
                          {supplier.notes || "-"}
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
            {/* ── Reusable circle button layout ── */}
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
                      <h2>{supplier.trn_number || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>TRN CERTIFICATE</small>
                      <h2>
                        {supplier.trn_certificate ? (
                          <Button
                            componentType="link"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            href={supplier.trn_certificate}
                            style={{
                              padding: "7px 7px",
                            }}
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
                        {supplier.trade_license ? (
                          <Button
                            componentType="link"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            href={supplier.trade_license}
                            style={{
                              padding: "7px 7px",
                            }}
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
                  <div>
                    <small>NOTES</small>
                    <h2>{supplier.notes || "-"}</h2>
                  </div>
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
                setTxPage(1);
                setTxSearchQuery("");
              }}
            >
              {tab === "unpaid" ? "UNPAID PAYMENT" : "HISTORY TRANSACTION"}
            </Button>
          ))}
        </div>

        {/* Right: record payment button + search bar (always visible) */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            componentType="button"
            bgColor={
              selectedLpos.length === 0
                ? "rgba(180,180,180,1)"
                : "rgba(0, 163, 93, 1)"
            }
            borderColor={
              selectedLpos.length === 0
                ? "rgba(180,180,180,1)"
                : "rgba(0, 163, 93, 1)"
            }
            textColor="white"
            disabled={selectedLpos.length === 0}
            onClick={() => {
              if (selectedLpos.length === 0) return;
              setIsRecordOpen(true);
            }}
          >
            RECORD PAYMENT ({formatPriceAED(selectedOutstanding)})
          </Button>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="SEARCH"
              value={txSearchQuery}
              onChange={(e) => {
                setTxSearchQuery(e.target.value);
                setTxPage(1);
              }}
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
            label: "Credit Outstanding Amount",
            value: `${formatAED(stats.creditOutstanding)} AED`,
          },
          {
            label: "Past Payments",
            value: `${formatAED(transactions.reduce((s, r) => s + r.total, 0))} AED`,
          },
          {
            label: "Total LPOs",
            value: `${stats.lpoCount} LPO${stats.lpoCount !== 1 ? "s" : ""}`,
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
        /* ── LPO List ──────────────────────────────────────────────────────── */
        displayLpos.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#aaa",
              padding: "40px",
              background: "white",
              borderRadius: "10px",
            }}
          >
            No unpaid LPOs.
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {displayLpos.map((lpo) => {
              const isChecked = checkedIds.has(lpo.id);

              return (
                <div key={lpo.id} className="mr-with-id">
                  {/* LPO header row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      marginBottom: "16px",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleOne(lpo.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(lpo.id)}
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <small>LPO NUMBER</small>
                          <h2>LPO-{String(lpo.id).padStart(5, "0")}</h2>
                        </div>
                        <Button
                          componentType="link"
                          bgColor="rgba(239,239,239,1)"
                          borderColor="rgba(223,223,223,1)"
                          textColor="black"
                          style={{ padding: "7px 7px" }}
                          href={`/mr/${lpo.mr_header_id}/lpo/${lpo.id}`}
                          target="_blank"
                        >
                          <img src={externalLinkIcon} alt="external link" />
                        </Button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <small>PROJECT</small>
                          <h2>{lpo.project_name || "-"}</h2>
                        </div>

                        <Button
                          componentType="link"
                          bgColor="rgba(239,239,239,1)"
                          borderColor="rgba(223,223,223,1)"
                          textColor="black"
                          style={{ padding: "7px 7px" }}
                          href={`/mr/${lpo.mr_header_id}/lpo/${lpo.id}`}
                          target="_blank"
                        >
                          <img src={externalLinkIcon} alt="external link" />
                        </Button>
                      </div>
                      <div>
                        <small>REQUESTED BY</small>
                        <h2>{lpo.requested_by || "-"}</h2>
                      </div>
                      <div>
                        <small>DUE DATE</small>
                        <h2>{fmtDate(supplier?.due_date)}</h2>
                      </div>
                    </div>

                    {/* Documents button */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <DocumentsPopup lpoId={lpo.id} />
                    </div>
                  </div>

                  {/* Lines table */}
                  {lpo.lpo_mr_lines.length > 0 && (
                    <div style={{ overflowX: "auto" }}>
                      <table className="items-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>CATEGORIES</th>
                            <th>SUBCATEGORIES</th>
                            <th>MATERIAL</th>
                            <th>QTY</th>
                            <th>BRAND &amp; SPECS</th>
                            <th>BOQ REF</th>
                            <th>NOTES</th>
                            <th>UNIT PRICE</th>
                            <th>TOTAL PRICE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lpo.lpo_mr_lines.map((line, i) => (
                            <tr key={line.lpo_mr_line_id}>
                              <td>{i + 1}</td>
                              <td>{line.material_category || "-"}</td>
                              <td>{line.material_subcategory || "-"}</td>
                              <td>{line.material_description || "-"}</td>
                              <td>
                                {Number.isInteger(Number(line.qty))
                                  ? Number(line.qty)
                                  : parseFloat(
                                      Number(line.qty).toFixed(3),
                                    )}{" "}
                                {line.unit}
                              </td>
                              <td>
                                {line.brand || line.specification ? (
                                  <InfoPopUpButton
                                    header="BRAND & SPECS"
                                    text={
                                      <div>
                                        <small>BRAND</small>
                                        <h2 style={{ whiteSpace: "pre-wrap" }}>
                                          {line.brand || "-"}
                                        </h2>
                                        <br />
                                        <small>SPECS</small>
                                        <h2 style={{ whiteSpace: "pre-wrap" }}>
                                          {line.specification || "-"}
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
                                      alt="brand & specs"
                                    />
                                  </InfoPopUpButton>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>
                              <td>
                                {line.boq_line_ids ? (
                                  <BoqReferencePopUp
                                    mrHeader={
                                      {
                                        project_id: lpo.project_id,
                                      } as any
                                    }
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
                                {line.specification ? (
                                  <InfoPopUpButton
                                    header="NOTES"
                                    text={line.specification}
                                    bgColor="rgba(239,239,239,1)"
                                    borderColor="rgba(223,223,223,1)"
                                    textColor="black"
                                    style={{ padding: "7px 7px" }}
                                  >
                                    <img
                                      src={externalLinkIcon}
                                      alt="view notes"
                                    />
                                  </InfoPopUpButton>
                                ) : (
                                  <span
                                    style={{ color: "rgba(150,150,150,1)" }}
                                  >
                                    -
                                  </span>
                                )}
                              </td>
                              <td>{formatPriceAED(line.lpo_unit_price)}</td>
                              <td>{formatPriceAED(line.lpo_total_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          {/* ── Subtotals ── */}
                          <tr>
                            <td colSpan={8} />
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
                              {formatPriceAED(
                                lpo.lpo_mr_lines.reduce(
                                  (s, l) => s + Number(l.lpo_total_price),
                                  0,
                                ),
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={8} />
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

                          {/* ── Payment rows ── */}
                          {lpo.payments.map((p) => {
                            const receiptUrl = p.receipt_file
                              ? p.receipt_file.replace(/^"+|"+$/g, "")
                              : null;
                            const statementUrl = p.supplier_statement
                              ? p.supplier_statement.replace(/^"+|"+$/g, "")
                              : null;
                            return (
                              <tr key={p.id}>
                                <td colSpan={8} />
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
                                    {statementUrl && (
                                      <Button
                                        componentType="link"
                                        bgColor="rgba(239,239,239,1)"
                                        borderColor="rgba(223,223,223,1)"
                                        textColor="black"
                                        href={statementUrl}
                                        target="_blank"
                                        style={{ padding: "7px 7px" }}
                                      >
                                        <img
                                          src={externalLinkIcon}
                                          alt="statement"
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

                          {/* ── Balance row ── */}
                          {lpo.payments.length > 0 && (
                            <tr>
                              <td colSpan={8} />
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
                                {formatPriceAED(
                                  Math.max(0, Number(lpo.outstanding)),
                                )}
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
        /* ── History Transactions ────────────────────────────────────────────── */
        <HistoryTransactionsTable
          transactions={transactions}
          searchQuery={txSearchQuery}
          currentPage={txPage}
          setCurrentPage={setTxPage}
          sortCol={txSortCol}
          setSortCol={setTxSortCol}
          sortDir={txSortDir}
          setSortDir={setTxSortDir}
        />
      )}

      {/* ── Record Payment modal ─────────────────────────────────────────────── */}
      <RecordPaymentForm
        lpos={selectedLpos.map((l) => ({
          id: l.id,
          mr_header_id: l.mr_header_id,
          outstanding: l.outstanding,
        }))}
        supplierName={supplier?.name ?? ""}
        recordedBy={userInfo?.name || userInfo?.email || "Finance"}
        isOpen={isRecordOpen}
        setIsOpen={setIsRecordOpen}
        showSupplierStatement={true}
        onSuccess={() => {
          setIsRecordOpen(false);
          setCheckedIds(new Set());
          fetchAll();
        }}
      />

      {/* ── Due Date Edit Popup ──────────────────────────────────────────────── */}
      {dueDateOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <FormPopUp
            header="EDIT DUE DATE"
            setIsOpen={setDueDateOpen}
            addButtonLabel={"CONFIRM"}
            handleSubmit={handleSaveDueDate}
            style={{ minWidth: "360px" }}
          >
            <div className="input-row full">
              <InputItem
                label={"REQUIRED DATE"}
                value={dueDateInput}
                type={"date"}
                placeholder={"SELECT DATE"}
                onChange={(e) => setDueDateInput(e.target.value)}
                required
              />
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}

// ── History Transactions sub-component ────────────────────────────────────────

type HistoryTableProps = {
  transactions: Transaction[];
  searchQuery: string;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  sortCol: string | null;
  setSortCol: (c: string | null) => void;
  sortDir: "asc" | "desc";
  setSortDir: (d: "asc" | "desc") => void;
};

function HistoryTransactionsTable({
  transactions,
  searchQuery,
  currentPage,
  setCurrentPage,
  sortCol,
  setSortCol,
  sortDir,
  setSortDir,
}: HistoryTableProps) {
  const externalLinkIcon = "/icons/external-link.svg";
  const ITEMS_PER_PAGE_TX = 30;

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = transactions.filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      row.display_id.toLowerCase().includes(q) ||
      row.requester.toLowerCase().includes(q) ||
      row.project_name.toLowerCase().includes(q)
    );
  });

  // ── Sort ────────────────────────────────────────────────────────────────────
  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortCol];
        const bVal = (b as Record<string, unknown>)[sortCol];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        let cmp: number;
        if (sortCol === "payment_date") {
          cmp =
            new Date(aVal as string).getTime() -
            new Date(bVal as string).getTime();
        } else {
          cmp = (aVal as number) - (bVal as number);
        }
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE_TX));
  const start = (currentPage - 1) * ITEMS_PER_PAGE_TX;
  const paginated = sorted.slice(start, start + ITEMS_PER_PAGE_TX);
  const filteredTotal = sorted.reduce((s, r) => s + r.total, 0);

  // ── Sort icon ────────────────────────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortCol(null);
      setSortDir("desc");
    }
  };

  const sortIcon = (col: string) => (
    <span
      style={{
        marginLeft: 4,
        fontSize: 10,
        opacity: sortCol === col ? 1 : 0.35,
      }}
    >
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  // ── Pagination ───────────────────────────────────────────────────────────────
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      {sorted.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", padding: "40px 0" }}>
          {searchQuery
            ? "No transactions match your search."
            : "No payment history for this supplier."}
        </p>
      ) : (
        <>
          <table
            className="items-table two-toned"
            style={{ width: "100%", tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: "160px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "250px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "200px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>LPO NUMBER</th>
                <th>REQUESTER</th>
                <th>PROJECT</th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("total")}
                >
                  TOTAL AMOUNT{sortIcon("total")}
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("payment_date")}
                >
                  PAYMENT DATE{sortIcon("payment_date")}
                </th>
                <th>PAYMENT</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => (
                <tr key={`${row.lpo_id}-${row.payment_entry_id ?? "legacy"}`}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      {row.display_id}
                      <Button
                        componentType="link"
                        bgColor="rgba(239,239,239,1)"
                        borderColor="rgba(223,223,223,1)"
                        textColor="black"
                        style={{ padding: "7px 7px" }}
                        href={`/mr/${row.mr_header_id}/lpo/${row.lpo_id}`}
                        target="_blank"
                      >
                        <img src={externalLinkIcon} alt="external link" />
                      </Button>
                    </div>
                  </td>
                  <td>
                    {!row.requester || row.requester === "—"
                      ? "-"
                      : row.requester}
                  </td>
                  <td>
                    {!row.project_name || row.project_name === "—"
                      ? "-"
                      : row.project_name}
                  </td>
                  <td>AED {formatAED(row.total)}</td>
                  <td>{formatDate(row.payment_date)}</td>
                  <td>
                    {!row.payment_file ? (
                      <span style={{ color: "#aaa" }}>-</span>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span>
                          PAY-
                          {String(row.payment_entry_id ?? row.lpo_id).padStart(
                            5,
                            "0",
                          )}
                        </span>
                        <Button
                          componentType="link"
                          bgColor="rgba(239,239,239,1)"
                          borderColor="rgba(223,223,223,1)"
                          textColor="black"
                          href={row.payment_file.replace(/^"+|"+$/g, "")}
                          target="_blank"
                          style={{ padding: "7px 7px", flexShrink: 0 }}
                        >
                          <img src={externalLinkIcon} alt="open" />
                        </Button>
                        {row.supplier_statement && (
                          <Button
                            componentType="link"
                            bgColor="rgba(239,239,239,1)"
                            borderColor="rgba(223,223,223,1)"
                            textColor="black"
                            href={row.supplier_statement.replace(
                              /^"+|"+$/g,
                              "",
                            )}
                            target="_blank"
                            style={{ padding: "7px 7px", flexShrink: 0 }}
                          >
                            <img src={externalLinkIcon} alt="statement" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} />
                <td style={{ fontWeight: "600", whiteSpace: "nowrap" }}>
                  AED {formatAED(filteredTotal)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 12px",
                  borderRadius: "5px",
                  border: "1px solid rgba(223,223,223,1)",
                  backgroundColor: "white",
                  color: "black",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  minWidth: "40px",
                  opacity: currentPage === 1 ? 0.4 : 1,
                }}
              >
                ‹
              </button>
              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    typeof page === "number" && setCurrentPage(page)
                  }
                  disabled={page === "..."}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "5px",
                    border: "1px solid rgba(223,223,223,1)",
                    backgroundColor:
                      page === currentPage
                        ? "black"
                        : page === "..."
                          ? "transparent"
                          : "white",
                    color: page === currentPage ? "white" : "black",
                    cursor: page === "..." ? "default" : "pointer",
                    fontWeight: "600",
                    minWidth: "40px",
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 12px",
                  borderRadius: "5px",
                  border: "1px solid rgba(223,223,223,1)",
                  backgroundColor: "white",
                  color: "black",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  minWidth: "40px",
                  opacity: currentPage === totalPages ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
