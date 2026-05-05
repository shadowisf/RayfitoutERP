"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type LogEntry = {
  id: string;
  source: "header" | "line";
  activity: string;
  handled_by: string;
  stage: string;
  remarks: string | null;
  created_at: string;
};

type Props = {
  mrHeaderId: number;
  lpoId?: number;
};

// ── Activity label colour coding ──────────────────────────────────────────────
function getActivityColor(activity: string): string {
  const upper = activity.toUpperCase();
  if (
    upper.includes("REJECTED") ||
    upper.includes("FAILED") ||
    upper.includes("DELETED")
  )
    return "rgba(248, 77, 77, 1)";
  if (
    upper.includes("APPROVED") ||
    upper.includes("COMPLETED") ||
    upper.includes("PASSED")
  )
    return "rgba(26, 216, 135, 1)";
  if (
    upper.includes("CHANGED") ||
    upper.includes("EDITED") ||
    upper.includes("VENDOR CHANGED")
  )
    return "rgba(255, 153, 36, 1)";
  return "inherit";
}

function formatDateTime(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

export default function RequisitionLogButton({ mrHeaderId, lpoId }: Props) {
  const clockIcon = "/icons/clock-inventory-archive.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function openLog() {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getRequisitionLog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_header_id: mrHeaderId,
            lpo_id: lpoId || null,
          }),
        },
      );
      if (res.ok) {
        setEntries(await res.json());
      }
    } catch (err) {
      console.error("Failed to load requisition log:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(223, 223, 223, 1)"
        textColor="black"
        onClick={openLog}
        style={{ padding: "7px 7px" }}
      >
        <img src={clockIcon} alt="requisition log" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="REQUISITION LOG"
          setIsOpen={setIsOpen}
          style={{ maxWidth: "1100px", width: "95vw" }}
        >
          {isLoading ? (
            <p style={{ padding: "20px", textAlign: "center", color: "#888" }}>
              Loading...
            </p>
          ) : entries.length === 0 ? (
            <p style={{ padding: "20px", textAlign: "center", color: "#888" }}>
              No activity recorded yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className="items-table two-toned"
                style={{ width: "100%", fontSize: "13px" }}
              >
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th style={{ width: "150px" }}>DATE &amp; TIME</th>
                    <th style={{ width: "200px" }}>ACTIVITY</th>
                    <th style={{ width: "180px" }}>HANDLED BY</th>
                    <th style={{ width: "140px" }}>STAGE</th>
                    <th>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const { date, time } = formatDateTime(entry.created_at);
                    const color = getActivityColor(entry.activity);
                    const isOdd = index % 2 === 0;
                    return (
                      <tr
                        key={entry.id}
                        style={{
                          backgroundColor: isOdd ? "#fff" : "#f9f9f9",
                        }}
                      >
                        <td>{index + 1}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {date}, {time.toUpperCase()}
                        </td>
                        <td
                          style={{
                            color,
                            textTransform: "uppercase",
                          }}
                        >
                          {entry.activity}
                        </td>
                        <td style={{ textTransform: "uppercase" }}>
                          {entry.handled_by || "-"}
                        </td>
                        <td style={{ textTransform: "uppercase" }}>
                          {entry.stage || "-"}
                        </td>
                        <td
                          style={{
                            textTransform: "uppercase",
                            color: entry.remarks ? "#333" : "#aaa",
                            fontSize: "12px",
                          }}
                        >
                          {entry.remarks ? (
                            entry.remarks.includes("→") ? (
                              <span>
                                {entry.remarks.split("→")[0].trim()}
                                <span
                                  style={{
                                    margin: "0 6px",
                                    color: "rgba(100,100,100,0.6)",
                                  }}
                                >
                                  →
                                </span>
                                {entry.remarks.split("→")[1].trim()}
                              </span>
                            ) : (
                              entry.remarks
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </FormPopUp>
      )}
    </>
  );
}
