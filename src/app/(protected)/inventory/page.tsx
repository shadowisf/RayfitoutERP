"use client";

import { useEffect, useState } from "react";
import { InventoryItem } from "./types/inventoryItem";
import NotesPopUp from "./components/NotesPopUp";
import AddInventoryButton from "./components/_AddInventoryItem";
import { QRCodeSVG } from "qrcode.react";

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory/getAllCompletedInventory`,
      {
        method: "GET",
      }
    ).then((res) => res.json().then((data) => setInventory(data.data)));
  }, []);

  return (
    <div className="dashboard">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>INVENTORY LIST</h2>
        <AddInventoryButton></AddInventoryButton>
      </div>

      <br />
      <br />
      <br />

      <div style={{ overflowX: "auto" }}>
        {inventory ? (
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>BATCH ID</th>
                <th>CATEGORY</th>
                <th>SUBCATEGORY</th>
                <th>ITEM</th>
                <th>LOCATION</th>
                <th>TOTAL QUANTITY</th>
                <th>STOCK HISTORY</th>
                <th>ISSUE HISTORY</th>
                <th>LAST TRANSACTION</th>
                <th>NOTES</th>
                <th>BARCODE</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    MRT-{String(item.id).padStart(5, "0")}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    BAT-{String(item.batch_id).padStart(5, "0")}
                  </td>
                  <td>{item.category}</td>
                  <td>{item.subcategory}</td>
                  <td>{item.item}</td>
                  <td>{item.location}</td>
                  <td>{item.total_quantity}</td>
                  <td></td>
                  <td></td>
                  <td>
                    {item.last_transaction
                      ? new Date(item.last_transaction).toLocaleDateString()
                      : ""}
                  </td>
                  <td>
                    <NotesPopUp item={item} />
                  </td>
                  <td>
                    <QRCodeSVG
                      value={`${process.env.NEXT_PUBLIC_BASE_URL}/inventory/${item.id}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}
