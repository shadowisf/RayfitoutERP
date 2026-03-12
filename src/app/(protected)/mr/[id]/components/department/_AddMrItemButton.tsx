"use client";

import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import CreateCategoryButton from "./_CreateCategoryButton";
import CreateSubCategoryButton from "./_CreateSubcategoryButton";

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
  style?: React.CSSProperties;
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
  style,
}: AddMrItemButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [categoriesManuallySelected, setCategoriesManuallySelected] =
    useState(false);
  const [userInitiatedCategorySelection, setUserInitiatedCategorySelection] =
    useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);
  const [locationValues, setLocationValues] = useState<any[]>([]);

  const [materialCategoryID, setMaterialCategoryID] = useState<string | number>(
    "",
  );
  const [materialSubCategoryIDs, setMaterialSubCategoryIDs] = useState<
    (string | number)[]
  >([]);
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>([]);
  const [materialDescription, setMaterialDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [brand, setBrand] = useState("");
  const [specification, setSpecification] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const [inventoryMatch, setInventoryMatch] = useState<{
    id: number;
    description: string;
  } | null>(null);
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);

  async function refreshSubcategories() {
    if (materialCategoryID && userInitiatedCategorySelection) {
      // If a category is selected, fetch only its subcategories
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: materialCategoryID,
          }),
        },
      );
      const data = await res.json();
      setMaterialSubCategoryValues(data);
    } else {
      // If no category selected, fetch all subcategories
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await res.json();
      setMaterialSubCategoryValues(data);
    }
  }

  async function getMaterialCategoriesAndSubcategories() {
    // Fetch categories
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error(err);
      });

    // ✅ Use the new refresh function instead of fetching all subcategories
    await refreshSubcategories();
  }

  // Fetch initial data
  useEffect(() => {
    getMaterialCategoriesAndSubcategories();

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

  // Set auto-populated values when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (autoCategoryID) {
      // First fetch the subcategories for this category
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: autoCategoryID,
          }),
        },
      )
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);

          // Set the category
          setMaterialCategoryID(autoCategoryID);
          setCategoriesManuallySelected(true);
          setUserInitiatedCategorySelection(true);

          // Now set the subcategories - this needs to happen AFTER we have the data
          if (autoSubCategoryIDs && autoSubCategoryIDs.length > 0) {
            const idsArray = Array.isArray(autoSubCategoryIDs)
              ? autoSubCategoryIDs
              : [autoSubCategoryIDs];

            const normalizedIds = idsArray.map((id) =>
              typeof id === "string" ? parseInt(id) : id,
            );

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

      setTimeout(() => {
        setMaterialSubCategoryIDs(normalizedIds);
      }, 0);
    }
  }, [isOpen, autoCategoryID, autoSubCategoryIDs]);

  // Debounced inventory search when user types item description
  useEffect(() => {
    if (!materialDescription || materialDescription.trim().length < 3) {
      setInventoryMatch(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingInventory(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory/searchByDescription`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              descriptions: [materialDescription.trim()],
            }),
          },
        );
        const data = await res.json();
        if (data.success && data.data) {
          const match = data.data[materialDescription.trim()];
          setInventoryMatch(
            match ? { id: match.id, description: match.description } : null,
          );
        } else {
          setInventoryMatch(null);
        }
      } catch {
        setInventoryMatch(null);
      } finally {
        setIsSearchingInventory(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [materialDescription]);

  // Filter subcategories based on selected category - only if category was selected by user
  useEffect(() => {
    if (materialCategoryID && userInitiatedCategorySelection) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: materialCategoryID,
          }),
        },
      )
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
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
  }, [materialCategoryID, userInitiatedCategorySelection]);

  // Handle subcategory change - auto-select category if needed
  const handleSubCategoryChange = (selectedIds: (string | number)[]) => {
    setMaterialSubCategoryIDs(selectedIds);

    // If subcategories are cleared
    if (selectedIds.length === 0) {
      if (!categoriesManuallySelected) {
        setMaterialCategoryID("");
      }
      // Reset to all subcategories
      fetch("/api/mr/getMaterialSubCategoryValues", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        });
      return;
    }

    // Get category from first selected subcategory
    const firstSelectedSubCategory = materialSubCategoryValues.find(
      (sc: any) => sc.id === selectedIds[0],
    ) as any;

    if (firstSelectedSubCategory?.category_id) {
      // If category was manually selected, keep it and merge
      if (categoriesManuallySelected && materialCategoryID) {
        // Don't override the manually selected category
      } else {
        // Auto-select the category based on subcategory
        setMaterialCategoryID(firstSelectedSubCategory.category_id);
      }
    }
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string | number) => {
    setCategoriesManuallySelected(true);
    setUserInitiatedCategorySelection(true);
    setMaterialCategoryID(categoryId);
  };

  // Handle BOQ selection
  const handleBoqSelection = (boqIDs: number[]) => {
    setBoqLineIDs(boqIDs);
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

    if (boqLineIDs.length === 0) {
      toast("Please select at least one bill of quantity item", "error");
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
          material_subcategory_ids: materialSubCategoryIDs,
          material_description: materialDescription,
          quantity: Number(quantity),
          unit,
          notes,
          brand,
          specification,
          delivery_location: deliveryLocation,
          boq_line_ids: boqLineIDs,
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
        setBoqLineIDs([]);
        setBrand("");
        setSpecification("");
        setDeliveryLocation("");
        setAttachment(null);
        setCategoriesManuallySelected(false);
        setUserInitiatedCategorySelection(false);
        setInventoryMatch(null);

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
              onChange={handleCategoryChange}
              placeholder="SELECT CATEGORY"
              required
              bottomButtonComponent={
                <CreateCategoryButton
                  onSuccess={() => {
                    getMaterialCategoriesAndSubcategories();
                  }}
                />
              }
            />

            <MultiSelectDropdown
              label={"SUBCATEGORIES"}
              dbData={materialSubCategoryValues}
              selectedValues={materialSubCategoryIDs}
              onChange={handleSubCategoryChange}
              placeholder="SELECT SUBCATEGORIES"
              required
              style={{ width: "350px" }}
              bottomButtonComponent={
                <CreateSubCategoryButton
                  materialCategoryID={Number(materialCategoryID)}
                  onSuccess={() => {
                    refreshSubcategories();
                  }}
                />
              }
            />
          </div>

          {/* Description and BOQ Line Row */}
          <div className="input-row half">
            {/* <div className="input-item">
              <label className="custom">
                <span>MATERIAL DESCRIPTION</span>
              </label>
              <small
                style={{
                  fontStyle: "italic",
                  fontWeight: "100",
                  fontSize: "9px",
                  marginBottom: "6px",
                  color: "rgba(150, 150, 150, 1)",
                }}
              >
                ENTER MATERIAL NAME OR{" "}
                <a
                  href="/inventory"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontWeight: "600",
                    textDecoration: "underline",
                    color: "inherit",
                  }}
                >
                  SELECT FROM INVENTORY
                </a>
              </small>
              <input
                type="text"
                value={materialDescription || ""}
                onChange={(e) => setMaterialDescription(e.target.value)}
                placeholder="ENTER MATERIAL NAME"
                required
              />
              {inventoryMatch && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "rgba(150, 150, 150, 1)",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontStyle: "italic" }}>
                    Possible match in inventory:
                  </span>
                  <a
                    href={`/inventory/${inventoryMatch.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontWeight: "600",
                      color: "black",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    &ldquo;{inventoryMatch.description}&rdquo;
                    <img
                      src="/icons/external-link.svg"
                      alt=""
                      style={{ width: "10px", height: "10px" }}
                    />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialDescription(inventoryMatch.description);
                      setInventoryMatch(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontSize: "10px",
                      fontWeight: "600",
                      textDecoration: "underline",
                      color: "black",
                      fontFamily: "inherit",
                    }}
                  >
                    Use This Item
                  </button>
                </div>
              )}
            </div> */}
            <div>
              <InputItem
                label={"ITEM"}
                value={materialDescription}
                type={"text"}
                onChange={(e) => setMaterialDescription(e.target.value)}
                required
              />
              {inventoryMatch && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "rgba(150, 150, 150, 1)",
                    display: "flex",
                    alignItems: "center",
                    gap: "25px",
                    flexWrap: "wrap",
                    marginTop: "-10px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ fontStyle: "italic" }}>
                    <span>Possible match in inventory: </span>
                    <a
                      href={`/inventory/${inventoryMatch.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontWeight: "600",
                        color: "black",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      &ldquo;{inventoryMatch.description}&rdquo;
                      <img
                        src="/icons/external-link.svg"
                        alt=""
                        style={{ width: "10px", height: "10px" }}
                      />
                    </a>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setMaterialDescription(inventoryMatch.description);
                      setInventoryMatch(null);
                    }}
                    style={{
                      padding: 0,
                      cursor: "pointer",
                      fontSize: "10px",
                      fontWeight: "600",
                      textDecoration: "underline",
                      color: "black",
                    }}
                    componentType={"button"}
                    bgColor={"transparent"}
                    borderColor={"transparent"}
                    textColor={"black"}
                  >
                    Use This Item
                  </Button>
                </div>
              )}
            </div>

            <div className="input-item">
              <label className="custom">
                <span>BOQ REFERENCE</span>
                <small></small>
              </label>

              <MultipleSelectBoqItemButton
                projectID={projectID}
                onSelectBoq={handleBoqSelection}
                currentBoqLineIDs={boqLineIDs}
              />
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

                if (val === "" || /^\d*\.?\d*$/.test(val)) {
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
                "DRUM",
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
    </>
  );
}
