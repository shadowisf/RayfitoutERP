"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";

type Props = {
  selectedMrIds: Set<number>;
  setSelectedMrIds: (ids: Set<number>) => void;
  onRefresh?: () => void;
};

export default function MassPriceApprovalButton({
  selectedMrIds,
  setSelectedMrIds,
  onRefresh,
}: Props) {
  const router = useRouter();
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

  // Flatten grouped MR lines into a flat array of line IDs
  function flattenLineIds(grouped: any): number[] {
    const ids: number[] = [];
    for (const category in grouped) {
      for (const subCategory in grouped[category]) {
        for (const supplier in grouped[category][subCategory]) {
          const items = grouped[category][subCategory][supplier];
          if (Array.isArray(items)) {
            items.forEach((item: any) => ids.push(item.id));
          }
        }
      }
    }
    return ids;
  }

  // Fetch all MR line IDs for a given MR header
  async function fetchLineIds(mrHeaderId: number): Promise<number[]> {
    const res = await fetch("/api/mr/getMrLinesByMrHeaderID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mrHeaderId }),
    });
    if (!res.ok) return [];
    const grouped = await res.json();
    return flattenLineIds(grouped);
  }

  async function handleAutoSelect() {
    setAutoSelectOpen(false);

    const mrIds = Array.from(selectedMrIds);
    let mrSuccess = 0;
    let mrFailed = 0;

    for (const mrId of mrIds) {
      try {
        const lineIds = await fetchLineIds(mrId);
        if (lineIds.length === 0) {
          mrFailed++;
          continue;
        }

        // For each line, get quotations and approve the cheapest/only one
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

          // Pick cheapest (or only) quotation
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

        // Delete non-approved quotation files
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deleteNonApprovedQuotationFiles",
            approved_suppliers: approvedSuppliers,
          }),
        });

        // Submit to LPO
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

        if (submitRes.ok) {
          mrSuccess++;
        } else {
          mrFailed++;
        }
      } catch (err) {
        console.error(`Error processing MR ${mrId}:`, err);
        mrFailed++;
      }
    }

    setSelectedMrIds(new Set());

    if (mrSuccess > 0 && mrFailed === 0) {
      toast(
        `Mass auto-select: ${mrSuccess} MR${mrSuccess > 1 ? "s" : ""} submitted to LPO`,
        "success",
      );
    } else if (mrSuccess > 0) {
      toast(
        `Mass auto-select: ${mrSuccess} submitted, ${mrFailed} failed`,
        "warning",
      );
    } else {
      toast("Mass auto-select failed", "error");
    }

    onRefresh && onRefresh();
    router.refresh();
  }

  async function handleReject() {
    setRejectOpen(false);

    const mrIds = Array.from(selectedMrIds);
    let mrSuccess = 0;
    let mrFailed = 0;

    for (const mrId of mrIds) {
      try {
        const lineIds = await fetchLineIds(mrId);

        // Reject all quotations for each line
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

        // Submit to Price Approval Rejected (progress 11)
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

        if (submitRes.ok) {
          mrSuccess++;
        } else {
          mrFailed++;
        }
      } catch (err) {
        console.error(`Error rejecting MR ${mrId}:`, err);
        mrFailed++;
      }
    }

    setSelectedMrIds(new Set());
    setRejectText("");

    if (mrSuccess > 0 && mrFailed === 0) {
      toast(
        `Mass reject: ${mrSuccess} MR${mrSuccess > 1 ? "s" : ""} sent to Price Approval Rejected`,
        "success",
      );
    } else if (mrSuccess > 0) {
      toast(
        `Mass reject: ${mrSuccess} rejected, ${mrFailed} failed`,
        "warning",
      );
    } else {
      toast("Mass reject failed", "error");
    }

    onRefresh && onRefresh();
    router.refresh();
  }

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    right: 0,
    backgroundColor: "white",
    border: "1px solid rgba(207, 207, 207, 1)",
    borderRadius: "8px",
    boxShadow: "0 -4px 12px rgba(0,0,0,0.12)",
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

  return (
    <>
      <div ref={actionsRef} style={{ position: "relative" }}>
        <Button
          componentType="button"
          bgColor={selectedMrIds.size === 0 ? "rgba(60,60,60,1)" : "white"}
          borderColor={selectedMrIds.size === 0 ? "rgba(60,60,60,1)" : "white"}
          textColor={selectedMrIds.size === 0 ? "white" : "black"}
          onClick={() => setActionsOpen((v) => !v)}
        >
          ACTIONS
        </Button>

        {actionsOpen && (
          <div style={dropdownStyle}>
            {/* Auto select */}
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
              <span>Auto select ({selectedMrIds.size})</span>
              <img src={diamondIcon} alt="smart select" />
            </button>

            {/* Reject */}
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                setRejectOpen(true);
              }}
              style={{ ...dropdownItemStyle }}
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
          header="MASS APPROVE MATERIAL REQUESTS"
          setIsOpen={(open) => {
            if (!open) setAutoSelectOpen(false);
          }}
          handleSubmit={(e) => {
            e.preventDefault();
            handleAutoSelect();
          }}
          addButtonLabel="CONFIRM"
        >
          <p>
            Are you sure you want to mass approve {selectedMrIds.size} selected
            MR
            {selectedMrIds.size !== 1 ? "s" : ""}?
          </p>
          <p
            style={{
              marginTop: "6px",
            }}
          >
            The cheapest quotation for each line will be automatically selected
            and submitted to LPO.
          </p>
        </FormPopUp>
      )}

      {/* Reject confirmation */}
      {rejectOpen && (
        <FormPopUp
          header="MASS REJECT MATERIAL REQUESTS"
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
          <p>
            Are you sure you want to reject all quotations for{" "}
            {selectedMrIds.size} selected MR
            {selectedMrIds.size !== 1 ? "s" : ""}?
          </p>
          <p
            style={{
              marginTop: "6px",
              marginBottom: "16px",
            }}
          >
            All items will be moved to Price Approval Rejected.
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
