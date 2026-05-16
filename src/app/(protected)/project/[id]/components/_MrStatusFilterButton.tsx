"use client";

import { useState, useMemo } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

// Progression order: normal flow first, then rejected at the bottom
const PROGRESSION_ORDER: Record<string, number> = {
  Draft: 1,
  "QS Review": 2,
  "Manager Approval": 3,
  Quotations: 4,
  "QS Price Check": 5,
  "Manager Price Approval": 6,
  "LPO & Invoice": 7,
  "Pending Payments": 8,
  "Awaiting Delivery": 9,
  "QC Check": 10,
  "Stock Entry": 11,
  Completed: 12,
  Segregated: 13,
  // Rejected statuses at the bottom
  "Request Rejected": 100,
  "Price Approval Rejected": 101,
  "Payment Rejected": 102,
  "GRN Failed": 103,
  "GRN failed": 103,
  "Failed QC": 104,
};

type MrStatusFilterButtonProps = {
  statuses: string[];
  onApplyFilters: (filters: { selectedStatuses: string[] }) => void;
  currentFilters: { selectedStatuses: string[] };
};

export default function MrStatusFilterButton({
  statuses,
  onApplyFilters,
  currentFilters,
}: MrStatusFilterButtonProps) {
  const filterIcon = "/icons/filter.svg";

  // Sort statuses by progression order, with rejected at the bottom
  const sortedStatuses = useMemo(() => {
    return [...statuses].sort((a, b) => {
      const orderA = PROGRESSION_ORDER[a] ?? 99;
      const orderB = PROGRESSION_ORDER[b] ?? 99;
      return orderA - orderB;
    });
  }, [statuses]);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    currentFilters.selectedStatuses,
  );

  const handleOpen = () => {
    setSelectedStatuses(currentFilters.selectedStatuses);
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({ selectedStatuses });
    setIsOpen(false);
  };

  const handleReset = () => {
    setSelectedStatuses([]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStatuses(sortedStatuses);
    } else {
      setSelectedStatuses([]);
    }
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    if (checked) {
      setSelectedStatuses([...selectedStatuses, status]);
    } else {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    }
  };

  const isAllSelected = selectedStatuses.length === sortedStatuses.length;

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"rgba(241, 244, 246, 1)"}
        textColor={"black"}
        onClick={handleOpen}
        style={{ position: "relative", borderRadius: "50px" }}
      >
        FILTER <img src={filterIcon} alt="filter" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"FILTER MATERIAL REQUESTS"}
          setIsOpen={setIsOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={handleApply}
          secondButton={
            <Button
              componentType={"button"}
              bgColor={"white"}
              borderColor={"black"}
              textColor={"black"}
              onClick={handleReset}
            >
              RESET
            </Button>
          }
        >
          {/* Status Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              STATUS
            </h3>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "10px",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "#10b981",
                    }}
                  />
                  <h4>Select All</h4>
                </label>
              </div>

              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {sortedStatuses.map((status) => (
                  <div key={status} style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={(e) =>
                          handleStatusChange(status, e.target.checked)
                        }
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "#10b981",
                        }}
                      />
                      <h4>{status.toUpperCase()}</h4>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
