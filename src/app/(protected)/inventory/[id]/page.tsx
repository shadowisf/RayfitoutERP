import { InventoryItem } from "../types/inventoryItem";
import CodeSection from "./components/QrCodeSection";
import QrCodeDownloadButton from "./components/_QrCodeDownloadButton";
import TransactionTimeline from "./components/TransactionTimeline";
import ManualAddToStockButton from "./components/_ManualAddStockButton";
import TransferIssueStocksButton from "./components/_TransferIssueStockButton";
import StockLocationChart from "./components/StockLocationChart";
import QrCodePrintButton from "./components/_QrCodePrintButton";
import EditInventoryItemButton from "../components/_EditInventoryItemButton";
import DeleteInventoryItemButton from "./components/_DeleteInventoryItemButton";
import ReceiveStocksButton from "./components/_ReceiveStocksButton";
import TopSuppliersChart from "./components/TopSuppliersChart";

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

  // Fetch stock transactions for this inventory item
  const stockData = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStocksByInventoryItemID`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryItemId: id }),
    }
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        return {
          stocks: data.stocks || [],
          stocksTransferIssue: data.stocksTransferIssue || [],
        };
      }
      return {
        stocks: [],
        stocksTransferIssue: [],
      };
    })
    .catch((err) => {
      console.error(err);
      return {
        stocks: [],
        stocksTransferIssue: [],
      };
    });

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          justifyContent: "space-betweens",
        }}
      >
        <div></div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <EditInventoryItemButton inventoryItem={inventoryItem} />
          <DeleteInventoryItemButton inventoryItem={inventoryItem} />

          <ReceiveStocksButton inventoryItem={inventoryItem} />

          <ManualAddToStockButton inventoryItem={inventoryItem} />
          <TransferIssueStocksButton inventoryItem={inventoryItem} />
        </div>
      </div>

      <br />
      <br />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 0.25fr",
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
              gap: "50px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-grid",
                  gridTemplateColumns: "repeat(3, max-content)",
                  columnGap: "50px",
                  rowGap: "30px",
                }}
              >
                <div>
                  <small>INVENTORY ITEM ID</small>
                  <h2>INV-{inventoryItem?.id.toString().padStart(5, "0")}</h2>
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
                  <small>ITEM NAME</small>
                  <h2>{inventoryItem?.description}</h2>
                </div>
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
                  <h2 style={{ whiteSpace: "pre-wrap", maxWidth: "300px" }}>
                    {inventoryItem?.specification || "-"}
                  </h2>
                </div>
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
                style={{ maxHeight: "200px" }}
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
            <h2>QR CODE</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <QrCodeDownloadButton item={inventoryItem} />
              <QrCodePrintButton item={inventoryItem} />
            </div>
          </div>

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
        <div>
          <div className="widget-container">
            <StockLocationChart
              stocks={stockData.stocks}
              stocksTransferIssue={stockData.stocksTransferIssue}
              unit={inventoryItem.unit}
            />
          </div>

          <br />
          <br />

          <div className="widget-container">
            <TopSuppliersChart
              stocks={stockData.stocks}
              unit={inventoryItem.unit}
              stocksTransferIssue={stockData.stocksTransferIssue}
            />
          </div>
        </div>

        <div className="widget-container">
          <h2>TRANSACTION & MOVEMENT</h2>

          <br />
          <br />

          <TransactionTimeline
            stocks={stockData.stocks}
            stocksTransferIssue={stockData.stocksTransferIssue}
            inventoryItem={inventoryItem}
          />
        </div>
      </div>
    </div>
  );
}
