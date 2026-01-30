"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState, useRef } from "react";
import { toast } from "@/app/components/Toast";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../types/inventoryItem";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";

type EditInventoryItemButtonProps = {
  inventoryItem: InventoryItem;
};

export default function EditInventoryItemButton({
  inventoryItem,
}: EditInventoryItemButtonProps) {
  const router = useRouter();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

  const [materialCategoryID, setMaterialCategoryID] = useState<string | number>(
    "",
  );
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState<
    string | number | ""
  >("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [unit, setUnit] = useState("");
  const [stockable, setStockable] = useState(false);
  const [minimumStockQuantity, setMinimumStockQuantity] = useState("");
  const [brand, setBrand] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [specification, setSpecification] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  // Fetch material categories
  useEffect(() => {
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

    // Fetch all subcategories initially
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setMaterialSubCategoryValues(data);
      });
  }, []);

  // Fetch material subcategories when category changes
  useEffect(() => {
    if (materialCategoryID) {
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
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      )
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        });
    }
  }, [materialCategoryID]);

  // Fetch inventory item details when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInventoryItemDetails();
    }
  }, [isOpen]);

  const fetchInventoryItemDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory/getInventoryItemByID`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: inventoryItem.id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch inventory item");
      }

      const result = await response.json();

      // Access the first item from the rows array
      const data: InventoryItem = result.rows[0];

      console.log("Fetched inventory data:", data); // Debug log

      // Populate form fields with existing data
      setMaterialCategoryID(data.category_id || "");
      setMaterialSubCategoryID(data.subcategory_id || "");
      setDescription(data.description || "");
      setType(data.type || "");
      setUnit(data.unit || "");
      setStockable(data.stockable);
      setMinimumStockQuantity(data.minimum_stock_quantity?.toString() || "");
      setBrand(data.brand || "");
      setCountryOfOrigin(data.country_of_origin || "");
      setSpecification(data.specification || "");

      if (data.image) {
        setExistingImageUrl(data.image);
        setImagePreview(data.image);
      }
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      toast("Failed to load inventory item details", "error");
    }
  };

  const deleteImageFromS3 = async (imageUrl: string) => {
    try {
      const response = await fetch("/api/s3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          url: imageUrl,
        }),
      });

      if (!response.ok) {
        console.error("Failed to delete image from S3");
      }
    } catch (error) {
      console.error("Error deleting image from S3:", error);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let imageUrl = existingImageUrl;

    // Upload new image if selected
    if (image) {
      try {
        const formData = new FormData();
        formData.append("files", image);
        formData.append("folder", "inventory-items");

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.urls[0];
      } catch (error) {
        console.error("Error uploading image:", error);
        toast("Failed to upload image", "error");
        return;
      }
    }

    // Delete old image from S3 if it was marked for deletion
    if (imageToDelete) {
      await deleteImageFromS3(imageToDelete);
    }

    // If image was removed and no new image uploaded
    if (!imagePreview && !image) {
      imageUrl = null;
    }

    // Update inventory item
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateInventoryItem",
          id: inventoryItem.id,
          category_id: materialCategoryID,
          subcategory_id: materialSubCategoryID,
          description,
          type,
          unit,
          stockable,
          minimum_stock_quantity: minimumStockQuantity,
          brand,
          country_of_origin: countryOfOrigin,
          specification,
          image: imageUrl,
        }),
      },
    );

    if (res.ok) {
      toast("Inventory item updated", "success");
      setIsOpen(false);

      // Reset states
      setImageToDelete(null);

      router.refresh();
    } else {
      toast("Failed to update inventory item", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={pencilIcon} alt="edit" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"EDIT INVENTORY ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <>
            <div className="input-row half">
              <SingleSelectDropdown
                label={"CATEGORY"}
                dbData={materialCategoryValues}
                selectedValue={materialCategoryID}
                onChange={setMaterialCategoryID}
                placeholder="SELECT CATEGORY"
                required
              />

              <SingleSelectDropdown
                label={"SUB CATEGORY"}
                dbData={materialSubCategoryValues}
                selectedValue={materialSubCategoryID}
                onChange={(subCategoryId) => {
                  setMaterialSubCategoryID(subCategoryId);

                  const selectedSubCategory = materialSubCategoryValues.find(
                    (sc: any) => sc.id === subCategoryId,
                  ) as any;

                  if (selectedSubCategory?.category_id) {
                    setMaterialCategoryID(selectedSubCategory.category_id);
                  }
                }}
                placeholder="SELECT SUB CATEGORY"
                required
              />
            </div>

            <div className="input-row full">
              <InputItem
                label={"DESCRIPTION"}
                value={description}
                type={"text"}
                placeholder={"ENTER DESCRIPTION"}
                required
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="input-row three-col">
              <InputItem
                label={"TYPE"}
                value={type}
                type={"select"}
                placeholder={"SELECT TYPE"}
                required
                onChange={(e) => setType(e.target.value)}
                selectOptions={[
                  "Raw material",
                  "Finish material",
                  "Hardware",
                  "Mechanical/plumbing material",
                  "Asset/equipment",
                  "Fabricated item",
                  "Consumable",
                ]}
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

              <div className="input-item">
                <label>STOCKABLE</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    height: "100%",
                  }}
                >
                  <div
                    onClick={() => setStockable(!stockable)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "5px",
                      border: stockable ? "none" : "2px solid #d1d5db",
                      backgroundColor: stockable ? "#10b981" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {stockable && (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M16.6667 5L7.50004 14.1667L3.33337 10"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="input-row three-col">
              <InputItem
                label={"MINIMUM QUANTITY TO STOCK"}
                value={minimumStockQuantity}
                type={"text"}
                placeholder={"ENTER MINIMUM QUANTITY TO STOCK"}
                required
                onChange={(e) => {
                  let val = e.target.value;
                  val = val.replace(/,/g, "");

                  // Allow empty (for clearing input)
                  if (val === "") {
                    setMinimumStockQuantity("");
                    return;
                  }

                  // ❌ Block anything that's not digits
                  if (!/^\d+$/.test(val)) {
                    return;
                  }

                  setMinimumStockQuantity(val);
                }}
              />

              <InputItem
                label={"BRAND"}
                value={brand}
                type={"text"}
                placeholder={""}
                required={false}
                onChange={(e) => setBrand(e.target.value)}
              />
              <InputItem
                label={"COUNTRY OF ORIGIN"}
                value={countryOfOrigin}
                type={"select"}
                placeholder={"SELECT COUNTRY OF ORIGIN"}
                required={false}
                onChange={(e) => setCountryOfOrigin(e.target.value)}
                selectOptions={[
                  "Afghanistan",
                  "Albania",
                  "Algeria",
                  "Andorra",
                  "Angola",
                  "Antigua and Barbuda",
                  "Argentina",
                  "Armenia",
                  "Australia",
                  "Austria",
                  "Azerbaijan",
                  "Bahamas",
                  "Bahrain",
                  "Bangladesh",
                  "Barbados",
                  "Belarus",
                  "Belgium",
                  "Belize",
                  "Benin",
                  "Bhutan",
                  "Bolivia",
                  "Bosnia and Herzegovina",
                  "Botswana",
                  "Brazil",
                  "Brunei",
                  "Bulgaria",
                  "Burkina Faso",
                  "Burundi",
                  "Cambodia",
                  "Cameroon",
                  "Canada",
                  "Cape Verde",
                  "Central African Republic",
                  "Chad",
                  "Chile",
                  "China",
                  "Colombia",
                  "Comoros",
                  "Costa Rica",
                  "Croatia",
                  "Cuba",
                  "Cyprus",
                  "Czech Republic",
                  "Denmark",
                  "Djibouti",
                  "Dominica",
                  "Dominican Republic",
                  "Ecuador",
                  "Egypt",
                  "El Salvador",
                  "Equatorial Guinea",
                  "Eritrea",
                  "Estonia",
                  "Eswatini",
                  "Ethiopia",
                  "Fiji",
                  "Finland",
                  "France",
                  "Gabon",
                  "Gambia",
                  "Georgia",
                  "Germany",
                  "Ghana",
                  "Greece",
                  "Grenada",
                  "Guatemala",
                  "Guinea",
                  "Guinea-Bissau",
                  "Guyana",
                  "Haiti",
                  "Honduras",
                  "Hungary",
                  "Iceland",
                  "India",
                  "Indonesia",
                  "Iran",
                  "Iraq",
                  "Ireland",
                  "Israel",
                  "Italy",
                  "Jamaica",
                  "Japan",
                  "Jordan",
                  "Kazakhstan",
                  "Kenya",
                  "Kiribati",
                  "Kuwait",
                  "Kyrgyzstan",
                  "Laos",
                  "Latvia",
                  "Lebanon",
                  "Lesotho",
                  "Liberia",
                  "Libya",
                  "Liechtenstein",
                  "Lithuania",
                  "Luxembourg",
                  "Madagascar",
                  "Malawi",
                  "Malaysia",
                  "Maldives",
                  "Mali",
                  "Malta",
                  "Marshall Islands",
                  "Mauritania",
                  "Mauritius",
                  "Mexico",
                  "Micronesia",
                  "Moldova",
                  "Monaco",
                  "Mongolia",
                  "Montenegro",
                  "Morocco",
                  "Mozambique",
                  "Myanmar",
                  "Namibia",
                  "Nauru",
                  "Nepal",
                  "Netherlands",
                  "New Zealand",
                  "Nicaragua",
                  "Niger",
                  "Nigeria",
                  "North Korea",
                  "North Macedonia",
                  "Norway",
                  "Oman",
                  "Pakistan",
                  "Palau",
                  "Panama",
                  "Papua New Guinea",
                  "Paraguay",
                  "Peru",
                  "Philippines",
                  "Poland",
                  "Portugal",
                  "Qatar",
                  "Romania",
                  "Russia",
                  "Rwanda",
                  "Saint Kitts and Nevis",
                  "Saint Lucia",
                  "Saint Vincent and the Grenadines",
                  "Samoa",
                  "San Marino",
                  "Sao Tome and Principe",
                  "Saudi Arabia",
                  "Senegal",
                  "Serbia",
                  "Seychelles",
                  "Sierra Leone",
                  "Singapore",
                  "Slovakia",
                  "Slovenia",
                  "Solomon Islands",
                  "Somalia",
                  "South Africa",
                  "South Korea",
                  "South Sudan",
                  "Spain",
                  "Sri Lanka",
                  "Sudan",
                  "Suriname",
                  "Sweden",
                  "Switzerland",
                  "Syria",
                  "Taiwan",
                  "Tajikistan",
                  "Tanzania",
                  "Thailand",
                  "Timor-Leste",
                  "Togo",
                  "Tonga",
                  "Trinidad and Tobago",
                  "Tunisia",
                  "Turkey",
                  "Turkmenistan",
                  "Tuvalu",
                  "Uganda",
                  "Ukraine",
                  "United Arab Emirates",
                  "United Kingdom",
                  "United States",
                  "Uruguay",
                  "Uzbekistan",
                  "Vanuatu",
                  "Vatican City",
                  "Venezuela",
                  "Vietnam",
                  "Yemen",
                  "Zambia",
                  "Zimbabwe",
                ]}
              />
            </div>

            <div className="input-row full">
              <InputItem
                label={"SPECIFICATION"}
                value={specification}
                type={"textarea"}
                placeholder={"ENTER SPECIFICATION"}
                required={false}
                onChange={(e) => setSpecification(e.target.value)}
              />
            </div>

            {/* Image Upload Section */}
            <div className="input-row full">
              {/* <div className="input-item">
                <label>REFERENCE IMAGE</label>

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  style={{
                    border: "1px dashed #d1d5db",
                    borderRadius: "5px",
                    padding: "40px",
                    textAlign: "center",
                    backgroundColor: "#f9fafb",
                    flexDirection: "column",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {imagePreview ? (
                    <div style={{ position: "relative" }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "300px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          border: "none",
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "white",
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      UPLOAD OR DRAG ATTACHMENT
                      <br />
                      <br />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                      />
                      <Button
                        componentType="button"
                        bgColor="black"
                        borderColor="black"
                        textColor="white"
                        onClick={(e) => {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }}
                      >
                        <img src={uploadIcon} alt="upload" />
                        UPLOAD FILE
                      </Button>
                    </>
                  )}
                </div>
              </div> */}

              <SingleUploadFileBox
                fileState={image}
                setFileState={setImage}
                label={"REFERENCE IMAGE"}
                acceptedFileTypes={".jpg,.jpeg,.png,.webp"}
                buttonLabel="SELECT OR DROP IMAGE"
                placeholder=""
              />
            </div>
          </>
        </FormPopUp>
      )}
    </>
  );
}
