"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OverviewHoverPopup from "../OverviewHoverPopup";

type props = {
  filterDays?: number;
};

export default function OverdueDeliveriesWidget({ filterDays }: props) {
  const router = useRouter();
  const deliveriesIcon = "/icons/incomplete-deliveries.svg";
  const upArrow = "/icons/arrow-up-chart-red-big.svg";
  const downArrow = "/icons/arrow-down-chart-green-big.svg";

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
    window.addEventListener("scroll", handleCloseHover, true);
    window.addEventListener("blur", handleCloseHover);
    return () => {
      window.removeEventListener("scroll", handleCloseHover, true);
      window.removeEventListener("blur", handleCloseHover);
    };
  }, []);

  useEffect(() => {
    const handleCloseAll = (e: Event) => {
      const customE = e as CustomEvent;
      if (customE.detail?.source !== "overdue-deliveries") setShowPopup(false);
    };
    window.addEventListener("close-all-hover-popups", handleCloseAll);
    return () =>
      window.removeEventListener("close-all-hover-popups", handleCloseAll);
  }, []);

  useEffect(() => {
    setIsLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/procurement/getTotalIncompleteDeliveries`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filter: filterDays }),
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
        console.error("Error fetching overdue deliveries data:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [filterDays]);

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
        detail: { source: "overdue-deliveries" },
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

  const hasNoIncompleteDeliveries = thisWeek === 0;

  const isSubstantial = percentageChange >= 10;
  const changeMagnitude = isSubstantial ? "Substantial" : "Slight";

  const pillBackgroundColor = hasNoIncompleteDeliveries
    ? "rgba(156, 156, 156, 1)"
    : isIncrease
      ? "rgba(246, 205, 205, 1)"
      : "rgba(111, 243, 187, 1)";

  const textColor = isIncrease ? "rgba(248, 77, 77, 1)" : "rgba(2, 122, 70, 1)";

  const arrow = isIncrease ? upArrow : downArrow;

  const isAllTime = filterDays === 0;
  const periodLabel =
    isAllTime ? "all time" : filterDays === 7 ? "week" : `${filterDays} days`;
  const changeText = hasNoIncompleteDeliveries
    ? "No incomplete deliveries"
    : isAllTime
      ? "Total overdue deliveries across all time"
      : isIncrease
        ? `${changeMagnitude} increase from last ${periodLabel}`
        : `${changeMagnitude} decrease from last ${periodLabel}`;

  return (
    <div
      ref={widgetRef}
      className="item"
      style={{ cursor: "pointer" }}
      onClick={() => router.push("/dashboard/details/overdue-deliveries")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="top">
        <span>Overdue Deliveries</span>
        <img src={deliveriesIcon} alt="deliveries icon" />
      </div>
      <div>
        <div className="bottom">
          <p className="number">{isLoading ? "..." : thisWeek}</p>
          {!hasNoIncompleteDeliveries && !isLoading && !isAllTime && (
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
            { key: "display_id", label: "LPO NUMBER" },
            {
              key: "item_count",
              label: "ITEMS",
              format: (val: number) => `${val} Items`,
            },
          ]}
          emptyMessage="No overdue deliveries"
        />
      )}
    </div>
  );
}
