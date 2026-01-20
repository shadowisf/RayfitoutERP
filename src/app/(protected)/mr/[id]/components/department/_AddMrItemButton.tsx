"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { BoqLine } from "@/app/(protected)/boq/[id]/types/boqLine";
import { useAuth } from "@/app/context/AuthContext";

type AddMrItemButtonProps = {
  mrHeaderID: number;
  projectID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  autoCategoryID?: string;
  autoSubCategoryIDs?: (string | number)[];
  children: React.ReactNode;
  full?: boolean;
  purposeID: number;
  style?: React.CSSProperties;
};

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

export default function AddMrItemButton({
  mrHeaderID,
  projectID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  autoCategoryID,
  autoSubCategoryIDs,
  children,
  full,
  purposeID,
  style,
}: AddMrItemButtonProps) {
  const router = useRouter();

  const locationIcon = "/icons/location-boq.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const arrowRight = "/icons/arrow-right.svg";

  const { userInfo } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isBoqSelectFormOpen, setIsBoqSelectFormOpen] = useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);
  const [locationValues, setLocationValues] = useState<any[]>([]);
  const [boqLineValues, setBoqLineValues] = useState<BoqLine[]>([]);
  const [groupedBoqLines, setGroupedBoqLines] = useState<GroupedBoqLines>({});

  const [materialCategoryID, setMaterialCategoryID] = useState<string | number>(
    "",
  );
  const [materialSubCategoryIDs, setMaterialSubCategoryIDs] = useState<
    (string | number)[]
  >([]);
  const [boqLineID, setBoqLineID] = useState<string | number>("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [brand, setBrand] = useState("");
  const [specification, setSpecification] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [tempSelectedBoqID, setTempSelectedBoqID] = useState<string | number>(
    "",
  );
  const [selectedBoqInfo, setSelectedBoqInfo] = useState("");

  // BOQ Category states
  const [activeBoqCategory, setActiveBoqCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const boqCategories = Object.keys(groupedBoqLines);
  const boqSubCategories =
    activeBoqCategory === "ALL"
      ? groupedBoqLines[boqCategories[0]] || {}
      : groupedBoqLines[activeBoqCategory] || {};

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10;

  // Check scroll position for arrows
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [boqCategories]);

  // Fetch initial data
  useEffect(() => {
    // Fetch material categories
    fetch("/api/mr/getMaterialCategoryValues")
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error(err);
      });

    // Fetch all subcategories initially
    fetch("/api/mr/getMaterialSubCategoryValues", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        setMaterialSubCategoryValues(data);
      });

    // Fetch projects for delivery location
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: any) => item.name);
        setLocationValues(names);
      });
  }, []);

  // Fetch BOQ lines when projectID is available
  useEffect(() => {
    if (projectID) {
      fetch("/api/boq/getAllBoqLinesWithNumberRef", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectID,
        }),
      })
        .then((res) => res.json())
        .then(function (data) {
          setBoqLineValues(data);

          // Group BOQ lines by category and subcategory
          const grouped: GroupedBoqLines = {};
          data.forEach((boqLine: BoqLine) => {
            const category = boqLine.category || "Uncategorized";
            const subCategory = boqLine.sub_category || "General";

            if (!grouped[category]) {
              grouped[category] = {};
            }
            if (!grouped[category][subCategory]) {
              grouped[category][subCategory] = [];
            }
            grouped[category][subCategory].push(boqLine);
          });

          setGroupedBoqLines(grouped);
        });
    }
  }, [projectID]);

  // Set auto-populated values when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (autoCategoryID) {
      // First fetch the subcategories for this category
      fetch("/api/mr/getMaterialSubCategoryValuesByCategoryID", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: autoCategoryID,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);

          // Set the category
          setMaterialCategoryID(autoCategoryID);

          // Now set the subcategories - this needs to happen AFTER we have the data
          if (autoSubCategoryIDs && autoSubCategoryIDs.length > 0) {
            const idsArray = Array.isArray(autoSubCategoryIDs)
              ? autoSubCategoryIDs
              : [autoSubCategoryIDs];

            const normalizedIds = idsArray.map((id) =>
              typeof id === "string" ? parseInt(id) : id,
            );

            console.log("Setting subcategory IDs:", normalizedIds);
            console.log("Available subcategories:", data);

            // IMPORTANT: Set this in the next tick to ensure state is ready
            setTimeout(() => {
              setMaterialSubCategoryIDs(normalizedIds);
            }, 0);
          }
        });
    } else if (autoSubCategoryIDs && autoSubCategoryIDs.length > 0) {
      // If only subcategories are provided without category
      const idsArray = Array.isArray(autoSubCategoryIDs)
        ? autoSubCategoryIDs
        : [autoSubCategoryIDs];

      const normalizedIds = idsArray.map((id) =>
        typeof id === "string" ? parseInt(id) : id,
      );

      console.log("Setting subcategory IDs (no category):", normalizedIds);
      setTimeout(() => {
        setMaterialSubCategoryIDs(normalizedIds);
      }, 0);
    }
  }, [isOpen, autoCategoryID, autoSubCategoryIDs]);

  // Filter subcategories based on selected category
  useEffect(() => {
    if (materialCategoryID) {
      fetch("/api/mr/getMaterialSubCategoryValuesByCategoryID", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: materialCategoryID,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);

          // Filter out any selected subcategories that don't belong to the new category
          // But preserve auto-populated subcategories if this is the initial load
          if (!autoCategoryID || materialCategoryID !== autoCategoryID) {
            setMaterialSubCategoryIDs((prev) =>
              prev.filter((id) => data.some((item: any) => item.id === id)),
            );
          }
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      // If category is reset, load all subcategories
      fetch("/api/mr/getMaterialSubCategoryValues", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        });
    }
  }, [materialCategoryID]);

  // Handle subcategory change - auto-select category if needed
  const handleSubCategoryChange = (selectedIds: (string | number)[]) => {
    setMaterialSubCategoryIDs(selectedIds);

    // If a subcategory is selected and no category is set, auto-select the category
    if (selectedIds.length > 0 && !materialCategoryID) {
      const firstSelectedSubCategory = materialSubCategoryValues.find(
        (sc: any) => sc.id === selectedIds[0],
      ) as any;

      if (firstSelectedSubCategory?.category_id) {
        setMaterialCategoryID(firstSelectedSubCategory.category_id);
      }
    }
  };

  const parseAttachments = (attachments: any): string[] => {
    if (!attachments) return [];
    if (Array.isArray(attachments)) return attachments;
    if (typeof attachments === "string") {
      try {
        if (attachments.trim() === "") return [];
        const parsed = JSON.parse(attachments);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Failed to parse attachments:", error);
        return [];
      }
    }
    return [];
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!materialCategoryID) {
      toast("Please select a material category", "error");
      return;
    }

    if (materialSubCategoryIDs.length === 0) {
      toast("Please select at least one material subcategory", "error");
      return;
    }

    if (!boqLineID && purposeID === 1) {
      toast("Please select a bill of quantity line", "error");
      return;
    }

    if (!materialDescription.trim()) {
      toast("Please enter a material description", "error");
      return;
    }

    if (!quantity) {
      toast("Please enter quantity", "error");
      return;
    }

    if (!unit) {
      toast("Please select unit", "error");
      return;
    }

    if (!deliveryLocation) {
      toast("Please select delivery location", "error");
      return;
    }

    try {
      let attachmentUrl = null;

      if (attachment) {
        const formData = new FormData();
        formData.append("files", attachment);
        formData.append("folder", "mr-attachments");

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }

        const uploadResult = await uploadRes.json();
        attachmentUrl = uploadResult.urls[0];
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createMrLine",
          mr_header_id: mrHeaderID,
          material_category_id: materialCategoryID,
          material_subcategory_ids: materialSubCategoryIDs, // Send as array
          material_description: materialDescription,
          quantity: Number(quantity),
          unit,
          notes,
          brand,
          specification,
          delivery_location: deliveryLocation,
          boq_line_id: boqLineID || null,
          attachment: JSON.stringify(attachmentUrl),
        }),
      });

      if (res.ok) {
        toast(`${materialDescription} added`, "success");

        // Reset form
        setIsOpen(false);
        setMaterialCategoryID("");
        setMaterialSubCategoryIDs([]);
        setMaterialDescription("");
        setQuantity("");
        setUnit("");
        setNotes("");
        setBoqLineID("");
        setBrand("");
        setSpecification("");
        setDeliveryLocation("");
        setAttachment(null);

        router.refresh();
      } else {
        const errorData = await res.json();
        toast(
          errorData.error || "Failed to add material request item",
          "error",
        );
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast(
        "Failed to add material request item. Something went wrong",
        "error",
      );
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
        full={full ? true : false}
        style={style}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CREATE MATERIAL REQUEST ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          {/* Category and Subcategory Row */}
          <div className="input-row half">
            <SingleSelectDropdown
              label={"CATEGORY"}
              dbData={materialCategoryValues}
              selectedValue={materialCategoryID}
              onChange={setMaterialCategoryID}
              placeholder="SELECT CATEGORY"
              required
            />

            <MultiSelectDropdown
              label={"SUBCATEGORIES"}
              dbData={materialSubCategoryValues}
              selectedValues={materialSubCategoryIDs}
              onChange={handleSubCategoryChange}
              placeholder="SELECT SUBCATEGORIES"
              required
              style={{ width: "350px" }}
            />
          </div>

          {/* Description and BOQ Line Row */}
          <div className="input-row half">
            <InputItem
              label={"ITEM"}
              value={materialDescription}
              type={"text"}
              required
              onChange={(e) => setMaterialDescription(e.target.value)}
            />

            <div className="input-item">
              <label className="custom">
                <span>BILL OF QUANTITY</span>
              </label>

              <Button
                componentType={"button"}
                bgColor={"black"}
                borderColor={"black"}
                textColor={"white"}
                onClick={(e) => {
                  e.preventDefault();
                  setIsBoqSelectFormOpen(true);
                }}
                full
                style={boqLineID ? { justifyContent: "flex-start" } : {}}
              >
                {boqLineID ? (
                  <span
                    style={{
                      maxWidth: "250px",
                      display: "inline-block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedBoqInfo}
                  </span>
                ) : (
                  <div style={{ display: "flex", gap: "10px" }}>
                    SELECT BILL OF QUANTITY ITEM
                    <img
                      src={externalLinkIcon}
                      alt="external link"
                      style={{ filter: "invert(1)" }}
                    />
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Quantity and Unit Row */}
          <div className="input-row half">
            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              placeholder={"ENTER QUANTITY"}
              required
              onChange={(e) => {
                const val = e.target.value;
                // Allow only positive numbers
                if (val === "" || /^\d+$/.test(val)) {
                  setQuantity(val);
                }
              }}
            />

            <InputItem
              label={"UNIT"}
              value={unit}
              type={"select"}
              placeholder={"SELECT UNIT"}
              required
              onChange={(e) => setUnit(e.target.value)}
              selectOptions={[
                "ITEM",
                "NOS",
                "SQM",
                "SQFT",
                "M",
                "LM",
                "FT",
                "CUM",
                "KG",
                "TON",
                "LTR",
                "GAL",
                "SET",
                "LOT",
                "LS",
                "PAIR",
                "BOX",
                "BAG",
                "ROLL",
              ]}
            />
          </div>

          {/* Brand Row */}
          <div className="input-row full">
            <InputItem
              label={"BRAND"}
              value={brand}
              type={"text"}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          {/* Specification Row */}
          <div className="input-row full">
            <InputItem
              label={"SPECIFICATION"}
              value={specification}
              type={"textarea"}
              onChange={(e) => setSpecification(e.target.value)}
            />
          </div>

          {/* Delivery Location Row */}
          <div className="input-row half">
            <InputItem
              label="DELIVERY LOCATION"
              value={deliveryLocation}
              type="select"
              placeholder="SELECT DELIVERY LOCATION"
              onChange={(e) => setDeliveryLocation(e.target.value)}
              selectOptions={[
                "Headquarters",
                "Umm Al Quwain Warehouse",
                ...locationValues,
              ]}
              required
            />
            <SingleUploadFileBox
              fileState={attachment}
              setFileState={setAttachment}
              label={"ATTACHMENT"}
              acceptedFileTypes={".pdf,.png,.jpg,.jpeg"}
            />
          </div>
        </FormPopUp>
      )}

      {isBoqSelectFormOpen && (
        <FormPopUp
          header={"SELECT BILL OF QUANTITY ITEM"}
          setIsOpen={setIsBoqSelectFormOpen}
          handleSubmit={(e) => {
            e.preventDefault();

            if (!tempSelectedBoqID) {
              toast("Please select a bill of quantity item", "error");
              return;
            }

            setBoqLineID(tempSelectedBoqID);
            setIsBoqSelectFormOpen(false);
          }}
          addButtonLabel={"CONFIRM"}
          style={{ minWidth: "1200px" }}
        >
          {/* Category Grid */}
          <div className="category-grid" style={{ marginBottom: "20px" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "70dvw" }}>
              {/* Left Fade Gradient */}
              {showLeftArrow && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "300px",
                    background:
                      "linear-gradient(to right, white 0%, rgba(255, 255, 255, 0) 100%)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
              )}

              {/* Left Arrow Button */}
              {showLeftArrow && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    scroll("left");
                  }}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    backgroundColor: "black",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={arrowRight}
                    style={{ transform: "rotate(-180deg)", width: "12px" }}
                  />
                </button>
              )}

              <div
                ref={scrollContainerRef}
                onScroll={checkScroll}
                style={{
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: "none";
                  }
                `}</style>
                <div style={{ display: "flex", gap: "1px" }}>
                  <div
                    className={`item ${
                      activeBoqCategory === "ALL" ? "active" : ""
                    }`}
                    onClick={() => setActiveBoqCategory("ALL")}
                    style={{
                      flexShrink: 0,
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    ALL
                  </div>

                  {boqCategories.map(function (category) {
                    return (
                      <div
                        key={category}
                        className={`item ${
                          activeBoqCategory === category ? "active" : ""
                        }`}
                        onClick={function () {
                          setActiveBoqCategory(category);
                        }}
                        style={{ flexShrink: 0, cursor: "pointer" }}
                      >
                        {category}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Fade Gradient */}
              {showRightArrow && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "300px",
                    background:
                      "linear-gradient(to left, white 0%, rgba(255, 255, 255, 0) 100%)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
              )}

              {/* Right Arrow Button */}
              {showRightArrow && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    scroll("right");
                  }}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    backgroundColor: "black",
                    borderRadius: "10px",
                    color: "white",
                    border: "none",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <img src={arrowRight} style={{ width: "12px" }} />
                </button>
              )}
            </div>
          </div>

          {/* BOQ Items Table */}
          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            {activeBoqCategory === "ALL"
              ? Object.entries(groupedBoqLines).map(
                  ([category, subCategoriesData], categoryIndex) =>
                    Object.entries(subCategoriesData).map(
                      ([subCategory, items], subCategoryIndex) => (
                        <div
                          key={`${category}-${subCategory}`}
                          style={{ marginBottom: "30px" }}
                        >
                          <h2
                            style={{
                              marginBottom: "10px",
                              textTransform: "uppercase",
                            }}
                          >
                            {categoryIndex + 1}.{subCategoryIndex + 1}{" "}
                            {category} / {subCategory}
                          </h2>

                          <table className="items-table two-toned">
                            <thead>
                              <tr>
                                <th></th>
                                <th>#</th>
                                <th>ITEM</th>
                                <th>QUANTITY</th>
                                {canSeePrice && (
                                  <>
                                    <th>RATE</th>
                                    <th>TOTAL PRICE</th>
                                  </>
                                )}
                                <th>ATTACHMENTS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((boq, itemIndex) => {
                                const attachmentUrls = parseAttachments(
                                  boq.attachments,
                                );

                                return (
                                  <tr key={boq.id}>
                                    <td onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="radio"
                                        name="boq-select"
                                        value={boq.id}
                                        checked={tempSelectedBoqID === boq.id}
                                        onChange={() => {
                                          setTempSelectedBoqID(boq.id);
                                          setSelectedBoqInfo(
                                            boq.item_number +
                                              " " +
                                              boq.item_name,
                                          );
                                        }}
                                        style={{
                                          width: "18px",
                                          height: "18px",
                                          cursor: "pointer",
                                        }}
                                      />
                                    </td>
                                    <td style={{ whiteSpace: "nowrap" }}>
                                      {boq.item_number}
                                    </td>
                                    <td>
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "10px",
                                        }}
                                      >
                                        <strong>{boq.item_name}</strong>

                                        {boq.item_description && (
                                          <p style={{ whiteSpace: "pre-wrap" }}>
                                            {boq.item_description}
                                          </p>
                                        )}

                                        {boq.location && (
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "10px",
                                              alignItems: "center",
                                            }}
                                          >
                                            <img
                                              src={locationIcon}
                                              style={{ width: "16px" }}
                                            />
                                            <span
                                              style={{
                                                fontWeight: 600,
                                                marginTop: "4px",
                                                color: "rgba(105, 105, 105, 1)",
                                              }}
                                            >
                                              {boq.location}
                                            </span>
                                          </div>
                                        )}

                                        {boq.scope_of_work && (
                                          <div
                                            style={{
                                              backgroundColor:
                                                "rgba(225, 225, 225, 1)",
                                              borderRadius: "50px",
                                              padding: "4px 10px",
                                              width: "fit-content",
                                            }}
                                          >
                                            <strong>{boq.scope_of_work}</strong>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      {boq.quantity} {boq.unit}
                                    </td>

                                    {canSeePrice && (
                                      <>
                                        <td>
                                          {boq.rate_per_quantity?.toLocaleString()}
                                        </td>
                                        <td>
                                          AED {boq.total_cost?.toLocaleString()}
                                        </td>
                                      </>
                                    )}

                                    <td className="attachments">
                                      <div className="attachments-grid">
                                        {attachmentUrls.map((url, i) => (
                                          <img
                                            key={i}
                                            src={url}
                                            alt="attachment"
                                          />
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ),
                    ),
                )
              : Object.entries(boqSubCategories).map(
                  ([subCategory, items], index) => (
                    <div key={subCategory} style={{ marginBottom: "30px" }}>
                      <h2 style={{ marginBottom: "10px" }}>
                        {boqCategories.indexOf(activeBoqCategory) + 1}.
                        {index + 1} {subCategory}
                      </h2>

                      <table className="items-table two-toned">
                        <thead>
                          <tr>
                            <th></th>
                            <th>#</th>
                            <th>ITEM</th>
                            <th>QUANTITY</th>
                            {canSeePrice && (
                              <>
                                <th>RATE</th>
                                <th>TOTAL PRICE</th>
                              </>
                            )}
                            <th>ATTACHMENTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((boq, itemIndex) => {
                            const attachmentUrls = parseAttachments(
                              boq.attachments,
                            );

                            return (
                              <tr key={boq.id}>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="radio"
                                    name="boq-select"
                                    value={boq.id}
                                    checked={tempSelectedBoqID === boq.id}
                                    onChange={() => {
                                      setTempSelectedBoqID(boq.id);
                                      setSelectedBoqInfo(
                                        boq.item_number + " " + boq.item_name,
                                      );
                                    }}
                                    style={{
                                      width: "18px",
                                      height: "18px",
                                      cursor: "pointer",
                                    }}
                                  />
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  {boqCategories.indexOf(activeBoqCategory) + 1}
                                  .{index + 1}.{itemIndex + 1}
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "10px",
                                    }}
                                  >
                                    <strong>{boq.item_name}</strong>

                                    {boq.item_description && (
                                      <p>{boq.item_description}</p>
                                    )}

                                    {boq.location && (
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "10px",
                                          alignItems: "center",
                                        }}
                                      >
                                        <img
                                          src={locationIcon}
                                          style={{ width: "16px" }}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            marginTop: "4px",
                                            color: "rgba(105, 105, 105, 1)",
                                          }}
                                        >
                                          {boq.location}
                                        </span>
                                      </div>
                                    )}

                                    {boq.scope_of_work && (
                                      <div
                                        style={{
                                          backgroundColor:
                                            "rgba(225, 225, 225, 1)",
                                          borderRadius: "50px",
                                          padding: "4px 10px",
                                          width: "fit-content",
                                        }}
                                      >
                                        <strong>{boq.scope_of_work}</strong>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  {boq.quantity} {boq.unit}
                                </td>

                                {canSeePrice && (
                                  <>
                                    <td>
                                      {boq.rate_per_quantity?.toLocaleString()}
                                    </td>
                                    <td>
                                      AED {boq.total_cost?.toLocaleString()}
                                    </td>
                                  </>
                                )}

                                <td className="attachments">
                                  <div className="attachments-grid">
                                    {attachmentUrls.map((url, i) => (
                                      <img key={i} src={url} alt="attachment" />
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ),
                )}
          </div>
        </FormPopUp>
      )}
    </>
  );
}
