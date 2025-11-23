"use client";

import Button from "@/app/components/Button";
import { useState, useEffect } from "react";
import AddItemButton from "./AddItemButton";

type BoqLine = {
  id: number;
  boq_id: number;
  item_name: string;
  item_code: string;
  scope_of_work: string;
  location_id: number;
  location_name: string;
  quantity: number;
  unit: string;
  rate_per_quantity: number;
  total_cost: number;
  item_description: string;
  attachments: string[];
};

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

type BoqLinesViewProps = {
  boqLines: GroupedBoqLines;
  boqHeaderID: string;
};

export default function BoqLinesView({
  boqLines,
  boqHeaderID,
}: BoqLinesViewProps) {
  const pencilIcon = "/icons/pencil.svg";
  const trashIcon = "/icons/trash.svg";

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<number[]>(
    []
  );

  useEffect(
    function () {
      const categories = Object.keys(boqLines);
      if (categories.length > 0) {
        setActiveCategory(categories[0]);
      }
    },
    [boqLines]
  );

  function toggleDescription(itemId: number) {
    setExpandedDescriptions(function (prev) {
      if (prev.includes(itemId)) {
        return prev.filter(function (id) {
          return id !== itemId;
        });
      } else {
        return [...prev, itemId];
      }
    });
  }

  function isExpanded(itemId: number) {
    return expandedDescriptions.includes(itemId);
  }

  const categories = Object.keys(boqLines);
  const subCategories = boqLines[activeCategory] || {};

  return (
    <>
      <div className="category-grid">
        <div>
          {categories.map(function (category) {
            return (
              <button
                key={category}
                className={`item ${
                  activeCategory === category ? "active" : ""
                }`}
                onClick={function () {
                  setActiveCategory(category);
                }}
              >
                {category}
              </button>
            );
          })}
        </div>

        <AddItemButton
          boqHeaderID={boqHeaderID}
          bgColor="black"
          borderColor="black"
          textColor="white"
        />
      </div>

      <br />
      <br />

      {Object.entries(subCategories).map(function (
        [subCategory, items],
        index
      ) {
        return (
          <div key={subCategory} className="subcategory-section">
            <h2>
              {categories.indexOf(activeCategory) + 1}.{index + 1} {subCategory}
            </h2>

            <br />
            <br />

            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM</th>
                  <th>QTY</th>
                  <th>UNIT</th>
                  <th>RATE</th>
                  <th>LOCATION</th>
                  <th>ITEM DESCRIPTION</th>
                  <th>ATTACHMENT(S)</th>
                  <th>TOTAL COST</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map(function (item, itemIndex) {
                  const expanded = isExpanded(item.id);
                  const maxLength = 100;
                  const needsCollapse =
                    item.item_description &&
                    item.item_description.length > maxLength;

                  return (
                    <tr key={item.id}>
                      <td>
                        {categories.indexOf(activeCategory) + 1}.{index + 1}.
                        {itemIndex + 1}
                      </td>
                      <td>{item.item_name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.rate_per_quantity?.toLocaleString()}</td>
                      <td>{item.location_name?.split(" - ").pop()}</td>
                      <td
                        className="item-description"
                        style={{ whiteSpace: "pre-wrap", width: "300px" }}
                      >
                        {needsCollapse ? (
                          <>
                            {expanded
                              ? item.item_description
                              : item.item_description.substring(0, maxLength) +
                                "..."}
                            <br />
                            <br />
                            <span
                              className="toggle-btn"
                              onClick={function () {
                                toggleDescription(item.id);
                              }}
                            >
                              {expanded ? "SHOW LESS" : "SHOW MORE"}
                            </span>
                          </>
                        ) : (
                          item.item_description
                        )}
                      </td>
                      <td className="attachments">
                        <div className="attachments-grid">
                          {item.attachments.map(function (url, i) {
                            return <img key={i} src={url} alt="attachment" />;
                          })}
                        </div>
                      </td>
                      <td>AED {item.total_cost?.toLocaleString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <Button
                            componentType={"button"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            onClick={() => {}}
                          >
                            <img src={pencilIcon} alt="pencil icon" />
                          </Button>

                          <Button
                            componentType={"button"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            onClick={() => {}}
                          >
                            <img src={trashIcon} alt="trash icon" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <br />
            <br />
            <br />
            <br />
          </div>
        );
      })}
    </>
  );
}
