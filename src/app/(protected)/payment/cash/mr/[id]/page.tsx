import Button from "@/app/components/Button";
import { MrHeader } from "../../../../mr/[id]/types/mrHeader";
import FinanceDetailClient from "./components/MrPaymentDetailClient";

export default async function PaymentWithID({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const externalLinkIcon = "/icons/external-link.svg";

  // ── Fetch MR Header ────────────────────────────────────────────────────────
  const mrHeader: MrHeader = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    },
  )
    .then((res) => res.json())
    .catch((err) => {
      console.error(err);
      return {} as MrHeader;
    });

  // ── Days left calculation ──────────────────────────────────────────────────
  const required = new Date(mrHeader.required_date);
  const today = new Date();
  required.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  let daysLeftText = "";
  if (diffDays > 0) daysLeftText = `${diffDays}d left`;
  else if (diffDays === 0) daysLeftText = "Due today";
  else daysLeftText = `${Math.abs(diffDays)}d overdue`;

  let daysLeftStyle = {
    backgroundColor: "rgba(231,231,231,1)",
    color: "black",
  };
  if (diffDays < 0) {
    daysLeftStyle = {
      backgroundColor: "rgba(255,181,181,1)",
      color: "rgba(248,77,77,1)",
    };
  } else if (diffDays <= 3) {
    daysLeftStyle = {
      backgroundColor: "rgba(255,250,189,1)",
      color: "rgba(134,83,47,1)",
    };
  }

  // ── Progress pill style ────────────────────────────────────────────────────
  const isCompleted = mrHeader.progress_id === 25;
  const isRejected = ["reject", "fail"].some((w) =>
    mrHeader.progress_name?.toLowerCase().includes(w),
  );
  const progressStyle = isRejected
    ? { backgroundColor: "rgba(255,181,181,1)", color: "rgba(248,77,77,1)" }
    : isCompleted
      ? { backgroundColor: "rgba(87,244,176,1)", color: "rgba(31,101,71,1)" }
      : { backgroundColor: "rgba(255,250,189,1)", color: "rgba(134,83,47,1)" };

  return (
    <div className="dashboard">
      {/* ── Breadcrumb — full width ────────────────────────────────────────── */}
      <h1 style={{ marginBottom: "25px" }}>
        <a href="/payment">PAYMENTS</a> &gt; <a href="/payment/cash">CASH</a> &gt; MR-
        {String(mrHeader.id).padStart(5, "0")}
      </h1>

      {/* ── Two-column grid starts here ────────────────────────────────────── */}
      {/* Left gets MR info + timeline + LPO table; right gets payment panel.  */}
      {/* Server-rendered left children are passed into the client component.  */}
      <FinanceDetailClient mrHeaderId={mrHeader.id} mrHeader={mrHeader}>
        {/* ── MR Info Bar ─────────────────────────────────────────────────── */}
        <div className="mr-with-id">
          <div className="top">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{ display: "flex", gap: "25px", alignItems: "center" }}
              >
                <div>
                  <small>MR NUMBER</small>
                  <h2>MR-{String(mrHeader.id).padStart(5, "0")}</h2>
                </div>
              </div>
            </div>
          </div>

          <br />
          <br />

          <div className="bottom">
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div>
                <small>PROJECT</small>
                <h2>{mrHeader.project_name || "-"}</h2>
              </div>
              {mrHeader.project_name && (
                <Button
                  componentType="link"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="rgba(223,223,223,1)"
                  textColor="black"
                  href={`/project/${mrHeader.project_id}`}
                  style={{ padding: "7px 7px" }}
                >
                  <img src={externalLinkIcon} alt="external link" />
                </Button>
              )}
            </div>

            <div>
              <small>PURPOSE</small>
              <h2>{mrHeader.purpose_name || "-"}</h2>
            </div>

            <div>
              <small>REQUESTED BY</small>
              <h2>{mrHeader.requested_by || "-"}</h2>
            </div>

            <div>
              <small>DEPARTMENT</small>
              <h2>{mrHeader.department_name || "-"}</h2>
            </div>

            <div>
              <small>CREATION DATE</small>
              <h2>
                {mrHeader.date_requested
                  ? new Date(mrHeader.date_requested).toLocaleDateString(
                      "en-GB",
                    )
                  : "-"}
              </h2>
            </div>

            <div
              style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}
            >
              <div>
                <small>REQUIRED DATE</small>
                <h2>
                  {mrHeader.required_date
                    ? new Date(mrHeader.required_date).toLocaleDateString(
                        "en-GB",
                      )
                    : "-"}
                </h2>
              </div>
              {!isCompleted && mrHeader.required_date && (
                <h2
                  className="approval-pill normal-text"
                  style={{
                    ...daysLeftStyle,
                    padding: "4px 10px",
                    borderRadius: "50px",
                    fontSize: "11px",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}
                >
                  {daysLeftText}
                </h2>
              )}
            </div>
          </div>
        </div>
      </FinanceDetailClient>
    </div>
  );
}
