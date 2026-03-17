"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type SubcontractorFilterButtonProps = {
  scopesOfWork: string[];
  projects: string[];
  onApplyFilters: (filters: {
    selectedScopes: string[];
    selectedProjects: string[];
  }) => void;
  currentFilters: {
    selectedScopes: string[];
    selectedProjects: string[];
  };
};

export default function SubcontractorFilterButton({
  scopesOfWork,
  projects,
  onApplyFilters,
  currentFilters,
}: SubcontractorFilterButtonProps) {
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    currentFilters.selectedScopes,
  );
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    currentFilters.selectedProjects,
  );
  const [scopeSearchQuery, setScopeSearchQuery] = useState("");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  const handleOpen = () => {
    setSelectedScopes(currentFilters.selectedScopes);
    setSelectedProjects(currentFilters.selectedProjects);
    setScopeSearchQuery("");
    setProjectSearchQuery("");
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({
      selectedScopes,
      selectedProjects,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setSelectedScopes([]);
    setSelectedProjects([]);
    setScopeSearchQuery("");
    setProjectSearchQuery("");
  };

  // Scope handlers
  const handleScopeChange = (scope: string, checked: boolean) => {
    if (checked) {
      setSelectedScopes([...selectedScopes, scope]);
    } else {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    }
  };

  // Project handlers
  const handleProjectChange = (project: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects([...selectedProjects, project]);
    } else {
      setSelectedProjects(selectedProjects.filter((p) => p !== project));
    }
  };

  const filteredScopes = scopesOfWork.filter((scope) =>
    scope.toLowerCase().includes(scopeSearchQuery.toLowerCase()),
  );

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
          header={"FILTER SUBCONTRACTORS"}
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
          {/* Scope of Work Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              SCOPE OF WORK
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
                  value={scopeSearchQuery}
                  onChange={(e) => setScopeSearchQuery(e.target.value)}
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
                {filteredScopes.length > 0 ? (
                  filteredScopes.map((scope) => (
                    <div key={scope} style={{ marginBottom: "10px" }}>
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
                          checked={selectedScopes.includes(scope)}
                          onChange={(e) =>
                            handleScopeChange(scope, e.target.checked)
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "#10b981",
                          }}
                        />
                        <h4>{scope.toUpperCase()}</h4>
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
                    No scopes found
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
                  placeholder="Search"
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

              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
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
                            accentColor: "#10b981",
                          }}
                        />
                        <h4>{project.toUpperCase()}</h4>
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
