import { InventoryItem } from "../../types/inventoryItem";
import BatchDetailsPopUpButton from "./_BatchDetailsPopUpButton";

type Stock = {
  id: number;
  batch_id: number;
  inventory_item_id: number;
  received_by: string;
  quantity: number;
  unit: string;
  location: string;
  notes: string;
  created_at: string;
};

type TransactionTimelineProps = {
  stock: Stock[];
  inventoryItem: InventoryItem;
};

const TransactionIcon = ({ isItemCreated }: { isItemCreated: boolean }) => {
  const plusIcon = "/icons/plus-green.svg";

  if (isItemCreated) {
    return (
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "rgba(218, 218, 218, 1)",
          color: "rgba(218, 218, 218, 1)",
          border: "2px solid white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: "5px",
        }}
      >
        <svg width="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "rgba(0, 108, 60, 1)",
        color: "rgba(149, 222, 189, 1)",
        border: "2px solid white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: "5px",
      }}
    >
      <img src={plusIcon} alt="plus" width="12" />
    </div>
  );
};

const StockCard = ({
  stock,
  inventoryItem,
}: {
  stock: Stock;
  inventoryItem: InventoryItem;
}) => {
  const transactionDate = new Date(stock.created_at)
    .toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div style={{ display: "flex", position: "relative" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <TransactionIcon isItemCreated={false} />
      </div>

      <div
        style={{
          paddingBottom: "50px",
          marginLeft: "-20px",
        }}
      >
        <div
          style={{
            borderRadius: "25px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(149, 222, 189, 1)",
              color: "rgba(0, 108, 60, 1)",
              padding: "4px 40px",
              fontWeight: "bold",
              borderRadius: "25px",
              width: "250px",
            }}
          >
            STOCK ADDED
          </div>

          <br />

          <div style={{ paddingLeft: "40px" }}>
            <div
              style={{
                display: "flex",
                gap: "20px",
              }}
            >
              <div style={{ textWrap: "nowrap" }}>
                <small>DATE</small>
                <h4>{transactionDate}</h4>
              </div>

              <div style={{ textWrap: "nowrap" }}>
                <small>ADDED QUANTITY</small>
                <h4>
                  {Math.abs(stock.quantity)} {inventoryItem.unit}
                </h4>
              </div>

              <div style={{ textWrap: "nowrap" }}>
                <small>BATCH ID</small>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <h4>BA-{stock.batch_id.toString().padStart(5, "0")}</h4>
                  <BatchDetailsPopUpButton inventoryItem={inventoryItem} />
                </div>
              </div>

              <div style={{ textWrap: "nowrap" }}>
                <small>STOCK LOCATION</small>
                <h4>{stock.location}</h4>
              </div>

              <div style={{ textWrap: "nowrap" }}>
                <small>ADDED BY</small>
                <h4>{stock.received_by}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ItemCreatedCard = ({
  inventoryItem,
}: {
  inventoryItem: InventoryItem;
}) => {
  const transactionDate = new Date(inventoryItem.created_at)
    .toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div style={{ display: "flex", position: "relative" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <TransactionIcon isItemCreated={true} />
      </div>

      <div
        style={{
          paddingBottom: "50px",
          marginLeft: "-20px",
        }}
      >
        <div
          style={{
            borderRadius: "25px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(239, 239, 239, 1)",
              color: "rgba(131, 131, 131, 1)",
              padding: "4px 40px",
              fontWeight: "bold",
              borderRadius: "25px",
              width: "250px",
            }}
          >
            ITEM CREATED
          </div>

          <br />

          <div style={{ paddingLeft: "40px" }}>
            <div
              style={{
                display: "flex",
                gap: "20px",
              }}
            >
              <div>
                <small>DATE</small>
                <h4>{transactionDate}</h4>
              </div>

              <div>
                <small>CREATED BY</small>
                <h4>{inventoryItem.created_by || "SYSTEM"}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TransactionTimeline({
  stock,
  inventoryItem,
}: TransactionTimelineProps) {
  return (
    <div style={{ position: "relative" }}>
      {/* Timeline line */}
      <div
        style={{
          position: "absolute",
          left: "12px",
          top: "24px",
          bottom: "48px",
          width: "2px",
          backgroundColor: "rgba(229, 229, 229, 1)",
        }}
      />

      {/* Transactions */}
      <div>
        {stock.map((stockItem) => (
          <StockCard
            key={stockItem.id}
            stock={stockItem}
            inventoryItem={inventoryItem}
          />
        ))}
        <ItemCreatedCard inventoryItem={inventoryItem} />
      </div>
    </div>
  );
}
