"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { MrHeader } from "../[id]/types/mrHeader";
import { useRefresh } from "@/app/context/RefreshContext";

type Props = {
  selectedMrIds: Set<number>;
  setSelectedMrIds: (ids: Set<number>) => void;
  mrHeaders: MrHeader[];
  onRefresh?: () => void;
};

export default function MassPriceApprovalButton({
  selectedMrIds,
  setSelectedMrIds,
  mrHeaders,
  onRefresh,
}: Props) {
  const router = useRouter();
  const { refresh } = useRefresh();

  const { userInfo } = useAuth();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [autoSelectOpen, setAutoSelectOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");

  const diamondIcon = "/icons/diamond.svg";
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node))
        setActionsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function flattenLineIds(grouped: any): number[] {
    const ids: number[] = [];
    for (const category in grouped) {
      for (const subCategory in grouped[category]) {
        for (const supplier in grouped[category][subCategory]) {
          const items = grouped[category][subCategory][supplier];
          if (Array.isArray(items))
            items.forEach((item: any) => ids.push(item.id));
        }
      }
    }
    return ids;
  }

  async function fetchMrLineIds(mrHeaderId: number): Promise<number[]> {
    const res = await fetch("/api/mr/getMrLinesByMrHeaderID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mrHeaderId }),
    });
    if (!res.ok) return [];
    const grouped = await res.json();
    return flattenLineIds(grouped);
  }

  async function fetchJoLineIds(mrHeaderId: number): Promise<number[]> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getJoLinesByMrHeaderID",
        mr_header_id: mrHeaderId,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map((l: any) => l.id) : [];
  }

  async function fetchPrLineIds(mrHeaderId: number): Promise<number[]> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getPrLines", mr_header_id: mrHeaderId }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((l: any) => l.id).filter(Boolean)
      : [];
  }

  // ── AUTO SELECT ──────────────────────────────────────────────────────────

  async function handleAutoSelect() {
    setAutoSelectOpen(false);

    const mrIds = Array.from(selectedMrIds);
    let success = 0;
    let failed = 0;

    for (const mrId of mrIds) {
      const mrHeader = mrHeaders.find((m) => m.id === mrId);
      const type = mrHeader?.type ?? "material";

      try {
        if (type === "material") {
          // ── MR: select cheapest quotation per line, submit to LPO ────────
          const lineIds = await fetchMrLineIds(mrId);
          if (lineIds.length === 0) {
            failed++;
            continue;
          }

          const approvedSuppliers: {
            mr_line_id: number;
            quotation_id: number;
          }[] = [];

          for (const lineId of lineIds) {
            const qRes = await fetch(
              "/api/supplier/getAllSupplierAndQuotationByMrLineID",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: lineId }),
              },
            );
            if (!qRes.ok) continue;
            const quotations = await qRes.json();
            if (!Array.isArray(quotations) || quotations.length === 0) continue;

            const lowest = quotations.reduce((prev: any, curr: any) =>
              Number(curr.total_price) < Number(prev.total_price) ? curr : prev,
            );

            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "approveSupplierAndQuotation",
                quotation_id: lowest.id,
                mr_line_id: lineId,
                supplier_id: lowest.supplier_id,
              }),
            });

            approvedSuppliers.push({
              mr_line_id: lineId,
              quotation_id: lowest.quotation_id || lowest.id,
            });
          }

          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "deleteNonApprovedQuotationFiles",
              approved_suppliers: approvedSuppliers,
            }),
          });

          const submitRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "submitForLPO",
                id: mrId,
                changed_by: userInfo?.name,
              }),
            },
          );

          submitRes.ok ? success++ : failed++;
        } else if (type === "job") {
          // ── JO: select cheapest subcontractor per BOQ item, submit to LPO & Invoice ──
          const lineIds = await fetchJoLineIds(mrId);
          if (lineIds.length === 0) {
            failed++;
            continue;
          }

          for (const joLineId of lineIds) {
            // Fetch BOQ items for this JO line (mirrors Smart Select in JoPriceApprovalButton)
            const boqRes = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "getBoqLinesWithDetailsByJoLineID",
                  jo_line_id: joLineId,
                }),
              },
            );
            if (!boqRes.ok) continue;
            const boqItems = await boqRes.json();
            if (!Array.isArray(boqItems) || boqItems.length === 0) continue;

            for (const boqItem of boqItems) {
              const qRes = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor/getAllSubcontractorAndQuotationByJoLineID`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: joLineId,
                    boq_line_id: boqItem.boq_line_id,
                  }),
                },
              );
              if (!qRes.ok) continue;
              const quotations = await qRes.json();
              if (!Array.isArray(quotations) || quotations.length === 0)
                continue;

              const lowest = quotations.reduce((prev: any, curr: any) =>
                Number(curr.total_price) < Number(prev.total_price)
                  ? curr
                  : prev,
              );

              await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "approveSubcontractorQuotation",
                    quotation_id: lowest.id,
                    jo_line_id: joLineId,
                    boq_line_id: boqItem.boq_line_id,
                  }),
                },
              );
            }
          }

          const submitRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "submitJoToLpoAndInvoice",
                id: mrId,
                changed_by: userInfo?.name,
              }),
            },
          );

          submitRes.ok ? success++ : failed++;
        } else if (type === "payment") {
          // ── PR: approve all pr_lines, submit for completion ──────────────
          const lineIds = await fetchPrLineIds(mrId);

          await Promise.all(
            lineIds.map((lineId) =>
              fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "approvePrLine",
                  pr_line_id: lineId,
                }),
              }),
            ),
          );

          const submitRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "submitPrForPayment",
                id: mrId,
                changed_by: userInfo?.name,
              }),
            },
          );

          submitRes.ok ? success++ : failed++;
        }
      } catch (err) {
        console.error(`Error processing ${type} ${mrId}:`, err);
        failed++;
      }
    }

    setSelectedMrIds(new Set());

    if (success > 0 && failed === 0) {
      toast(
        `Mass auto-select: ${success} item${success > 1 ? "s" : ""} submitted`,
        "success",
      );
    } else if (success > 0) {
      toast(
        `Mass auto-select: ${success} submitted, ${failed} failed`,
        "warning",
      );
    } else {
      toast("Mass auto-select failed", "error");
    }

    onRefresh && onRefresh();
    await refresh();
  }

  // ── REJECT ───────────────────────────────────────────────────────────────

  async function handleReject() {
    setRejectOpen(false);

    const mrIds = Array.from(selectedMrIds);
    let success = 0;
    let failed = 0;

    for (const mrId of mrIds) {
      const mrHeader = mrHeaders.find((m) => m.id === mrId);
      const type = mrHeader?.type ?? "material";

      try {
        if (type === "material") {
          // ── MR: reject all quotations → price rejected (11) ──────────────
          const lineIds = await fetchMrLineIds(mrId);

          await Promise.all(
            lineIds.map((lineId) =>
              fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "rejectAllSupplierAndQuotation",
                  reject_comment: rejectText,
                  mr_line_id: lineId,
                }),
              }),
            ),
          );

          const submitRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "submitForPricingResubmission",
                id: mrId,
                changed_by: userInfo?.name,
                user_name: userInfo?.name,
                user_role: userInfo?.role,
              }),
            },
          );

          submitRes.ok ? success++ : failed++;
        } else if (type === "job") {
          // ── JO: reject all subcontractor quotations → price rejected (11) ─
          const lineIds = await fetchJoLineIds(mrId);

          await Promise.all(
            lineIds.map((joLineId) =>
              fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "rejectAllSubcontractorQuotations",
                  reject_comment: rejectText,
                  jo_line_id: joLineId,
                }),
              }),
            ),
          );

          const submitRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "submitForPricingResubmission",
                id: mrId,
                changed_by: userInfo?.name,
                user_name: userInfo?.name,
                user_role: userInfo?.role,
              }),
            },
          );

          submitRes.ok ? success++ : failed++;
        } else if (type === "payment") {
          // ── PR: reject all pr_lines → request rejected (5) ───────────────
          const lineIds = await fetchPrLineIds(mrId);

          await Promise.all(
            lineIds.map((lineId) =>
              fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "rejectPrLine",
                  pr_line_id: lineId,
                  comment: rejectText,
                }),
              }),
            ),
          );

          const submitRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "submitPrForRejection",
                id: mrId,
                changed_by: userInfo?.name,
                department_id: mrHeader?.department_id,
                from_progress_id: 10,
              }),
            },
          );

          submitRes.ok ? success++ : failed++;
        }
      } catch (err) {
        console.error(`Error rejecting ${type} ${mrId}:`, err);
        failed++;
      }
    }

    setSelectedMrIds(new Set());
    setRejectText("");

    if (success > 0 && failed === 0) {
      toast(
        `Mass reject: ${success} item${success > 1 ? "s" : ""} rejected`,
        "success",
      );
    } else if (success > 0) {
      toast(`Mass reject: ${success} rejected, ${failed} failed`, "warning");
    } else {
      toast("Mass reject failed", "error");
    }

    onRefresh && onRefresh();
    await refresh();
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    backgroundColor: "white",
    border: "1px solid rgba(207, 207, 207, 1)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    zIndex: 200,
    minWidth: "240px",
    overflow: "hidden",
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 16px",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "black",
    fontWeight: "600",
    fontSize: "13px",
  };

  const selectedCount = selectedMrIds.size;
  const selectedTypes = Array.from(selectedMrIds)
    .map((id) => mrHeaders.find((m) => m.id === id)?.type ?? "material")
    .reduce(
      (acc, t) => {
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  const typeSummary = Object.entries(selectedTypes)
    .map(
      ([t, n]) =>
        `${n} ${t === "material" ? "MR" : t === "job" ? "JO" : "PR"}${n > 1 ? "s" : ""}`,
    )
    .join(", ");

  return (
    <>
      <div ref={actionsRef} style={{ position: "relative" }}>
        <Button
          componentType="button"
          bgColor={selectedCount === 0 ? "white" : "black"}
          borderColor={selectedCount === 0 ? "rgba(211, 211, 211, 1)" : "black"}
          textColor={selectedCount === 0 ? "black" : "white"}
          disabled={selectedCount === 0}
          onClick={() => selectedCount > 0 && setActionsOpen((v) => !v)}
        >
          ACTIONS
        </Button>

        {actionsOpen && (
          <div style={dropdownStyle}>
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                setAutoSelectOpen(true);
              }}
              style={dropdownItemStyle}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.backgroundColor =
                  "rgba(245,245,245,1)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.backgroundColor =
                  "transparent")
              }
            >
              <span>Auto select ({selectedCount})</span>
              <img src={diamondIcon} alt="smart select" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                setRejectOpen(true);
              }}
              style={dropdownItemStyle}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.backgroundColor =
                  "rgba(245,245,245,1)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.backgroundColor =
                  "transparent")
              }
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Auto-select confirmation */}
      {autoSelectOpen && (
        <FormPopUp
          header="MASS APPROVE REQUESTS"
          setIsOpen={(open) => {
            if (!open) setAutoSelectOpen(false);
          }}
          handleSubmit={(e) => {
            e.preventDefault();
            handleAutoSelect();
          }}
          addButtonLabel="CONFIRM"
        >
          <p>Are you sure you want to mass approve {typeSummary}?</p>
        </FormPopUp>
      )}

      {/* Reject confirmation */}
      {rejectOpen && (
        <FormPopUp
          header="MASS REJECT"
          setIsOpen={(open) => {
            if (!open) {
              setRejectOpen(false);
              setRejectText("");
            }
          }}
          handleSubmit={(e) => {
            e.preventDefault();
            handleReject();
          }}
          addButtonLabel="CONFIRM"
        >
          <p>Are you sure you want to reject {typeSummary}?</p>
          <p
            style={{
              marginTop: "6px",
              marginBottom: "16px",
              color: "rgba(100,100,100,1)",
              fontSize: "13px",
            }}
          >
            • MRs &amp; JOs → Price Approval Rejected
            <br />• PRs → Request Rejected
          </p>
          <div className="input-row full">
            <InputItem
              label="REASON"
              value={rejectText}
              type="textarea"
              required
              onChange={(e) => setRejectText(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
