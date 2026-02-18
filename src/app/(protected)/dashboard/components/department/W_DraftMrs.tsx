"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";

type props = {
  filterDays?: number;
};

export default function DraftMrsWidget({ filterDays }: props) {
  const { userInfo } = useAuth();

  const fileIcon = "/icons/file.svg";
  const upArrow = "/icons/arrow-up-chart-green-big.svg";
  const downArrow = "/icons/arrow-down-chart-red-big.svg";

  const [thisWeek, setThisWeek] = useState<number>(0);
  const [lastWeek, setLastWeek] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userInfo?.departmentID) return;

    setIsLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/department/getTotalDraftMrs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department_id: userInfo?.departmentID,
          filter: filterDays,
        }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        const thisWeekCount = data.this_week || 0;
        const lastWeekCount = data.last_week || 0;

        setThisWeek(thisWeekCount);
        setLastWeek(lastWeekCount);

        // Calculate percentage change
        if (lastWeekCount === 0) {
          // If last week was 0, cap at 100% increase
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
          // Cap percentage at 100% to avoid infinity display
          setPercentageChange(Math.min(Math.abs(change), 100));
          setIsIncrease(change >= 0);
        }
      })
      .catch((err) => {
        console.error("Error fetching MR data:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userInfo?.departmentID, filterDays]);

  // Check if there are no active MRs
  const hasNoDraftMrs = thisWeek === 0;

  // Determine if change is substantial (>=10%) or slight (<10%)
  const isSubstantial = percentageChange >= 10;
  const changeMagnitude = isSubstantial ? "Substantial" : "Slight";

  // Determine styling based on increase/decrease or no active MRs
  const backgroundColor = hasNoDraftMrs
    ? "rgba(156, 156, 156, 1)"
    : isIncrease
    ? "rgba(12, 143, 87, 1)"
    : "rgba(248, 77, 77, 1)";
  const textColor = isIncrease
    ? "rgba(1, 184, 105, 1)"
    : "rgba(255, 255, 255, 1)";
  const arrow = isIncrease ? upArrow : downArrow;

  // ✅ Dynamic period label
  const isAllTime = filterDays === 0;
  const periodLabel = isAllTime ? "all time" : filterDays === 7 ? "week" : `${filterDays} days`;
  const changeText = hasNoDraftMrs
    ? "No draft MRs"
    : isAllTime
    ? "Total draft MRs across all time"
    : isIncrease
    ? `${changeMagnitude} increase from last ${periodLabel}`
    : `${changeMagnitude} decrease from last ${periodLabel}`;

  return (
    <div className="item" style={{ backgroundColor, color: "white" }}>
      <div className="top">
        <span>MRs in Draft</span>
        <img src={fileIcon} alt="file icon" />
      </div>
      <div>
        <div className="bottom">
          <p className="number">{isLoading ? "..." : thisWeek}</p>
          {!hasNoDraftMrs && !isLoading && !isAllTime && (
            <div className="data-pill">
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
