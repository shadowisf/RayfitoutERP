"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";

type WidgetConfig = {
  title: string;
  apiUrl: string;
  bodyBuilder: (filter: number, departmentId?: number) => Record<string, any>;
  columns: { key: string; label: string; format?: (val: any) => string }[];
  linkBuilder: (item: any) => string;
};

const WIDGET_CONFIGS: Record<string, WidgetConfig> = {
  "active-mrs": {
    title: "Active MRs & LPOs",
    apiUrl: "/api/dashboard/manager/getTotalActiveMrs",
    bodyBuilder: (filter) => ({ filter, limit: 100 }),
    columns: [
      { key: "display_id", label: "MR/LPO NUMBER" },
      {
        key: "item_count",
        label: "ITEMS",
        format: (val: number) => `${val} items`,
      },
    ],
    linkBuilder: (item) =>
      item.type === "lpo"
        ? `/mr/${item.mr_header_id}/lpo/${item.raw_id}`
        : `/mr/${item.raw_id}`,
  },
  "pending-approvals": {
    title: "Pending Approvals",
    apiUrl: "/api/dashboard/manager/getTotalPendingApprovalMrs",
    bodyBuilder: (filter) => ({ filter, limit: 100 }),
    columns: [
      { key: "display_id", label: "MR NUMBER" },
      {
        key: "item_count",
        label: "ITEMS",
        format: (val: number) => `${val} items`,
      },
    ],
    linkBuilder: (item) => `/mr/${item.raw_id}`,
  },
  "pending-payments": {
    title: "Pending Payments",
    apiUrl: "/api/dashboard/manager/getTotalPendingPaymentMrs",
    bodyBuilder: (filter) => ({ filter, limit: 100 }),
    columns: [
      { key: "display_id", label: "LPO NUMBER" },
      {
        key: "amount",
        label: "AMOUNT",
        format: (val: number) => `AED ${val.toFixed(2)}`,
      },
    ],
    linkBuilder: (item) => `/mr/${item.mr_header_id}/lpo/${item.raw_id}`,
  },
  "outbound-payments": {
    title: "Outbound Payments",
    apiUrl: "/api/dashboard/manager/getTotalOutboundPayment",
    bodyBuilder: (filter) => ({ filter, limit: 100 }),
    columns: [
      { key: "display_id", label: "LPO NUMBER" },
      {
        key: "amount",
        label: "AMOUNT",
        format: (val: number) => `AED ${val.toFixed(2)}`,
      },
    ],
    linkBuilder: (item) => `/mr/${item.mr_header_id}/lpo/${item.raw_id}`,
  },
  "pending-deliveries": {
    title: "Pending Deliveries",
    apiUrl: "/api/dashboard/manager/getTotalPendingDeliveryMrs",
    bodyBuilder: (filter) => ({ filter, limit: 100 }),
    columns: [
      { key: "display_id", label: "LPO NUMBER" },
      {
        key: "item_count",
        label: "ITEMS",
        format: (val: number) => `${val} items`,
      },
    ],
    linkBuilder: (item) => `/mr/${item.mr_header_id}/lpo/${item.raw_id}`,
  },
  "pending-quotations": {
    title: "Pending Quotations",
    apiUrl: "/api/dashboard/procurement/getTotalPendingQuotations",
    bodyBuilder: (filter) => ({ filter, limit: 100 }),
    columns: [
      { key: "display_id", label: "MR NUMBER" },
      {
        key: "item_count",
        label: "ITEMS",
        format: (val: number) => `${val} items`,
      },
    ],
    linkBuilder: (item) => `/mr/${item.raw_id}`,
  },
  "overdue-deliveries": {
    title: "Overdue Deliveries",
    apiUrl: "/api/dashboard/procurement/getTotalIncompleteDeliveries",
    bodyBuilder: (filter) => ({ filter, limit: 100 }),
    columns: [
      { key: "display_id", label: "LPO NUMBER" },
      {
        key: "item_count",
        label: "ITEMS",
        format: (val: number) => `${val} items`,
      },
    ],
    linkBuilder: (item) => `/mr/${item.mr_header_id}/lpo/${item.raw_id}`,
  },
  "draft-mrs": {
    title: "Draft MRs",
    apiUrl: "/api/dashboard/department/getTotalDraftMrs",
    bodyBuilder: (filter, departmentId) => ({
      filter,
      limit: 100,
      department_id: departmentId,
    }),
    columns: [
      { key: "display_id", label: "MR NUMBER" },
      {
        key: "item_count",
        label: "ITEMS",
        format: (val: number) => `${val} items`,
      },
    ],
    linkBuilder: (item) => `/mr/${item.raw_id}`,
  },
  "total-spent": {
    title: "Total Spend",
    apiUrl: "/api/dashboard/finance/getTotalSpent",
    bodyBuilder: (filter) => ({ filter, limit: 100 }),
    columns: [
      { key: "display_id", label: "LPO NUMBER" },
      {
        key: "amount",
        label: "AMOUNT",
        format: (val: number) => `AED ${val.toFixed(2)}`,
      },
    ],
    linkBuilder: (item) => `/mr/${item.mr_header_id}/lpo/${item.raw_id}`,
  },
};

export default function WidgetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { userInfo } = useAuth();

  const type = params.type as string;
  const config = WIDGET_CONFIGS[type];

  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const externalLinkIcon = "/icons/external-link.svg";

  useEffect(() => {
    if (!config) return;

    // For draft-mrs, wait for department ID
    if (type === "draft-mrs" && !userInfo?.departmentID) return;

    setIsLoading(true);

    const body = config.bodyBuilder(0, userInfo?.departmentID);

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${config.apiUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setTotalCount(data.total_count || 0);
      })
      .catch((err) => {
        console.error("Error fetching detail data:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [config, type, userInfo?.departmentID]);

  if (!config) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>Not Found</h1>
        </div>
        <p>Widget type &quot;{type}&quot; not found.</p>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            background: "white",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>{config.title.toUpperCase()}</h1>

      <br />

      <div>
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            No items found.
          </div>
        ) : (
          <table className="items-table two-toned alt">
            <thead>
              <tr>
                <th>#</th>
                {config.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  {config.columns.map((col) => (
                    <td key={col.key}>
                      {col.format ? col.format(item[col.key]) : item[col.key]}
                    </td>
                  ))}
                  <td>
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{ padding: "7px 7px" }}
                      href={config.linkBuilder(item)}
                    >
                      <img src={externalLinkIcon} alt="open" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
