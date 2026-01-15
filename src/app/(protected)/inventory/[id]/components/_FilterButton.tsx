"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type FilterButtonProps = {
  categories: string[];
  onApplyFilters: (filters: {
    selectedCategories: string[];
    selectedLocations: string[];
    stockAddedIn: string;
  }) => void;
  currentFilters: {
    selectedCategories: string[];
    selectedLocations: string[];
    stockAddedIn: string;
  };
};

export default function FilterButton({
  categories,
  onApplyFilters,
  currentFilters,
}: FilterButtonProps) {
  const arrowDown = "/icons/minimal-arrow-down.svg";
  const arrowUp = "/icons/minimal-arrow-up.svg";
  const searchIcon = "/icons/search.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentFilters.selectedCategories
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    currentFilters.selectedLocations
  );
  const [stockAddedIn, setStockAddedIn] = useState<string>(
    currentFilters.stockAddedIn
  );
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

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
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.locations) {
            // Get unique locations and sort them
            const uniqueLocations = Array.from(
              new Set(data.locations.filter((loc: string) => loc))
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

  const handleOpen = () => {
    setSelectedCategories(currentFilters.selectedCategories);
    setSelectedLocations(currentFilters.selectedLocations);
    setStockAddedIn(currentFilters.stockAddedIn);
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({
      selectedCategories,
      selectedLocations,
      stockAddedIn,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedLocations([]);
    setStockAddedIn("all");
    setCategorySearchQuery("");
    setLocationSearchQuery("");
  };

  // Category handlers
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

  // Check if all items are selected
  const isAllCategoriesSelected =
    selectedCategories.length === categories.length;
  const isAllLocationsSelected =
    selectedLocations.length === availableLocations.length;

  // Filter categories and locations based on search
  const filteredCategories = categories.filter((category) =>
    category.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const filteredLocations = availableLocations.filter((location) =>
    location.toLowerCase().includes(locationSearchQuery.toLowerCase())
  );

  // Count active filters
  const activeFilterCount =
    selectedCategories.length +
    selectedLocations.length +
    (stockAddedIn !== "all" ? 1 : 0);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={handleOpen}
        style={{ position: "relative", borderRadius: "50px" }}
      >
        FILTER
      </Button>

      {isOpen && (
        <FormPopUp
          header={"FILTER INVENTORY"}
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
                padding: "20px",
              }}
            >
              {/* Search Box */}
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

              {/* Select All */}
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

              {/* Categories List */}
              <div
                style={{
                  maxHeight: "250px",
                  overflowY: "auto",
                }}
              >
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
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
              }}
            >
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
                padding: "20px",
              }}
            >
              {/* Search Box */}
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
                  {/* Select All */}
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

                  {/* Locations List */}
                  <div
                    style={{
                      maxHeight: "250px",
                      overflowY: "auto",
                    }}
                  >
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
