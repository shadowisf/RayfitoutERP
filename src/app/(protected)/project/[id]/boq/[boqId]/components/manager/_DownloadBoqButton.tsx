"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState, useMemo } from "react";
import Button from "@/app/components/Button";
import { BoqHeader } from "../../types/boqHeader";
import { BoqLine } from "../../types/boqLine";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import { pdf } from "@react-pdf/renderer";
import { BoqPDF } from "../BoqPDF";
import { toast } from "@/app/components/Toast";

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

type DownloadBoqButtonProps = {
  boqHeader: BoqHeader;
  boqLines: GroupedBoqLines;
  isReference?: boolean;
  mrHeader?: MrHeader;
  itemName?: string;
  itemId?: number;
};

export default function DownloadBoqButton({
  boqHeader,
  boqLines,
  isReference = false,
  mrHeader,
  itemName,
  itemId,
}: DownloadBoqButtonProps) {
  const { userInfo } = useAuth();

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  const downloadIcon = "/icons/download.svg";
  const arrowDown = "/icons/minimal-arrow-down.svg";
  const arrowUp = "/icons/minimal-arrow-up.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<{
    [category: string]: boolean;
  }>({});
  const [selectedSubCategories, setSelectedSubCategories] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedCategories, setExpandedCategories] = useState<{
    [category: string]: boolean;
  }>({});
  const [configMode, setConfigMode] = useState<
    "priced" | "unpriced" | "dn" | ""
  >("");

  // Initialize selections when opening the modal
  const handleOpen = () => {
    const initialCategories: { [category: string]: boolean } = {};
    const initialSubCategories: { [key: string]: boolean } = {};
    const initialExpanded: { [category: string]: boolean } = {};

    Object.keys(boqLines).forEach((category) => {
      initialCategories[category] = false;
      initialExpanded[category] = false;

      Object.keys(boqLines[category]).forEach((subCategory) => {
        initialSubCategories[`${category}-${subCategory}`] = false;
      });
    });

    setSelectedCategories(initialCategories);
    setSelectedSubCategories(initialSubCategories);
    setExpandedCategories(initialExpanded);
    setIsOpen(true);
  };

  // Handle "Select All" checkbox
  const handleSelectAll = (checked: boolean) => {
    const updatedCategories = { ...selectedCategories };
    const updatedSubCategories = { ...selectedSubCategories };

    Object.keys(boqLines).forEach((category) => {
      updatedCategories[category] = checked;

      Object.keys(boqLines[category]).forEach((subCategory) => {
        updatedSubCategories[`${category}-${subCategory}`] = checked;
      });
    });

    setSelectedCategories(updatedCategories);
    setSelectedSubCategories(updatedSubCategories);
  };

  // Handle category checkbox
  const handleCategoryChange = (category: string, checked: boolean) => {
    const updatedCategories = { ...selectedCategories };
    const updatedSubCategories = { ...selectedSubCategories };

    updatedCategories[category] = checked;

    // Update all subcategories under this category
    Object.keys(boqLines[category]).forEach((subCategory) => {
      updatedSubCategories[`${category}-${subCategory}`] = checked;
    });

    setSelectedCategories(updatedCategories);
    setSelectedSubCategories(updatedSubCategories);
  };

  // Handle subcategory checkbox
  const handleSubCategoryChange = (
    category: string,
    subCategory: string,
    checked: boolean,
  ) => {
    const updatedSubCategories = { ...selectedSubCategories };
    updatedSubCategories[`${category}-${subCategory}`] = checked;

    // Check if all subcategories are selected to update parent category
    const allSubCategoriesSelected = Object.keys(boqLines[category]).every(
      (sub) => updatedSubCategories[`${category}-${sub}`],
    );

    const updatedCategories = { ...selectedCategories };
    updatedCategories[category] = allSubCategoriesSelected;

    setSelectedCategories(updatedCategories);
    setSelectedSubCategories(updatedSubCategories);
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Check if all items are selected
  const isAllSelected = Object.values(selectedCategories).every((val) => val);

  // Filter boqLines based on selections
  const filteredBoqLines = useMemo(() => {
    const filtered: GroupedBoqLines = {};

    Object.entries(boqLines).forEach(([category, subCategories]) => {
      const filteredSubCategories: { [subCategory: string]: BoqLine[] } = {};

      Object.entries(subCategories).forEach(([subCategory, items]) => {
        if (selectedSubCategories[`${category}-${subCategory}`]) {
          filteredSubCategories[subCategory] = items;
        }
      });

      if (Object.keys(filteredSubCategories).length > 0) {
        filtered[category] = filteredSubCategories;
      }
    });

    return filtered;
  }, [boqLines, selectedSubCategories]);

  // URL to Base64 converter
  async function urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.dataUrl) {
        throw new Error("Invalid response from proxy");
      }

      return data.dataUrl;
    } catch (error) {
      console.error("Failed to convert image:", url, error);
      return "";
    }
  }

  // Download handler
  async function handleDownload() {
    if (
      !boqHeader ||
      !filteredBoqLines ||
      Object.keys(filteredBoqLines).length === 0
    ) {
      toast(
        "Please select at least one category or subcategory to export",
        "error",
      );

      return;
    }

    if (configMode === "") {
      toast("Please select a configuration", "error");
      return;
    }

    try {
      console.log("Processing images...");

      // Process BOQ lines and convert images to base64
      const processedLines: any = {};

      for (const category of Object.keys(filteredBoqLines)) {
        processedLines[category] = {};

        for (const subCategory of Object.keys(filteredBoqLines[category])) {
          const items = filteredBoqLines[category][subCategory];

          processedLines[category][subCategory] = await Promise.all(
            items.map(async (item) => {
              if (!item.attachments) return item;

              try {
                let urls: string[] = [];

                if (Array.isArray(item.attachments)) {
                  urls = item.attachments;
                } else if (typeof item.attachments === "string") {
                  if (item.attachments.trim() === "") return item;
                  urls = JSON.parse(item.attachments);
                }

                if (!Array.isArray(urls) || urls.length === 0) return item;

                console.log(
                  `Processing ${urls.length} images for item: ${item.item_name}`,
                );

                // Convert all images to base64
                const base64Images = await Promise.all(
                  urls.map((url) => urlToBase64(url)),
                );

                // Filter out failed conversions
                const validImages = base64Images.filter((img) => img !== "");

                console.log(
                  `Successfully converted ${validImages.length} images`,
                );

                return {
                  ...item,
                  attachments: validImages,
                };
              } catch (error) {
                console.error("Error processing item attachments:", error);
                return item;
              }
            }),
          );
        }
      }

      // Generate PDF blob
      const showPrices = configMode === "priced";
      const showDN = configMode === "dn";

      const blob = await pdf(
        <BoqPDF
          boqHeader={boqHeader}
          boqLines={processedLines}
          showPrices={showPrices}
          showDN={showDN}
          isReference={isReference}
          mrHeader={mrHeader}
          itemName={itemName}
        />,
      ).toBlob();

      console.log("PDF generated successfully");

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      let fileNameSuffix = "";
      if (configMode === "priced") fileNameSuffix = "PRICED";
      else if (configMode === "unpriced") fileNameSuffix = "UNPRICED";
      else if (configMode === "dn") fileNameSuffix = "DN";

      // Generate filename based on mode
      if (isReference && mrHeader && itemName) {
        // New format: BOQ-MR-{MR ID}-{ITEM NAME}-{PRICED/UNPRICED}.pdf
        const sanitizedItemName = itemName
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 30);

        link.download = `BOQ-REF-MR-${String(mrHeader.id).padStart(5, "0")}-${sanitizedItemName}-${fileNameSuffix}.pdf`;
      } else {
        // Original format: BOQ-{PRICED/UNPRICED/DN}-{BOQ ID}.pdf
        link.download = `BOQ-${fileNameSuffix}-${String(boqHeader.id).padStart(5, "0")}.pdf`;
      }

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("Download complete");
      setIsOpen(false); // Close modal after successful download
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please check console for details.");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"black"}
        textColor={"black"}
        onClick={handleOpen}
      >
        {isReference ? "EXPORT BOQ REFERENCE" : "EXPORT BOQ"}
        <img src={downloadIcon} alt="download" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={
            isReference
              ? "EXPORT BILL OF QUANTITY REFERENCE"
              : "EXPORT BILL OF QUANTITY"
          }
          setIsOpen={setIsOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={handleDownload}
        >
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              SELECT CATEGORIES & SUBCATEGORIES
            </h3>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "20px",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              {/* Select All */}
              <div
                style={{
                  marginBottom: "10px",
                }}
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
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
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

              {/* Categories and Subcategories */}
              {Object.keys(boqLines).map((category, index) => (
                <div key={category} style={{ marginBottom: "10px" }}>
                  {/* Category */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories[category] || false}
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
                    <label
                      onClick={() => toggleCategory(category)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                      }}
                    >
                      <h4>
                        {index + 1}.0 {category}
                      </h4>
                      <h4>
                        {expandedCategories[category] ? (
                          <img
                            style={{ paddingBottom: "2px" }}
                            src={arrowUp}
                            alt="arrow up"
                          />
                        ) : (
                          <img
                            style={{ paddingBottom: "2px" }}
                            src={arrowDown}
                            alt="arrow down"
                          />
                        )}
                      </h4>
                    </label>
                  </div>

                  {/* Subcategories */}
                  {expandedCategories[category] && (
                    <div style={{ marginLeft: "35px" }}>
                      {Object.keys(boqLines[category]).map(
                        (subCategory, subIndex) => (
                          <div
                            key={`${category}-${subCategory}`}
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
                                checked={
                                  selectedSubCategories[
                                    `${category}-${subCategory}`
                                  ] || false
                                }
                                onChange={(e) =>
                                  handleSubCategoryChange(
                                    category,
                                    subCategory,
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
                              <h4>
                                {index + 1}.{subIndex + 1} {subCategory}
                              </h4>
                            </label>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div>
            <h3 style={{ marginBottom: "15px" }}>CONFIGURATION</h3>
            <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
              {canSeePrice && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="configMode"
                    value="priced"
                    checked={configMode === "priced"}
                    onChange={(e) =>
                      setConfigMode(
                        e.target.value as "priced" | "unpriced" | "dn",
                      )
                    }
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <h4>Priced</h4>
                </label>
              )}

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="configMode"
                  value="unpriced"
                  checked={configMode === "unpriced"}
                  onChange={(e) =>
                    setConfigMode(
                      e.target.value as "priced" | "unpriced" | "dn",
                    )
                  }
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <h4>Unpriced</h4>
              </label>

              {/* DN option - available for both reference and normal mode */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="configMode"
                  value="dn"
                  checked={configMode === "dn"}
                  onChange={(e) =>
                    setConfigMode(
                      e.target.value as "priced" | "unpriced" | "dn",
                    )
                  }
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <h4>DN Number & Date</h4>
              </label>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
