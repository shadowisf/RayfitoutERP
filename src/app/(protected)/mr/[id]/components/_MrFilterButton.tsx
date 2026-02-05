"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type MrFilterButtonProps = {
  availableProjects: { id: number; name: string }[];
  onApplyFilters: (filters: {
    itemsRequestedIn: string;
    selectedDepartments: number[];
    selectedProjects: number[];
  }) => void;
  currentFilters: {
    itemsRequestedIn: string;
    selectedDepartments: number[];
    selectedProjects: number[];
  };
};

export default function MrFilterButton({
  availableProjects,
  onApplyFilters,
  currentFilters,
}: MrFilterButtonProps) {
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [itemsRequestedIn, setItemsRequestedIn] = useState<string>(
    currentFilters.itemsRequestedIn,
  );
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>(
    currentFilters.selectedDepartments,
  );
  const [selectedProjects, setSelectedProjects] = useState<number[]>(
    currentFilters.selectedProjects,
  );
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  const handleOpen = () => {
    setItemsRequestedIn(currentFilters.itemsRequestedIn);
    setSelectedDepartments(currentFilters.selectedDepartments);
    setSelectedProjects(currentFilters.selectedProjects);
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({
      itemsRequestedIn,
      selectedDepartments,
      selectedProjects,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setItemsRequestedIn("all");
    setSelectedDepartments([]);
    setSelectedProjects([]);
    setProjectSearchQuery("");
  };

  // Department/Role options with their department IDs
  const departmentOptions = [
    { label: "Manager", departmentId: 8 },
    { label: "Quantity Surveyor", departmentId: 16 },
    { label: "Procurement", departmentId: 9 },
    { label: "Finance", departmentId: 10 },
    { label: "Quality Check", departmentId: 12 },
    { label: "Storekeeper", departmentId: 11 },
    /*     { label: "Civil", departmentId: 1 },
    { label: "MEP", departmentId: 2 },
    { label: "Electrical", departmentId: 3 },
    { label: "Plumbing", departmentId: 4 },
    { label: "HVAC", departmentId: 5 },
    { label: "Finishing", departmentId: 6 },
    { label: "Landscaping", departmentId: 7 }, */
  ];

  const handleDepartmentChange = (departmentId: number, checked: boolean) => {
    if (checked) {
      setSelectedDepartments([...selectedDepartments, departmentId]);
    } else {
      setSelectedDepartments(
        selectedDepartments.filter((d) => d !== departmentId),
      );
    }
  };

  // Project handlers
  const handleSelectAllProjects = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(availableProjects.map((p) => p.id));
    } else {
      setSelectedProjects([]);
    }
  };

  const handleProjectChange = (projectId: number, checked: boolean) => {
    if (checked) {
      setSelectedProjects([...selectedProjects, projectId]);
    } else {
      setSelectedProjects(selectedProjects.filter((p) => p !== projectId));
    }
  };

  // Check if all projects are selected
  const isAllProjectsSelected =
    selectedProjects.length === availableProjects.length;

  // Filter projects based on search
  const filteredProjects = availableProjects.filter((project) =>
    project?.name?.toLowerCase().includes(projectSearchQuery.toLowerCase()),
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
          header={"FILTER MATERIAL REQUISITIONS"}
          setIsOpen={setIsOpen}
          addButtonLabel="APPLY FILTER"
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
              RESET FILTER
            </Button>
          }
        >
          {/* Items Requested In Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              ITEMS REQUESTED IN
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {[
                { value: "all", label: "All Times" },
                { value: "24h", label: "Last 24 Hours" },
                { value: "3d", label: "Last 3 Days" },
                { value: "7d", label: "Last 7 Days" },
                { value: "14d", label: "Last 14 Days" },
                { value: "30d", label: "Last 30 Days" },
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
                    name="itemsRequestedIn"
                    value={option.value}
                    checked={itemsRequestedIn === option.value}
                    onChange={(e) => setItemsRequestedIn(e.target.value)}
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

          {/* Department Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              DEPARTMENT
            </h3>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {departmentOptions.map((dept) => (
                <label
                  key={dept.departmentId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(dept.departmentId)}
                    onChange={(e) =>
                      handleDepartmentChange(
                        dept.departmentId,
                        e.target.checked,
                      )
                    }
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "#10b981",
                    }}
                  />
                  <h4>{dept.label}</h4>
                </label>
              ))}
            </div>
          </div>

          {/* Projects Section */}
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
                padding: "20px",
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
                      accentColor: "#10b981",
                    }}
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
                          checked={selectedProjects.includes(project.id)}
                          onChange={(e) =>
                            handleProjectChange(project.id, e.target.checked)
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "#10b981",
                          }}
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
        </FormPopUp>
      )}
    </>
  );
}
