"use client";

import React from "react";
import Button from "@/app/components/Button";
import { EditProjectButton } from "./components/_EditProjectButton";
import { Project } from "./types/project";
import { DeleteProjectButton } from "./components/_DeleteProjectButton";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../mr/[id]/types/mrHeader";
import UploadAdditionalAttachmentsButton from "./components/_UploadAdditionalAttachmentsButton";
import AttachmentsList from "./components/AttachmentList";
import CreateBoqHeaderButton from "./boq/[boqId]/components/manager/_CreateBoqHeaderButton";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import EditBoqHeaderButton from "./boq/[boqId]/components/manager/_EditBoqHeaderButton";
import { DeleteBoqHeaderButton } from "./boq/[boqId]/components/manager/_DeleteBoqHeaderButton";
import { SetBoqDraftButton } from "./boq/[boqId]/components/manager/_SetBoqDraftButton";
import { SetBoqPrimaryButton } from "./boq/[boqId]/components/manager/_SetBoqPrimaryButton";
import { DuplicateBoqHeaderButton } from "./boq/[boqId]/components/manager/_DuplicateBoqHeaderButton";
import { CreateBoqRevisionButton } from "./boq/[boqId]/components/manager/_CreateBoqRevisionButton";
import { BoqHeader } from "./boq/[boqId]/types/boqHeader";
import MrStatusFilterButton from "./components/_MrStatusFilterButton";
import BoqTableActionsButton from "./components/_BoqTableActionsButton";
import { MergeBoqHeadersButton } from "./components/_MergeBoqHeadersButton";

// Extended MrHeader type with LPO details
type MrHeaderWithLpo = MrHeader & {
  lpo_id?: number | null;
  lpo_progress_id?: number | null;
  lpo_progress_name?: string | null;
  display_progress_name?: string;
  total_spent?: number;
  date_requested?: string;
  type?: string;
};

// ── Pagination ────────────────────────────────────────────────────────────────
const MR_PAGE_SIZE = 15;

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  const btnBase: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: "5px",
    border: "1px solid rgba(223,223,223,1)",
    backgroundColor: "white",
    color: "black",
    fontWeight: 600,
    minWidth: "40px",
    cursor: "pointer",
    fontSize: "13px",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        marginTop: "20px",
      }}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          ...btnBase,
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
          opacity: currentPage === 1 ? 0.4 : 1,
        }}
      >
        ‹
      </button>
      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === "number" && onPageChange(page)}
          disabled={page === "..."}
          style={{
            ...btnBase,
            backgroundColor:
              page === currentPage
                ? "black"
                : page === "..."
                  ? "transparent"
                  : "white",
            color: page === currentPage ? "white" : "black",
            cursor: page === "..." ? "default" : "pointer",
            border: page === "..." ? "none" : "1px solid rgba(223,223,223,1)",
          }}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          ...btnBase,
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          opacity: currentPage === totalPages ? 0.4 : 1,
        }}
      >
        ›
      </button>
    </div>
  );
}

export default function ProjectWithID() {
  const externalLinkIcon = "/icons/external-link.svg";

  const { id } = useParams();
  const { userInfo } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [boqs, setBoqs] = useState<BoqHeader[] | null>(null);
  const [editingBoq, setEditingBoq] = useState<BoqHeader | null>(null);
  const [deletingBoq, setDeletingBoq] = useState<BoqHeader | null>(null);
  const [revisioningBoq, setRevisioningBoq] = useState<BoqHeader | null>(null);
  const [collapsedRevisions, setCollapsedRevisions] = useState<
    Record<number, boolean>
  >({});
  const [boqSortCol, setBoqSortCol] = useState<string | null>("created_on");
  const [boqSortDir, setBoqSortDir] = useState<"asc" | "desc">("asc");
  const [boqSearch, setBoqSearch] = useState("");
  const [selectedBoqIds, setSelectedBoqIds] = useState<Set<number>>(new Set());
  const [mergingBoqs, setMergingBoqs] = useState<[BoqHeader, BoqHeader] | null>(
    null,
  );
  const [mrs, setMrs] = useState<MrHeaderWithLpo[] | null>(null);
  const [mrStatusFilters, setMrStatusFilters] = useState<{
    selectedStatuses: string[];
  }>({ selectedStatuses: [] });
  const [mrSearch, setMrSearch] = useState("");
  const [joStatusFilters, setJoStatusFilters] = useState<{
    selectedStatuses: string[];
  }>({ selectedStatuses: [] });
  const [joSearch, setJoSearch] = useState("");
  const [mrActiveTab, setMrActiveTab] = useState<
    "material-requests" | "job-orders"
  >("material-requests");
  const [mrSortCol, setMrSortCol] = useState<
    "date_requested" | "total_spent" | null
  >(null);
  const [mrSortDir, setMrSortDir] = useState<"asc" | "desc">("desc");
  const [joSortCol, setJoSortCol] = useState<"date_requested" | null>(null);
  const [joSortDir, setJoSortDir] = useState<"asc" | "desc">("desc");
  const [mrPage, setMrPage] = useState(1);
  const [joPage, setJoPage] = useState(1);
  const [projectValue, setProjectValue] = useState<number | null>(null);

  async function fetchProjectByID() {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getProjectByID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setProject(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  async function fetchAllBoqsByProjectID() {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getAllBoqsByProjectID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setBoqs(data.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  async function fetchAllMrsByProjectID() {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getAllMrsByProjectID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        console.log(data.data);
        setMrs(data.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  async function fetchProjectStats() {
    if (!id) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getProjectStats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: id }),
        },
      );
      const data = await res.json();
      if (data?.value !== undefined) setProjectValue(Number(data.value));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchAllMrsByProjectID();
    fetchAllBoqsByProjectID();
    fetchProjectByID();
    fetchProjectStats();
  }, []);

  // Reset MR/JO pages when filters or search change
  useEffect(() => {
    setMrPage(1);
  }, [mrSearch, mrStatusFilters]);
  useEffect(() => {
    setJoPage(1);
  }, [joSearch, joStatusFilters]);

  // Helper function to get approval pill style based on progress name
  const getApprovalPillStyle = (progressName: string) => {
    const lowerProgress = progressName?.toLowerCase() || "";
    const isRejected = ["reject", "fail"].some((word) =>
      lowerProgress.includes(word),
    );
    const isCompleted = ["completed", "done", "finished"].some((word) =>
      lowerProgress.includes(word),
    );

    if (isRejected) {
      return {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    } else if (isCompleted) {
      return {
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    } else {
      // Default/pending style
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    }
  };

  // Extract unique statuses from MR data
  const mrStatuses = useMemo(() => {
    if (!mrs) return [];
    const statuses = new Set<string>();
    mrs
      .filter((mr) => !mr.type || mr.type === "material")
      .forEach((mr) => {
        const status = mr.display_progress_name || mr.progress_name;
        if (status) statuses.add(status);
      });
    return Array.from(statuses).sort();
  }, [mrs]);

  const joStatuses = useMemo(() => {
    if (!mrs) return [];
    const statuses = new Set<string>();
    mrs
      .filter((mr) => mr.type === "job")
      .forEach((mr) => {
        const status = mr.display_progress_name || mr.progress_name;
        if (status) statuses.add(status);
      });
    return Array.from(statuses).sort();
  }, [mrs]);

  // Apply status filter + search + sort
  const filteredMrs = useMemo(() => {
    if (!mrs) return null;
    let list = mrs.filter((mr) => !mr.type || mr.type === "material");
    if (mrStatusFilters.selectedStatuses.length > 0) {
      list = list.filter((mr) => {
        const status = mr.display_progress_name || mr.progress_name;
        return mrStatusFilters.selectedStatuses.includes(status);
      });
    }
    if (mrSearch.trim()) {
      const q = mrSearch.trim().toLowerCase();
      list = list.filter(
        (mr) =>
          String(mr.id).includes(q) ||
          (mr.purpose_name || "").toLowerCase().includes(q) ||
          (mr.requested_by || "").toLowerCase().includes(q) ||
          (mr.project_name || "").toLowerCase().includes(q) ||
          (mr.lpo_id ? String(mr.lpo_id).includes(q) : false),
      );
    }
    if (mrSortCol) {
      list = [...list].sort((a, b) => {
        let aVal: number, bVal: number;
        if (mrSortCol === "date_requested") {
          aVal = a.date_requested ? new Date(a.date_requested).getTime() : 0;
          bVal = b.date_requested ? new Date(b.date_requested).getTime() : 0;
        } else {
          aVal = Number(a.total_spent) || 0;
          bVal = Number(b.total_spent) || 0;
        }
        return mrSortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    return list;
  }, [mrs, mrStatusFilters.selectedStatuses, mrSearch, mrSortCol, mrSortDir]);

  const filteredJobOrders = useMemo(() => {
    if (!mrs) return null;
    let list = mrs.filter((mr) => mr.type === "job");
    if (joStatusFilters.selectedStatuses.length > 0) {
      list = list.filter((mr) => {
        const status = mr.display_progress_name || mr.progress_name;
        return joStatusFilters.selectedStatuses.includes(status);
      });
    }
    if (joSearch.trim()) {
      const q = joSearch.trim().toLowerCase();
      list = list.filter(
        (mr) =>
          String(mr.id).includes(q) ||
          (mr.purpose_name || "").toLowerCase().includes(q) ||
          (mr.requested_by || "").toLowerCase().includes(q) ||
          (mr.project_name || "").toLowerCase().includes(q),
      );
    }
    if (joSortCol) {
      list = [...list].sort((a, b) => {
        const aVal = a.date_requested
          ? new Date(a.date_requested).getTime()
          : 0;
        const bVal = b.date_requested
          ? new Date(b.date_requested).getTime()
          : 0;
        return joSortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    return list;
  }, [mrs, joStatusFilters.selectedStatuses, joSearch, joSortCol, joSortDir]);

  const hasActiveMrFilters = mrStatusFilters.selectedStatuses.length > 0;
  const hasActiveJoFilters = joStatusFilters.selectedStatuses.length > 0;

  const resetMrFilters = () => setMrStatusFilters({ selectedStatuses: [] });
  const resetJoFilters = () => setJoStatusFilters({ selectedStatuses: [] });

  const handleBoqSort = (col: string) => {
    if (boqSortCol !== col) {
      setBoqSortCol(col);
      setBoqSortDir("desc");
    } else if (boqSortDir === "desc") {
      setBoqSortDir("asc");
    } else {
      setBoqSortCol(null);
      setBoqSortDir("desc");
    }
  };

  const boqSortIcon = (col: string) => (
    <span
      style={{
        marginLeft: 4,
        fontSize: 10,
        opacity: boqSortCol === col ? 1 : 0.35,
      }}
    >
      {boqSortCol === col ? (boqSortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  type BoqGroup = { displayParent: BoqHeader; children: BoqHeader[] };

  // Build display groups: for each family (root + its revisions), whichever
  // member is primary becomes the display parent; all others become children.
  const groupedBoqs = useMemo((): BoqGroup[] => {
    if (!boqs) return [];

    const roots = boqs.filter((b) => !b.revision_of);

    const groups: BoqGroup[] = roots.map((root) => {
      const revisions = boqs
        .filter((b) => b.revision_of === root.id)
        .sort(
          (a, b) =>
            new Date(a.created_on).getTime() - new Date(b.created_on).getTime(),
        );

      const allMembers = [root, ...revisions];
      const primary = allMembers.find((b) => !!b.is_primary);
      const displayParent = primary ?? root;

      const children = allMembers
        .filter((b) => b.id !== displayParent.id)
        .sort(
          (a, b) =>
            new Date(a.created_on).getTime() - new Date(b.created_on).getTime(),
        );

      return { displayParent, children };
    });

    return [...groups].sort((a, b) => {
      // Primary group always floats to the top
      const aPrimary = !!a.displayParent.is_primary ? 0 : 1;
      const bPrimary = !!b.displayParent.is_primary ? 0 : 1;
      if (aPrimary !== bPrimary) return aPrimary - bPrimary;

      // Secondary sort by chosen column
      if (!boqSortCol) return 0;
      let aVal: number;
      let bVal: number;
      if (boqSortCol === "created_on") {
        aVal = a.displayParent.created_on
          ? new Date(a.displayParent.created_on).getTime()
          : 0;
        bVal = b.displayParent.created_on
          ? new Date(b.displayParent.created_on).getTime()
          : 0;
      } else {
        aVal =
          Number(a.displayParent.total_value) -
          Number(a.displayParent.discount);
        bVal =
          Number(b.displayParent.total_value) -
          Number(b.displayParent.discount);
      }
      return boqSortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [boqs, boqSortCol, boqSortDir]);

  const filteredGroupedBoqs = useMemo(() => {
    if (!boqSearch.trim()) return groupedBoqs;
    const q = boqSearch.toLowerCase();
    return groupedBoqs.filter(({ displayParent, children }) => {
      const matchesParent =
        displayParent.name?.toLowerCase().includes(q) ||
        displayParent.location?.toLowerCase().includes(q) ||
        `BOQ-${String(displayParent.id).padStart(5, "0")}`
          .toLowerCase()
          .includes(q);
      const matchesChild = children.some(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q) ||
          `BOQ-${String(c.id).padStart(5, "0")}`.toLowerCase().includes(q),
      );
      return matchesParent || matchesChild;
    });
  }, [groupedBoqs, boqSearch]);

  // All visible BOQ ids (parents + children) for select-all logic
  const allVisibleBoqIds = useMemo(
    () =>
      filteredGroupedBoqs.flatMap(({ displayParent, children }) => [
        displayParent.id,
        ...children.map((c) => c.id),
      ]),
    [filteredGroupedBoqs],
  );

  const allSelected =
    allVisibleBoqIds.length > 0 &&
    allVisibleBoqIds.every((id) => selectedBoqIds.has(id));

  const someSelected =
    !allSelected && allVisibleBoqIds.some((id) => selectedBoqIds.has(id));

  const toggleSelectAll = () => {
    setSelectedBoqIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allVisibleBoqIds.forEach((id) => next.delete(id));
      } else {
        allVisibleBoqIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectBoq = (id: number) => {
    setSelectedBoqIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedBoqsList = useMemo(
    () => (boqs ?? []).filter((b) => selectedBoqIds.has(b.id)),
    [boqs, selectedBoqIds],
  );

  return (
    <div className="dashboard">
      <h1>
        <a href="/project">PROJECTS</a> &gt; {project?.name.toUpperCase()}
      </h1>

      <br />
      <br />

      <div className="project-with-id">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "25px",
              textTransform: "uppercase",
            }}
          >
            <div>
              <small>NAME</small>
              <h2>{project?.name}</h2>
            </div>
            <div>
              <small>TYPE</small>
              <h2>{project?.type}</h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {(userInfo?.departmentID === 8 ||
              userInfo?.departmentID === 16) && (
              <>
                <EditProjectButton
                  project={project}
                  onSuccess={() => fetchProjectByID()}
                />
                <DeleteProjectButton project={project} />
              </>
            )}
          </div>
        </div>

        <br />
        <br />

        <div
          style={{
            display: "flex",
            gap: "25px",
            textTransform: "uppercase",
            borderTop: "1px solid rgba(207, 207, 207, 1)",
            paddingTop: "32px",
          }}
        >
          <div>
            <small>PROJECT NUMBER</small>
            <h2>RAY-{String(project?.id).padStart(5, "0")}</h2>
          </div>

          <div>
            <small>SIZE</small>
            <h2>{project?.size.toLocaleString("en-US")} SQFT</h2>
          </div>

          <div>
            <small>STATUS</small>
            <div
              className="approval-pill normal-text centered"
              style={{
                background: project?.status.toLowerCase().includes("completed")
                  ? "rgba(134,241,181,1)"
                  : "rgba(255, 250, 189, 1)",
                color: project?.status.toLowerCase().includes("completed")
                  ? "rgba(52,100,73,1)"
                  : "rgba(134, 83, 47, 1)",
              }}
            >
              {project?.status}
            </div>
          </div>

          <div>
            <small>TYPE OF WORK</small>
            <h2 style={{ textWrap: "nowrap" }}>
              {project?.type_of_work || "-"}
            </h2>
          </div>

          <div>
            <small>VALUE</small>
            <h2>
              {projectValue !== null
                ? `${project?.currency ?? "AED"} ${projectValue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "-"}
            </h2>
          </div>

          <div>
            <small>BUDGET</small>
            <h2>
              {project?.allocated_budget
                ? `${project.currency} ${Number(project?.allocated_budget).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "-"}
            </h2>
          </div>
        </div>

        <br />

        <div
          style={{ display: "flex", gap: " 25px", textTransform: "uppercase" }}
        >
          <div>
            <small>START DATE</small>
            <h2>
              {project?.start_date
                ? new Date(project.start_date).toLocaleDateString("en-US")
                : "-"}
            </h2>
          </div>

          <div>
            <small>END DATE</small>
            <h2>
              {project?.end_date
                ? new Date(project.end_date).toLocaleDateString("en-US")
                : "-"}
            </h2>
          </div>
        </div>

        {project?.scope && (
          <>
            <br />

            <div style={{ textTransform: "uppercase" }}>
              <small>SCOPE</small>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {project.scope
                  ?.split(",")
                  .map((item: string, index: number) => (
                    <h2
                      key={index}
                      className=""
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "rgba(225, 225, 225, 1)",
                        borderRadius: "5px",
                        color: "black",
                      }}
                    >
                      {item.trim()}
                    </h2>
                  ))}
              </div>
            </div>
          </>
        )}

        <br />
        <br />

        <div
          style={{
            borderTop: "1px solid rgba(207, 207, 207, 1)",
            paddingTop: "32px",
          }}
        >
          <small>ADDITIONAL ATTACHMENTS</small>
          <div style={{ display: "flex", gap: "25px" }}>
            <AttachmentsList
              attachments={project?.attachments}
              projectId={project?.id}
              onDeleteSuccess={() => fetchProjectByID()}
            />
            <UploadAdditionalAttachmentsButton
              project={project}
              onUploadSuccess={() => fetchProjectByID()}
            />
          </div>
        </div>
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />

      <div className="widget-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3>BILL OF QUANTITIES</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BoqTableActionsButton
              selectedCount={selectedBoqIds.size}
              selectedBoqs={selectedBoqsList}
              onReset={() => setSelectedBoqIds(new Set())}
              onMerge={() => {
                if (selectedBoqsList.length === 2) {
                  setMergingBoqs([selectedBoqsList[0], selectedBoqsList[1]]);
                }
              }}
              onDelete={() => {}}
            />
            {/* Search bar */}
            <input
              type="text"
              placeholder="SEARCH"
              value={boqSearch}
              onChange={(e) => setBoqSearch(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid rgba(211,211,211,1)",
                borderRadius: "6px",
                fontSize: "12px",
                outline: "none",
                width: "200px",
              }}
            />
            {(userInfo?.departmentID === 8 ||
              userInfo?.departmentID === 16) && (
              <CreateBoqHeaderButton
                project={project}
                onSuccess={() => fetchAllBoqsByProjectID()}
              />
            )}
          </div>
        </div>

        <br />

        {boqs?.length === 0 ? (
          <div>No bill of quantities created</div>
        ) : (
          <table
            className="items-table two-toned"
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <colgroup>
              <col style={{ width: "40px" }} />
              <col style={{ width: "32px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "250px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: "0 0 0 12px" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="manager-checkbox"
                  />
                </th>
                <th></th>
                <th>BOQ NUMBER</th>
                <th
                  onClick={() => handleBoqSort("created_on")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  CREATION DATE{boqSortIcon("created_on")}
                </th>
                <th>NAME</th>
                <th>LOCATION</th>
                <th
                  onClick={() => handleBoqSort("total_value")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  TOTAL VALUE{boqSortIcon("total_value")}
                </th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredGroupedBoqs.map(
                ({ displayParent: boq, children: revisions }) => {
                  const hasRevisions = revisions.length > 0;
                  const isCollapsed = collapsedRevisions[boq.id] ?? false;
                  const canManage =
                    userInfo?.departmentID === 8 ||
                    userInfo?.departmentID === 16;

                  const renderActions = (
                    row: BoqHeader,
                    isRevision = false,
                  ) => (
                    <div
                      style={{
                        display: "flex",
                        gap: "25px",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        componentType="link"
                        bgColor="rgba(239, 239, 239, 1)"
                        borderColor="rgba(223, 223, 223, 1)"
                        textColor="black"
                        style={{ padding: "7px 7px" }}
                        href={`/project/${row.project_id}/boq/${row.id}`}
                      >
                        <img src={externalLinkIcon} alt="view" />
                      </Button>
                      <ThreeDotsMenuButton>
                        <Button
                          componentType="button"
                          bgColor="transparent"
                          borderColor="transparent"
                          textColor="black"
                          onClick={() => setEditingBoq(row)}
                          full
                          style={{ justifyContent: "flex-start" }}
                        >
                          <img src="/icons/pencil.svg" alt="pencil" /> Edit
                        </Button>
                        <DuplicateBoqHeaderButton
                          boqHeader={row}
                          onSuccess={() => fetchAllBoqsByProjectID()}
                        />
                        <SetBoqPrimaryButton
                          boqHeader={row}
                          onSuccess={() => fetchAllBoqsByProjectID()}
                        />
                        <SetBoqDraftButton
                          boqHeader={row}
                          onSuccess={() => fetchAllBoqsByProjectID()}
                        />
                        {!isRevision && (
                          <Button
                            componentType="button"
                            bgColor="transparent"
                            borderColor="transparent"
                            textColor="black"
                            onClick={() => setRevisioningBoq(row)}
                            full
                            style={{ justifyContent: "flex-start" }}
                          >
                            Create Revision
                          </Button>
                        )}
                        <Button
                          componentType="button"
                          bgColor="transparent"
                          borderColor="transparent"
                          textColor="black"
                          onClick={() => setDeletingBoq(row)}
                          full
                          style={{ justifyContent: "flex-start" }}
                        >
                          <img src="/icons/trash.svg" alt="trash" /> Delete
                        </Button>
                      </ThreeDotsMenuButton>
                    </div>
                  );

                  const renderStatusPill = (row: BoqHeader) => (
                    <span
                      className="approval-pill normal-text centered full"
                      style={{
                        backgroundColor: row.is_draft
                          ? "rgba(255, 250, 189, 1)"
                          : "rgba(87, 244, 176, 1)",
                        color: row.is_draft
                          ? "rgba(134, 83, 47, 1)"
                          : "rgba(31, 101, 71, 1)",
                      }}
                    >
                      {row.is_draft ? "DRAFT" : "ACTIVE"}
                    </span>
                  );

                  const isParentChecked = selectedBoqIds.has(boq.id);

                  return (
                    <React.Fragment key={boq.id}>
                      {/* ── Parent row ── */}
                      <tr
                        style={
                          isParentChecked
                            ? { backgroundColor: "rgba(240,253,247,1)" }
                            : undefined
                        }
                      >
                        <td style={{ padding: "0 0 0 12px" }}>
                          <input
                            type="checkbox"
                            checked={isParentChecked}
                            onChange={() => toggleSelectBoq(boq.id)}
                            className="manager-checkbox"
                          />
                        </td>
                        <td style={{ textAlign: "center", padding: "0 4px" }}>
                          {hasRevisions && (
                            <button
                              onClick={() =>
                                setCollapsedRevisions((prev) => ({
                                  ...prev,
                                  [boq.id]: !prev[boq.id],
                                }))
                              }
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
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
                            </button>
                          )}
                        </td>
                        <td>BOQ-{String(boq.id).padStart(5, "0")}</td>
                        <td>
                          {boq.created_on
                            ? new Date(boq.created_on).toLocaleDateString(
                                "en-GB",
                              )
                            : "-"}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span>{boq.name || "-"}</span>
                            {!!boq.is_primary && (
                              <span
                                style={{
                                  padding: "4px 16px",
                                  backgroundColor: "rgba(235, 222, 151, 1)",
                                  color: "rgba(123, 109, 32, 1)",
                                  borderRadius: "50px",
                                  fontSize: "8px",
                                  fontWeight: "800",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                PRIMARY
                              </span>
                            )}
                            {!boq.is_primary && (
                              <span
                                style={{
                                  padding: "4px 16px",
                                  backgroundColor: "rgba(225, 225, 225, 1)",
                                  color: "rgba(90, 90, 90, 1)",
                                  borderRadius: "50px",
                                  fontSize: "8px",
                                  fontWeight: "800",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ADDITIONAL
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{boq.location || "-"}</td>
                        <td>
                          {canManage
                            ? `${boq.project_currency} ${(
                                Number(boq.total_value) -
                                  Number(boq.discount) || 0
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "-"}
                        </td>
                        <td>{renderStatusPill(boq)}</td>
                        <td>{canManage && renderActions(boq)}</td>
                      </tr>

                      {/* ── Revision rows (collapsed/expanded) ── */}
                      {!isCollapsed &&
                        revisions.map((rev) => (
                          <tr
                            key={rev.id}
                            style={{
                              backgroundColor: selectedBoqIds.has(rev.id)
                                ? "rgba(240,253,247,1)"
                                : "rgba(250, 250, 252, 1)",
                            }}
                          >
                            <td style={{ padding: "0 0 0 12px" }}>
                              <input
                                type="checkbox"
                                checked={selectedBoqIds.has(rev.id)}
                                onChange={() => toggleSelectBoq(rev.id)}
                                className="manager-checkbox"
                              />
                            </td>
                            <td
                              style={{ textAlign: "center", padding: "0 4px" }}
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 10 10"
                                fill="none"
                                style={{
                                  opacity: 0.35,
                                  display: "block",
                                  marginBottom: "8px",
                                  marginLeft: "12px",
                                }}
                              >
                                <path
                                  d="M1 1 L1 9 L9 9"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </td>
                            <td
                              style={{
                                color: "rgba(100,100,100,1)",
                                fontSize: "12px",
                              }}
                            >
                              BOQ-{String(rev.id).padStart(5, "0")}
                            </td>
                            <td
                              style={{
                                color: "rgba(100,100,100,1)",
                                fontSize: "12px",
                              }}
                            >
                              {rev.created_on
                                ? new Date(rev.created_on).toLocaleDateString(
                                    "en-GB",
                                  )
                                : "-"}
                            </td>
                            <td
                              style={{
                                color: "rgba(100,100,100,1)",
                                fontSize: "12px",
                              }}
                            >
                              {rev.name || "-"}
                            </td>
                            <td
                              style={{
                                color: "rgba(100,100,100,1)",
                                fontSize: "12px",
                              }}
                            >
                              {rev.location || "-"}
                            </td>
                            <td
                              style={{
                                color: "rgba(100,100,100,1)",
                                fontSize: "12px",
                              }}
                            >
                              {canManage
                                ? `${rev.project_currency} ${(
                                    Number(rev.total_value) -
                                      Number(rev.discount) || 0
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : "-"}
                            </td>
                            <td>{renderStatusPill(rev)}</td>
                            <td>{canManage && renderActions(rev, true)}</td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                },
              )}
            </tbody>
          </table>
        )}
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />

      {/* Tab switcher — outside the widget container */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <Button
          componentType="button"
          bgColor={
            mrActiveTab === "material-requests" ? "black" : "transparent"
          }
          borderColor="black"
          textColor={mrActiveTab === "material-requests" ? "white" : "black"}
          style={{ borderRadius: "25px", padding: "6px 18px" }}
          onClick={() => setMrActiveTab("material-requests")}
        >
          MATERIAL REQUESTS
        </Button>
        <Button
          componentType="button"
          bgColor={mrActiveTab === "job-orders" ? "black" : "transparent"}
          borderColor="black"
          textColor={mrActiveTab === "job-orders" ? "white" : "black"}
          style={{ borderRadius: "25px", padding: "6px 18px" }}
          onClick={() => setMrActiveTab("job-orders")}
        >
          JOB ORDERS
        </Button>
      </div>

      <div className="widget-container">
        {/* Section header — label changes with active tab */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h3>
            {mrActiveTab === "material-requests"
              ? "MATERIAL REQUESTS"
              : "JOB ORDERS"}
          </h3>
        </div>

        {/* ── Material Requests tab ── */}
        {mrActiveTab === "material-requests" && (
          <>
            {/* Filter bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <MrStatusFilterButton
                  statuses={mrStatuses}
                  onApplyFilters={setMrStatusFilters}
                  currentFilters={mrStatusFilters}
                />
                {hasActiveMrFilters && (
                  <>
                    {mrStatusFilters.selectedStatuses.length > 0 && (
                      <Button
                        style={{ borderRadius: "50px", fontWeight: 600 }}
                        componentType={"none"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"transparent"}
                        textColor={"black"}
                      >
                        STATUS:{" "}
                        <span
                          style={{
                            color: "rgba(16, 185, 129, 1)",
                            textWrap: "nowrap",
                          }}
                        >
                          {mrStatusFilters.selectedStatuses[0].toUpperCase()}
                          {mrStatusFilters.selectedStatuses.length > 1 &&
                            `, +${mrStatusFilters.selectedStatuses.length - 1} MORE`}
                        </span>
                      </Button>
                    )}
                    <Button
                      onClick={resetMrFilters}
                      componentType={"button"}
                      bgColor={"transparent"}
                      borderColor={"transparent"}
                      textColor={"black"}
                      style={{ padding: "0px" }}
                    >
                      RESET FILTER
                    </Button>
                  </>
                )}
              </div>
              <input
                type="text"
                placeholder="SEARCH"
                value={mrSearch}
                onChange={(e) => setMrSearch(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid rgba(211,211,211,1)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  outline: "none",
                  width: "200px",
                }}
              />
            </div>

            {filteredMrs?.length === 0 ? (
              <div style={{ fontSize: "13px", color: "rgba(130,130,130,1)" }}>
                {hasActiveMrFilters
                  ? "No material requests matching your filters"
                  : "No material requests created"}
              </div>
            ) : (
              <>
                <table
                  className="items-table two-toned"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "auto" }} />
                    <col style={{ width: "auto" }} />
                    <col style={{ width: "200px" }} />
                    <col style={{ width: "250px" }} />
                    <col style={{ width: "100px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>MR NUMBER</th>
                      <th>LPO NUMBER</th>
                      <th
                        onClick={() => {
                          if (mrSortCol !== "date_requested") {
                            setMrSortCol("date_requested");
                            setMrSortDir("desc");
                          } else if (mrSortDir === "desc") setMrSortDir("asc");
                          else {
                            setMrSortCol(null);
                            setMrSortDir("desc");
                          }
                        }}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        CREATION DATE
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: 10,
                            opacity: mrSortCol === "date_requested" ? 1 : 0.35,
                          }}
                        >
                          {mrSortCol === "date_requested"
                            ? mrSortDir === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </th>
                      <th>PURPOSE</th>
                      <th>PROJECT</th>
                      <th>REQUESTER</th>
                      <th
                        onClick={() => {
                          if (mrSortCol !== "total_spent") {
                            setMrSortCol("total_spent");
                            setMrSortDir("desc");
                          } else if (mrSortDir === "desc") setMrSortDir("asc");
                          else {
                            setMrSortCol(null);
                            setMrSortDir("desc");
                          }
                        }}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        TOTAL PRICE
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: 10,
                            opacity: mrSortCol === "total_spent" ? 1 : 0.35,
                          }}
                        >
                          {mrSortCol === "total_spent"
                            ? mrSortDir === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMrs
                      ?.slice(
                        (mrPage - 1) * MR_PAGE_SIZE,
                        mrPage * MR_PAGE_SIZE,
                      )
                      .map((item: MrHeaderWithLpo, index: number) => {
                        const progressStyle = getApprovalPillStyle(
                          item.display_progress_name || item.progress_name,
                        );
                        return (
                          <tr key={index}>
                            <td>MR-{String(item.id).padStart(5, "0")}</td>
                            <td>
                              {item.lpo_id
                                ? `LPO-${String(item.lpo_id).padStart(5, "0")}`
                                : "-"}
                            </td>
                            <td>
                              {item.date_requested
                                ? new Date(
                                    item.date_requested,
                                  ).toLocaleDateString("en-US")
                                : "-"}
                            </td>
                            <td>{item.purpose_name || "-"}</td>
                            <td>{item.project_name || "-"}</td>
                            <td>{item.requested_by || "-"}</td>
                            <td>
                              {item.total_spent
                                ? `AED ${Number(
                                    item.total_spent,
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : "-"}
                            </td>
                            <td>
                              <span
                                className="approval-pill normal-text centered full"
                                style={{
                                  ...progressStyle,
                                  textTransform: "uppercase",
                                }}
                              >
                                {item.display_progress_name ||
                                  item.progress_name}
                              </span>
                            </td>
                            <td>
                              <div>
                                {userInfo?.departmentID ===
                                  item.department_id ||
                                userInfo?.departmentID === 8 ? (
                                  <Button
                                    componentType={"link"}
                                    bgColor={"rgba(239, 239, 239, 1)"}
                                    borderColor={"rgba(223, 223, 223, 1)"}
                                    textColor={"black"}
                                    style={{ padding: "7px 7px" }}
                                    href={
                                      item.lpo_id
                                        ? `/mr/${item.id}/lpo/${item.lpo_id}`
                                        : `/mr/${item.id}`
                                    }
                                  >
                                    <img
                                      src={externalLinkIcon}
                                      alt="external link"
                                    />
                                  </Button>
                                ) : (
                                  "-"
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <PaginationControls
                  currentPage={mrPage}
                  totalPages={Math.ceil(
                    (filteredMrs?.length ?? 0) / MR_PAGE_SIZE,
                  )}
                  onPageChange={setMrPage}
                />
              </>
            )}
          </>
        )}

        {/* ── Job Orders tab ── */}
        {mrActiveTab === "job-orders" && (
          <>
            {/* Filter bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <MrStatusFilterButton
                  statuses={joStatuses}
                  onApplyFilters={setJoStatusFilters}
                  currentFilters={joStatusFilters}
                />
                {hasActiveJoFilters && (
                  <>
                    {joStatusFilters.selectedStatuses.length > 0 && (
                      <Button
                        style={{ borderRadius: "50px", fontWeight: 600 }}
                        componentType={"none"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"transparent"}
                        textColor={"black"}
                      >
                        STATUS:{" "}
                        <span
                          style={{
                            color: "rgba(16, 185, 129, 1)",
                            textWrap: "nowrap",
                          }}
                        >
                          {joStatusFilters.selectedStatuses[0].toUpperCase()}
                          {joStatusFilters.selectedStatuses.length > 1 &&
                            `, +${joStatusFilters.selectedStatuses.length - 1} MORE`}
                        </span>
                      </Button>
                    )}
                    <Button
                      onClick={resetJoFilters}
                      componentType={"button"}
                      bgColor={"transparent"}
                      borderColor={"transparent"}
                      textColor={"black"}
                      style={{ padding: "0px" }}
                    >
                      RESET FILTER
                    </Button>
                  </>
                )}
              </div>
              <input
                type="text"
                placeholder="SEARCH"
                value={joSearch}
                onChange={(e) => setJoSearch(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid rgba(211,211,211,1)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  outline: "none",
                  width: "200px",
                }}
              />
            </div>

            {filteredJobOrders?.length === 0 ? (
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(130,130,130,1)",
                  padding: "40px 0",
                  textAlign: "center",
                }}
              >
                No job orders created
              </div>
            ) : (
              <>
                <table
                  className="items-table two-toned"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "auto" }} />
                    <col style={{ width: "auto" }} />
                    <col style={{ width: "200px" }} />
                    <col style={{ width: "200px" }} />
                    <col style={{ width: "100px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>JO NUMBER</th>
                      <th
                        onClick={() => {
                          if (joSortCol !== "date_requested") {
                            setJoSortCol("date_requested");
                            setJoSortDir("desc");
                          } else if (joSortDir === "desc") setJoSortDir("asc");
                          else {
                            setJoSortCol(null);
                            setJoSortDir("desc");
                          }
                        }}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        CREATION DATE
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: 10,
                            opacity: joSortCol === "date_requested" ? 1 : 0.35,
                          }}
                        >
                          {joSortCol === "date_requested"
                            ? joSortDir === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </th>
                      <th>PURPOSE</th>
                      <th>PROJECT</th>
                      <th>REQUESTER</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobOrders
                      ?.slice(
                        (joPage - 1) * MR_PAGE_SIZE,
                        joPage * MR_PAGE_SIZE,
                      )
                      .map((item: MrHeaderWithLpo, index: number) => {
                        const progressStyle = getApprovalPillStyle(
                          item.display_progress_name || item.progress_name,
                        );
                        return (
                          <tr key={index}>
                            <td>JO-{String(item.id).padStart(5, "0")}</td>
                            <td>
                              {item.date_requested
                                ? new Date(
                                    item.date_requested,
                                  ).toLocaleDateString("en-US")
                                : "-"}
                            </td>
                            <td>{item.purpose_name || "-"}</td>
                            <td>{item.project_name || "-"}</td>
                            <td>{item.requested_by || "-"}</td>
                            <td>
                              <span
                                className="approval-pill normal-text centered"
                                style={{
                                  ...progressStyle,
                                  textTransform: "uppercase",
                                }}
                              >
                                {item.display_progress_name ||
                                  item.progress_name}
                              </span>
                            </td>
                            <td>
                              <div>
                                {userInfo?.departmentID ===
                                  item.department_id ||
                                userInfo?.departmentID === 8 ? (
                                  <Button
                                    componentType={"link"}
                                    bgColor={"rgba(239, 239, 239, 1)"}
                                    borderColor={"rgba(223, 223, 223, 1)"}
                                    textColor={"black"}
                                    style={{ padding: "7px 7px" }}
                                    href={`/mr/${item.id}`}
                                  >
                                    <img
                                      src={externalLinkIcon}
                                      alt="external link"
                                    />
                                  </Button>
                                ) : (
                                  "-"
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <PaginationControls
                  currentPage={joPage}
                  totalPages={Math.ceil(
                    (filteredJobOrders?.length ?? 0) / MR_PAGE_SIZE,
                  )}
                  onPageChange={setJoPage}
                />
              </>
            )}
          </>
        )}
      </div>
      {/* Page-level BOQ modals — rendered outside ThreeDotsMenu so they survive menu close */}
      {editingBoq && (
        <EditBoqHeaderButton
          key={editingBoq.id}
          boqHeader={editingBoq}
          openImmediately
          hideButton
          onSuccess={() => {
            setEditingBoq(null);
            fetchAllBoqsByProjectID();
          }}
          onClose={() => setEditingBoq(null)}
        />
      )}
      {deletingBoq && (
        <DeleteBoqHeaderButton
          key={deletingBoq.id}
          boqHeader={deletingBoq}
          openImmediately
          hideButton
          onSuccess={() => {
            setDeletingBoq(null);
            fetchAllBoqsByProjectID();
          }}
          onClose={() => setDeletingBoq(null)}
        />
      )}
      {mergingBoqs && (
        <MergeBoqHeadersButton
          boqs={mergingBoqs}
          onSuccess={() => {
            setMergingBoqs(null);
            setSelectedBoqIds(new Set());
            fetchAllBoqsByProjectID();
          }}
          onClose={() => setMergingBoqs(null)}
        />
      )}
      {revisioningBoq && (
        <CreateBoqRevisionButton
          key={revisioningBoq.id}
          boqHeader={revisioningBoq}
          revisionNumber={
            (boqs?.filter((b) => b.revision_of === revisioningBoq.id).length ??
              0) + 1
          }
          openImmediately
          hideButton
          onSuccess={() => {
            setRevisioningBoq(null);
            fetchAllBoqsByProjectID();
          }}
          onClose={() => setRevisioningBoq(null)}
        />
      )}
    </div>
  );
}
