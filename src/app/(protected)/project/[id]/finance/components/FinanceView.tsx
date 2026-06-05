"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import DateRangeButton, {
  DateRange,
  formatRangeLabel,
} from "@/app/components/_DateRangeButton";
import AddFinanceEntryButton from "./_AddFinanceEntryButton";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import EditFinanceEntryPopup from "./_EditFinanceEntryPopup";

type FinanceEntry = {
  id: number;
  entry_type: "revenue" | "expense";
  name: string;
  amount: number;
  effective_amount: number;
  is_recurring: number;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
};

type LpoRow = {
  lpo_id: number;
  mr_header_id: number;
  lpo_total: number;
  lpo_date: string;
  supplier_name: string | null;
  requested_by: string;
  date_requested: string;
  amount_paid: number;
  payment_status: "Paid" | "Unpaid";
  boq_refs: string | null;
};

type JoRow = {
  pr_id: number;
  date_requested: string;
  requested_by: string;
  payment_jo_reference_id: number;
  subcontractor_name: string | null;
  total_with_vat: number;
  amount_paid: number;
  payment_status: "Paid" | "Unpaid";
};

type FinanceData = {
  entries: FinanceEntry[];
  lpo_rows: LpoRow[];
  mr_paid: number;
  mr_unpaid: number;
  mr_total: number;
  jo_rows: JoRow[];
  jo_total: number;
  project_value: number;
};

type Props = {
  projectId: string;
  projectName: string;
};

const formatAED = (n: number) =>
  `AED ${n < 0 ? "-" : "+"} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatMoney = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DEFAULT_RANGE: DateRange = { start: null, end: null, preset: "All time" };

export default function FinanceView({ projectId, projectName }: Props) {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE);
  const [activeTab, setActiveTab] = useState<"material" | "jo">("material");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [statusSort, setStatusSort] = useState<"none" | "asc" | "desc">("none");
  const [lpoFilterOpen, setLpoFilterOpen] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState<string[]>([]);

  const [joStatusFilter, setJoStatusFilter] = useState<string[]>([]);
  const [joStatusSort, setJoStatusSort] = useState<"none" | "asc" | "desc">(
    "none",
  );
  const [joFilterOpen, setJoFilterOpen] = useState(false);
  const [tempJoStatusFilter, setTempJoStatusFilter] = useState<string[]>([]);

  const filterIcon = "/icons/filter.svg";
  const crossIcon = "/icons/cross-small.svg";

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const params = new URLSearchParams({ project_id: projectId });
      if (dateRange.start)
        params.set("start_date", dateRange.start.toISOString().slice(0, 10));
      if (dateRange.end)
        params.set("end_date", dateRange.end.toISOString().slice(0, 10));

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getFinanceData?${params}`,
      );
      if (res.ok) setData(await res.json());
      if (!silent) setLoading(false);
    },
    [projectId, dateRange],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);

  const openEdit = (entry: FinanceEntry) => setEditingEntry(entry);

  const deleteEntry = async (id: number) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/manageFinanceEntry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", id }),
        },
      );
      if (!res.ok) throw new Error();
      toast("Entry deleted", "success");
      fetchData(true);
    } catch {
      toast("Failed to delete entry", "error");
    }
  };

  // Derived totals
  const manualRevenue =
    data?.entries.filter((e) => e.entry_type === "revenue") ?? [];
  const manualExpense =
    data?.entries.filter((e) => e.entry_type === "expense") ?? [];

  const totalManualRevenue = manualRevenue.reduce(
    (s, e) => s + e.effective_amount,
    0,
  );
  const totalManualExpense = manualExpense.reduce(
    (s, e) => s + e.effective_amount,
    0,
  );
  const projectValue = data?.project_value ?? 0;
  const mrTotal = data?.mr_total ?? 0;
  const joTotal = data?.jo_total ?? 0;
  const lpoRows = data?.lpo_rows ?? [];
  const joRows = data?.jo_rows ?? [];

  const displayedLpoRows = (() => {
    let rows =
      statusFilter.length > 0
        ? lpoRows.filter((r) => statusFilter.includes(r.payment_status))
        : lpoRows;
    if (statusSort !== "none") {
      rows = [...rows].sort((a, b) => {
        const order = statusSort === "asc" ? 1 : -1;
        return a.payment_status.localeCompare(b.payment_status) * order;
      });
    }
    return rows;
  })();

  const displayedJoRows = (() => {
    let rows =
      joStatusFilter.length > 0
        ? joRows.filter((r) => joStatusFilter.includes(r.payment_status))
        : joRows;
    if (joStatusSort !== "none") {
      rows = [...rows].sort((a, b) => {
        const order = joStatusSort === "asc" ? 1 : -1;
        return a.payment_status.localeCompare(b.payment_status) * order;
      });
    }
    return rows;
  })();

  const mrDisplayedTotal = displayedLpoRows.reduce(
    (s, r) => s + Number(r.lpo_total),
    0,
  );
  const joDisplayedTotal = displayedJoRows.reduce(
    (s, r) => s + Number(r.total_with_vat),
    0,
  );

  const cycleStatusSort = () =>
    setStatusSort((s) =>
      s === "none" ? "asc" : s === "asc" ? "desc" : "none",
    );

  const cycleJoStatusSort = () =>
    setJoStatusSort((s) =>
      s === "none" ? "asc" : s === "asc" ? "desc" : "none",
    );

  const openLpoFilter = () => {
    setTempStatusFilter([...statusFilter]);
    setLpoFilterOpen(true);
  };

  const applyLpoFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusFilter([...tempStatusFilter]);
    setLpoFilterOpen(false);
  };

  const resetLpoFilter = () => setTempStatusFilter([]);

  const toggleTempStatus = (val: string) =>
    setTempStatusFilter((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
    );

  const openJoFilter = () => {
    setTempJoStatusFilter([...joStatusFilter]);
    setJoFilterOpen(true);
  };

  const applyJoFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setJoStatusFilter([...tempJoStatusFilter]);
    setJoFilterOpen(false);
  };

  const resetJoFilter = () => setTempJoStatusFilter([]);

  const toggleTempJoStatus = (val: string) =>
    setTempJoStatusFilter((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
    );

  const [activeBar, setActiveBar] = useState<string | null>(null);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length || !activeBar) return null;
    const item = payload.find((p: any) => p.dataKey === activeBar);
    if (!item) return null;
    return (
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid rgba(232,232,232,1)",
          borderRadius: "8px",
          padding: "8px 14px",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        {item.name}: AED {formatMoney(item.value)}
      </div>
    );
  };

  const totalRevenue = projectValue + totalManualRevenue;
  const totalExpenses = mrTotal + joTotal + totalManualExpense;
  const pnl = totalRevenue - totalExpenses;

  // Chart data — simple single bar pair
  const chartData = [
    {
      name: "Financial Overview",
      Revenue: Math.round(totalRevenue),
      Expenses: Math.round(totalExpenses),
    },
  ];

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 500,
    color: "black",
  };

  const ThreeDotsDeleteMenu = ({ entry }: { entry: FinanceEntry }) => (
    <ThreeDotsMenuButton>
      <button
        type="button"
        onClick={() => openEdit(entry)}
        style={menuItemStyle}
      >
        <img
          src="/icons/pencil.svg"
          alt="edit"
          style={{ width: "14px", opacity: 0.7 }}
        />
        Edit
      </button>
      <button
        type="button"
        onClick={() => deleteEntry(entry.id)}
        style={menuItemStyle}
      >
        <img
          src="/icons/trash.svg"
          alt="delete"
          style={{ width: "14px", opacity: 0.7 }}
        />
        Delete
      </button>
    </ThreeDotsMenuButton>
  );

  return (
    <div className="dashboard">
      {/* Breadcrumb */}
      <h1>
        <a href="/project">PROJECTS</a> &gt;{" "}
        <a href={`/project/${projectId}`}>{projectName.toUpperCase()}</a> &gt;{" "}
        FINANCIAL ANALYTICS
      </h1>

      <br />
      <br />

      {/* Top bar: tabs + date range */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            componentType="button"
            bgColor={activeTab === "material" ? "black" : "transparent"}
            borderColor="black"
            textColor={activeTab === "material" ? "white" : "black"}
            onClick={() => setActiveTab("material")}
            style={{ padding: "7px 20px", borderRadius: "25px" }}
          >
            MATERIAL REQUESTS
          </Button>
          <Button
            componentType="button"
            bgColor={activeTab === "jo" ? "black" : "transparent"}
            borderColor="black"
            textColor={activeTab === "jo" ? "white" : "black"}
            onClick={() => setActiveTab("jo")}
            style={{ padding: "7px 20px", borderRadius: "25px" }}
          >
            JOB ORDERS
          </Button>
        </div>
        <DateRangeButton
          value={dateRange}
          onChange={setDateRange}
          popupAlign="right"
        />
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Chart + Panels row */}
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px" }}>
            {/* Chart skeleton */}
            <div className="skeleton-pulse" style={{ borderRadius: "12px", minHeight: "500px" }} />

            {/* Revenue + Expenses + PNL */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flex: 1 }}>
                {/* Revenue panel skeleton */}
                <div className="skeleton-pulse" style={{ borderRadius: "12px", minHeight: "500px" }} />
                {/* Expenses panel skeleton */}
                <div className="skeleton-pulse" style={{ borderRadius: "12px", minHeight: "500px" }} />
              </div>
              {/* PNL row skeleton */}
              <div className="skeleton-pulse" style={{ borderRadius: "10px", height: "58px" }} />
            </div>
          </div>

          {/* Table section skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            {/* Title + total spent */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="skeleton-pulse" style={{ height: "20px", width: "280px", borderRadius: "6px" }} />
                <div className="skeleton-pulse" style={{ height: "14px", width: "120px", borderRadius: "6px" }} />
              </div>
              <div className="skeleton-pulse" style={{ height: "52px", width: "180px", borderRadius: "10px" }} />
            </div>
            {/* Filter row */}
            <div className="skeleton-pulse" style={{ height: "36px", width: "100px", borderRadius: "50px" }} />
            {/* Table rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-pulse" style={{ height: "48px", borderRadius: "8px" }} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Chart + Panels */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "320px 1fr",
              gap: "20px",
              marginBottom: "32px",
              alignItems: "stretch",
            }}
          >
            {/* Bar Chart */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "20px",
                height: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    barCategoryGap="5%"
                    barGap={12}
                    margin={{ top: 10, right: 0, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(240,240,240,1)"
                    />
                    <YAxis
                      tickFormatter={(v) => `AED ${(v / 1000000).toFixed(1)}M`}
                      tick={{ fontSize: 9 }}
                      width={55}
                      tickMargin={6}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Bar
                      dataKey="Revenue"
                      fill="rgba(33,227,144,1)"
                      activeBar={{ fill: "rgba(33,227,144,1)" }}
                      radius={[30, 30, 30, 30]}
                      barSize={45}
                      onMouseEnter={() => setActiveBar("Revenue")}
                      onMouseLeave={() => setActiveBar(null)}
                    />
                    <Bar
                      dataKey="Expenses"
                      fill="rgba(238,79,79,1)"
                      activeBar={{ fill: "rgba(238,79,79,1)" }}
                      radius={[30, 30, 30, 30]}
                      barSize={45}
                      minPointSize={60}
                      onMouseEnter={() => setActiveBar("Expenses")}
                      onMouseLeave={() => setActiveBar(null)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "16px",
                  marginTop: "8px",
                  marginLeft: "75px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "rgba(33,227,144,1)",
                      flexShrink: 0,
                    }}
                  />
                  Project Value
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "rgba(238,79,79,1)",
                      flexShrink: 0,
                    }}
                  />
                  Expenses
                </div>
              </div>
            </div>
            {/* Right column: Revenue + Expenses + PNL */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Revenue + Expenses side by side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  flex: 1,
                }}
              >
                {/* Revenue Panel */}
                <div
                  style={{
                    backgroundColor: "rgba(207,255,235,1)",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "500px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <h3>Revenue</h3>
                    <span
                      style={{
                        color: "rgba(0,163,93,1)",
                        padding: "10px 20px",
                        backgroundColor: "white",
                        borderRadius: "50px",
                      }}
                    >
                      AED + {formatMoney(totalRevenue)}
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {/* Project value row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 20px",
                        backgroundColor: "white",
                        borderRadius: "50px",
                        color: "rgba(0,163,93,1)",
                      }}
                    >
                      <span
                        style={{
                          textTransform: "uppercase",
                          color: "rgba(0,163,93,1)",
                        }}
                      >
                        Project Value
                      </span>
                      <span
                        style={{
                          color: "rgba(0,163,93,1)",
                        }}
                      >
                        AED + {formatMoney(projectValue)}
                      </span>
                    </div>

                    {/* Manual revenue entries */}
                    {manualRevenue.map((e) => (
                      <div
                        key={e.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "3px 20px",
                          backgroundColor: "white",
                          borderRadius: "50px",
                          color: "rgba(0,163,93,1)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          <span
                            style={{
                              textTransform: "uppercase",
                              color: "rgba(0,163,93,1)",
                            }}
                          >
                            {e.name}
                          </span>
                          {e.is_recurring === 1 && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "rgba(0,163,93,0.7)",
                                textTransform: "uppercase",
                              }}
                            >
                              {e.frequency} · AED {formatMoney(e.amount)}/period
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "rgba(0,163,93,1)",
                            }}
                          >
                            AED + {formatMoney(e.effective_amount)}
                          </span>
                          <ThreeDotsDeleteMenu entry={e} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <AddFinanceEntryButton
                      projectId={projectId}
                      entryType="revenue"
                      onSuccess={() => fetchData(true)}
                    />
                  </div>
                </div>

                {/* Expenses Panel */}
                <div
                  style={{
                    backgroundColor: "rgba(255,241,242,1)",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "500px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <h3>Expenses</h3>
                    <span
                      style={{
                        color: "rgba(220,38,38,1)",
                        padding: "10px 20px",
                        backgroundColor: "white",
                        borderRadius: "50px",
                      }}
                    >
                      AED - {formatMoney(totalExpenses)}
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {/* Material requests */}
                    {mrTotal > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 20px",
                          backgroundColor: "white",
                          borderRadius: "50px",
                        }}
                      >
                        <span
                          style={{
                            textTransform: "uppercase",
                            color: "rgba(220,38,38,1)",
                          }}
                        >
                          Material Requests (Paid + Unpaid)
                        </span>
                        <span
                          style={{
                            color: "rgba(220,38,38,1)",
                          }}
                        >
                          AED - {formatMoney(mrTotal)}
                        </span>
                      </div>
                    )}

                    {/* Job orders */}
                    {joTotal > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 20px",
                          backgroundColor: "white",
                          borderRadius: "50px",
                        }}
                      >
                        <span
                          style={{
                            textTransform: "uppercase",
                            color: "rgba(220,38,38,1)",
                          }}
                        >
                          Job Orders
                        </span>
                        <span
                          style={{
                            color: "rgba(220,38,38,1)",
                          }}
                        >
                          AED - {formatMoney(joTotal)}
                        </span>
                      </div>
                    )}

                    {/* Manual expense entries */}
                    {manualExpense.map((e) => (
                      <div
                        key={e.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "3px 20px",
                          backgroundColor: "white",
                          borderRadius: "50px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          <span
                            style={{
                              textTransform: "uppercase",
                              color: "rgba(220,38,38,1)",
                            }}
                          >
                            {e.name}
                          </span>
                          {e.is_recurring === 1 && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "rgba(220,38,38,0.7)",
                                textTransform: "uppercase",
                              }}
                            >
                              {e.frequency} · AED {formatMoney(e.amount)}/period
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "rgba(220,38,38,1)",
                            }}
                          >
                            AED - {formatMoney(e.effective_amount)}
                          </span>
                          <ThreeDotsDeleteMenu entry={e} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <AddFinanceEntryButton
                      projectId={projectId}
                      entryType="expense"
                      onSuccess={() => fetchData(true)}
                    />
                  </div>
                </div>
              </div>{" "}
              {/* close Revenue + Expenses grid */}
              {/* PNL Row — inside right column, below the two panels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 24px",
                  backgroundColor: "white",
                  borderRadius: "10px",
                }}
              >
                <span style={{ textTransform: "uppercase", fontSize: "14px" }}>
                  Current PNL
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "rgba(0,163,93,1)",
                    backgroundColor: "rgba(207,255,235,1)",
                    borderRadius: "10px",
                    padding: "6px 20px",
                  }}
                >
                  {formatAED(pnl)}
                </span>
              </div>
            </div>{" "}
            {/* close right column */}
          </div>{" "}
          {/* close outer chart+panels grid */}
          {/* MR Table */}
          {activeTab === "material" && (
            <div>
              {/* Title row with Total Spent */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px", textTransform: "uppercase" }}>
                    Material requests (paid + unpaid)
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "rgba(120,120,120,1)",
                    }}
                  >
                    Showing {displayedLpoRows.length}
                    {statusFilter.length > 0
                      ? ` of ${lpoRows.length}`
                      : ""}{" "}
                    LPOs
                  </p>

                  <br />

                  {/* Filter row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                    }}
                  >
                    <Button
                      componentType="button"
                      bgColor="white"
                      borderColor="rgba(241,244,246,1)"
                      textColor="black"
                      onClick={openLpoFilter}
                      style={{ borderRadius: "50px" }}
                    >
                      FILTER <img src={filterIcon} alt="filter" />
                    </Button>

                    {statusFilter.length > 0 && (
                      <Button
                        componentType="button"
                        bgColor="rgba(239,239,239,1)"
                        borderColor="transparent"
                        textColor="black"
                        onClick={() => setStatusFilter([])}
                        style={{
                          borderRadius: "50px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        STATUS:{" "}
                        <span
                          style={{
                            color: "rgba(16,185,129,1)",
                            textWrap: "nowrap",
                          }}
                        >
                          {statusFilter.join(", ")}
                        </span>
                        <img
                          src={crossIcon}
                          alt="remove"
                          style={{
                            width: "10px",
                            opacity: 0.6,
                            marginBottom: "2px",
                          }}
                        />
                      </Button>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    backgroundColor: "white",
                    borderRadius: "10px",
                    padding: "10px 16px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 2px",
                      fontSize: "12px",
                      color: "rgba(120,120,120,1)",
                    }}
                  >
                    Total Spent
                  </p>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "black",
                    }}
                  >
                    AED - {formatMoney(mrDisplayedTotal)}
                  </span>
                </div>
              </div>

              {/* LPO Filter Popup */}
              {lpoFilterOpen &&
                typeof window !== "undefined" &&
                createPortal(
                  <FormPopUp
                    header="FILTER"
                    setIsOpen={setLpoFilterOpen}
                    handleSubmit={applyLpoFilter}
                    addButtonLabel="CONFIRM"
                    secondButton={
                      <Button
                        componentType="button"
                        bgColor="white"
                        borderColor="black"
                        textColor="black"
                        type="button"
                        onClick={resetLpoFilter}
                      >
                        RESET
                      </Button>
                    }
                    style={{ minWidth: "400px" }}
                  >
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
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "20px",
                        }}
                      >
                        {["Paid", "Unpaid"].map((s) => (
                          <label
                            key={s}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="filter-checkbox"
                              checked={tempStatusFilter.includes(s)}
                              onChange={() => toggleTempStatus(s)}
                            />
                            <h4>{s}</h4>
                          </label>
                        ))}
                      </div>
                    </div>
                  </FormPopUp>,
                  document.body,
                )}

              {lpoRows.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "rgba(140,140,140,1)",
                    fontSize: "13px",
                    border: "1px dashed rgba(220,220,220,1)",
                    borderRadius: "8px",
                  }}
                >
                  No LPOs found for this project
                </div>
              ) : (
                <table
                  className="items-table two-toned"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "300px" }} />
                    <col style={{ width: "300px" }} />
                    <col style={{ width: "300px" }} />
                    <col />
                    <col style={{ width: "300px" }} />
                    <col style={{ width: "300px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>LPO NUMBER</th>
                      <th>REQUESTER</th>
                      <th>BOQ REF.</th>
                      <th>AMOUNT</th>
                      <th
                        onClick={cycleStatusSort}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        STATUS
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: 10,
                            opacity: statusSort !== "none" ? 1 : 0.35,
                          }}
                        >
                          {statusSort === "asc"
                            ? "↑"
                            : statusSort === "desc"
                              ? "↓"
                              : "↕"}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLpoRows.map((row) => {
                      const isPaid = row.payment_status === "Paid";
                      return (
                        <tr key={row.lpo_id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {new Date(row.lpo_date).toLocaleDateString("en-GB")}
                          </td>
                          <td>
                            <a
                              href={`/mr/${row.mr_header_id}/lpo/${row.lpo_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "rgba(37,150,190,1)",
                                fontWeight: 600,
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                              }}
                            >
                              LPO-{String(row.lpo_id).padStart(5, "0")}
                            </a>
                          </td>
                          <td>
                            {row.requested_by ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    backgroundColor: "black",
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  {row.requested_by.trim()[0].toUpperCase()}
                                </div>
                                <span>{row.requested_by}</span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={{ wordBreak: "break-word" }}>
                            {row.boq_refs ? (
                              <span
                                style={{
                                  color: "rgba(37,150,190,1)",
                                  fontWeight: 600,
                                }}
                              >
                                {row.boq_refs.split(",")[0]}
                                {row.boq_refs.split(",").length > 1 && (
                                  <span>
                                    , +{row.boq_refs.split(",").length - 1} More
                                  </span>
                                )}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>AED {formatMoney(Number(row.lpo_total))}</td>
                          <td>
                            <span
                              className="approval-pill normal-text"
                              style={{
                                backgroundColor: isPaid
                                  ? "rgba(187,247,208,1)"
                                  : "rgba(255,181,181,1)",
                                color: isPaid
                                  ? "rgba(3,130,46,1)"
                                  : "rgba(248,77,77,1)",
                              }}
                            >
                              {row.payment_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeTab === "jo" && (
            <div>
              {/* Title row with Total Spent */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px", textTransform: "uppercase" }}>
                    Job Orders (paid + unpaid)
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "rgba(120,120,120,1)",
                    }}
                  >
                    Showing {displayedJoRows.length}
                    {joStatusFilter.length > 0
                      ? ` of ${joRows.length}`
                      : ""}{" "}
                    PRs
                  </p>

                  <br />

                  {/* Filter row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                    }}
                  >
                    <Button
                      componentType="button"
                      bgColor="white"
                      borderColor="rgba(241,244,246,1)"
                      textColor="black"
                      onClick={openJoFilter}
                      style={{ borderRadius: "50px" }}
                    >
                      FILTER <img src={filterIcon} alt="filter" />
                    </Button>

                    {joStatusFilter.length > 0 && (
                      <Button
                        componentType="button"
                        bgColor="rgba(239,239,239,1)"
                        borderColor="transparent"
                        textColor="black"
                        onClick={() => setJoStatusFilter([])}
                        style={{
                          borderRadius: "50px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        STATUS:{" "}
                        <span
                          style={{
                            color: "rgba(16,185,129,1)",
                            textWrap: "nowrap",
                          }}
                        >
                          {joStatusFilter.join(", ")}
                        </span>
                        <img
                          src={crossIcon}
                          alt="remove"
                          style={{
                            width: "10px",
                            opacity: 0.6,
                            marginBottom: "2px",
                          }}
                        />
                      </Button>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    backgroundColor: "white",
                    borderRadius: "10px",
                    padding: "10px 16px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 2px",
                      fontSize: "12px",
                      color: "rgba(120,120,120,1)",
                    }}
                  >
                    Total Spent
                  </p>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "black",
                    }}
                  >
                    AED - {formatMoney(joDisplayedTotal)}
                  </span>
                </div>
              </div>

              {/* JO Filter Popup */}
              {joFilterOpen &&
                typeof window !== "undefined" &&
                createPortal(
                  <FormPopUp
                    header="FILTER"
                    setIsOpen={setJoFilterOpen}
                    handleSubmit={applyJoFilter}
                    addButtonLabel="CONFIRM"
                    secondButton={
                      <Button
                        componentType="button"
                        bgColor="white"
                        borderColor="black"
                        textColor="black"
                        type="button"
                        onClick={resetJoFilter}
                      >
                        RESET
                      </Button>
                    }
                    style={{ minWidth: "400px" }}
                  >
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
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "20px",
                        }}
                      >
                        {["Paid", "Unpaid"].map((s) => (
                          <label
                            key={s}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="filter-checkbox"
                              checked={tempJoStatusFilter.includes(s)}
                              onChange={() => toggleTempJoStatus(s)}
                            />
                            <h4>{s}</h4>
                          </label>
                        ))}
                      </div>
                    </div>
                  </FormPopUp>,
                  document.body,
                )}

              {joRows.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "rgba(140,140,140,1)",
                    fontSize: "13px",
                    border: "1px dashed rgba(220,220,220,1)",
                    borderRadius: "8px",
                  }}
                >
                  No job order payment requests found for this project
                </div>
              ) : (
                <table
                  className="items-table two-toned"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "300px" }} />
                    <col style={{ width: "300px" }} />
                    <col />
                    <col style={{ width: "300px" }} />
                    <col style={{ width: "300px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>PAYMENT REQUEST</th>
                      <th>SUBCONTRACTOR</th>
                      <th>AMOUNT (AFTER VAT)</th>
                      <th
                        onClick={cycleJoStatusSort}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        STATUS
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: 10,
                            opacity: joStatusSort !== "none" ? 1 : 0.35,
                          }}
                        >
                          {joStatusSort === "asc"
                            ? "↑"
                            : joStatusSort === "desc"
                              ? "↓"
                              : "↕"}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedJoRows.map((row) => {
                      const isPaid = row.payment_status === "Paid";
                      return (
                        <tr key={row.pr_id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {new Date(row.date_requested).toLocaleDateString(
                              "en-GB",
                            )}
                          </td>
                          <td>
                            <a
                              href={`/mr/${row.payment_jo_reference_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "rgba(37,150,190,1)",
                                fontWeight: 600,
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                              }}
                            >
                              PR-{String(row.pr_id).padStart(5, "0")}
                            </a>
                          </td>
                          <td>{row.subcontractor_name || "-"}</td>
                          <td>AED {formatMoney(Number(row.total_with_vat))}</td>
                          <td>
                            <span
                              className="approval-pill normal-text"
                              style={{
                                backgroundColor: isPaid
                                  ? "rgba(187,247,208,1)"
                                  : "rgba(255,181,181,1)",
                                color: isPaid
                                  ? "rgba(3,130,46,1)"
                                  : "rgba(248,77,77,1)",
                              }}
                            >
                              {row.payment_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {editingEntry && (
        <EditFinanceEntryPopup
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSuccess={() => fetchData(true)}
        />
      )}
    </div>
  );
}
