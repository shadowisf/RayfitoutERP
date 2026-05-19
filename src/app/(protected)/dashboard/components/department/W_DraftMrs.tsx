"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OverviewHoverPopup from "../OverviewHoverPopup";

type props = {
  dateFrom?: string;
  dateTo?: string;
};

export default function DraftMrsWidget({ dateFrom, dateTo }: props) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const fileIcon = "/icons/file.svg";
  const upArrow = "/icons/arrow-up-chart-green-big.svg";
  const downArrow = "/icons/arrow-down-chart-red-big.svg";

  const [thisWeek, setThisWeek] = useState<number>(0);
  const [lastWeek, setLastWeek] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Hover popup state
  const [showPopup, setShowPopup] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const anchorRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const handleCloseHover = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowPopup(false);
    };
    window.addEventListener("blur", handleCloseHover);
    return () => {
      window.removeEventListener("blur", handleCloseHover);
    };
  }, []);

  useEffect(() => {
    const handleCloseAll = (e: Event) => {
      const customE = e as CustomEvent;
      if (customE.detail?.source !== "draft-mrs") setShowPopup(false);
    };
    window.addEventListener("close-all-hover-popups", handleCloseAll);
    return () =>
      window.removeEventListener("close-all-hover-popups", handleCloseAll);
  }, []);

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
          date_from: dateFrom,
          date_to: dateTo,
        }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        const thisWeekCount = data.this_week || 0;
        const lastWeekCount = data.last_week || 0;

        setThisWeek(thisWeekCount);
        setLastWeek(lastWeekCount);
        setItems(data.items || []);
        setTotalCount(data.total_count || 0);

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
        console.error("Error fetching MR data:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userInfo?.departmentID, dateFrom, dateTo]);

  const startHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowPopup(false);
    }, 120);
  };

  const cancelHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button']")) return;
    window.dispatchEvent(
      new CustomEvent("close-all-hover-popups", {
        detail: { source: "draft-mrs" },
      }),
    );
    cancelHideTimer();
    anchorRectRef.current =
      widgetRef.current?.getBoundingClientRect() ?? null;
    setShowPopup(true);
  };

  const handleMouseLeave = () => {
    startHideTimer();
  };

  const hasNoDraftMrs = thisWeek === 0;

  const isSubstantial = percentageChange >= 10;
  const changeMagnitude = isSubstantial ? "Substantial" : "Slight";

  const backgroundColor = hasNoDraftMrs
    ? "rgba(156, 156, 156, 1)"
    : isIncrease
      ? "rgba(12, 143, 87, 1)"
      : "rgba(248, 77, 77, 1)";
  const textColor = isIncrease
    ? "rgba(1, 184, 105, 1)"
    : "rgba(255, 255, 255, 1)";
  const arrow = isIncrease ? upArrow : downArrow;

  const isAllTime = !dateFrom && !dateTo;
  const periodLabel = isAllTime
    ? "all time"
    : dateFrom && dateTo
      ? `${dateFrom} – ${dateTo}`
      : dateFrom
        ? `from ${dateFrom}`
        : `to ${dateTo}`;
  const filteredLabel = dateFrom && dateTo
    ? `from ${dateFrom} to ${dateTo}`
    : dateFrom
      ? `from ${dateFrom}`
      : `to ${dateTo}`;
  const changeText = hasNoDraftMrs
    ? "No draft MRs"
    : isAllTime
      ? "Total draft MRs across all time"
      : `Total draft MRs ${filteredLabel}`;

  return (
    <div
      ref={widgetRef}
      className="item"
      style={{ backgroundColor, color: "white", cursor: "pointer" }}
      onClick={() => router.push("/dashboard/details/draft-mrs")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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

      {showPopup && items.length > 0 && (
        <OverviewHoverPopup
          mouseX={0}
          mouseY={0}
          items={items}
          totalCount={totalCount}
          anchorRect={anchorRectRef.current}
          onMouseEnter={cancelHideTimer}
          onMouseLeave={startHideTimer}
          columns={[
            { key: "display_id", label: "MR NUMBER" },
            {
              key: "item_count",
              label: "ITEMS",
              format: (val: number) => `${val} Items`,
            },
          ]}
          emptyMessage="No draft MRs"
        />
      )}
    </div>
  );
}
