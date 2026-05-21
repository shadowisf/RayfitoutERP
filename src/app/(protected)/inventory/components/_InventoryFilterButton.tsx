"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type InventoryFilterButtonProps = {
  parentCategories: string[];
  categories: string[];
  onApplyFilters: (filters: {
    selectedParentCategories: string[];
    selectedCategories: string[];
    selectedLocations: string[];
    selectedProjects: number[];
    stockAddedIn: string;
    selectedStockStatuses: string[];
  }) => void;
  currentFilters: {
    selectedParentCategories: string[];
    selectedCategories: string[];
    selectedLocations: string[];
    selectedProjects: number[];
    stockAddedIn: string;
    selectedStockStatuses: string[];
  };
};

export default function InventoryFilterButton({
  parentCategories,
  categories,
  onApplyFilters,
  currentFilters,
}: InventoryFilterButtonProps) {
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedParentCategories, setSelectedParentCategories] = useState<string[]>(
    currentFilters.selectedParentCategories,
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentFilters.selectedCategories,
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    currentFilters.selectedLocations,
  );
  const [selectedProjects, setSelectedProjects] = useState<number[]>(
    currentFilters.selectedProjects,
  );
  const [stockAddedIn, setStockAddedIn] = useState<string>(
    currentFilters.stockAddedIn,
  );
  const [selectedStockStatuses, setSelectedStockStatuses] = useState<string[]>(
    currentFilters.selectedStockStatuses, // ✅ New
  );
  const [parentCategorySearchQuery, setParentCategorySearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableProjects, setAvailableProjects] = useState<
    { id: number; name: string }[]
  >([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Fetch locations from stocks when modal opens
  useEffect(() => {
    async function fetchStockLocations() {
      if (!isOpen) return;

      setIsLoadingLocations(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getAvailableLocations`,
          {
            method: "GET",
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.locations) {
            const uniqueLocations = Array.from(
              new Set(data.locations.filter((loc: string) => loc)),
            ).sort();
            setAvailableLocations(uniqueLocations as string[]);
          }
        }
      } catch (error) {
        console.error("Error fetching stock locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    }

    fetchStockLocations();
  }, [isOpen]);

  // Fetch projects from stocks when modal opens
  useEffect(() => {
    async function fetchStockProjects() {
      if (!isOpen) return;

      setIsLoadingProjects(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getAvailableProjects`,
          {
            method: "GET",
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.projects) {
            setAvailableProjects(data.projects);
          }
        }
      } catch (error) {
        console.error("Error fetching stock projects:", error);
      } finally {
        setIsLoadingProjects(false);
      }
    }

    fetchStockProjects();
  }, [isOpen]);

  const handleOpen = () => {
    setSelectedParentCategories(currentFilters.selectedParentCategories);
    setSelectedCategories(currentFilters.selectedCategories);
    setSelectedLocations(currentFilters.selectedLocations);
    setSelectedProjects(currentFilters.selectedProjects);
    setStockAddedIn(currentFilters.stockAddedIn);
    setSelectedStockStatuses(currentFilters.selectedStockStatuses);
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({
      selectedParentCategories,
      selectedCategories,
      selectedLocations,
      selectedProjects,
      stockAddedIn,
      selectedStockStatuses,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setSelectedParentCategories([]);
    setSelectedCategories([]);
    setSelectedLocations([]);
    setSelectedProjects([]);
    setStockAddedIn("all");
    setSelectedStockStatuses([]);
    setParentCategorySearchQuery("");
    setCategorySearchQuery("");
    setLocationSearchQuery("");
    setProjectSearchQuery("");
  };

  // Parent Category handlers
  const handleSelectAllParentCategories = (checked: boolean) => {
    if (checked) {
      setSelectedParentCategories(parentCategories);
    } else {
      setSelectedParentCategories([]);
    }
  };

  const handleParentCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedParentCategories([...selectedParentCategories, category]);
    } else {
      setSelectedParentCategories(selectedParentCategories.filter((c) => c !== category));
    }
  };

  // Category handlers (subcategories)
  const handleSelectAllCategories = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(categories);
    } else {
      setSelectedCategories([]);
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    }
  };

  // Location handlers
  const handleSelectAllLocations = (checked: boolean) => {
    if (checked) {
      setSelectedLocations(availableLocations);
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

  // ✅ Stock Status handlers
  const stockStatusOptions = ["IN-STOCK", "LOW STOCK", "EMPTY STOCK"];

  const handleSelectAllStockStatuses = (checked: boolean) => {
    if (checked) {
      setSelectedStockStatuses(stockStatusOptions);
    } else {
      setSelectedStockStatuses([]);
    }
  };

  const handleStockStatusChange = (status: string, checked: boolean) => {
    if (checked) {
      setSelectedStockStatuses([...selectedStockStatuses, status]);
    } else {
      setSelectedStockStatuses(
        selectedStockStatuses.filter((s) => s !== status),
      );
    }
  };

  // Check if all items are selected
  const isAllParentCategoriesSelected =
    selectedParentCategories.length === parentCategories.length;
  const isAllCategoriesSelected =
    selectedCategories.length === categories.length;
  const isAllLocationsSelected =
    selectedLocations.length === availableLocations.length;
  const isAllProjectsSelected =
    selectedProjects.length === availableProjects.length;
  const isAllStockStatusesSelected =
    selectedStockStatuses.length === stockStatusOptions.length; // ✅ New

  // Filter parent categories, categories, locations, and projects based on search
  const filteredParentCategories = parentCategories.filter((category) =>
    category.toLowerCase().includes(parentCategorySearchQuery.toLowerCase()),
  );

  const filteredCategories = categories.filter((category) =>
    category.toLowerCase().includes(categorySearchQuery.toLowerCase()),
  );

  const filteredLocations = availableLocations.filter((location) =>
    location.toLowerCase().includes(locationSearchQuery.toLowerCase()),
  );

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
          header={"FILTER INVENTORY"}
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
          {/* Categories Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              CATEGORIES
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
                  value={parentCategorySearchQuery}
                  onChange={(e) => setParentCategorySearchQuery(e.target.value)}
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
                    checked={isAllParentCategoriesSelected}
                    onChange={(e) =>
                      handleSelectAllParentCategories(e.target.checked)
                    }
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
                {filteredParentCategories.map((category) => (
                  <div key={category} style={{ marginBottom: "10px" }}>
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
                        checked={selectedParentCategories.includes(category)}
                        onChange={(e) =>
                          handleParentCategoryChange(category, e.target.checked)
                        }
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "#10b981",
                        }}
                      />
                      <h4>{category}</h4>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subcategories Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              SUBCATEGORIES
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
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
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
                    checked={isAllCategoriesSelected}
                    onChange={(e) =>
                      handleSelectAllCategories(e.target.checked)
                    }
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
                {filteredCategories.map((category) => (
                  <div key={category} style={{ marginBottom: "10px" }}>
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
                        checked={selectedCategories.includes(category)}
                        onChange={(e) =>
                          handleCategoryChange(category, e.target.checked)
                        }
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "#10b981",
                        }}
                      />
                      <h4>{category}</h4>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stock Added In Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              STOCK ADDED IN
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
                    name="stockAddedIn"
                    value={option.value}
                    checked={stockAddedIn === option.value}
                    onChange={(e) => setStockAddedIn(e.target.value)}
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

          {/* ✅ Stock Status Section - New Design */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              STOCK STATUS
            </h3>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {stockStatusOptions.map((status) => (
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
                    checked={selectedStockStatuses.includes(status)}
                    onChange={(e) =>
                      handleStockStatusChange(status, e.target.checked)
                    }
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "#10b981",
                    }}
                  />
                  <h4>{status}</h4>
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

              {isLoadingProjects ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  Loading projects...
                </div>
              ) : (
                <>
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
                        onChange={(e) =>
                          handleSelectAllProjects(e.target.checked)
                        }
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
                                handleProjectChange(
                                  project.id,
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
                </>
              )}
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

              {isLoadingLocations ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  Loading locations...
                </div>
              ) : (
                <>
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
                        onChange={(e) =>
                          handleSelectAllLocations(e.target.checked)
                        }
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
                                accentColor: "#10b981",
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
                </>
              )}
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
