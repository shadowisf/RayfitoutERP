"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "@/app/components/Button";
import { BoqLine } from "../types/boqLine";
import TransactionDetailsPopUpButton from "@/app/(protected)/inventory/[id]/components/_IssueDetailsPopUpButton";
import LinkDeliveryNoteButton from "./_LinkDeliveryNoteButton";

type LpoLine = {
  lpo_id: number;
  mr_header_id: number;
  material_description: string;
  quantity: number | null;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
};

type DeliveryNote = {
  transaction_id: number;
  type: string;
  from_location: string;
  to_location: string | null;
  purpose: string;
  receiver_name: string | null;
  received: number;
  created_on: string;
  descriptions: string[] | null;
};

type LinkedBoqDetailsProps = {
  item: BoqLine;
  categoryIndex: number;
  subCategoryIndex: number;
  itemIndex: number;
};

export default function LinkedBoqDetails({
  item,
  categoryIndex,
  subCategoryIndex,
  itemIndex,
}: LinkedBoqDetailsProps) {
  const itemNumber = `${categoryIndex + 1}.${subCategoryIndex + 1}.${itemIndex + 1}`;
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [lpoLines, setLpoLines] = useState<LpoLine[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loadingLpo, setLoadingLpo] = useState(false);
  const [loadingDn, setLoadingDn] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [linkPopupOpen, setLinkPopupOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const openDrawer = () => {
    setIsOpen(true);
    requestAnimationFrame(() => setVisible(true));
  };

  const closeDrawer = () => {
    setVisible(false);
    setTimeout(() => setIsOpen(false), 300);
  };

  const fetchDeliveryNotes = () => {
    setLoadingDn(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getDeliveryNotesByBoqLineID?boq_line_id=${item.id}`,
    )
      .then((r) => r.json())
      .then((data) => setDeliveryNotes(Array.isArray(data) ? data : []))
      .catch(() => setDeliveryNotes([]))
      .finally(() => setLoadingDn(false));
  };

  useEffect(() => {
    if (!isOpen) return;

    setLoadingLpo(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getMrLinesByBoqLineID?boq_line_id=${item.id}`,
    )
      .then((r) => r.json())
      .then((data) => setLpoLines(Array.isArray(data) ? data : []))
      .catch(() => setLpoLines([]))
      .finally(() => setLoadingLpo(false));

    fetchDeliveryNotes();
  }, [isOpen, item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const formatQty = (q: number | string | null | undefined) => {
    if (q == null) return "-";
    const n = Number(q);
    if (isNaN(n)) return "-";
    return Number.isInteger(n)
      ? n.toLocaleString()
      : n.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        });
  };

  const formatMoney = (n: number | string | null | undefined) => {
    if (n == null) return "-";
    const v = Number(n);
    if (isNaN(v)) return "-";
    return v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor="rgba(239,239,239,1)"
        borderColor="rgba(223,223,223,1)"
        textColor="black"
        style={{ padding: "7px 7px" }}
        onClick={(e) => {
          e.preventDefault();
          openDrawer();
        }}
      >
        <img src="/icons/folder.svg" alt="linked details" />
      </Button>

      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={closeDrawer}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.35)",
                zIndex: selectedTransactionId !== null || linkPopupOpen ? 998 : 9998,
                opacity: visible ? 1 : 0,
                transition: "opacity 300ms ease",
              }}
            />

            {/* Drawer */}
            <div
              ref={drawerRef}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "min(700px, 90vw)",
                backgroundColor: "white",
                zIndex: selectedTransactionId !== null || linkPopupOpen ? 999 : 9999,
                display: "flex",
                flexDirection: "column",
                boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
                transform: visible ? "translateX(0)" : "translateX(100%)",
                transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 24px",
                  borderBottom: "1px solid rgba(232,232,232,1)",
                  flexShrink: 0,
                  gap: "16px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "16px" }}>
                  {itemNumber} — {item.item_name}
                </h2>
                <button
                  onClick={closeDrawer}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-label="Close"
                >
                  <img
                    src="/icons/cross.svg"
                    alt="close"
                    className="form-close-btn"
                  />
                </button>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                {/* ── LPO LINES ── */}
                <section style={{ marginBottom: "36px" }}>
                  <h3
                    style={{
                      margin: "0 0 12px",
                      fontSize: "13px",
                      textTransform: "uppercase",
                    }}
                  >
                    MATERIAL REQUESTS
                  </h3>

                  {loadingLpo ? (
                    <SkeletonTable cols={4} rows={3} />
                  ) : lpoLines.length === 0 ? (
                    <EmptyState text="No material requests linked to this bill of quantity item" />
                  ) : (
                    <table
                      className="items-table"
                      style={{ tableLayout: "fixed", width: "100%" }}
                    >
                      <colgroup>
                        <col style={{ width: "125px" }} />
                        <col />
                        <col style={{ width: "100px" }} />
                        <col style={{ width: "150px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>LPO NUMBER</th>
                          <th>MATERIAL</th>
                          <th>QTY</th>
                          <th>UNIT PRICE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lpoLines.map((line, idx) => (
                          <tr key={`${line.lpo_id}-${idx}`}>
                            <td>
                              <a
                                href={`/mr/${line.mr_header_id}/lpo/${line.lpo_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "rgba(37,150,190,1)",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                }}
                              >
                                LPO-{String(line.lpo_id).padStart(5, "0")}
                              </a>
                            </td>
                            <td style={{ wordBreak: "break-word" }}>
                              {line.material_description}
                            </td>
                            <td>
                              {line.quantity != null
                                ? `${formatQty(line.quantity)} ${line.unit}`
                                : "-"}
                            </td>
                            <td>
                              {line.unit_price != null
                                ? `AED ${formatMoney(line.unit_price)}`
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot
                        style={{ borderTop: "1px solid rgba(232,223,223,1)" }}
                      >
                        <tr>
                          <td></td>
                          <td>
                            <h3>TOTAL</h3>
                          </td>
                          <td></td>
                          <td>
                            <h3>
                              AED{" "}
                              {formatMoney(
                                lpoLines.reduce(
                                  (sum, l) =>
                                    sum + (Number(l.total_price) || 0),
                                  0,
                                ),
                              )}
                            </h3>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </section>

                {/* ── DELIVERY NOTES ── */}
                <section>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        textTransform: "uppercase",
                      }}
                    >
                      Delivery Notes
                    </h3>
                    <LinkDeliveryNoteButton
                      boqLineId={item.id}
                      onLinked={fetchDeliveryNotes}
                      onOpen={() => setLinkPopupOpen(true)}
                      onClose={() => setLinkPopupOpen(false)}
                    />
                  </div>

                  {loadingDn ? (
                    <SkeletonTable cols={3} rows={3} />
                  ) : deliveryNotes.length === 0 ? (
                    <EmptyState text="No delivery notes linked to this bill of quantity item" />
                  ) : (
                    <table className="items-table">
                      <colgroup>
                        <col style={{ width: "175px" }} />
                        <col />
                        <col style={{ width: "175px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>TRANSACTION NUMBER</th>
                          <th>DESCRIPTION</th>
                          <th>TRANSFER TYPE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryNotes.map((dn) => (
                          <tr key={dn.transaction_id}>
                            <td>
                              <button
                                onClick={() => setSelectedTransactionId(dn.transaction_id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                  color: "rgba(37,150,190,1)",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  fontSize: "inherit",
                                }}
                              >
                                TA-{String(dn.transaction_id).padStart(5, "0")}
                              </button>
                            </td>
                            <td style={{ wordBreak: "break-word" }}>
                              {dn.descriptions && dn.descriptions.filter(Boolean).length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {dn.descriptions.filter(Boolean).map((d, i) => (
                                    <span key={i}>{d}</span>
                                  ))}
                                </div>
                              ) : "-"}
                            </td>
                            <td>{dn.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              </div>
            </div>

            {/* Transaction detail popup — rendered inside the portal so it layers above the drawer */}
            {selectedTransactionId !== null && (
              <TransactionDetailsPopUpButton
                transferID={selectedTransactionId}
                autoOpen
                onClose={() => setSelectedTransactionId(null)}
              />
            )}
          </>,
          document.body,
        )}
    </>
  );
}

function SkeletonTable({ cols, rows }: { cols: number; rows: number }) {
  return (
    <table className="items-table" style={{ width: "100%" }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}>
              <div
                className="skeleton-pulse"
                style={{ height: "10px", borderRadius: "4px", width: "60%" }}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <div
                  className="skeleton-pulse"
                  style={{ height: "13px", borderRadius: "4px" }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "24px",
        textAlign: "center",
        color: "rgba(150,150,150,1)",
        fontSize: "13px",
        border: "1px dashed rgba(220,220,220,1)",
        borderRadius: "8px",
      }}
    >
      {text}
    </div>
  );
}
