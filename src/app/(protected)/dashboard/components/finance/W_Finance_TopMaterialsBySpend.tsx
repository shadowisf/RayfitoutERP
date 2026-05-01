"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type MaterialRow = {
  material_description: string;
  top_supplier: string;
  qty_order: number;
  avg_price: number;
  lowest_price: number;
  total_spent: number;
};

type CategoryRow = {
  category_name: string;
  item_count: number;
  total_spent: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAEDShort(val: number): string {
  if (val >= 1_000_000) return `AED ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `AED ${(val / 1_000).toFixed(1)}K`;
  return `AED ${val.toLocaleString()}`;
}

const COLORS = [
  "#00804C",
  "#1a237e",
  "#87CEEB",
  "#C62828",
  "#7B68EE",
  "#80CBC4",
  "#D3D3D3",
];

// ─── Pie tooltip ─────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { color, value } = payload[0];
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "8px 12px",
        borderRadius: 25,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        border: "1px solid #e0e0e0",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
        }}
      />
      <strong>{formatAEDShort(value)}</strong>
    </div>
  );
};

type SortKey = "qty_order" | "avg_price" | "lowest_price" | "total_spent";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.35 }}>
      {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────
export default function FinanceTopMaterialsBySpendWidget() {
  const [tableData, setTableData] = useState<MaterialRow[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("total_spent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialTopMaterialsBySpend`,
    )
      .then((res) => res.json())
      .then((d) => {
        setTableData(d?.table_data ?? []);
        setCategoryData(d?.category_data ?? []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    return [...tableData].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });
  }, [tableData, sortKey, sortDir]);

  const chartData = categoryData.slice(0, 7).map((row, i) => ({
    name: row.category_name,
    value: row.total_spent,
    item_count: row.item_count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Top Materials By Spend</h2>
        <Link
          href="/finance/materials"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 14px",
            borderRadius: 50,
            border: "1px solid rgba(223,223,223,1)",
            backgroundColor: "white",
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(30,30,30,1)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          VIEW FULL REPORT
          <span style={{ fontSize: 14, lineHeight: 1 }}>›</span>
        </Link>
      </div>
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "15px",
          padding: "20px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "32px",
          alignItems: "start",
        }}
      >
        {/* ── LEFT: Materials table ── */}
        <div>
          {isLoading ? (
            <p style={{ fontSize: 13, color: "rgba(150,150,150,1)" }}>
              Loading...
            </p>
          ) : !tableData.length ? (
            <p style={{ fontSize: 13, color: "rgba(150,150,150,1)" }}>
              No material data available
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr>
                  {/* MATERIAL — not sortable */}
                  <th
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      width: "auto",
                      whiteSpace: "nowrap",
                      backgroundColor: "rgba(245,246,248,1)",
                      borderRadius: "50px 0 0 50px",
                    }}
                  >
                    MATERIAL
                  </th>
                  {/* TOP VENDOR — not sortable */}
                  <th
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      width: "18%",
                      whiteSpace: "nowrap",
                      backgroundColor: "rgba(245,246,248,1)",
                    }}
                  >
                    TOP VENDOR
                  </th>
                  {/* QTY ORDER — sortable */}
                  <th
                    onClick={() => handleSort("qty_order")}
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      width: "10%",
                      whiteSpace: "nowrap",
                      backgroundColor: "rgba(245,246,248,1)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    QTY ORDER
                    <SortIcon active={sortKey === "qty_order"} dir={sortDir} />
                  </th>
                  {/* AVG PRICE — sortable */}
                  <th
                    onClick={() => handleSort("avg_price")}
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      width: "12%",
                      whiteSpace: "nowrap",
                      backgroundColor: "rgba(245,246,248,1)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    AVG PRICE
                    <SortIcon active={sortKey === "avg_price"} dir={sortDir} />
                  </th>
                  {/* LOWEST PRICE — sortable */}
                  <th
                    onClick={() => handleSort("lowest_price")}
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      width: "12%",
                      whiteSpace: "nowrap",
                      backgroundColor: "rgba(245,246,248,1)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    LOWEST PRICE
                    <SortIcon
                      active={sortKey === "lowest_price"}
                      dir={sortDir}
                    />
                  </th>
                  {/* TOTAL SPENT — sortable */}
                  <th
                    onClick={() => handleSort("total_spent")}
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      width: "13%",
                      whiteSpace: "nowrap",
                      backgroundColor: "rgba(245,246,248,1)",
                      borderRadius: "0 50px 50px 0",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    TOTAL SPENT
                    <SortIcon
                      active={sortKey === "total_spent"}
                      dir={sortDir}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const isAlt = i % 2 !== 0;
                  const altBg = isAlt ? "rgba(249, 249, 249, 1)" : undefined;
                  return (
                    <tr key={i}>
                      {/* MATERIAL NAME */}
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(30,30,30,1)",
                          maxWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          backgroundColor: altBg,
                          borderRadius: isAlt ? "50px 0 0 50px" : undefined,
                        }}
                      >
                        {row.material_description}
                      </td>

                      {/* TOP SUPPLIER */}
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          maxWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          backgroundColor: altBg,
                        }}
                      >
                        {row.top_supplier}
                      </td>

                      {/* QTY ORDER */}
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          backgroundColor: altBg,
                        }}
                      >
                        {row.qty_order.toLocaleString()}
                      </td>

                      {/* AVG PRICE */}
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          color: "rgba(198,169,0,1)",
                          fontWeight: 600,
                          backgroundColor: altBg,
                        }}
                      >
                        AED {formatAED(row.avg_price)}
                      </td>

                      {/* LOWEST PRICE */}
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          color: "rgba(2,122,70,1)",
                          fontWeight: 600,
                          backgroundColor: altBg,
                        }}
                      >
                        AED {formatAED(row.lowest_price)}
                      </td>

                      {/* TOTAL SPENT */}
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          color: "rgba(30,30,30,1)",
                          backgroundColor: altBg,
                          borderRadius: isAlt ? "0 50px 50px 0" : undefined,
                        }}
                      >
                        AED {formatAED(row.total_spent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── RIGHT: Spending By Categories ── */}
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(74,85,101,1)",
              marginBottom: 16,
            }}
          >
            Spending By Categories
          </p>

          {isLoading ? (
            <p style={{ fontSize: 13, color: "rgba(150,150,150,1)" }}>
              Loading...
            </p>
          ) : !chartData.length ? (
            <p style={{ fontSize: 13, color: "rgba(150,150,150,1)" }}>
              No data available
            </p>
          ) : (
            <>
              {/* Donut chart */}
              <div style={{ position: "relative", width: "100%", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<PieTooltip />}
                      wrapperStyle={{ zIndex: 100 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginTop: 16,
                }}
              >
                {chartData.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "16px 1fr auto auto",
                      alignItems: "center",
                      gap: "6px 10px",
                    }}
                  >
                    {/* Dot */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: item.color,
                      }}
                    />
                    {/* Category name */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        color: "rgba(30,30,30,1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </span>
                    {/* Item count */}
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(120,120,120,1)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.item_count.toLocaleString()} Items
                    </span>
                    {/* Amount */}
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(30,30,30,1)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      AED {formatAED(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
