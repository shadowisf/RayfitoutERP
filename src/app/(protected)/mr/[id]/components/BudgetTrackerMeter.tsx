"use client";

import Button from "@/app/components/Button";
import { useState, useEffect } from "react";
import { MrHeader } from "../types/mrHeader";

type props = {
  /* mrHeader: MrHeader; */
  quotedBudget: number;
  allocatedBudget: number;
};

export default function BudgetTrackerMeter({
  quotedBudget,
  allocatedBudget,
}: props) {
  /* const [quotedBudget, setQuotedBudget] = useState(0);
  const [allocatedBudget, setAllocatedBudget] = useState(0); */

  /* useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getBudgetTrackingDetailsByMrHeaderID`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mr_header_id: mrHeader.id,
        }),
      },
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setQuotedBudget(Number(data.quoted_budget) || 0);
        setAllocatedBudget(Number(data.allocated_budget) || 0);
      })
      .catch((err) => {
        console.error("Error fetching budget details:", err);
      });
  }, [mrHeader.id]); */

  const percentageUsed =
    quotedBudget > 0
      ? Math.min((allocatedBudget / quotedBudget) * 100, 100)
      : 0;

  // Determine color based on percentage
  const getMeterColor = () => {
    if (percentageUsed >= 100) {
      return "rgba(194, 60, 60, 1)"; // Red - exceeded
    } else if (percentageUsed >= 80) {
      return "rgba(255, 250, 189, 1)"; // Yellow - close
    } else {
      return "rgba(26, 216, 135, 1)"; // Green - good
    }
  };

  const meterColor = getMeterColor();

  // Calculate circumference for a circle with 270 degrees (360 - 90)
  // 270 degrees = 75% of full circle (larger gap)
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270/360 = 0.75

  return (
    <div
      style={{
        padding: "15px",
        backgroundColor: "rgba(248, 249, 251, 1)",
        borderRadius: "15px",
        display: "flex",
        gap: "20px",
        alignItems: "flex-start",
        width: "fit-content",
      }}
    >
      {/* Left side - Budget Info */}
      <div>
        <small>TOTAL SPENT</small>

        <div
          style={{
            display: "flex",
            gap: "5px",
            flexWrap: "wrap",
            marginTop: "5px",
          }}
        >
          <h2 style={{ color: meterColor, fontSize: "24px" }}>
            AED {allocatedBudget.toLocaleString("en-US")}
          </h2>
          <h2 style={{ fontSize: "24px" }}>/</h2>
          <h2 style={{ fontSize: "24px" }}>
            AED {quotedBudget.toLocaleString("en-US")}
          </h2>
        </div>

        {/* <br />
        <br />
        <br />
        <br />

        <Button
          componentType={"link"}
          bgColor={"rgba(236, 236, 236, 1)"}
          borderColor={"rgba(236, 236, 236, 1)"}
          textColor={"black"}
          href="#"
          style={{ borderRadius: "15px" }}
        >
          <span>Details</span> &gt;
        </Button> */}
      </div>

      {/* Right side - Gauge Meter */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "150px",
            height: "150px",
          }}
        >
          {/* Background Circle with 90-degree gap at bottom */}
          <svg
            width="150"
            height="150"
            viewBox="0 0 150 150"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: "rotate(135deg)", // Start at bottom-left of gap
            }}
          >
            <circle
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke="rgba(230, 230, 230, 1)"
              strokeWidth="15"
              strokeLinecap="butt"
              strokeDasharray={`${arcLength} ${circumference}`}
            />
          </svg>

          {/* Foreground Circle with 90-degree gap at bottom */}
          <svg
            width="150"
            height="150"
            viewBox="0 0 150 150"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: "rotate(135deg)", // Start at bottom-left of gap
            }}
          >
            <circle
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke={meterColor}
              strokeWidth="15"
              strokeLinecap="butt"
              strokeDasharray={`${
                (percentageUsed / 100) * arcLength
              } ${circumference}`}
              style={{
                transition:
                  "stroke-dasharray 0.5s ease-out, stroke 0.5s ease-out",
              }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
