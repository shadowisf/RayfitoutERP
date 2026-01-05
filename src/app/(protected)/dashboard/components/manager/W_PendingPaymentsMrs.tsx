"use client";

import { useEffect, useState } from "react";

export default function PendingPaymentMrsWidget() {
  const paymentsIcon = "/icons/payments.svg";
  const upArrow = "/icons/arrow-up-chart-red-big.svg";
  const downArrow = "/icons/arrow-down-chart-green-big.svg";

  const [thisWeek, setThisWeek] = useState<number>(0);
  const [lastWeek, setLastWeek] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalPendingPaymentMrs`
    )
      .then((res) => res.json())
      .then((data) => {
        const thisWeekCount = data.this_week || 0;
        const lastWeekCount = data.last_week || 0;

        setThisWeek(thisWeekCount);
        setLastWeek(lastWeekCount);

        // Calculate percentage change
        if (lastWeekCount === 0) {
          // If last week was 0, any value this week is 100% increase
          setPercentageChange(thisWeekCount > 0 ? 100 : 0);
          setIsIncrease(thisWeekCount > 0);
        } else {
          const change =
            ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
          setPercentageChange(Math.abs(change));
          setIsIncrease(change >= 0);
        }
      })
      .catch((err) => {
        console.error("Error fetching MR data:", err);
      });
  }, []);

  // Check if there are no pending approvals
  const hasNoPendingPayments = thisWeek === 0;

  // Determine if change is substantial (>=10%) or slight (<10%)
  const isSubstantial = percentageChange >= 10;
  const changemagnitude = isSubstantial ? "Substantial" : "Slight";

  // Determine styling based on increase/decrease
  // Increase = bad (red), Decrease = good (green) for pending approvals
  const pillBackgroundColor = hasNoPendingPayments
    ? "rgba(156, 156, 156, 1)"
    : isIncrease
    ? "rgba(246, 205, 205, 1)"
    : "rgba(111, 243, 187, 1)";

  const textColor = isIncrease ? "rgba(248, 77, 77, 1)" : "rgba(2, 122, 70, 1)";

  const arrow = isIncrease ? upArrow : downArrow;

  const changeText = hasNoPendingPayments
    ? "No pending payments"
    : isIncrease
    ? `${changemagnitude} increase this week`
    : `${changemagnitude} decrease this week`;

  return (
    <div className="item">
      <div className="top">
        <span>Pending Payments</span>
        <img src={paymentsIcon} alt="payments icon" />
      </div>
      <div>
        <div className="bottom">
          <p className="number">{thisWeek}</p>
          {!hasNoPendingPayments && (
            <div
              className="data-pill"
              style={{ backgroundColor: pillBackgroundColor }}
            >
              <span style={{ color: textColor }}>
                {isIncrease ? "+" : "-"}
                {percentageChange.toFixed(percentageChange >= 10 ? 0 : 1)}%
              </span>
              <img src={arrow} alt="trend arrow" />
            </div>
          )}
        </div>
        <br />
        <span>{changeText}</span>
      </div>
    </div>
  );
}
