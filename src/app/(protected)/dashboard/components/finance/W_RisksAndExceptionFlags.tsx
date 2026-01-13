"use client";

import { useEffect, useState } from "react";

export default function RisksAndExceptionFlagsWidget() {
  const warningIcon = "/icons/warning-line.svg";
  const warningGreenIcon = "/icons/warning-line-green.svg";

  const [pendingPayments, setPendingPayments] = useState<number>(0);
  const [pendingRefundApproval, setPendingRefundApproval] = useState<number>(0);
  const [projectBudgetOverrun, setProjectBudgetOverrun] = useState<number>(0);
  const [unapprovedTransactions, setUnapprovedTransactions] =
    useState<number>(0);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/finance/manager/getTotalPendingPayments`
    )
      .then((res) => res.json())
      .then((data) => {
        setPendingPayments(data.pending_count);
      });

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getTotalProjectBudgetOverrun`
    )
      .then((res) => res.json())
      .then((data) => {
        setProjectBudgetOverrun(data.overrun_count);
      });

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getTotalUnapprovedTransactions`
    )
      .then((res) => res.json())
      .then((data) => {
        setProjectBudgetOverrun(data.rejected_count);
      });
  }, []);

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "15px",
        borderRadius: "15px",
      }}
    >
      <h3>Alerts & Risks</h3>
      <br />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        <div
          className="item"
          style={{
            backgroundColor: "rgba(255, 226, 226, 1)",
            minHeight: "100px",
          }}
        >
          <div className="top" style={{ color: "rgba(190, 20, 20, 1)" }}>
            <span className="number">{pendingPayments || 0}</span>
            <img src={warningIcon} alt="warning" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <div className="bottom">
              <p className="number"></p>
            </div>
            <span>Pending Payments</span>
          </div>
        </div>
        <div
          className="item"
          style={{
            backgroundColor: "rgba(245, 253, 223, 1)",
            minHeight: "100px",
          }}
        >
          <div className="top" style={{ color: "rgba(134, 146, 30, 1)" }}>
            <span className="number">{pendingRefundApproval || 0}</span>
            <img src={warningGreenIcon} alt="deliveries icon" />
          </div>
          <div style={{ color: "rgba(134, 146, 30, 1)" }}>
            <div className="bottom">
              <p className="number"></p>
            </div>
            <span>Pending Refund Approval</span>
          </div>
        </div>
        <div
          className="item"
          style={{
            backgroundColor: "rgba(255, 226, 226, 1)",
            minHeight: "100px",
          }}
        >
          <div className="top" style={{ color: "rgba(190, 20, 20, 1)" }}>
            <span className="number">{projectBudgetOverrun || 0}</span>
            <img src={warningIcon} alt="warning" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <div className="bottom">
              <p className="number"></p>
            </div>
            <span>Projects Budget Overrun</span>
          </div>
        </div>
        <div
          className="item"
          style={{
            backgroundColor: "rgba(255, 226, 226, 1)",
            minHeight: "100px",
          }}
        >
          <div className="top" style={{ color: "rgba(190, 20, 20, 1)" }}>
            <span className="number">{unapprovedTransactions || 0}</span>
            <img src={warningIcon} alt="warning" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <div className="bottom">
              <p className="number"></p>
            </div>
            <span>Unapproved Transactions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
