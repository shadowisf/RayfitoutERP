"use client";

import { useState, useEffect, useRef } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import { MrLine } from "../../types/mrLine";
import { toast } from "@/app/components/Toast";
import { BoqLine } from "@/app/(protected)/boq/[id]/types/boqLine";
import { useAuth } from "@/app/context/AuthContext";

type EditMrItemButtonProps = {
  projectID: number;
  item: MrLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
  full?: boolean;
  purposeID: number;
};

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

export default function EditMrItemButton({
  projectID,
  item,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  purposeID,
}: EditMrItemButtonProps) {
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
    item.material_category_id,
  );

  // Parse material_subcategory_id from the view (comma-separated string to array)
  const [materialSubCategoryIDs, setMaterialSubCategoryIDs] = useState<
    (string | number)[]
  >(() => {
    if (item.material_subcategory_id) {
      if (typeof item.material_subcategory_id === "string") {
        const ids = item.material_subcategory_id
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "")
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
        return ids;
      }
      if (Array.isArray(item.material_subcategory_id)) {
        return item.material_subcategory_id
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
      }
      if (typeof item.material_subcategory_id === "number") {
        return [item.material_subcategory_id];
      }
    }
    return [];
  });

  const [boqLineID, setBoqLineID] = useState<string | number>(
    item.boq_line_id || "",
  );
  const [materialDescription, setMaterialDescription] = useState(
    item.material_description,
  );
  const [quantity, setQuantity] = useState<string | number>(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [specification, setSpecification] = useState(item.specification ?? "");
  const [brand, setBrand] = useState(item.brand ?? "");
  const [deliveryLocation, setDeliveryLocation] = useState(
    item.delivery_location ?? "",
  );
  const [tempSelectedBoqID, setTempSelectedBoqID] = useState<string | number>(
    item.boq_line_id || "", // ✅ Initialize with current BOQ line ID
  );
  const [selectedBoqInfo, setSelectedBoqInfo] = useState(() => {
    // Initialize with current BOQ info if it exists
    if (item.boq_item_number && item.boq_item_name) {
      return `${item.boq_item_number} ${item.boq_item_name}`;
    }
    return "";
  });

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
    fetch("/api/mr/getMaterialCategoryValues")
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
      });

    fetch("/api/mr/getMaterialSubCategoryValues", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        setMaterialSubCategoryValues(data);
      })
      .catch((err) => {
        console.error("Error fetching subcategories:", err);
      });

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: any) => item.name);
        setLocationValues(names);
      })
      .catch((err) => {
        console.error("Error fetching projects:", err);
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
        })
        .catch((err) => {
          console.error("Error fetching BOQ lines:", err);
        });
    }
  }, [projectID]);

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

          setMaterialSubCategoryIDs((prev) =>
            prev.filter((id) =>
              data.some((item: any) => item.id === Number(id)),
            ),
          );
        })
        .catch((err) => {
          console.error("Error filtering subcategories:", err);
        });
    } else {
      fetch("/api/mr/getMaterialSubCategoryValues", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        })
        .catch((err) => {
          console.error("Error fetching subcategories:", err);
        });
    }
  }, [materialCategoryID]);

  // ✅ Reset tempSelectedBoqID when BOQ select form opens
  useEffect(() => {
    if (isBoqSelectFormOpen) {
      setTempSelectedBoqID(boqLineID || "");
    }
  }, [isBoqSelectFormOpen, boqLineID]);

  const handleSubCategoryChange = (selectedIds: (string | number)[]) => {
    setMaterialSubCategoryIDs(selectedIds);

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

    if (!materialCategoryID) {
      toast("Please select a material category", "error");
      return;
    }

    if (materialSubCategoryIDs.length === 0) {
      toast("Please select at least one material subcategory", "error");
      return;
    }

    if (!materialDescription.trim()) {
      toast("Please enter a material description", "error");
      return;
    }

    if (!quantity || isNaN(Number(quantity))) {
      toast("Please enter a valid quantity", "error");
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

    const cleanedSubcategoryIds = materialSubCategoryIDs
      .filter((id) => id && !isNaN(Number(id)))
      .map((id) => Number(id));

    if (cleanedSubcategoryIds.length === 0) {
      toast("Invalid subcategory selection", "error");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: Number(item.id),
          boq_line_id: boqLineID ? Number(boqLineID) : null,
          material_category_id: Number(materialCategoryID),
          material_subcategory_id: cleanedSubcategoryIds,
          material_description: materialDescription.trim(),
          quantity: Number(quantity),
          unit: unit,
          notes: notes || null,
          specification: specification || null,
          brand: brand || null,
          delivery_location: deliveryLocation,
        }),
      });

      if (res.ok) {
        toast(`${materialDescription} updated`, "success");
        setIsOpen(false);
        router.refresh();
      } else {
        const errorData = await res.json();
        toast(
          errorData.error || "Failed to update material request item",
          "error",
        );
      }
    } catch (error) {
      console.error("Update error:", error);
      toast(
        "Failed to update material request item. Something went wrong",
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
        style={{ padding: "7px 7px" }}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE MATERIAL REQUEST ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
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

          <div className="input-row half">
            <InputItem
              label={"DESCRIPTION"}
              value={materialDescription}
              type={"text"}
              placeholder={"ENTER DESCRIPTION"}
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

          <div className="input-row half">
            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              placeholder={"ENTER QUANTITY"}
              required
              onChange={(e) => {
                const val = e.target.value;
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

          <div className="input-row full">
            <InputItem
              label={"BRAND"}
              value={brand}
              type={"text"}
              placeholder={"ENTER BRAND"}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"SPECIFICATION"}
              value={specification}
              type={"textarea"}
              placeholder={"ENTER SPECIFICATION"}
              onChange={(e) => setSpecification(e.target.value)}
            />
          </div>

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

              {showLeftArrow && (
                <button
                  type="button"
                  onClick={() => scroll("left")}
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
                    display: none;
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

              {showRightArrow && (
                <button
                  type="button"
                  onClick={() => scroll("right")}
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
