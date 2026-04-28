"use client";

import { useEffect, useState } from "react";
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

// ─── Widget ───────────────────────────────────────────────────────────────────
export default function FinanceTopMaterialsBySpendWidget() {
  const [tableData, setTableData] = useState<MaterialRow[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const chartData = categoryData.slice(0, 7).map((row, i) => ({
    name: row.category_name,
    value: row.total_spent,
    item_count: row.item_count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <>
      <h2>Top Materials By Spend</h2>
      <br />
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
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(245,246,248,1)" }}>
                  {[
                    { label: "", width: "4%" },
                    { label: "MATERIAL NAME", width: "auto" },
                    { label: "TOP VENDOR", width: "18%" },
                    { label: "QTY ORDER", width: "10%" },
                    { label: "AVG PRICE", width: "12%" },
                    { label: "LOWEST PRICE", width: "12%" },
                    { label: "TOTAL SPENT", width: "13%" },
                  ].map(({ label, width }, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: "left",
                        padding: "9px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        width,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid rgba(243,244,246,1)" }}
                  >
                    {/* # */}
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: 12,
                        color: "rgba(120,120,120,1)",
                      }}
                    >
                      {i + 1}
                    </td>

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
                      }}
                    >
                      AED {formatAED(row.total_spent)}
                    </td>
                  </tr>
                ))}
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
