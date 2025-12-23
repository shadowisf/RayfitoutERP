interface Transaction {
  id: string;
  type:
    | "TO_BE_TRANSFERRED"
    | "STOCK_ADDED"
    | "STOCK_ISSUED"
    | "TRANSFER_RECEIVED"
    | "ITEM_CREATED";
  date: string;
  quantity: number;
  batchId?: string;
  transferNote?: string;
  stockLocation?: string;
  addedBy?: string;
  issuedTo?: string;
  purpose?: string;
  createdBy?: string;
}

const truckIcon = "/icons/truck.svg";
const plusIcon = "/icons/plus-green.svg";
const minusIcon = "/icons/minus.svg";

interface TransactionTimelineProps {
  transactions: Transaction[];
}

const TransactionIcon = ({ type }: { type: Transaction["type"] }) => {
  const iconConfig = {
    TO_BE_TRANSFERRED: {
      icon: <img src={truckIcon} alt="truck" width="12" />,
      bg: "rgba(206, 186, 29, 1)",
      color: "white",
    },
    STOCK_ADDED: {
      icon: <img src={plusIcon} alt="plus" width="12" />,
      bg: "rgba(0, 108, 60, 1)",
      color: "rgba(149, 222, 189, 1)",
    },
    STOCK_ISSUED: {
      icon: <img src={minusIcon} alt="minus" width="12" />,
      bg: "rgba(197, 12, 15, 1)",
      color: "white",
    },
    TRANSFER_RECEIVED: {
      icon: <img src={truckIcon} alt="truck" width="12" />,
      bg: "rgba(206, 186, 29, 1)",
      color: "white",
    },
    ITEM_CREATED: {
      icon: (
        <svg width="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      bg: "rgba(218, 218, 218, 1)",
      color: "rgba(218, 218, 218, 1)",
    },
  };

  const config = iconConfig[type];

  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: config.bg,
        color: config.color,
        border: "2px solid white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: "5px",
      }}
    >
      {config.icon}
    </div>
  );
};

const TransactionCard = ({ transaction }: { transaction: Transaction }) => {
  const getStatusConfig = () => {
    switch (transaction.type) {
      case "TO_BE_TRANSFERRED":
        return {
          label: "TO BE TRANSFERRED",
          bg: "rgba(255, 250, 189, 1)",
          color: "rgba(134, 83, 47, 1)",
        };
      case "STOCK_ADDED":
        return {
          label: "STOCK ADDED",
          bg: "rgba(149, 222, 189, 1)",
          color: "rgba(0, 108, 60, 1)",
        };
      case "STOCK_ISSUED":
        return {
          label: "STOCK ISSUED",
          bg: "rgba(255, 186, 187, 1)",
          color: "rgba(197, 12, 15, 1)",
        };
      case "TRANSFER_RECEIVED":
        return {
          label: "TRANSFER RECEIVED",
          bg: "rgba(255, 250, 189, 1)",
          color: "rgba(134, 83, 47, 1)",
        };
      case "ITEM_CREATED":
        return {
          label: "ITEM CREATED",
          bg: "rgba(239, 239, 239, 1)",
          color: "rgba(131, 131, 131, 1)",
        };
    }
  };

  const status = getStatusConfig();

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
        <TransactionIcon type={transaction.type} />
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
              backgroundColor: status.bg,
              color: status.color,
              padding: "4px 40px",
              fontWeight: "bold",
              borderRadius: "25px",
              width: "250px",
            }}
          >
            {status.label}
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
                <h2>{transaction.date}</h2>
              </div>
              <div>
                <small>DATE</small>
                <h2>{transaction.date}</h2>
              </div>
              <div>
                <small>DATE</small>
                <h2>{transaction.date}</h2>
              </div>
              <div>
                <small>DATE</small>
                <h2>{transaction.date}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TransactionTimeline({
  transactions,
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
        {transactions.map((transaction, index) => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
}
