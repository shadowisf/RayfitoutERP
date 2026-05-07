"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type TransferLogFilterButtonProps = {
  locations: string[];
  projects: string[];
  onApplyFilters: (filters: TransferLogFilters) => void;
  currentFilters: TransferLogFilters;
};

export type TransferLogFilters = {
  timeRange: string;
  selectedTypes: string[];
  selectedStatuses: string[];
  selectedLocations: string[];
  selectedProjects: string[];
};

export const defaultTransferLogFilters: TransferLogFilters = {
  timeRange: "all",
  selectedTypes: [],
  selectedStatuses: [],
  selectedLocations: [],
  selectedProjects: [],
};

export default function TransferLogFilterButton({
  locations,
  projects,
  onApplyFilters,
  currentFilters,
}: TransferLogFilterButtonProps) {
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<string>(currentFilters.timeRange);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    currentFilters.selectedTypes,
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    currentFilters.selectedStatuses,
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    currentFilters.selectedLocations,
  );
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    currentFilters.selectedProjects,
  );
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  const handleOpen = () => {
    setTimeRange(currentFilters.timeRange);
    setSelectedTypes(currentFilters.selectedTypes);
    setSelectedStatuses(currentFilters.selectedStatuses);
    setSelectedLocations(currentFilters.selectedLocations);
    setSelectedProjects(currentFilters.selectedProjects);
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({
      timeRange,
      selectedTypes,
      selectedStatuses,
      selectedLocations,
      selectedProjects,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setTimeRange("all");
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedLocations([]);
    setSelectedProjects([]);
    setLocationSearchQuery("");
    setProjectSearchQuery("");
  };

  // Type handlers
  const transferTypeOptions = ["Material Transfer", "Issue For Use"];

  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, type]);
    } else {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    }
  };

  // Status handlers
  const statusOptions = [
    "Sent for Processing",
    "Stock Issued",
    "Stock Transferred",
  ];

  const handleStatusChange = (status: string, checked: boolean) => {
    if (checked) {
      setSelectedStatuses([...selectedStatuses, status]);
    } else {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    }
  };

  // Location handlers
  const handleSelectAllLocations = (checked: boolean) => {
    if (checked) {
      setSelectedLocations(locations);
    } else {
      setSelectedLocations([]);
    }
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations([...selectedLocations, location]);
    } else {
      setSelectedLocations(selectedLocations.filter((l) => l !== location));
    }
  };

  const isAllLocationsSelected =
    locations.length > 0 && selectedLocations.length === locations.length;

  const filteredLocations = locations.filter((location) =>
    location.toLowerCase().includes(locationSearchQuery.toLowerCase()),
  );

  // Project handlers
  const handleSelectAllProjects = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(projects);
    } else {
      setSelectedProjects([]);
    }
  };

  const handleProjectChange = (project: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects([...selectedProjects, project]);
    } else {
      setSelectedProjects(selectedProjects.filter((p) => p !== project));
    }
  };

  const isAllProjectsSelected =
    projects.length > 0 && selectedProjects.length === projects.length;

  const filteredProjects = projects.filter((project) =>
    project.toLowerCase().includes(projectSearchQuery.toLowerCase()),
  );

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
          header={"FILTER TRANSACTIONS"}
          setIsOpen={setIsOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={handleApply}
          style={{ minWidth: "600px" }}
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
          {/* Time Range Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              TIME RANGE
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {[
                { value: "all", label: "All Times" },
                { value: "24h", label: "Last 24 hours" },
                { value: "3d", label: "Last 3 days" },
                { value: "7d", label: "Last 7 days" },
                { value: "14d", label: "Last 14 days" },
                { value: "30d", label: "Last 30 days" },
              ].map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="timeRange"
                    value={option.value}
                    checked={timeRange === option.value}
                    onChange={(e) => setTimeRange(e.target.value)}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                    }}
                  />
                  <h4>{option.label}</h4>
                </label>
              ))}
            </div>
          </div>

          {/* Transfer Type Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              TRANSFER TYPE
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {transferTypeOptions.map((type) => (
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
                    checked={selectedTypes.includes(type)}
                    onChange={(e) => handleTypeChange(type, e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "rgba(0, 163, 93, 1)",
                    }}
                  />
                  <h4>{type}</h4>
                </label>
              ))}
            </div>
          </div>

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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {statusOptions.map((status) => (
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
                    checked={selectedStatuses.includes(status)}
                    onChange={(e) =>
                      handleStatusChange(status, e.target.checked)
                    }
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "rgba(0, 163, 93, 1)",
                    }}
                  />
                  <h4>{status}</h4>
                </label>
              ))}
            </div>
          </div>

          {/* Location Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              LOCATION
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
                  placeholder="SEARCH"
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
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
                    checked={isAllLocationsSelected}
                    onChange={(e) => handleSelectAllLocations(e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "rgba(0, 163, 93, 1)",
                    }}
                  />
                  <h4>Select All</h4>
                </label>
              </div>

              <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((location) => (
                    <div key={location} style={{ marginBottom: "10px" }}>
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
                          checked={selectedLocations.includes(location)}
                          onChange={(e) =>
                            handleLocationChange(location, e.target.checked)
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "rgba(0, 163, 93, 1)",
                          }}
                        />
                        <h4>{location}</h4>
                      </label>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888",
                    }}
                  >
                    No locations found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
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
                  placeholder="SEARCH"
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
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
                    checked={isAllProjectsSelected}
                    onChange={(e) => handleSelectAllProjects(e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "rgba(0, 163, 93, 1)",
                    }}
                  />
                  <h4>Select All</h4>
                </label>
              </div>

              <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
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
                          checked={selectedProjects.includes(project)}
                          onChange={(e) =>
                            handleProjectChange(project, e.target.checked)
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "rgba(0, 163, 93, 1)",
                          }}
                        />
                        <h4>{project}</h4>
                      </label>
                    </div>
                  ))
                ) : (
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
        </FormPopUp>
      )}
    </>
  );
}
