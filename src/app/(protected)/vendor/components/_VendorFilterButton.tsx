"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type VendorFilterButtonProps = {
  vendorTypes: string[];
  materialCategories: string[];
  onApplyFilters: (filters: {
    selectedTypes: string[];
    selectedMaterialCategories: string[];
  }) => void;
  currentFilters: {
    selectedTypes: string[];
    selectedMaterialCategories: string[];
  };
};

export default function VendorFilterButton({
  vendorTypes,
  materialCategories,
  onApplyFilters,
  currentFilters,
}: VendorFilterButtonProps) {
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    currentFilters.selectedTypes,
  );
  const [selectedMaterialCategories, setSelectedMaterialCategories] = useState<
    string[]
  >(currentFilters.selectedMaterialCategories);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  const handleOpen = () => {
    setSelectedTypes(currentFilters.selectedTypes);
    setSelectedMaterialCategories(currentFilters.selectedMaterialCategories);
    setCategorySearchQuery("");
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({
      selectedTypes,
      selectedMaterialCategories,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setSelectedTypes([]);
    setSelectedMaterialCategories([]);
    setCategorySearchQuery("");
  };

  // Type handlers
  const handleSelectAllTypes = (checked: boolean) => {
    if (checked) {
      setSelectedTypes(vendorTypes);
    } else {
      setSelectedTypes([]);
    }
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, type]);
    } else {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    }
  };

  // Material Category handlers
  const handleSelectAllCategories = (checked: boolean) => {
    if (checked) {
      setSelectedMaterialCategories(materialCategories);
    } else {
      setSelectedMaterialCategories([]);
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedMaterialCategories([...selectedMaterialCategories, category]);
    } else {
      setSelectedMaterialCategories(
        selectedMaterialCategories.filter((c) => c !== category),
      );
    }
  };

  const isAllTypesSelected = selectedTypes.length === vendorTypes.length;
  const isAllCategoriesSelected =
    selectedMaterialCategories.length === materialCategories.length;

  const filteredCategories = materialCategories.filter((category) =>
    category.toLowerCase().includes(categorySearchQuery.toLowerCase()),
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
          header={"FILTER VENDORS"}
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
          {/* Vendor Type Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              VENDOR TYPE
            </h3>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {vendorTypes.map((type) => (
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
                      accentColor: "#10b981",
                    }}
                  />
                  <h4>{type.toUpperCase()}</h4>
                </label>
              ))}
            </div>
          </div>

          {/* Material Categories Section */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              MATERIAL CATEGORIES
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
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
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
                          checked={selectedMaterialCategories.includes(
                            category,
                          )}
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
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888",
                    }}
                  >
                    No categories found
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
