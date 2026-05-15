"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import DateRangeButton, {
  type DateRange,
} from "@/app/components/_DateRangeButton";

export type PaymentFilters = {
  selectedVendors: string[];
  selectedPaymentTypes: string[];
  selectedStatuses: string[];
  selectedProjects: string[];
  selectedSubcontractors: string[];
};

export const defaultPaymentFilters: PaymentFilters = {
  selectedVendors: [],
  selectedPaymentTypes: [],
  selectedStatuses: ["Unpaid"],
  selectedProjects: [],
  selectedSubcontractors: [],
};

type Props = {
  vendors: string[];
  projects: string[];
  subcontractors: string[];
  onApplyFilters: (filters: PaymentFilters) => void;
  currentFilters: PaymentFilters;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
};

const PAYMENT_TYPE_OPTIONS = ["Cash", "Credit", "Marketplace/Online"];
const STATUS_OPTIONS = ["Paid", "Unpaid"];

export default function PaymentFilterButton({
  vendors,
  projects,
  subcontractors,
  onApplyFilters,
  currentFilters,
  dateRange,
  onDateRangeChange,
}: Props) {
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<string[]>(
    currentFilters.selectedVendors,
  );
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>(
    currentFilters.selectedPaymentTypes,
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    currentFilters.selectedStatuses,
  );
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    currentFilters.selectedProjects,
  );
  const [selectedSubcontractors, setSelectedSubcontractors] = useState<
    string[]
  >(currentFilters.selectedSubcontractors);
  const [vendorSearch, setVendorSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [subcontractorSearch, setSubcontractorSearch] = useState("");

  const handleOpen = () => {
    setSelectedVendors(currentFilters.selectedVendors);
    setSelectedPaymentTypes(currentFilters.selectedPaymentTypes);
    setSelectedStatuses(currentFilters.selectedStatuses);
    setSelectedProjects(currentFilters.selectedProjects);
    setSelectedSubcontractors(currentFilters.selectedSubcontractors);
    setVendorSearch("");
    setProjectSearch("");
    setSubcontractorSearch("");
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({
      selectedVendors,
      selectedPaymentTypes,
      selectedStatuses,
      selectedProjects,
      selectedSubcontractors,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    const empty: PaymentFilters = {
      selectedVendors: [],
      selectedPaymentTypes: [],
      selectedStatuses: [],
      selectedProjects: [],
      selectedSubcontractors: [],
    };
    setSelectedVendors([]);
    setSelectedPaymentTypes([]);
    setSelectedStatuses([]);
    setSelectedProjects([]);
    setSelectedSubcontractors([]);
    setVendorSearch("");
    setProjectSearch("");
    setSubcontractorSearch("");
    onApplyFilters(empty);
    onDateRangeChange({ start: null, end: null, preset: null });
    setIsOpen(false);
  };

  // Vendor handlers
  const filteredVendors = vendors.filter((v) =>
    v.toLowerCase().includes(vendorSearch.toLowerCase()),
  );
  const isAllVendorsSelected = selectedVendors.length === vendors.length;
  const handleSelectAllVendors = (checked: boolean) =>
    setSelectedVendors(checked ? [...vendors] : []);
  const handleVendorChange = (vendor: string, checked: boolean) =>
    setSelectedVendors((prev) =>
      checked ? [...prev, vendor] : prev.filter((v) => v !== vendor),
    );

  // Project handlers
  const filteredProjects = projects.filter((p) =>
    p.toLowerCase().includes(projectSearch.toLowerCase()),
  );
  const isAllProjectsSelected = selectedProjects.length === projects.length;
  const handleSelectAllProjects = (checked: boolean) =>
    setSelectedProjects(checked ? [...projects] : []);
  const handleProjectChange = (project: string, checked: boolean) =>
    setSelectedProjects((prev) =>
      checked ? [...prev, project] : prev.filter((p) => p !== project),
    );

  // Subcontractor handlers
  const filteredSubcontractors = subcontractors.filter((s) =>
    s.toLowerCase().includes(subcontractorSearch.toLowerCase()),
  );
  const isAllSubcontractorsSelected =
    selectedSubcontractors.length === subcontractors.length;
  const handleSelectAllSubcontractors = (checked: boolean) =>
    setSelectedSubcontractors(checked ? [...subcontractors] : []);
  const handleSubcontractorChange = (sub: string, checked: boolean) =>
    setSelectedSubcontractors((prev) =>
      checked ? [...prev, sub] : prev.filter((s) => s !== sub),
    );

  // Payment type handlers
  const handlePaymentTypeChange = (type: string, checked: boolean) =>
    setSelectedPaymentTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type),
    );

  // Status handlers
  const handleStatusChange = (status: string, checked: boolean) =>
    setSelectedStatuses((prev) =>
      checked ? [...prev, status] : prev.filter((s) => s !== status),
    );

  return (
    <>
      <Button
        componentType="button"
        bgColor="white"
        borderColor="rgba(241, 244, 246, 1)"
        textColor="black"
        onClick={handleOpen}
        style={{ position: "relative", borderRadius: "50px" }}
      >
        FILTER <img src={filterIcon} alt="filter" />
      </Button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <FormPopUp
            header="FILTER PAYMENTS"
            setIsOpen={setIsOpen}
            addButtonLabel="CONFIRM"
            handleSubmit={handleApply}
            style={{ minWidth: "550px" }}
            secondButton={
              <Button
                componentType="button"
                bgColor="white"
                borderColor="black"
                textColor="black"
                type="button"
                onClick={handleReset}
              >
                RESET
              </Button>
            }
          >
            {/* DUE DATE */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                DUE DATE
              </h3>
              <DateRangeButton
                value={dateRange}
                onChange={onDateRangeChange}
                popupAlign="left"
              />
            </div>

            {/* PAYMENT TYPE */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                PAYMENT TYPE
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                {PAYMENT_TYPE_OPTIONS.map((type) => (
                  <label
                    key={type}
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
                      checked={selectedPaymentTypes.includes(type)}
                      onChange={(e) =>
                        handlePaymentTypeChange(type, e.target.checked)
                      }
                    />
                    <h4>{type}</h4>
                  </label>
                ))}
              </div>
            </div>

            {/* STATUS */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                STATUS
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                {STATUS_OPTIONS.map((status) => (
                  <label
                    key={status}
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
                      checked={selectedStatuses.includes(status)}
                      onChange={(e) =>
                        handleStatusChange(status, e.target.checked)
                      }
                    />
                    <h4>{status}</h4>
                  </label>
                ))}
              </div>
            </div>

            {/* VENDOR */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                VENDOR
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223, 223, 223, 1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245, 245, 245, 1)",
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
                      className="filter-checkbox"
                      checked={isAllVendorsSelected}
                      onChange={(e) => handleSelectAllVendors(e.target.checked)}
                    />
                    <h4>Select All</h4>
                  </label>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {filteredVendors.map((vendor) => (
                    <div key={vendor} style={{ marginBottom: "10px" }}>
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
                          className="filter-checkbox"
                          checked={selectedVendors.includes(vendor)}
                          onChange={(e) =>
                            handleVendorChange(vendor, e.target.checked)
                          }
                        />
                        <h4>{vendor}</h4>
                      </label>
                    </div>
                  ))}
                  {filteredVendors.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#888",
                      }}
                    >
                      No vendors found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SUBCONTRACTOR */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                SUBCONTRACTOR
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={subcontractorSearch}
                    onChange={(e) => setSubcontractorSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223, 223, 223, 1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245, 245, 245, 1)",
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
                      className="filter-checkbox"
                      checked={isAllSubcontractorsSelected}
                      onChange={(e) =>
                        handleSelectAllSubcontractors(e.target.checked)
                      }
                    />
                    <h4>Select All</h4>
                  </label>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {filteredSubcontractors.map((sub) => (
                    <div key={sub} style={{ marginBottom: "10px" }}>
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
                          className="filter-checkbox"
                          checked={selectedSubcontractors.includes(sub)}
                          onChange={(e) =>
                            handleSubcontractorChange(sub, e.target.checked)
                          }
                        />
                        <h4>{sub}</h4>
                      </label>
                    </div>
                  ))}
                  {filteredSubcontractors.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#888",
                      }}
                    >
                      No subcontractors found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PROJECT */}
            <div>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                PROJECT
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223, 223, 223, 1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245, 245, 245, 1)",
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
                      className="filter-checkbox"
                      checked={isAllProjectsSelected}
                      onChange={(e) =>
                        handleSelectAllProjects(e.target.checked)
                      }
                    />
                    <h4>Select All</h4>
                  </label>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {filteredProjects.map((project) => (
                    <div key={project} style={{ marginBottom: "10px" }}>
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
                          className="filter-checkbox"
                          checked={selectedProjects.includes(project)}
                          onChange={(e) =>
                            handleProjectChange(project, e.target.checked)
                          }
                        />
                        <h4>{project}</h4>
                      </label>
                    </div>
                  ))}
                  {filteredProjects.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#888",
                      }}
                    >
                      No projects found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
