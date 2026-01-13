"use client";

import { useEffect, useState } from "react";

type props = {
  filterDays?: number;
};

export default function AvgPaymentTimeWidget({ filterDays = 7 }: props) {
  const clockIcon = "/icons/clock.svg";
  const upArrow = "/icons/arrow-up-chart-red-big.svg";
  const downArrow = "/icons/arrow-down-chart-green-big.svg";

  const [thisWeek, setThisWeek] = useState<number>(0);
  const [lastWeek, setLastWeek] = useState<number>(0);
  const [thisWeekUnit, setThisWeekUnit] = useState<string>("hrs");
  const [lastWeekUnit, setLastWeekUnit] = useState<string>("hrs");
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getAvgPaymentTime`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filter: filterDays }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        const thisWeekCount = data.this_week || 0;
        const lastWeekCount = data.last_week || 0;

        setThisWeek(thisWeekCount);
        setLastWeek(lastWeekCount);
        setThisWeekUnit(data.this_week_unit || "hrs");
        setLastWeekUnit(data.last_week_unit || "hrs");

        // Calculate percentage change
        if (lastWeekCount === 0) {
          if (thisWeekCount > 0) {
            setPercentageChange(100);
            setIsIncrease(true);
          } else {
            setPercentageChange(0);
            setIsIncrease(true);
          }
        } else {
          const change =
            ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
          setPercentageChange(Math.min(Math.abs(change), 100));
          setIsIncrease(change >= 0);
        }
      })
      .catch((err) => {
        console.error("Error fetching payment time data:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [filterDays]);

  // Check if there are no pending approvals
  const hasNoPaymentTime = thisWeek === 0;

  // Determine if change is substantial (>=10%) or slight (<10%)
  const isSubstantial = percentageChange >= 10;
  const changeMagnitude = isSubstantial ? "Substantial" : "Slight";

  // Determine styling based on increase/decrease
  // Increase = bad (red), Decrease = good (green) for payment time
  const pillBackgroundColor = hasNoPaymentTime
    ? "rgba(156, 156, 156, 1)"
    : isIncrease
    ? "rgba(246, 205, 205, 1)"
    : "rgba(111, 243, 187, 1)";

  const textColor = isIncrease ? "rgba(248, 77, 77, 1)" : "rgba(2, 122, 70, 1)";

  const arrow = isIncrease ? upArrow : downArrow;

  // ✅ Updated text to be more generic
  const periodLabel = filterDays === 7 ? "week" : `${filterDays} days`;
  const changeText = hasNoPaymentTime
    ? "No payments completed yet"
    : isIncrease
    ? `${changeMagnitude} increase from last ${periodLabel}`
    : `${changeMagnitude} decrease from last ${periodLabel}`;

  return (
    <div className="item">
      <div className="top">
        <span>Average Payment Time</span>
        <img src={clockIcon} alt="clock icon" />
      </div>
      <div>
        <div className="bottom">
          <p className="number">
            {isLoading ? "..." : `${thisWeek} ${thisWeekUnit}`}
          </p>
          {!hasNoPaymentTime && !isLoading && (
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
        <span>{isLoading ? "Loading..." : changeText}</span>
      </div>
    </div>
  );
}
