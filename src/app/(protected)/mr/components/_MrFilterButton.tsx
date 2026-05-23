"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type MrFilterButtonProps = {
  availableProjects: { id: number; name: string }[];
  availableRequesters: string[];
  onApplyFilters: (filters: {
    selectedTypes: string[];
    selectedStages: number[];
    selectedProjects: number[];
    selectedShow: string[];
    selectedRequesters: string[];
  }) => void;
  currentFilters: {
    selectedTypes: string[];
    selectedStages: number[];
    selectedProjects: number[];
    selectedShow: string[];
    selectedRequesters: string[];
  };
};

export default function MrFilterButton({
  availableProjects,
  availableRequesters,
  onApplyFilters,
  currentFilters,
}: MrFilterButtonProps) {
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    currentFilters.selectedTypes,
  );
  const [selectedStages, setSelectedStages] = useState<number[]>(
    currentFilters.selectedStages,
  );
  const [selectedProjects, setSelectedProjects] = useState<number[]>(
    currentFilters.selectedProjects,
  );
  const [selectedShow, setSelectedShow] = useState<string[]>(
    currentFilters.selectedShow,
  );
  const [selectedRequesters, setSelectedRequesters] = useState<string[]>(
    currentFilters.selectedRequesters,
  );
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [requesterSearchQuery, setRequesterSearchQuery] = useState("");
  const [stageSearchQuery, setStageSearchQuery] = useState("");

  const handleOpen = () => {
    setSelectedTypes(currentFilters.selectedTypes);
    setSelectedStages(currentFilters.selectedStages);
    setSelectedProjects(currentFilters.selectedProjects);
    setSelectedShow(currentFilters.selectedShow);
    setSelectedRequesters(currentFilters.selectedRequesters);
    setProjectSearchQuery("");
    setRequesterSearchQuery("");
    setStageSearchQuery("");
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({
      selectedTypes,
      selectedStages,
      selectedProjects,
      selectedShow,
      selectedRequesters,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setSelectedTypes([]);
    setSelectedStages([]);
    setSelectedProjects([]);
    setSelectedShow([]);
    setSelectedRequesters([]);
    setProjectSearchQuery("");
    setRequesterSearchQuery("");
    setStageSearchQuery("");
  };

  // TYPE options (no "All")
  const typeOptions = [
    { value: "material", label: "Material Request" },
    { value: "job", label: "Job Order" },
    { value: "payment", label: "Payment Request" },
  ];

  const handleTypeChange = (value: string, checked: boolean) => {
    setSelectedTypes((prev) =>
      checked ? [...prev, value] : prev.filter((t) => t !== value),
    );
  };

  // SHOW options (no "All")
  const showOptions = [
    { value: "rejected", label: "Rejected Only" },
    { value: "incomplete", label: "Incomplete" },
  ];

  const handleShowChange = (value: string, checked: boolean) => {
    setSelectedShow((prev) =>
      checked ? [...prev, value] : prev.filter((s) => s !== value),
    );
  };

  // Stage options
  const stageOptions = [
    { label: "Draft", progressId: 1 },
    { label: "QS Review", progressId: 2 },
    // { label: "Manager Approval", progressId: 3 },
    // { label: "Stock Transfer", progressId: 4 },
    { label: "Quotations", progressId: 7 },
    // { label: "QS Price Check", progressId: 9 },
    { label: "Manager Price Approval", progressId: 10 },
    { label: "LPO & Invoice", progressId: 12 },
    // { label: "Pending Payments", progressId: 14 },
    { label: "Awaiting Delivery", progressId: 17 },
    // { label: "Stock Entry", progressId: 24 },
    { label: "Request Rejected", progressId: 5 },
    { label: "Price Approval Rejected", progressId: 11 },
    { label: "Payment Rejected", progressId: 13 },
    { label: "GRN Failed", progressId: 16 },
    { label: "Completed", progressId: 25 },
  ];

  const handleStageChange = (progressId: number, checked: boolean) => {
    setSelectedStages((prev) =>
      checked ? [...prev, progressId] : prev.filter((s) => s !== progressId),
    );
  };

  const filteredStages = stageOptions.filter((s) =>
    s.label.toLowerCase().includes(stageSearchQuery.toLowerCase()),
  );

  // Project handlers
  const handleSelectAllProjects = (checked: boolean) => {
    setSelectedProjects(checked ? availableProjects.map((p) => p.id) : []);
  };
  const handleProjectChange = (projectId: number, checked: boolean) => {
    setSelectedProjects((prev) =>
      checked ? [...prev, projectId] : prev.filter((p) => p !== projectId),
    );
  };
  const isAllProjectsSelected =
    selectedProjects.length === availableProjects.length &&
    availableProjects.length > 0;

  // Requester handlers
  const handleSelectAllRequesters = (checked: boolean) => {
    setSelectedRequesters(checked ? [...availableRequesters] : []);
  };
  const handleRequesterChange = (name: string, checked: boolean) => {
    setSelectedRequesters((prev) =>
      checked ? [...prev, name] : prev.filter((r) => r !== name),
    );
  };
  const isAllRequestersSelected =
    selectedRequesters.length === availableRequesters.length &&
    availableRequesters.length > 0;

  const filteredProjects = availableProjects.filter((p) =>
    p?.name?.toLowerCase().includes(projectSearchQuery.toLowerCase()),
  );
  const filteredRequesters = availableRequesters.filter((r) =>
    r?.toLowerCase().includes(requesterSearchQuery.toLowerCase()),
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

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <FormPopUp
            header={"FILTER REQUESTS"}
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
                type="button"
                onClick={handleReset}
              >
                RESET
              </Button>
            }
          >
            {/* SHOW Section */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                SHOW
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                {showOptions.map((option) => (
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
                      type="checkbox"
                      className="filter-checkbox"
                      checked={selectedShow.includes(option.value)}
                      onChange={(e) =>
                        handleShowChange(option.value, e.target.checked)
                      }
                    />
                    <h4>{option.label}</h4>
                  </label>
                ))}
              </div>
            </div>

            {/* TYPE Section */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                TYPE
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                {typeOptions.map((option) => (
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
                      type="checkbox"
                      className="filter-checkbox"
                      checked={selectedTypes.includes(option.value)}
                      onChange={(e) =>
                        handleTypeChange(option.value, e.target.checked)
                      }
                    />
                    <h4>{option.label}</h4>
                  </label>
                ))}
              </div>
            </div>

            {/* REQUESTER Section */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                REQUESTER
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
                    value={requesterSearchQuery}
                    onChange={(e) => setRequesterSearchQuery(e.target.value)}
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
                      checked={isAllRequestersSelected}
                      onChange={(e) =>
                        handleSelectAllRequesters(e.target.checked)
                      }
                    />
                    <h4>Select All</h4>
                  </label>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {filteredRequesters.length > 0 ? (
                    filteredRequesters.map((name) => (
                      <div key={name} style={{ marginBottom: "10px" }}>
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
                            checked={selectedRequesters.includes(name)}
                            onChange={(e) =>
                              handleRequesterChange(name, e.target.checked)
                            }
                          />
                          <h4>{name}</h4>
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
                      No requesters found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PROJECTS Section */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                PROJECTS
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
                      className="filter-checkbox"
                      checked={isAllProjectsSelected}
                      onChange={(e) =>
                        handleSelectAllProjects(e.target.checked)
                      }
                    />
                    <h4>Select All</h4>
                  </label>
                </div>
                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <div key={project.id} style={{ marginBottom: "10px" }}>
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
                            checked={selectedProjects.includes(project.id)}
                            onChange={(e) =>
                              handleProjectChange(project.id, e.target.checked)
                            }
                          />
                          <h4>{project.name}</h4>
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

            {/* STAGE Section — searchable list */}
            <div>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                STAGE
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
                    value={stageSearchQuery}
                    onChange={(e) => setStageSearchQuery(e.target.value)}
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
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {filteredStages.length > 0 ? (
                    filteredStages.map((stage) => (
                      <div
                        key={stage.progressId}
                        style={{ marginBottom: "10px" }}
                      >
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
                            checked={selectedStages.includes(stage.progressId)}
                            onChange={(e) =>
                              handleStageChange(
                                stage.progressId,
                                e.target.checked,
                              )
                            }
                          />
                          <h4>{stage.label}</h4>
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
                      No stages found
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
