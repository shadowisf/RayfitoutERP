"use client";

import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";
import React, { useEffect, useState } from "react";
import { MrHeader } from "./[id]/types/mrHeader";
import type { MrLine } from "./[id]/types/mrLine";
import MrFilterButton from "./components/_MrFilterButton";
import BulkQuotationCreator from "./components/_BulkQuotationCreator";
import SupplierAndQuotationButton from "./[id]/components/procurement/_SupplierAndQuotationButton";
import ExportItemsButton from "./components/_ExportAllItemsButton";

type TableItem = {
  line_id: number;
  mr_header_id: number;
  lpo_id?: number | null;
  material_description: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  unit: string;
  material_category: string;
  type: string;
  requested_by: string;
  department_id: number;
  project_name: string;
  progress_name: string;
  progress_id: number;
  supplier_name?: string;
  boq_line_id?: number | null;
  boq_item_number?: string | null;
  boq_description?: string | null;
  has_quotation?: boolean;
  delivery_location?: string;
};

type LpoCard = {
  id: number;
  project_id: number;
  mr_header_id: number;
  supplier_id: number;
  progress_id: number;
  quotation_code: string;
  delivery_date: string;
  total: number;
  payment_status: string;
  created_at: string;
  supplier_name: string;
  requested_by: string;
  department_id: number; // This is the MR's department_id
  required_date: string;
  mr_project_id: number;
  project_name: string;
  department_name: string;
  progress_name: string;
  item_count?: number;
  identifier?: string | null;
};

// Progress IDs that use LPO cards instead of MR cards
// TEMPORARILY DISABLED QC: removed 21 (QC Check)
const LPO_STAGE_IDS = [13, 14, 15, 16, 17, 24, 25];

export default function MR() {
  const { userInfo } = useAuth();

  const searchIcon = "/icons/search.svg";

  const [mrHeaders, setMrHeaders] = useState<MrHeader[]>([]);
  const [lpoCards, setLpoCards] = useState<LpoCard[]>([]);
  const [filterRelevant, setFilterRelevant] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("pt_filterRelevant");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [mrDurations, setMrDurations] = useState<{
    [key: string]: { duration: string; hoursDecimal: number; style: any };
  }>({});
  const [lpoDurations, setLpoDurations] = useState<{
    [key: string]: { duration: string; hoursDecimal: number; style: any };
  }>({});

  const [mrDeliveryDates, setMrDeliveryDates] = useState<{
    [mrId: number]: Array<{ supplier_name: string; delivery_date: string }>;
  }>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [tableItems, setTableItems] = useState<{
    material: TableItem[];
    lpo: TableItem[];
    job: TableItem[];
    payment: TableItem[];
  }>({ material: [], lpo: [], job: [], payment: [] });
  const [tableLoading, setTableLoading] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const defaultFilters = {
    itemsRequestedIn: "all",
    selectedDepartments: [] as number[],
    selectedProjects: [] as number[],
    requestType: "all",
    selectedStages: [] as number[],
  };

  const [filters, setFilters] = useState<{
    itemsRequestedIn: string;
    selectedDepartments: number[];
    selectedProjects: number[];
    requestType: string;
    selectedStages: number[];
  }>(() => {
    if (typeof window === "undefined") return defaultFilters;
    try {
      const saved = localStorage.getItem("pt_filters");
      return saved ? JSON.parse(saved) : defaultFilters;
    } catch {
      return defaultFilters;
    }
  });

  // Persist filter state to localStorage
  useEffect(() => {
    localStorage.setItem("pt_filterRelevant", JSON.stringify(filterRelevant));
  }, [filterRelevant]);

  // When "Only Related Cards" is on, collapse Draft, Rejected & Completed by default;
  // restore them to expanded when it's turned off
  useEffect(() => {
    setCollapsedGroups((prev) => ({
      ...prev,
      Draft: filterRelevant,
      Rejected: filterRelevant,
      Completed: filterRelevant,
    }));
  }, [filterRelevant]);

  useEffect(() => {
    localStorage.setItem("pt_filters", JSON.stringify(filters));
  }, [filters]);

  const getFlagColor = (hours: number, progress_id: number): string => {
    if (hours == null || isNaN(hours) || hours < 0) return "#ECCF28";

    if (progress_id === 7) {
      if (hours <= 1) return "#ECCF28";
      if (hours <= 3) return "rgba(255, 153, 36, 1)";
      return "rgba(250, 52, 52, 1)";
    }

    if (progress_id === 14) {
      if (hours <= 0.333) return "#ECCF28";
      if (hours <= 0.5) return "rgba(255, 153, 36, 1)";
      return "rgba(250, 52, 52, 1)";
    }

    if (progress_id === 17) {
      if (hours <= 4) return "#ECCF28";
      if (hours <= 14) return "rgba(255, 153, 36, 1)";
      return "rgba(250, 52, 52, 1)";
    }

    if (hours <= 2) return "#ECCF28";
    if (hours <= 12) return "rgba(255, 153, 36, 1)";
    return "rgba(250, 52, 52, 1)";
  };

  useEffect(() => {
    if (mrHeaders.length === 0) return;

    const fetchDeliveryDates = async () => {
      const deliveryDatesMap: {
        [mrId: number]: Array<{ supplier_name: string; delivery_date: string }>;
      } = {};

      await Promise.all(
        mrHeaders.map(async (mr) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getDeliveryDatesByMrHeaderID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mr_header_id: mr.id }),
              },
            );
            const data = await res.json();

            if (data.success && data.delivery_dates) {
              deliveryDatesMap[mr.id] = data.delivery_dates;
            } else {
              deliveryDatesMap[mr.id] = [];
            }
          } catch (err) {
            console.error(
              `Error fetching delivery dates for MR ${mr.id}:`,
              err,
            );
            deliveryDatesMap[mr.id] = [];
          }
        }),
      );

      setMrDeliveryDates(deliveryDatesMap);
    };

    fetchDeliveryDates();
  }, [mrHeaders]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "GET",
    }).then((res) => res.json().then((data) => setMrHeaders(data)));

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getAllLPOs`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => setLpoCards(data))
      .catch((err) => console.error("Error fetching LPO cards:", err));
  }, [userInfo]);

  useEffect(() => {
    setTableLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getTableViewItems" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTableItems(data);
        setTableLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching table items:", err);
        setTableLoading(false);
      });
  }, [tableRefreshKey]);

  useEffect(() => {
    if (lpoCards.length === 0) return;

    const fetchLpoDurations = async () => {
      const durationsMap: {
        [key: string]: { duration: string; hoursDecimal: number; style: any };
      } = {};

      await Promise.all(
        lpoCards.map(async (lpoCard) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getProgressDuration`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lpo_id: lpoCard.id,
                  progress_id: lpoCard.progress_id,
                }),
              },
            );
            const data = await res.json();

            let hoursDecimal = 0;
            if (
              data &&
              data.hours_in_stage != null &&
              data.minutes_in_stage != null
            ) {
              hoursDecimal =
                Number(data.hours_in_stage) +
                Number(data.minutes_in_stage) / 60;
            }

            const totalMinutes = Math.round(hoursDecimal * 60);
            const days = Math.floor(totalMinutes / (60 * 24));
            const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
            const minutes = totalMinutes % 60;

            const durationParts: string[] = [];
            if (days > 0) durationParts.push(`${days}d`);
            if (hours > 0) durationParts.push(`${hours}h`);
            if (minutes > 0 || durationParts.length === 0)
              durationParts.push(`${minutes}m`);
            const durationString = durationParts.join(" ");

            let durationStyle = {
              color: "black",
              backgroundColor: "rgba(231, 231, 231, 1)",
            };

            if (hoursDecimal > 48) {
              durationStyle = {
                color: "white",
                backgroundColor: "rgba(175, 61, 61, 1)",
              };
            } else if (hoursDecimal >= 24 && hoursDecimal <= 48) {
              durationStyle = {
                color: "rgba(248, 77, 77, 1)",
                backgroundColor: "rgba(255, 181, 181, 1)",
              };
            } else if (hoursDecimal >= 12 && hoursDecimal <= 24) {
              durationStyle = {
                color: "rgba(134, 83, 47, 1)",
                backgroundColor: "rgba(255, 250, 189, 1)",
              };
            }

            durationsMap[`lpo-${lpoCard.id}-${lpoCard.progress_id}`] = {
              duration: durationString,
              hoursDecimal,
              style: durationStyle,
            };
          } catch (err) {
            console.error(
              `Error fetching duration for LPO ${lpoCard.id}:`,
              err,
            );
            durationsMap[`lpo-${lpoCard.id}-${lpoCard.progress_id}`] = {
              duration: "0m",
              hoursDecimal: 0,
              style: {
                color: "black",
                backgroundColor: "rgba(231, 231, 231, 1)",
              },
            };
          }
        }),
      );

      setLpoDurations(durationsMap);
    };

    fetchLpoDurations();
  }, [lpoCards]);

  useEffect(() => {
    if (mrHeaders.length === 0) return;

    const fetchDurations = async () => {
      const durationsMap: {
        [key: string]: { duration: string; hoursDecimal: number; style: any };
      } = {};

      await Promise.all(
        mrHeaders.map(async (mr) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getProgressDuration`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mr_header_id: mr.id,
                  progress_id: mr.progress_id,
                }),
              },
            );
            const data = await res.json();

            let hoursDecimal = 0;
            if (
              data &&
              data.hours_in_stage != null &&
              data.minutes_in_stage != null
            ) {
              hoursDecimal =
                Number(data.hours_in_stage) +
                Number(data.minutes_in_stage) / 60;
            }

            const totalMinutes = Math.round(hoursDecimal * 60);
            const days = Math.floor(totalMinutes / (60 * 24));
            const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
            const minutes = totalMinutes % 60;

            const durationParts: string[] = [];
            if (days > 0) durationParts.push(`${days}d`);
            if (hours > 0) durationParts.push(`${hours}h`);
            if (minutes > 0 || durationParts.length === 0)
              durationParts.push(`${minutes}m`);
            const durationString = durationParts.join(" ");

            let durationStyle = {
              color: "black",
              backgroundColor: "rgba(231, 231, 231, 1)",
            };

            if (hoursDecimal > 48) {
              durationStyle = {
                color: "white",
                backgroundColor: "rgba(175, 61, 61, 1)",
              };
            } else if (hoursDecimal >= 24 && hoursDecimal <= 48) {
              durationStyle = {
                color: "rgba(248, 77, 77, 1)",
                backgroundColor: "rgba(255, 181, 181, 1)",
              };
            } else if (hoursDecimal >= 12 && hoursDecimal <= 24) {
              durationStyle = {
                color: "rgba(134, 83, 47, 1)",
                backgroundColor: "rgba(255, 250, 189, 1)",
              };
            }

            durationsMap[`${mr.id}-${mr.progress_id}`] = {
              duration: durationString,
              hoursDecimal,
              style: durationStyle,
            };
          } catch (err) {
            console.error(`Error fetching duration for MR ${mr.id}:`, err);
            durationsMap[`${mr.id}-${mr.progress_id}`] = {
              duration: "0m",
              hoursDecimal: 0,
              style: {
                color: "black",
                backgroundColor: "rgba(231, 231, 231, 1)",
              },
            };
          }
        }),
      );

      setMrDurations(durationsMap);
    };

    fetchDurations();
  }, [mrHeaders]);

  const progressToResponsibleDepartment: { [key: number]: number } = {
    2: 16,
    3: 8,
    4: 11,
    5: 0,
    7: 9,
    9: 16,
    10: 8,
    11: 9,
    12: 9,
    16: 9,
    14: 10,
    13: 9,
    17: 11,
    21: 12,
    23: 12,
    24: 11,
  };

  const getResponsibleDepartment = (status: string) => {
    const departmentMap: { [key: string]: { name: string; id: number } } = {
      Draft: { name: "", id: 0 },
      "QS Review": { name: "Quantity Surveyor", id: 16 },
      "Manager Approval": { name: "Directors/Management", id: 8 },
      "Request Rejected": { name: "", id: 0 },
      Quotations: { name: "Procurement", id: 9 },
      "QS Price Check": { name: "Quantity Surveyor", id: 16 },
      "Manager Price Approval": { name: "Directors/Management", id: 8 },
      "Price Approval Rejected": { name: "Procurement", id: 9 },
      "LPO & Invoice": { name: "Procurement", id: 9 },
      "Pending Payments": { name: "Finance", id: 10 },
      "Payment Rejected": { name: "Procurement", id: 9 },
      "GRN failed": { name: "Procurement", id: 9 },
      "Awaiting Delivery": { name: "Storekeeper", id: 11 },
      // TEMPORARILY DISABLED QC
      // "QC Check": { name: "Quality Control", id: 12 },
      // "Failed QC": { name: "Quality Control", id: 12 },
      "Stock Transfer": { name: "Storekeeper", id: 11 },
      "Stock Entry": { name: "Storekeeper", id: 11 },
      Completed: { name: "", id: 0 },
    };
    return departmentMap[status] || { name: "", id: 0 };
  };

  const getDepartmentStyle = (departmentId: number) => {
    const styles: {
      [key: number]: { backgroundColor: string; color: string };
    } = {
      8: {
        backgroundColor: "rgba(205, 222, 255, 1)",
        color: "rgba(23, 92, 220, 1)",
      },
      9: {
        backgroundColor: "rgba(254, 215, 170, 1)",
        color: "rgba(185, 104, 10, 1)",
      },
      10: {
        backgroundColor: "rgba(187, 247, 208, 1)",
        color: "rgba(3, 130, 46, 1)",
      },
      11: {
        backgroundColor: "rgba(143, 236, 255, 1)",
        color: "rgba(21, 104, 120, 1)",
      },
      12: {
        backgroundColor: "rgba(233, 213, 255, 1)",
        color: "rgba(129, 68, 196, 1)",
      },
      16: {
        backgroundColor: "rgba(255, 237, 213, 1)",
        color: "rgba(156, 87, 0, 1)",
      },
    };
    return (
      styles[departmentId] || {
        backgroundColor: "rgba(186, 230, 253, 1)",
        color: "rgba(0, 112, 170, 1)",
      }
    );
  };

  const getDaysLeftText = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > 0) return `${diffDays}d left`;
    if (diffDays === 0) return "Due today";
    return `${Math.abs(diffDays)}d overdue`;
  };

  const getDaysLeftStyle = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    }
    return {
      backgroundColor: "rgba(255, 250, 189, 1)",
      color: "rgba(134, 83, 47, 1)",
    };
  };

  const stageGroups = [
    {
      name: "Draft",
      statuses: [{ name: "Draft", progress_id: 1 }],
    },
    {
      name: "Approval",
      statuses: [
        { name: "QS Review", progress_id: 2 },
        // { name: "Manager Approval", progress_id: 3 },
      ],
    },
    // {
    //   name: "Existing Stock",
    //   statuses: [{ name: "Stock Transfer", progress_id: 4 }],
    // },
    {
      name: "Commercial Validation",
      statuses: [
        { name: "Quotations", progress_id: 7 },
        // { name: "QS Price Check", progress_id: 9 }, // disabled — skipped in favour of direct Manager Price Approval
        { name: "Manager Price Approval", progress_id: 10 },
      ],
    },
    {
      name: "Procurement",
      statuses: [
        { name: "LPO & Invoice", progress_id: 12 },
        { name: "Pending Payments", progress_id: 14 },
      ],
    },
    {
      name: "Delivery",
      statuses: [
        { name: "Awaiting Delivery", progress_id: 17 },
        // TEMPORARILY DISABLED QC: { name: "QC Check", progress_id: 21 },
        { name: "Stock Entry", progress_id: 24 },
      ],
    },
    {
      name: "Rejected",
      statuses: [
        { name: "Request Rejected", progress_id: 5 },
        { name: "Price Approval Rejected", progress_id: 11 },
        { name: "Payment Rejected", progress_id: 13 },
        { name: "GRN Failed", progress_id: 16 },
      ],
    },
    { name: "Completed", statuses: [{ name: "Completed", progress_id: 25 }] },
  ];

  // ===== MODIFIED canViewLPO to respect filterRelevant for managers =====
  const canViewLPO = (
    lpoCard: LpoCard,
    isFilterRelevant: boolean = filterRelevant,
  ) => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return false;

    if (userDeptId === 8) {
      // Manager
      if (isFilterRelevant) {
        // When "only related" is ON:
        // • Hide Pending Payments (progress 14) completely
        // • Show only own department's items for everything else
        if (lpoCard.progress_id === 14) {
          return false;
        }
        return lpoCard.department_id === 8;
      }
      // filter off → managers see everything
      return true;
    }

    // ───── Non-managers ─────
    if ([5].includes(lpoCard.progress_id)) {
      return lpoCard.department_id === userDeptId;
    }

    if ([25].includes(lpoCard.progress_id)) {
      return true;
    }

    if ([11, 13, 16].includes(lpoCard.progress_id)) {
      return userDeptId === 9;
    }

    const responsibleDept =
      progressToResponsibleDepartment[lpoCard.progress_id];
    return responsibleDept === userDeptId;
  };

  const canViewMR = (
    mr: MrHeader,
    isFilterRelevant: boolean = filterRelevant,
  ) => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return false;

    if (userDeptId === 8) {
      // Manager
      if (isFilterRelevant) {
        // Active stages manager must act on — show all MRs
        if ([3, 10].includes(mr.progress_id)) return true;
        // Draft, Rejected, Completed — show own dept's MRs (collapsed by default)
        if ([1, 5, 25].includes(mr.progress_id)) return mr.department_id === 8;
        // All other stages: hide
        return false;
      }
      // filter off → see everything
      return true;
    }

    // ───── Normal users ─────
    if (mr.progress_id === 1) {
      return mr.department_id === userDeptId;
    }

    if ([5].includes(mr.progress_id)) {
      return mr.department_id === userDeptId;
    }

    if ([11, 13, 16].includes(mr.progress_id)) {
      return userDeptId === 9;
    }

    if ([25].includes(mr.progress_id)) {
      return true;
    }

    const responsibleDept = progressToResponsibleDepartment[mr.progress_id];
    return responsibleDept === userDeptId;
  };

  const getFilteredLPOs = () => {
    let filtered = lpoCards;

    // Apply request type filter - LPOs are always material requests
    if (filters.requestType === "job" || filters.requestType === "payment") {
      return [];
    }

    // Apply relevance filter using the modified canViewLPO
    if (filterRelevant) {
      filtered = filtered.filter((lpoCard) => canViewLPO(lpoCard, true));
    }

    if (filters.itemsRequestedIn !== "all") {
      const now = new Date();
      const timeframes: { [key: string]: number } = {
        "24h": 1,
        "3d": 3,
        "7d": 7,
        "14d": 14,
        "30d": 30,
      };
      const daysAgo = timeframes[filters.itemsRequestedIn];
      if (daysAgo) {
        const cutoffDate = new Date(
          now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
        );
        filtered = filtered.filter(
          (lpoCard) => new Date(lpoCard.created_at) >= cutoffDate,
        );
      }
    }

    if (filters.selectedDepartments.length > 0) {
      filtered = filtered.filter((lpoCard) =>
        filters.selectedDepartments.includes(lpoCard.department_id),
      );
    }

    if (filters.selectedProjects.length > 0) {
      filtered = filtered.filter((lpoCard) =>
        filters.selectedProjects.includes(
          lpoCard.project_id || lpoCard.mr_project_id,
        ),
      );
    }

    if (searchQuery.trim() !== "") {
      const rawQuery = searchQuery.toLowerCase().trim();
      const normalizedQuery = rawQuery.replace(/^(mr-|lpo-)/, "");
      filtered = filtered.filter((lpoCard) => {
        const formattedLpoId = `lpo-${lpoCard.id.toString().padStart(5, "0")}`;
        const formattedMrId = `mr-${lpoCard.mr_header_id.toString().padStart(5, "0")}`;
        return (
          formattedLpoId.includes(rawQuery) ||
          formattedMrId.includes(rawQuery) ||
          lpoCard.id.toString().includes(normalizedQuery) ||
          lpoCard.mr_header_id.toString().includes(normalizedQuery) ||
          lpoCard.project_name?.toLowerCase().includes(rawQuery) ||
          lpoCard.supplier_name?.toLowerCase().includes(rawQuery) ||
          lpoCard.requested_by?.toLowerCase().includes(rawQuery) ||
          lpoCard.department_name?.toLowerCase().includes(rawQuery)
        );
      });
    }

    return filtered;
  };

  const getFilteredMRs = () => {
    let filtered = mrHeaders;

    // Apply request type filter
    if (filters.requestType !== "all") {
      filtered = filtered.filter((mr) => mr.type === filters.requestType);
    }

    filtered = filtered.filter((mr) => {
      if (mr.progress_id === 1)
        return mr.department_id === userInfo?.departmentID;
      return true;
    });

    if (filterRelevant) {
      filtered = filtered.filter((mr) => {
        if (mr.progress_id === 1) return true;
        return canViewMR(mr, filterRelevant);
      });
    }

    if (filters.itemsRequestedIn !== "all") {
      const now = new Date();
      const timeframes: { [key: string]: number } = {
        "24h": 1,
        "3d": 3,
        "7d": 7,
        "14d": 14,
        "30d": 30,
      };
      const daysAgo = timeframes[filters.itemsRequestedIn];
      if (daysAgo) {
        const cutoffDate = new Date(
          now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
        );
        filtered = filtered.filter(
          (mr) => new Date(mr.date_requested) >= cutoffDate,
        );
      }
    }

    if (filters.selectedDepartments.length > 0) {
      filtered = filtered.filter((mr) =>
        filters.selectedDepartments.includes(mr.department_id),
      );
    }

    if (filters.selectedProjects.length > 0) {
      filtered = filtered.filter((mr) =>
        filters.selectedProjects.includes(mr.project_id),
      );
    }

    if (searchQuery.trim() !== "") {
      const rawQuery = searchQuery.toLowerCase().trim();
      const normalizedQuery = rawQuery.replace(/^(mr|jo|pr)-/, "");
      filtered = filtered.filter((mr) => {
        const prefix =
          mr.type === "job" ? "jo" : mr.type === "payment" ? "pr" : "mr";
        const formattedId = `${prefix}-${mr.id.toString().padStart(5, "0")}`;
        return (
          formattedId.includes(rawQuery) ||
          mr.id.toString().includes(normalizedQuery) ||
          mr.project_name?.toLowerCase().includes(rawQuery) ||
          mr.requested_by?.toLowerCase().includes(rawQuery) ||
          mr.department_name?.toLowerCase().includes(rawQuery)
        );
      });
    }

    return filtered;
  };

  const filteredMRs = getFilteredMRs();
  const filteredLPOs = getFilteredLPOs();

  // Active MR count: exclude progress_id 26 (segregation), and exclude MRs
  // whose associated LPOs are ALL completed (progress_id 26). MRs with at
  // least one pending LPO are still considered active.
  const activeMrCount = filteredMRs.filter((mr) => {
    if (mr.progress_id === 26) return false;
    const mrLpos = lpoCards.filter((lpo) => lpo.mr_header_id === mr.id);
    if (mrLpos.length === 0) return true;
    return mrLpos.some((lpo) => lpo.progress_id !== 26);
  }).length;

  // Active LPO count: exclude completed LPOs (progress_id 25).
  const activeLpoCount = filteredLPOs.filter(
    (lpo) => lpo.progress_id !== 25,
  ).length;

  const groupedMRs = filteredMRs.reduce(
    (acc: Record<string, MrHeader[]>, mr) => {
      const status = mr.progress_name || "Unknown";
      acc[status] = acc[status] || [];
      acc[status].push(mr);
      return acc;
    },
    {},
  );

  const groupedLPOs = filteredLPOs.reduce(
    (acc: Record<number, LpoCard[]>, lpoCard) => {
      const key = lpoCard.progress_id;
      acc[key] = acc[key] || [];
      acc[key].push(lpoCard);
      return acc;
    },
    {} as Record<number, LpoCard[]>,
  );

  const shouldShowStatusWhenFiltering = (status: any) => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return false;

    const useLpoCards = LPO_STAGE_IDS.includes(status.progress_id);

    // For Completed stage, check LPOs, JOs, Payment Requests, and material MRs
    if (status.progress_id === 25) {
      const lpos = groupedLPOs[status.progress_id] || [];
      const allCompletedMrs = groupedMRs[status.name] || [];
      const completedMrs = allCompletedMrs.filter(
        (mr: any) => mr.type === "job" || mr.type === "payment",
      );

      if (userDeptId === 8 && filterRelevant) {
        // Include LPOs, job/payment MRs, and regular material MRs from own dept
        return (
          lpos.some((l) => l.department_id === 8) ||
          allCompletedMrs.some((mr: any) => mr.department_id === 8)
        );
      }
      return (
        lpos.some((l: any) => l.department_id === userDeptId) ||
        completedMrs.some((mr: any) => mr.department_id === userDeptId)
      );
    }

    if (useLpoCards) {
      const lpos = groupedLPOs[status.progress_id] || [];
      const paymentMrs =
        status.progress_id === 14
          ? (groupedMRs[status.name] || []).filter(
              (mr: any) => mr.type === "payment",
            )
          : [];

      if (userDeptId === 8) {
        if (filterRelevant) {
          // Only show LPO stages where manager is the responsible department.
          // No LPO stages (13,14,16,17,24) map to dept 8, so all are hidden —
          // managers don't act at any LPO operational stage.
          const responsibleForStage =
            progressToResponsibleDepartment[status.progress_id];
          if (responsibleForStage !== 8) return false;
          return lpos.some((l) => l.department_id === 8);
        }
        // Managers see all LPO stages when filter is off
        return lpos.length > 0 || paymentMrs.length > 0;
      }
      const responsibleDept =
        progressToResponsibleDepartment[status.progress_id];
      if (responsibleDept === userDeptId) return true;
      // Also show if there are payment requests and user is from the originating dept
      if (
        status.progress_id === 14 &&
        paymentMrs.some((mr: any) => mr.department_id === userDeptId)
      )
        return true;
      return false;
    }

    const mrs = groupedMRs[status.name] || [];

    if (status.progress_id === 1) return mrs.length > 0;
    if (userDeptId === 8) {
      // Only show stages the manager is responsible for
      // Manager Approval (3), Manager Price Approval (10): show if any MRs exist
      if ([3, 10].includes(status.progress_id)) return mrs.length > 0;
      // Request Rejected (5): show if own dept has rejected MRs
      if (status.progress_id === 5)
        return mrs.some((mr: any) => mr.department_id === 8);
      // All other MR stages: hide
      return false;
    }
    if ([5, 25].includes(status.progress_id)) {
      return mrs.some((mr: any) => mr.department_id === userDeptId);
    }
    return getResponsibleDepartment(status.name).id === userDeptId;
  };

  const shouldShowGroupWhenFiltering = (group: any) =>
    group.statuses.some(shouldShowStatusWhenFiltering);

  const availableProjects = Array.from(
    new Map(
      mrHeaders
        .filter((mr) => mr.project_id && mr.project_name)
        .map((mr) => [
          mr.project_id,
          { id: mr.project_id, name: mr.project_name },
        ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const getItemsRequestedLabel = (value: string) => {
    const labels: Record<string, string> = {
      all: "All Times",
      "24h": "Last 24 Hours",
      "3d": "Last 3 Days",
      "7d": "Last 7 Days",
      "14d": "Last 14 Days",
      "30d": "Last 30 Days",
    };
    return labels[value] || value;
  };

  const getDepartmentName = (departmentId: number) => {
    const names: Record<number, string> = {
      1: "Civil",
      2: "MEP",
      3: "Electrical",
      4: "Plumbing",
      5: "HVAC",
      6: "Finishing",
      7: "Landscaping",
      8: "Manager",
      9: "Procurement",
      10: "Finance",
      11: "Storekeeper",
      12: "Quality Check",
      16: "Quantity Surveyor",
    };
    return names[departmentId] || "Unknown";
  };

  const resetAllFilters = () => {
    setFilters({
      itemsRequestedIn: "all",
      selectedDepartments: [],
      selectedProjects: [],
      requestType: "all",
      selectedStages: [],
    });
  };

  const getStageName = (progressId: number): string => {
    const stageMap: Record<number, string> = {
      1: "Draft",
      2: "QS Review",
      3: "Manager Approval",
      4: "Stock Transfer",
      5: "Request Rejected",
      7: "Quotations",
      9: "QS Price Check",
      10: "Manager Price Approval",
      11: "Price Approval Rejected",
      12: "LPO & Invoice",
      13: "Payment Rejected",
      14: "Pending Payments",
      16: "GRN Failed",
      17: "Awaiting Delivery",
      24: "Stock Entry",
      25: "Completed",
    };
    return stageMap[progressId] || `Stage ${progressId}`;
  };

  const hasActiveFilters =
    filters.itemsRequestedIn !== "all" ||
    filters.selectedDepartments.length > 0 ||
    filters.selectedProjects.length > 0 ||
    filters.requestType !== "all" ||
    filters.selectedStages.length > 0;

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1>PROCUREMENT TRACKER</h1>

          <br />
          <br />

          <h2 style={{ color: "rgba(120, 120, 120, 1)" }}>
            Showing {activeMrCount} MRs & {activeLpoCount} LPOs
          </h2>

          <br />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* View toggle */}
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(242, 242, 242, 1)",
              borderRadius: "10px",
              padding: "4px",
            }}
          >
            <button
              onClick={() => {
                setViewMode("kanban");
                setFilters((prev) => ({ ...prev, selectedStages: [] }));
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  viewMode === "kanban" ? "white" : "transparent",
                color: "black",
              }}
            >
              <img
                src="/icons/kanban-option.svg"
                alt="kanban"
                style={{ width: "16px", height: "16px" }}
              />
              KANBAN
            </button>
            <button
              onClick={() => {
                setViewMode("table");
                setFilters((prev) => ({
                  ...prev,
                  selectedStages:
                    prev.selectedStages.length === 0
                      ? [7]
                      : prev.selectedStages,
                }));
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                backgroundColor: viewMode === "table" ? "white" : "transparent",
                color: "black",
              }}
            >
              <img
                src="/icons/table-option.svg"
                alt="table"
                style={{ width: "16px", height: "16px" }}
              />
              TABLE
            </button>
          </div>

          <div
            style={{
              maxWidth: "300px",
              backgroundColor: "white",
              position: "relative",
            }}
          >
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "300px",
                padding: "10px 40px 10px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223, 223, 223, 1)",
                fontSize: "14px",
              }}
            />
            <img
              src={searchIcon}
              alt="search"
              style={{
                position: "absolute",
                right: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                opacity: 0.5,
              }}
            />
          </div>
        </div>
      </div>

      <br />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {viewMode === "kanban" && (
          <>
            <Button
              componentType="button"
              bgColor="white"
              borderColor="rgba(241, 244, 246, 1)"
              textColor="black"
              onClick={() => setFilterRelevant(!filterRelevant)}
              style={{ padding: "7px 20px", borderRadius: "50px" }}
            >
              ONLY RELATED CARDS{" "}
              <div
                style={{
                  position: "relative",
                  width: "30px",
                  height: "17px",
                  backgroundColor: filterRelevant
                    ? "rgb(34, 197, 94)"
                    : "rgba(200, 200, 200, 1)",
                  borderRadius: "34px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "0px",
                    left: filterRelevant ? "15px" : "0px",
                    width: "17px",
                    border: "1px solid rgba(217, 217, 217, 1)",
                    height: "17px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                  }}
                />
              </div>
            </Button>

            <div style={{ borderRight: "1px solid rgba(207, 207, 207, 1)" }} />
          </>
        )}

        <MrFilterButton
          availableProjects={availableProjects}
          onApplyFilters={setFilters}
          currentFilters={filters}
        />

        {hasActiveFilters && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {filters.requestType !== "all" && (
              <Button
                style={{ borderRadius: "50px", fontWeight: "600" }}
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
              >
                TYPE:{" "}
                <span
                  style={{ color: "rgba(16, 185, 129, 1)", textWrap: "nowrap" }}
                >
                  {filters.requestType === "material"
                    ? "MATERIAL REQUEST"
                    : filters.requestType === "payment"
                      ? "PAYMENT REQUEST"
                      : "JOB ORDER"}
                </span>
              </Button>
            )}

            {filters.itemsRequestedIn !== "all" && (
              <Button
                style={{ borderRadius: "50px", fontWeight: "600" }}
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
              >
                ITEMS REQUESTED IN:{" "}
                <span
                  style={{ color: "rgba(16, 185, 129, 1)", textWrap: "nowrap" }}
                >
                  {getItemsRequestedLabel(
                    filters.itemsRequestedIn,
                  ).toUpperCase()}
                </span>
              </Button>
            )}

            {filters.selectedDepartments.length > 0 && (
              <Button
                style={{ borderRadius: "50px", fontWeight: "600" }}
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
              >
                DEPARTMENT:{" "}
                <span
                  style={{ color: "rgba(16, 185, 129, 1)", textWrap: "nowrap" }}
                >
                  {getDepartmentName(
                    filters.selectedDepartments[0],
                  ).toUpperCase()}
                  {filters.selectedDepartments.length > 1 &&
                    `, +${filters.selectedDepartments.length - 1} MORE`}
                </span>
              </Button>
            )}

            {filters.selectedProjects.length > 0 && (
              <Button
                style={{ borderRadius: "50px", fontWeight: "600" }}
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
              >
                PROJECT:{" "}
                <span
                  style={{ color: "rgba(16, 185, 129, 1)", textWrap: "nowrap" }}
                >
                  {(() => {
                    const first = availableProjects.find(
                      (p) => p.id === filters.selectedProjects[0],
                    );
                    return first ? first.name.toUpperCase() : "UNKNOWN";
                  })()}
                  {filters.selectedProjects.length > 1 &&
                    `, +${filters.selectedProjects.length - 1} MORE`}
                </span>
              </Button>
            )}

            {filters.selectedStages.length > 0 && (
              <Button
                style={{ borderRadius: "50px", fontWeight: "600" }}
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
              >
                STAGE:{" "}
                <span
                  style={{ color: "rgba(16, 185, 129, 1)", textWrap: "nowrap" }}
                >
                  {getStageName(filters.selectedStages[0]).toUpperCase()}
                  {filters.selectedStages.length > 1 &&
                    `, +${filters.selectedStages.length - 1} MORE`}
                </span>
              </Button>
            )}

            <Button
              onClick={resetAllFilters}
              componentType="button"
              bgColor="transparent"
              borderColor="transparent"
              textColor="black"
              style={{ padding: "0px" }}
            >
              RESET FILTER
            </Button>
          </div>
        )}
      </div>

      <br />
      <br />

      {viewMode === "table" && (
        <TableView
          tableItems={tableItems}
          tableLoading={tableLoading}
          searchQuery={searchQuery}
          filters={filters}
          collapsedCategories={collapsedCategories}
          setCollapsedCategories={setCollapsedCategories}
          onRefresh={() => setTableRefreshKey((k) => k + 1)}
          filterRelevant={filterRelevant}
          userDeptId={Number(userInfo?.departmentID) || 0}
        />
      )}

      {viewMode === "kanban" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          {stageGroups.map((group) => {
            if (
              filterRelevant &&
              group.name !== "Draft" &&
              !shouldShowGroupWhenFiltering(group)
            )
              return null;

            const totalCount = group.statuses.reduce((sum, status) => {
              if (filterRelevant && !shouldShowStatusWhenFiltering(status))
                return sum;
              const useLpo = LPO_STAGE_IDS.includes(status.progress_id);
              const isCompleted = status.progress_id === 25;
              const isPendingPay = status.progress_id === 14;
              if (isCompleted) {
                const mrCount = (groupedMRs[status.name] || []).filter(
                  (mr) => mr.type === "job" || mr.type === "payment",
                ).length;
                return (
                  sum + (groupedLPOs[status.progress_id]?.length || 0) + mrCount
                );
              }
              if (isPendingPay) {
                const prCount = (groupedMRs[status.name] || []).filter(
                  (mr) => mr.type === "payment",
                ).length;
                return (
                  sum + (groupedLPOs[status.progress_id]?.length || 0) + prCount
                );
              }
              return (
                sum +
                (useLpo
                  ? groupedLPOs[status.progress_id]?.length || 0
                  : groupedMRs[status.name]?.length || 0)
              );
            }, 0);

            // When searching, hide entire group if no matching cards
            if (searchQuery.trim() && totalCount === 0) return null;

            return (
              <div key={group.name}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    marginBottom: collapsedGroups[group.name] ? "0px" : "20px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [group.name]: !prev[group.name],
                    }))
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      transition: "transform 0.2s ease",
                      transform: collapsedGroups[group.name]
                        ? "rotate(-90deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    <path
                      d="M3.5 5.25L7 8.75L10.5 5.25"
                      stroke="black"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h2 style={{ margin: 0 }}>{group.name}</h2>
                  <div
                    style={{
                      backgroundColor: "black",
                      color: "white",
                      borderRadius: "50px",
                      padding: "3px 8px",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    {totalCount} Requests
                  </div>
                </div>

                {!collapsedGroups[group.name] && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "20px",
                    }}
                  >
                    {group.statuses.map((status) => {
                      if (
                        filterRelevant &&
                        !shouldShowStatusWhenFiltering(status)
                      )
                        return null;

                      const useLpoCards = LPO_STAGE_IDS.includes(
                        status.progress_id,
                      );
                      const isCompletedStage = status.progress_id === 25;
                      const isPendingPayments = status.progress_id === 14;
                      const mrs = isCompletedStage
                        ? (groupedMRs[status.name] || []).filter(
                            (mr) => mr.type === "job" || mr.type === "payment",
                          )
                        : isPendingPayments
                          ? (groupedMRs[status.name] || []).filter(
                              (mr) => mr.type === "payment",
                            )
                          : useLpoCards
                            ? []
                            : groupedMRs[status.name] || [];
                      const lpos = useLpoCards
                        ? groupedLPOs[status.progress_id] || []
                        : [];
                      const cardCount =
                        isCompletedStage || isPendingPayments
                          ? lpos.length + mrs.length
                          : useLpoCards
                            ? lpos.length
                            : mrs.length;

                      // When searching, hide empty status columns
                      if (searchQuery.trim() && cardCount === 0) return null;

                      const dept = getResponsibleDepartment(status.name);
                      const deptStyle = getDepartmentStyle(dept.id);
                      const isEmpty = cardCount === 0;

                      return (
                        <div
                          key={status.name}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            backgroundColor: isEmpty
                              ? "rgba(242, 242, 242, 1)"
                              : "transparent",
                            borderRadius: "15px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "10px",
                              padding: "15px",
                              borderRadius: "50px",
                              backgroundColor: isEmpty
                                ? "rgba(242, 242, 242, 1)"
                                : "white",
                              border: isEmpty
                                ? "none"
                                : "1px solid rgba(231, 231, 231, 1)",
                            }}
                          >
                            <h3
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: "600",
                              }}
                            >
                              {status.name}
                            </h3>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              {dept.name && !isEmpty && (
                                <div
                                  style={{
                                    ...deptStyle,
                                    padding: "7px 10px",
                                    borderRadius: "50px",
                                    fontSize: "10px",
                                    fontWeight: "600",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <span style={{ scale: "3" }}>•</span>
                                  {dept.name.toUpperCase()}
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  padding: "6px",
                                  minWidth: "32px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "50%",
                                  backgroundColor: isEmpty ? "white" : "black",
                                  color: isEmpty ? "black" : "white",
                                }}
                              >
                                {cardCount}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "15px",
                              overflowY: "auto",
                              maxHeight: "660px",
                              paddingRight: "5px",
                              marginTop: "15px",
                            }}
                          >
                            {cardCount > 0 ? (
                              isCompletedStage || isPendingPayments ? (
                                /* ===== MIXED STAGE: BOTH LPO + MR CARDS ===== */
                                <>
                                  {lpos.map((lpoCard) => {
                                    const key = `lpo-${lpoCard.id}-${lpoCard.progress_id}`;
                                    const dur = lpoDurations[key] || {
                                      duration: "0m",
                                      hoursDecimal: 0,
                                      style: {
                                        color: "black",
                                        backgroundColor:
                                          "rgba(231, 231, 231, 1)",
                                      },
                                    };

                                    return (
                                      <div
                                        key={`lpo-${lpoCard.id}`}
                                        style={{
                                          backgroundColor: "white",
                                          borderRadius: "15px",
                                          padding: "15px",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "12px",
                                          border:
                                            "1px solid rgba(231, 231, 231, 1)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "10px",
                                            }}
                                          >
                                            <div
                                              style={{
                                                backgroundColor: "black",
                                                color: "white",
                                                padding: "4px 10px",
                                                borderRadius: "50px",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                display: "inline-flex",
                                                alignItems: "center",
                                              }}
                                            >
                                              MATERIAL REQUEST
                                            </div>

                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "flex-end",
                                                gap: "10px",
                                              }}
                                            >
                                              {lpoCard.progress_id !== 25 &&
                                                lpoCard.required_date && (
                                                  <div
                                                    style={{
                                                      ...getDaysLeftStyle(
                                                        lpoCard.required_date,
                                                      ),
                                                      padding: "4px 10px",
                                                      borderRadius: "50px",
                                                      fontSize: "11px",
                                                      fontWeight: "600",
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    {getDaysLeftText(
                                                      lpoCard.required_date,
                                                    )}
                                                  </div>
                                                )}

                                              {lpoCard.progress_id !== 25 && (
                                                <div
                                                  style={{
                                                    padding: "4px 8px",
                                                    borderRadius: "50px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    backgroundColor:
                                                      "rgba(234, 234, 234, 1)",
                                                    color:
                                                      "rgba(89, 89, 89, 1)",
                                                  }}
                                                >
                                                  <svg
                                                    width="11"
                                                    height="11"
                                                    viewBox="0 0 11 11"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    style={{
                                                      color:
                                                        "rgba(89, 89, 89, 1)",
                                                    }}
                                                  >
                                                    <path
                                                      d="M5.5 2.5V5.5H8.5"
                                                      stroke="currentColor"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    />
                                                    <path
                                                      d="M5.5 10.5C8.2615 10.5 10.5 8.2615 10.5 5.5C10.5 2.7385 8.2615 0.5 5.5 0.5C2.7385 0.5 0.5 2.7385 0.5 5.5C0.5 8.2615 2.7385 10.5 5.5 10.5Z"
                                                      stroke="currentColor"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    />
                                                  </svg>
                                                  {dur.duration}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {lpoCard.progress_id !== 25 && (
                                            <div
                                              style={{
                                                alignSelf: "flex-end",
                                              }}
                                            >
                                              <svg
                                                width="15"
                                                height="17"
                                                viewBox="0 0 15 17"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                              >
                                                <path
                                                  d="M0 17V0H9L9.4 2H15V12H8L7.6 10H2V17H0Z"
                                                  fill={getFlagColor(
                                                    dur.hoursDecimal,
                                                    lpoCard.progress_id,
                                                  )}
                                                />
                                              </svg>
                                            </div>
                                          )}
                                        </div>

                                        <div>
                                          <small>MR NUMBER</small>
                                          <h3>
                                            MR-
                                            {String(
                                              lpoCard.mr_header_id,
                                            ).padStart(5, "0")}
                                          </h3>
                                        </div>

                                        <div>
                                          <small>LPO NUMBER</small>
                                          <h3>
                                            LPO-
                                            {String(lpoCard.id).padStart(
                                              5,
                                              "0",
                                            )}
                                          </h3>
                                        </div>

                                        <div>
                                          <small>PROJECT</small>
                                          <h3>{lpoCard.project_name || "-"}</h3>
                                        </div>

                                        <div>
                                          <small>VENDOR</small>
                                          <h3>
                                            {lpoCard.supplier_name || "-"}
                                          </h3>
                                        </div>

                                        <div>
                                          <small>IDENTIFIER</small>
                                          <h3>{lpoCard.identifier ?? "-"}</h3>
                                        </div>

                                        <div>
                                          <small>REQUESTER</small>
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "5px",
                                              alignItems: "center",
                                            }}
                                          >
                                            <h3
                                              style={{
                                                backgroundColor: "black",
                                                color: "white",
                                                borderRadius: "50%",
                                                width: "24px",
                                                height: "24px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                              }}
                                            >
                                              {lpoCard.requested_by
                                                ? lpoCard.requested_by
                                                    .split(" ")
                                                    .map((n: string) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                                    .slice(0, 2)
                                                : "?"}
                                            </h3>
                                            <h3>
                                              {lpoCard.requested_by || "-"},{" "}
                                              {lpoCard.department_name || "-"}
                                            </h3>
                                          </div>
                                        </div>

                                        <Button
                                          componentType="link"
                                          bgColor="rgba(239, 239, 239, 1)"
                                          borderColor="rgba(239, 239, 239, 1)"
                                          textColor="black"
                                          href={`/mr/${lpoCard.mr_header_id}/lpo/${lpoCard.id}`}
                                          full
                                          style={{ borderRadius: "50px" }}
                                          disabled={
                                            !canViewLPO(lpoCard, filterRelevant)
                                          }
                                        >
                                          VIEW &gt;
                                        </Button>
                                      </div>
                                    );
                                  })}
                                  {mrs.map((mr) => {
                                    const key = `${mr.id}-${mr.progress_id}`;
                                    const dur = mrDurations[key] || {
                                      duration: "0m",
                                      hoursDecimal: 0,
                                      style: {
                                        color: "black",
                                        backgroundColor:
                                          "rgba(231, 231, 231, 1)",
                                      },
                                    };

                                    return (
                                      <div
                                        key={mr.id}
                                        style={{
                                          backgroundColor:
                                            mr.type === "job"
                                              ? "rgba(255, 253, 227, 1)"
                                              : mr.type === "payment"
                                                ? "rgba(189, 242, 217, 1)"
                                                : "white",
                                          borderRadius: "15px",
                                          padding: "15px",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "12px",
                                          border:
                                            "1px solid rgba(231, 231, 231, 1)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            backgroundColor:
                                              mr.type === "job"
                                                ? "rgba(209, 182, 34, 1)"
                                                : mr.type === "payment"
                                                  ? "rgba(0, 163, 93, 1)"
                                                  : "black",
                                            color: "white",
                                            padding: "4px 10px",
                                            borderRadius: "50px",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            width: "fit-content",
                                            alignItems: "center",
                                          }}
                                        >
                                          {mr.type === "job"
                                            ? "JOB ORDER"
                                            : mr.type === "payment"
                                              ? "PAYMENT REQUEST"
                                              : "MATERIAL REQUEST"}
                                        </div>

                                        <div>
                                          <small>
                                            {mr.type === "job"
                                              ? "JO NUMBER"
                                              : mr.type === "payment"
                                                ? "PR NUMBER"
                                                : "MR NUMBER"}
                                          </small>
                                          <h3>
                                            {mr.type === "job"
                                              ? "JO"
                                              : mr.type === "payment"
                                                ? "PR"
                                                : "MR"}
                                            -{String(mr.id).padStart(5, "0")}
                                          </h3>
                                        </div>

                                        {mr.type === "payment" &&
                                          mr.payment_jo_reference_id && (
                                            <div>
                                              <small>JO NUMBER</small>
                                              <h3>
                                                JO-
                                                {String(
                                                  mr.payment_jo_reference_id,
                                                ).padStart(5, "0")}
                                              </h3>
                                            </div>
                                          )}

                                        <div>
                                          <small>PROJECT</small>
                                          <h3>{mr.project_name || "-"}</h3>
                                        </div>

                                        <div>
                                          <small>IDENTIFIER</small>
                                          <h3>{mr.identifier ?? "-"}</h3>
                                        </div>

                                        <div>
                                          <small>REQUESTER</small>
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "5px",
                                              alignItems: "center",
                                            }}
                                          >
                                            <h3
                                              style={{
                                                backgroundColor: "black",
                                                color: "white",
                                                borderRadius: "50%",
                                                width: "24px",
                                                height: "24px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                              }}
                                            >
                                              {mr.requested_by
                                                ? mr.requested_by
                                                    .split(" ")
                                                    .map((n: string) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                                    .slice(0, 2)
                                                : "?"}
                                            </h3>
                                            <h3>
                                              {mr.requested_by || "-"},{" "}
                                              {mr.department_name || "-"}
                                            </h3>
                                          </div>
                                        </div>

                                        <Button
                                          componentType="link"
                                          bgColor={
                                            mr.type === "job" ||
                                            mr.type === "payment"
                                              ? "white"
                                              : "rgba(239, 239, 239, 1)"
                                          }
                                          borderColor="rgba(239, 239, 239, 1)"
                                          textColor="black"
                                          href={`/mr/${mr.id}`}
                                          full
                                          style={{ borderRadius: "50px" }}
                                          disabled={
                                            !canViewMR(mr, filterRelevant)
                                          }
                                        >
                                          VIEW &gt;
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </>
                              ) : useLpoCards ? (
                                /* ===== LPO CARDS ===== */
                                lpos.map((lpoCard) => {
                                  const key = `lpo-${lpoCard.id}-${lpoCard.progress_id}`;
                                  const dur = lpoDurations[key] || {
                                    duration: "0m",
                                    hoursDecimal: 0,
                                    style: {
                                      color: "black",
                                      backgroundColor: "rgba(231, 231, 231, 1)",
                                    },
                                  };

                                  return (
                                    <div
                                      key={`lpo-${lpoCard.id}`}
                                      style={{
                                        backgroundColor: "white",
                                        borderRadius: "15px",
                                        padding: "15px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "12px",
                                        border:
                                          "1px solid rgba(231, 231, 231, 1)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          justifyContent: "space-between",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "10px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              backgroundColor: "black",
                                              color: "white",
                                              padding: "4px 10px",
                                              borderRadius: "50px",
                                              fontSize: "11px",
                                              fontWeight: "600",
                                              display: "inline-flex",
                                              alignItems: "center",
                                            }}
                                          >
                                            MATERIAL REQUEST
                                          </div>

                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "flex-end",
                                              gap: "10px",
                                            }}
                                          >
                                            {lpoCard.progress_id !== 25 &&
                                              lpoCard.required_date && (
                                                <div
                                                  style={{
                                                    ...getDaysLeftStyle(
                                                      lpoCard.required_date,
                                                    ),
                                                    padding: "4px 10px",
                                                    borderRadius: "50px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    whiteSpace: "nowrap",
                                                  }}
                                                >
                                                  {getDaysLeftText(
                                                    lpoCard.required_date,
                                                  )}
                                                </div>
                                              )}

                                            {lpoCard.progress_id !== 25 && (
                                              <div
                                                style={{
                                                  padding: "4px 8px",
                                                  borderRadius: "50px",
                                                  fontSize: "11px",
                                                  fontWeight: "600",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "5px",
                                                  backgroundColor:
                                                    "rgba(234, 234, 234, 1)",
                                                  color: "rgba(89, 89, 89, 1)",
                                                }}
                                              >
                                                <svg
                                                  width="11"
                                                  height="11"
                                                  viewBox="0 0 11 11"
                                                  fill="none"
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  style={{
                                                    color:
                                                      "rgba(89, 89, 89, 1)",
                                                  }}
                                                >
                                                  <path
                                                    d="M5.5 2.5V5.5H8.5"
                                                    stroke="currentColor"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  />
                                                  <path
                                                    d="M5.5 10.5C8.2615 10.5 10.5 8.2615 10.5 5.5C10.5 2.7385 8.2615 0.5 5.5 0.5C2.7385 0.5 0.5 2.7385 0.5 5.5C0.5 8.2615 2.7385 10.5 5.5 10.5Z"
                                                    stroke="currentColor"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  />
                                                </svg>
                                                {dur.duration}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {lpoCard.progress_id !== 25 && (
                                          <div
                                            style={{ alignSelf: "flex-end" }}
                                          >
                                            <svg
                                              width="15"
                                              height="17"
                                              viewBox="0 0 15 17"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M0 17V0H9L9.4 2H15V12H8L7.6 10H2V17H0Z"
                                                fill={getFlagColor(
                                                  dur.hoursDecimal,
                                                  lpoCard.progress_id,
                                                )}
                                              />
                                            </svg>
                                          </div>
                                        )}
                                      </div>

                                      <div>
                                        <small>MR NUMBER</small>
                                        <h3>
                                          MR-
                                          {String(
                                            lpoCard.mr_header_id,
                                          ).padStart(5, "0")}
                                        </h3>
                                      </div>

                                      <div>
                                        <small>LPO NUMBER</small>
                                        <h3>
                                          LPO-
                                          {String(lpoCard.id).padStart(5, "0")}
                                        </h3>
                                      </div>

                                      <div>
                                        <small>VENDOR</small>
                                        <h3>{lpoCard.supplier_name || "-"}</h3>
                                      </div>

                                      <div>
                                        <small>PROJECT</small>
                                        <h3>{lpoCard.project_name || "-"}</h3>
                                      </div>

                                      <div>
                                        <small>IDENTIFIER</small>
                                        <h3>{lpoCard.identifier ?? "-"}</h3>
                                      </div>

                                      <div>
                                        <small>REQUESTER</small>
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "5px",
                                            alignItems: "center",
                                          }}
                                        >
                                          <h3
                                            style={{
                                              backgroundColor: "black",
                                              color: "white",
                                              borderRadius: "50%",
                                              width: "24px",
                                              height: "24px",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontSize: "11px",
                                              fontWeight: "600",
                                            }}
                                          >
                                            {lpoCard.requested_by
                                              ? lpoCard.requested_by
                                                  .split(" ")
                                                  .map((n: string) => n[0])
                                                  .join("")
                                                  .toUpperCase()
                                                  .slice(0, 2)
                                              : "?"}
                                          </h3>
                                          <h3>
                                            {lpoCard.requested_by || "-"},{" "}
                                            {lpoCard.department_name || "-"}
                                          </h3>
                                        </div>
                                      </div>

                                      {lpoCard.progress_id === 17 &&
                                        lpoCard.delivery_date && (
                                          <div>
                                            <small>DELIVERY ETA</small>
                                            <h3>
                                              {new Date(
                                                lpoCard.delivery_date,
                                              ).toLocaleDateString("en-GB")}
                                            </h3>
                                          </div>
                                        )}

                                      <Button
                                        componentType="link"
                                        bgColor="rgba(239, 239, 239, 1)"
                                        borderColor="rgba(239, 239, 239, 1)"
                                        textColor="black"
                                        href={`/mr/${lpoCard.mr_header_id}/lpo/${lpoCard.id}`}
                                        full
                                        style={{ borderRadius: "50px" }}
                                        disabled={
                                          !canViewLPO(lpoCard, filterRelevant)
                                        }
                                      >
                                        VIEW &gt;
                                      </Button>
                                    </div>
                                  );
                                })
                              ) : (
                                /* ===== MR CARDS ===== */
                                mrs.map((mr) => {
                                  const key = `${mr.id}-${mr.progress_id}`;
                                  const dur = mrDurations[key] || {
                                    duration: "0m",
                                    hoursDecimal: 0,
                                    style: {
                                      color: "black",
                                      backgroundColor: "rgba(231, 231, 231, 1)",
                                    },
                                  };

                                  return (
                                    <div
                                      key={mr.id}
                                      style={{
                                        backgroundColor:
                                          mr.type === "job"
                                            ? "rgba(255, 253, 227, 1)"
                                            : mr.type === "payment"
                                              ? "rgba(189, 242, 217, 1)"
                                              : "white",
                                        borderRadius: "15px",
                                        padding: "15px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "12px",
                                        border:
                                          "1px solid rgba(231, 231, 231, 1)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          justifyContent: "space-between",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "flex-end",
                                            gap: "10px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              backgroundColor:
                                                mr.type === "job"
                                                  ? "rgba(209, 182, 34, 1)"
                                                  : mr.type === "payment"
                                                    ? "rgba(0, 163, 93, 1)"
                                                    : "black",
                                              color: "white",
                                              padding: "4px 10px",
                                              borderRadius: "50px",
                                              fontSize: "11px",
                                              fontWeight: "600",
                                              display: "inline-flex",
                                              alignItems: "center",
                                            }}
                                          >
                                            {mr.type === "job"
                                              ? "JOB ORDER"
                                              : mr.type === "payment"
                                                ? "PAYMENT REQUEST"
                                                : "MATERIAL REQUEST"}
                                          </div>

                                          {mr.progress_id !== 25 && (
                                            <div
                                              style={{
                                                ...getDaysLeftStyle(
                                                  mr.required_date,
                                                ),
                                                padding: "4px 10px",
                                                borderRadius: "50px",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {getDaysLeftText(
                                                mr.required_date,
                                              )}
                                            </div>
                                          )}

                                          {mr.progress_id !== 1 &&
                                            mr.progress_id !== 25 && (
                                              <div
                                                style={{
                                                  padding: "4px 8px",
                                                  borderRadius: "50px",
                                                  fontSize: "11px",
                                                  fontWeight: "600",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "5px",
                                                  backgroundColor:
                                                    "rgba(234, 234, 234, 1)",
                                                  color: "rgba(89, 89, 89, 1)",
                                                }}
                                              >
                                                <svg
                                                  width="11"
                                                  height="11"
                                                  viewBox="0 0 11 11"
                                                  fill="none"
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  style={{
                                                    color:
                                                      "rgba(89, 89, 89, 1)",
                                                  }}
                                                >
                                                  <path
                                                    d="M5.5 2.5V5.5H8.5"
                                                    stroke="currentColor"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  />
                                                  <path
                                                    d="M5.5 10.5C8.2615 10.5 10.5 8.2615 10.5 5.5C10.5 2.7385 8.2615 0.5 5.5 0.5C2.7385 0.5 0.5 2.7385 0.5 5.5C0.5 8.2615 2.7385 10.5 5.5 10.5Z"
                                                    stroke="currentColor"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  />
                                                </svg>
                                                {dur.duration}
                                              </div>
                                            )}
                                        </div>

                                        {mr.progress_id !== 1 &&
                                          mr.progress_id !== 25 && (
                                            <div
                                              style={{ alignSelf: "flex-end" }}
                                            >
                                              <svg
                                                width="15"
                                                height="17"
                                                viewBox="0 0 15 17"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                              >
                                                <path
                                                  d="M0 17V0H9L9.4 2H15V12H8L7.6 10H2V17H0Z"
                                                  fill={getFlagColor(
                                                    dur.hoursDecimal,
                                                    mr.progress_id,
                                                  )}
                                                />
                                              </svg>
                                            </div>
                                          )}
                                      </div>

                                      <div>
                                        <small>
                                          {mr.type === "job"
                                            ? "JO NUMBER"
                                            : mr.type === "payment"
                                              ? "PR NUMBER"
                                              : "MR NUMBER"}
                                        </small>
                                        <h3>
                                          {mr.type === "job"
                                            ? "JO"
                                            : mr.type === "payment"
                                              ? "PR"
                                              : "MR"}
                                          -{String(mr.id).padStart(5, "0")}
                                        </h3>
                                      </div>

                                      {mr.type === "payment" &&
                                        mr.payment_jo_reference_id && (
                                          <div>
                                            <small>JO NUMBER</small>
                                            <h3>
                                              JO-
                                              {String(
                                                mr.payment_jo_reference_id,
                                              ).padStart(5, "0")}
                                            </h3>
                                          </div>
                                        )}

                                      <div>
                                        <small>PROJECT</small>
                                        <h3>{mr.project_name || "-"}</h3>
                                      </div>

                                      <div>
                                        <small>IDENTIFIER</small>
                                        <h3>{mr.identifier ?? "-"}</h3>
                                      </div>

                                      <div>
                                        <small>REQUESTER</small>
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "5px",
                                            alignItems: "center",
                                          }}
                                        >
                                          <h3
                                            style={{
                                              backgroundColor: "black",
                                              color: "white",
                                              borderRadius: "50%",
                                              width: "24px",
                                              height: "24px",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontSize: "11px",
                                              fontWeight: "600",
                                            }}
                                          >
                                            {mr.requested_by
                                              ? mr.requested_by
                                                  .split(" ")
                                                  .map((n: string) => n[0])
                                                  .join("")
                                                  .toUpperCase()
                                                  .slice(0, 2)
                                              : "?"}
                                          </h3>
                                          <h3>
                                            {mr.requested_by || "-"},{" "}
                                            {mr.department_name || "-"}
                                          </h3>
                                        </div>
                                      </div>

                                      {mr.progress_id === 17 &&
                                        mrDeliveryDates[mr.id]?.length > 0 && (
                                          <div>
                                            {mrDeliveryDates[mr.id].map(
                                              (d, i) => (
                                                <div key={i}>
                                                  <small>
                                                    {d.supplier_name.toUpperCase()}{" "}
                                                    DELIVERY ETA
                                                  </small>
                                                  <h3>
                                                    {new Date(
                                                      d.delivery_date,
                                                    ).toLocaleDateString(
                                                      "en-GB",
                                                    )}
                                                  </h3>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}

                                      <Button
                                        componentType="link"
                                        bgColor={
                                          mr.type === "job" ||
                                          mr.type === "payment"
                                            ? "white"
                                            : "rgba(239, 239, 239, 1)"
                                        }
                                        borderColor="rgba(239, 239, 239, 1)"
                                        textColor="black"
                                        href={`/mr/${mr.id}`}
                                        full
                                        style={{ borderRadius: "50px" }}
                                        disabled={
                                          !canViewMR(mr, filterRelevant)
                                        }
                                      >
                                        VIEW &gt;
                                      </Button>
                                    </div>
                                  );
                                })
                              )
                            ) : (
                              <div
                                style={{
                                  padding: "40px 20px",
                                  textAlign: "center",
                                  color: "#9ca3af",
                                  fontSize: "12px",
                                  minHeight: "660px",
                                }}
                              >
                                No requests
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== TABLE VIEW COMPONENT ====================

type TableViewProps = {
  tableItems: {
    material: TableItem[];
    lpo: TableItem[];
    job: TableItem[];
    payment: TableItem[];
  };
  tableLoading: boolean;
  searchQuery: string;
  filters: {
    itemsRequestedIn: string;
    selectedDepartments: number[];
    selectedProjects: number[];
    requestType: string;
    selectedStages: number[];
  };
  collapsedCategories: Record<string, boolean>;
  setCollapsedCategories: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  onRefresh: () => void;
  filterRelevant: boolean;
  userDeptId: number;
};

function TableView({
  tableItems,
  tableLoading,
  searchQuery,
  filters,
  collapsedCategories,
  setCollapsedCategories,
  onRefresh,
  filterRelevant,
  userDeptId,
}: TableViewProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  // Selection state for bulk quotation creation
  const [selectedItems, setSelectedItems] = useState<TableItem[]>([]);

  function toggleItemSelection(item: TableItem) {
    setSelectedItems((prev) => {
      const exists = prev.find(
        (s) =>
          s.line_id === item.line_id && s.mr_header_id === item.mr_header_id,
      );
      if (exists) {
        return prev.filter(
          (s) =>
            !(
              s.line_id === item.line_id && s.mr_header_id === item.mr_header_id
            ),
        );
      }
      return [...prev, item];
    });
  }

  function isItemSelected(item: TableItem): boolean {
    return selectedItems.some(
      (s) => s.line_id === item.line_id && s.mr_header_id === item.mr_header_id,
    );
  }

  function isQuotationStage(item: TableItem): boolean {
    return item.type === "material" && item.progress_id === 7;
  }

  function toggleCategorySelection(catItems: TableItem[]) {
    const quotationItems = catItems.filter(isQuotationStage);
    if (quotationItems.length === 0) return;

    const allSelected = quotationItems.every((item) => isItemSelected(item));

    if (allSelected) {
      // Deselect all quotation items in this category
      setSelectedItems((prev) =>
        prev.filter(
          (s) =>
            !quotationItems.some(
              (qi) =>
                qi.line_id === s.line_id && qi.mr_header_id === s.mr_header_id,
            ),
        ),
      );
    } else {
      // Select all quotation items in this category that aren't already selected
      setSelectedItems((prev) => {
        const newItems = quotationItems.filter(
          (qi) =>
            !prev.some(
              (s) =>
                s.line_id === qi.line_id && s.mr_header_id === qi.mr_header_id,
            ),
        );
        return [...prev, ...newItems];
      });
    }
  }

  function isCategorySelected(catItems: TableItem[]): boolean {
    const quotationItems = catItems.filter(isQuotationStage);
    if (quotationItems.length === 0) return false;
    return quotationItems.every((item) => isItemSelected(item));
  }

  function isCategoryIndeterminate(catItems: TableItem[]): boolean {
    const quotationItems = catItems.filter(isQuotationStage);
    if (quotationItems.length === 0) return false;
    const selectedCount = quotationItems.filter((item) =>
      isItemSelected(item),
    ).length;
    return selectedCount > 0 && selectedCount < quotationItems.length;
  }

  function categoryHasQuotationItems(catItems: TableItem[]): boolean {
    return catItems.some(isQuotationStage);
  }

  function filterItems(items: TableItem[]): TableItem[] {
    let filtered = items;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.material_description?.toLowerCase().includes(q) ||
          item.material_category?.toLowerCase().includes(q) ||
          item.project_name?.toLowerCase().includes(q) ||
          item.requested_by?.toLowerCase().includes(q) ||
          item.mr_header_id.toString().includes(q),
      );
    }

    if (filters.selectedDepartments.length > 0) {
      filtered = filtered.filter((item) =>
        filters.selectedDepartments.includes(item.department_id),
      );
    }

    if (filters.selectedStages.length > 0) {
      filtered = filtered.filter((item) =>
        filters.selectedStages.includes(item.progress_id),
      );
    }

    // "ONLY RELATED CARDS" — filter by responsible department for the stage
    if (filterRelevant && userDeptId) {
      const progressToResponsible: { [key: number]: number } = {
        2: 16,
        3: 8,
        4: 11,
        5: 0,
        7: 9,
        9: 16,
        10: 8,
        11: 9,
        12: 9,
        13: 9,
        14: 10,
        16: 9,
        17: 11,
        21: 12,
        23: 12,
        24: 11,
      };
      filtered = filtered.filter((item) => {
        const responsible = progressToResponsible[item.progress_id];
        // If stage has no mapping or maps to 0, show to managers (8)
        if (responsible === undefined || responsible === 0) {
          return userDeptId === 8;
        }
        // Show if user's department is responsible, or user is manager
        return responsible === userDeptId || userDeptId === 8;
      });
    }

    return filtered;
  }

  function groupByCategory(
    items: TableItem[],
    groupByLpo = false,
  ): Record<string, TableItem[]> {
    const groups: Record<string, TableItem[]> = {};
    for (const item of items) {
      const cat =
        groupByLpo && item.lpo_id
          ? `LPO-${String(item.lpo_id).padStart(5, "0")}`
          : item.material_category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }

  function getCategoryTotalQty(items: TableItem[]): string {
    // Sum quantities per unit instead of lumping every quantity into a single
    // number. Items sharing the same unit are added together; items with
    // different units are kept as separate segments. Result format example:
    //   "23 BOX + 48 BAG + 3 NOS"
    const totalsByUnit: Record<string, number> = {};
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (!qty) continue;
      const unit = (item.unit || "").trim();
      const key = unit || "__NO_UNIT__";
      totalsByUnit[key] = (totalsByUnit[key] || 0) + qty;
    }

    const parts = Object.entries(totalsByUnit)
      .filter(([, total]) => total > 0)
      .map(([unit, total]) => {
        const formatted = Number.isInteger(total)
          ? total
          : parseFloat(total.toFixed(3));
        return unit === "__NO_UNIT__" ? `${formatted}` : `${formatted} ${unit}`;
      });

    return parts.join(" + ");
  }

  function getItemLink(item: TableItem): string {
    if (item.lpo_id) return `/mr/${item.mr_header_id}/lpo/${item.lpo_id}`;
    if (item.type === "job" || item.type === "payment")
      return `/mr/${item.mr_header_id}`;
    return `/mr/${item.mr_header_id}`;
  }

  function getItemRef(item: TableItem): string {
    if (item.lpo_id) return `LPO-${String(item.lpo_id).padStart(5, "0")}`;
    if (item.type === "job")
      return `JO-${String(item.mr_header_id).padStart(5, "0")}`;
    if (item.type === "payment")
      return `PR-${String(item.mr_header_id).padStart(5, "0")}`;
    return `MR-${String(item.mr_header_id).padStart(5, "0")}`;
  }

  function getStageStyle(progressName: string): React.CSSProperties {
    const name = progressName?.toLowerCase() || "";
    if (name.includes("completed"))
      return {
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    if (name.includes("rejected") || name.includes("failed"))
      return {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };

    return {
      backgroundColor: "rgba(255, 250, 189, 1)",
      color: "rgba(134, 83, 47, 1)",
    };
  }

  const sections: {
    type: string;
    label: string;
    items: TableItem[];
  }[] = [];

  if (filters.requestType === "all" || filters.requestType === "material") {
    sections.push({
      type: "material",
      label: "MATERIAL REQUESTS",
      items: filterItems(tableItems.material),
    });
  }
  if (filters.requestType === "all" || filters.requestType === "job") {
    sections.push({
      type: "job",
      label: "JOB ORDERS",
      items: filterItems(tableItems.job),
    });
  }

  if (tableLoading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
        Loading items...
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {sections.map((section) => {
          const grouped = groupByCategory(section.items);
          const categoryNames = Object.keys(grouped).sort();
          const totalItems = section.items.length;

          return (
            <div key={section.type}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                  }}
                >
                  <h2 style={{ margin: 0 }}>{section.label}</h2>
                  <div
                    style={{
                      backgroundColor: "black",
                      color: "white",
                      borderRadius: "50px",
                      padding: "4px 12px",
                    }}
                  >
                    {totalItems} Items
                  </div>
                </div>
                {section.type === "material" && (
                  <ExportItemsButton
                    selectedItems={section.items}
                    disabled={section.items.length === 0}
                  />
                )}
              </div>

              {totalItems === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#9ca3af",
                    backgroundColor: "rgba(242, 242, 242, 1)",
                    borderRadius: "12px",
                  }}
                >
                  No requests
                </div>
              ) : (
                <table className="items-table alt two-toned fixed-layout">
                  <thead>
                    <tr>
                      <th style={{ width: "30px", padding: "0" }}></th>
                      <th
                        style={{
                          width:
                            section.type === "material" ? "600px" : "600px",
                        }}
                      >
                        {section.type === "job" ? "BOQ" : "CATEGORY"}
                      </th>
                      <th style={{ width: "300px" }}>REQ. QTY</th>
                      <th style={{ width: "175px" }}>REFERENCE</th>
                      <th style={{ width: "200px" }}>REQUESTER</th>
                      <th
                        style={{
                          width:
                            section.type === "material" ? "200px" : "200px",
                        }}
                      >
                        PROJECT
                      </th>
                      <th style={{ width: "150px" }}>STAGE</th>
                      <th style={{ width: "100px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryNames.map((catName) => {
                      const catItems = grouped[catName];
                      const catKey = `${section.type}-${catName}`;
                      const isCollapsed = collapsedCategories[catKey] ?? true;
                      const catTotalQty = getCategoryTotalQty(catItems);

                      return (
                        <React.Fragment key={catKey}>
                          {/* Category header row */}
                          <tr
                            style={{
                              cursor: "pointer",
                              backgroundColor: "rgba(249,249,249,1)",
                            }}
                            onClick={() =>
                              setCollapsedCategories((prev) => ({
                                ...prev,
                                [catKey]: !isCollapsed,
                              }))
                            }
                          >
                            <td
                              style={{
                                width: "30px",
                                textAlign: "center",
                                padding: "18px 0",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{
                                  transition: "transform 0.2s ease",
                                  transform: isCollapsed
                                    ? "rotate(-90deg)"
                                    : "rotate(0deg)",
                                }}
                              >
                                <path
                                  d="M3.5 5.25L7 8.75L10.5 5.25"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                {categoryHasQuotationItems(catItems) && (
                                  <input
                                    type="checkbox"
                                    checked={isCategorySelected(catItems)}
                                    ref={(el) => {
                                      if (el)
                                        el.indeterminate =
                                          isCategoryIndeterminate(catItems);
                                    }}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleCategorySelection(catItems);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      cursor: "pointer",
                                      accentColor: "rgba(0, 163, 93, 1)",
                                    }}
                                  />
                                )}
                                {section.type === "job" ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <strong>{catName}</strong>
                                    {catItems[0]?.boq_description && (
                                      <span>
                                        - {catItems[0].boq_description}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <strong>{catName.toUpperCase()}</strong>
                                )}
                              </div>
                            </td>
                            <td>
                              <strong>{catTotalQty}</strong>
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>

                          {/* Individual items */}
                          {!isCollapsed &&
                            catItems.map((item) => (
                              <tr key={`${item.mr_header_id}-${item.line_id}`}>
                                <td></td>
                                <td
                                  style={{
                                    paddingLeft: "57px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                    }}
                                  >
                                    {isQuotationStage(item) && (
                                      <input
                                        type="checkbox"
                                        checked={isItemSelected(item)}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleItemSelection(item);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          width: "16px",
                                          height: "16px",
                                          cursor: "pointer",
                                          accentColor: "rgba(0, 163, 93, 1)",
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                    <span>
                                      {item.material_description || "-"}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  {item.quantity &&
                                  Number(item.quantity) !== 0 ? (
                                    <>
                                      {parseFloat(
                                        Number(item.quantity).toFixed(3),
                                      )}{" "}
                                      {item.unit}
                                    </>
                                  ) : (
                                    ""
                                  )}
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "10px",
                                      alignItems: "center",
                                    }}
                                  >
                                    {getItemRef(item)}{" "}
                                    <Button
                                      componentType={"link"}
                                      bgColor={"rgba(239, 239, 239, 1)"}
                                      borderColor={"rgba(223, 223, 223, 1)"}
                                      textColor={"black"}
                                      style={{ padding: "7px 7px" }}
                                      href={getItemLink(item)}
                                    >
                                      <img
                                        src={externalLinkIcon}
                                        alt="details"
                                      />
                                    </Button>
                                  </div>
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        backgroundColor: "black",
                                        color: "white",
                                        borderRadius: "50%",
                                        width: "24px",
                                        height: "24px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "10px",
                                        fontWeight: "600",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {item.requested_by
                                        ? item.requested_by
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)
                                        : "?"}
                                    </div>
                                    <span>{item.requested_by || "-"}</span>
                                  </div>
                                </td>
                                <td>{item.project_name || "-"}</td>
                                <td>
                                  <span
                                    style={{
                                      ...getStageStyle(item.progress_name),
                                      padding: "4px 10px",
                                      borderRadius: "50px",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {item.progress_name}
                                  </span>
                                </td>
                                {section.type === "material" ? (
                                  <td>
                                    {isQuotationStage(item) &&
                                      !!item.has_quotation && (
                                        <SupplierAndQuotationButton
                                          mrHeader={
                                            {
                                              id: item.mr_header_id,
                                              progress_id: item.progress_id,
                                            } as MrHeader
                                          }
                                          mrLine={
                                            {
                                              id: item.line_id,
                                              mr_header_id: item.mr_header_id,
                                              quantity: item.quantity,
                                              unit: item.unit,
                                              material_description:
                                                item.material_description,
                                            } as MrLine
                                          }
                                        />
                                      )}
                                  </td>
                                ) : (
                                  <td></td>
                                )}
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <BulkQuotationCreator
        selectedItems={selectedItems}
        onClear={() => setSelectedItems([])}
        onSuccess={() => {
          setSelectedItems([]);
          onRefresh();
        }}
      />
    </>
  );
}
