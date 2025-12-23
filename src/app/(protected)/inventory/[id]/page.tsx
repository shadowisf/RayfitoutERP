import { InventoryItem } from "../types/inventoryItem";
import CodeSection from "./components/CodeSection";
import CodeDownloadButton from "./components/CodeDownloadButton";
import TransactionTimeline from "./components/TransactionTimeline";

export default async function InventoryItemWithID({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const inventoryItem: InventoryItem = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory/getInventoryItemByID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    }
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.rows && data.rows.length > 0) {
        return data.rows[0];
      }
      return null;
    })
    .catch((err) => {
      console.error(err);
      return null;
    });

  // Example transaction data - replace with your actual API call
  const transactions = [
    {
      id: "1",
      type: "TO_BE_TRANSFERRED" as const,
      date: "21 JAN 2025",
      quantity: 1,
      batchId: "BA-0013",
      transferNote: "TRN - 001",
    },
    {
      id: "2",
      type: "STOCK_ADDED" as const,
      date: "21 JAN 2025",
      quantity: 12,
      batchId: "BA-0013",
      stockLocation: "HEADQUARTERS",
      addedBy: "JOHN",
    },
    {
      id: "3",
      type: "STOCK_ISSUED" as const,
      date: "21 JAN 2025",
      quantity: 1,
      batchId: "BA-0013",
      issuedTo: "RAFIQUE AHMED",
      purpose: "NEW WORK",
    },
    {
      id: "4",
      type: "TRANSFER_RECEIVED" as const,
      date: "21 JAN 2025",
      quantity: 1,
      batchId: "BA-0013",
      transferNote: "TRN - 001",
    },
    {
      id: "5",
      type: "TO_BE_TRANSFERRED" as const,
      date: "21 JAN 2025",
      quantity: 1,
      batchId: "BA-0013",
      transferNote: "TRN - 001",
    },
    {
      id: "6",
      type: "STOCK_ADDED" as const,
      date: "21 JAN 2025",
      quantity: 12,
      batchId: "BA-0013",
      stockLocation: "HEADQUARTERS",
      addedBy: "JOHN",
    },
    {
      id: "7",
      type: "ITEM_CREATED" as const,
      date: "21 JAN 2025",
      quantity: 0,
      createdBy: "JOHN",
    },
  ];

  return (
    <div className="dashboard">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 0.5fr",
          gap: "25px",
          textTransform: "uppercase",
        }}
      >
        <div className="widget-container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.25fr",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                }}
              >
                <div>
                  <small>INVENTORY ITEM ID</small>
                  <h2>MRT-{inventoryItem?.id.toString().padStart(5, "0")}</h2>
                </div>
                <div>
                  <small>STATUS</small>
                  <p
                    style={{
                      padding: "5px 15px",
                      backgroundColor: "rgba(149, 222, 189, 1)",
                      color: "rgba(0, 108, 60, 1)",
                      width: "fit-content",
                      borderRadius: "25px",
                      fontWeight: "bold",
                    }}
                  >
                    IN-STOCK
                  </p>
                </div>
                <div>
                  <small>DESCRIPTION</small>
                  <h2>{inventoryItem?.description}</h2>
                </div>
              </div>

              <br />
              <br />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                }}
              >
                <div>
                  <small>CATEGORY</small>
                  <h2>{inventoryItem?.category_name}</h2>
                </div>
                <div>
                  <small>BRAND</small>
                  <h2>{inventoryItem?.brand || "-"}</h2>
                </div>
                <div>
                  <small>SPECIFICATION</small>
                  <h2>{inventoryItem?.specification || "-"}</h2>
                </div>
              </div>

              <br />
              <br />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                }}
              >
                <div>
                  <small>SUBCATEGORY</small>
                  <h2>{inventoryItem?.subcategory_name}</h2>
                </div>
                <div>
                  <small>TYPE</small>
                  <h2>{inventoryItem?.type}</h2>
                </div>
              </div>
            </div>

            <div>
              <img
                src={inventoryItem?.image}
                alt="Inventory item"
                style={{ maxHeight: "150px" }}
              />
            </div>
          </div>
        </div>

        <div className="widget-container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>BARCODE & QR CODE</h2>
            <CodeDownloadButton item={inventoryItem} />
          </div>

          <br />
          <br />

          <CodeSection item={inventoryItem} />
        </div>
      </div>

      <br />
      <br />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 0.75fr",
          gap: "25px",
        }}
      >
        <div className="widget-container">
          <h2>STOCK HISTORY</h2>
        </div>

        <div className="widget-container">
          <h2>TRANSACTION & MOVEMENT</h2>
          <br />
          <br />
          <TransactionTimeline transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
