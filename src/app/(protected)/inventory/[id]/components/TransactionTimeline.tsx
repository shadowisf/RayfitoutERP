"use client";

import { InventoryItem } from "../../types/inventoryItem";
import BatchDetailsPopUpButton from "./_BatchDetailsPopUpButton";
import TransactionDetailsPopUpButton from "./_IssueDetailsPopUpButton";
import UploadSignedTSCButton from "./_UploadSignedTSCButton";
import ViewTSNPDFButton from "./_ViewTsnPDFButton";

type StockData = any;
type TransferIssueData = any;

type TransactionTimelineProps = {
  stocks: StockData[];
  stocksTransferIssue: TransferIssueData[];
  inventoryItem: InventoryItem;
};

const TransactionIcon = ({
  type,
  transaction,
}: {
  type: string;
  transaction?: any;
}) => {
  const plusIcon = "/icons/plus-green.svg";
  const minusIcon = "/icons/minus.svg";

  const iconConfig = {
    STOCK_ADDED: {
      icon: <img src={plusIcon} alt="plus" width="12" />,
      bg: "rgba(0, 108, 60, 1)",
      color: "rgba(149, 222, 189, 1)",
    },
    STOCK_ISSUED: {
      icon: <img src={minusIcon} alt="minus" width="12" />,
      bg:
        transaction?.received === 1
          ? "rgba(197, 12, 15, 1)"
          : "rgba(131, 131, 131, 1)",
      color: "white",
    },
    STOCK_TRANSFERRED: {
      icon: <img src={minusIcon} alt="minus" width="12" />,
      bg:
        transaction?.received === 1
          ? "rgba(197, 12, 15, 1)"
          : "rgba(131, 131, 131, 1)",
      color: "white",
    },
    STOCK_SENT: {
      icon: <img src={minusIcon} alt="minus" width="12" />,
      bg:
        transaction?.received === 1
          ? "rgba(197, 12, 15, 1)"
          : "rgba(131, 131, 131, 1)",
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

  const config =
    iconConfig[type as keyof typeof iconConfig] || iconConfig.ITEM_CREATED;

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

const TransactionCard = ({
  transaction,
  inventoryItem,
}: {
  transaction: any;
  inventoryItem: InventoryItem;
}) => {
  const warningIcon = "/icons/warning.svg";

  const getTransactionType = () => {
    if (transaction.source_table === "stocks") {
      return "STOCK_ADDED";
    } else if (transaction.source_table === "stocks_transfer_issue") {
      if (transaction.type.toLowerCase().includes("transfer")) {
        return "STOCK_TRANSFERRED";
      } else if (transaction.type.toLowerCase().includes("issue")) {
        return "STOCK_ISSUED";
      } else if (transaction.type.toLowerCase().includes("send")) {
        return "STOCK_SENT";
      }
    }
    return "STOCK_ADDED";
  };

  const transactionType = getTransactionType();

  const dateField = transaction.created_at || transaction.created_on;
  const transactionDate = new Date(dateField)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  const getStatusConfig = () => {
    switch (transactionType) {
      case "STOCK_ADDED":
        return {
          label: "STOCK ADDED",
          bg: "rgba(149, 222, 189, 1)",
          color: "rgba(0, 108, 60, 1)",
        };
      case "STOCK_ISSUED":
        return {
          label: "STOCK ISSUED",
          bg:
            transaction.received === 1
              ? "rgba(255, 186, 187, 1)"
              : "rgba(239, 239, 239, 1)",
          color:
            transaction.received === 1
              ? "rgba(197, 12, 15, 1)"
              : "rgba(131, 131, 131, 1)",
        };
      case "STOCK_TRANSFERRED":
        return {
          label: "STOCK TRANSFERRED",
          bg:
            transaction.received === 1
              ? "rgba(255, 186, 187, 1)"
              : "rgba(239, 239, 239, 1)",
          color:
            transaction.received === 1
              ? "rgba(197, 12, 15, 1)"
              : "rgba(131, 131, 131, 1)",
        };
      case "STOCK_SENT":
        return {
          label: "STOCK UNDER PROCESSING",
          bg:
            transaction.received === 1
              ? "rgba(255, 186, 187, 1)"
              : "rgba(239, 239, 239, 1)",
          color:
            transaction.received === 1
              ? "rgba(197, 12, 15, 1)"
              : "rgba(131, 131, 131, 1)",
        };
      default:
        return {
          label: "STOCK ADDED",
          bg: "rgba(149, 222, 189, 1)",
          color: "rgba(0, 108, 60, 1)",
        };
    }
  };

  const status = getStatusConfig();

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        textTransform: "uppercase",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <TransactionIcon type={transactionType} transaction={transaction} />
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
            {status.label !== "STOCK ADDED" && !transaction.received && (
              <span
                style={{
                  color: "rgba(197, 12, 15, 1)",
                  fontStyle: "italic",
                }}
              >
                TRANSACTION IS MISSING SIGNED DN
              </span>
            )}
          </div>

          <br />

          <div style={{ paddingLeft: "40px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                /* gap: "20px", */
                /* backgroundColor: "rgba(248, 249, 251, 1)", */
                /* padding: "10px 20px", */
                rowGap: "25px",
                /* borderRadius: "10px", */
              }}
            >
              <div style={{ textWrap: "nowrap" }}>
                <small>DATE</small>
                <h4>{transactionDate}</h4>
              </div>
              <div style={{ textWrap: "nowrap" }}>
                <small>QUANTITY</small>
                <h4>
                  {Math.abs(transaction.quantity)}{" "}
                  {transaction.unit || inventoryItem.unit}
                </h4>
              </div>
              {transactionType === "STOCK_ADDED" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div style={{ textWrap: "nowrap" }}>
                      <small>TRANSACTION ID</small>
                      <h4>
                        TA-{transaction.batch_id.toString().padStart(5, "0")}
                      </h4>
                    </div>

                    <BatchDetailsPopUpButton
                      inventoryItem={inventoryItem}
                      batchID={transaction.batch_id}
                    />
                  </div>

                  {/* {transaction.location && (
                    <div style={{ textWrap: "nowrap" }}>
                      <small>STOCK LOCATION</small>
                      <h4>{transaction.location}</h4>
                    </div>
                  )} */}

                  {/* {transaction.received_by && (
                    <div style={{ textWrap: "nowrap" }}>
                      <small>ADDED BY</small>
                      <h4>{transaction.received_by}</h4>
                    </div>
                  )} */}
                </>
              )}
              {/* {transactionType === "STOCK_TRANSFERRED" && (
                <>
                  {transaction.id && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div style={{ textWrap: "nowrap" }}>
                        <small>TRANSFER RECEIPT NOTE</small>
                        <h4>
                          TRN-{transaction.id.toString().padStart(5, "0")}
                        </h4>
                      </div>
                      <ViewTSNPDFButton transferID={transaction.id} />
                    </div>
                  )}
                </>
              )} */}

              {transactionType === "STOCK_ISSUED" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {transaction.received === 0 && <img src={warningIcon} />}
                    <div style={{ textWrap: "nowrap" }}>
                      <small>TRANSACTION ID</small>
                      <h4>TA-{transaction.id.toString().padStart(5, "0")}</h4>
                    </div>
                    <TransactionDetailsPopUpButton
                      transferID={transaction.id}
                    />
                  </div>
                  <div style={{ textWrap: "nowrap" }}>
                    <small>PROJECT</small>
                    <h4>{transaction.project_name || "-"}</h4>
                  </div>
                  <div></div>
                  {!transaction.received && (
                    <div style={{ textWrap: "nowrap" }}>
                      <UploadSignedTSCButton transactionID={transaction.id} />
                    </div>
                  )}
                </>
              )}

              {transactionType === "STOCK_TRANSFERRED" && (
                <>
                  {transaction.id && (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        {transaction.received === 0 && (
                          <img src={warningIcon} />
                        )}
                        <div style={{ textWrap: "nowrap" }}>
                          <small>TRANSACTION ID</small>
                          <h4>
                            TA-{transaction.id.toString().padStart(5, "0")}
                          </h4>
                        </div>
                        <TransactionDetailsPopUpButton
                          transferID={transaction.id}
                        />
                      </div>
                      <div>
                        <small>TRANSFER FROM</small>
                        <h4>{transaction.from_location}</h4>
                      </div>
                      <div>
                        <small>TRANSFER TO</small>
                        <h4>{transaction.to_location}</h4>
                      </div>
                      {!transaction.received && (
                        <div style={{ textWrap: "nowrap" }}>
                          <UploadSignedTSCButton
                            transactionID={transaction.id}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {transactionType === "STOCK_SENT" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {transaction.received === 0 && <img src={warningIcon} />}
                    <div style={{ textWrap: "nowrap" }}>
                      <small>TRANSACTION ID</small>
                      <h4>TA-{transaction.id.toString().padStart(5, "0")}</h4>
                    </div>
                    <TransactionDetailsPopUpButton
                      transferID={transaction.id}
                    />
                  </div>
                  <div style={{ textWrap: "nowrap" }}>
                    <small>PURPOSE</small>
                    <h4>{transaction.purpose}</h4>
                  </div>
                  <div></div>
                  {!transaction.received && (
                    <div style={{ textWrap: "nowrap" }}>
                      <UploadSignedTSCButton transactionID={transaction.id} />
                    </div>
                  )}
                </>
              )}
              {/* {(transactionType === "STOCK_ISSUED" ||
                transactionType === "STOCK_TRANSFERRED" ||
                transactionType === "STOCK_SENT") && (
                <>
                  {transaction.id && (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div style={{ textWrap: "nowrap" }}>
                          <small>DELIVERY NOTE</small>
                          <h4>
                            DN-{transaction.id.toString().padStart(5, "0")}
                          </h4>
                        </div>
                        <ViewTSNPDFButton transferID={transaction.id} />
                      </div>

                      <div style={{ textWrap: "nowrap" }}>
                        <UploadSignedTSCButton transactionID={transaction.id} />
                      </div>
                    </>
                  )}
                </>
              )} */}
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
        <TransactionIcon type="ITEM_CREATED" />
      </div>

      <div
        style={{
          paddingBottom: "50px",
          marginLeft: "-20px",
          textTransform: "uppercase",
          backgroundColor: "rgba(223, 223, 223, 1)",
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
  stocks,
  stocksTransferIssue,
  inventoryItem,
}: TransactionTimelineProps) {
  // Add source table identifier to stocks
  const stocksWithSource = stocks.map((stock) => ({
    ...stock,
    source_table: "stocks",
  }));

  // Add source table identifier to all transfer/issue transactions (no filtering)
  const transferIssueWithSource = stocksTransferIssue.map((transaction) => ({
    ...transaction,
    source_table: "stocks_transfer_issue",
  }));

  // Combine all transactions
  const allTransactions = [...stocksWithSource, ...transferIssueWithSource];

  // Sort by date (newest first)
  const sortedTransactions = allTransactions.sort((a, b) => {
    const dateA = new Date(a.created_at || a.created_on).getTime();
    const dateB = new Date(b.created_at || b.created_on).getTime();
    return dateB - dateA;
  });

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
        {sortedTransactions.map((transaction, index) => (
          <TransactionCard
            key={`${transaction.source_table}-${transaction.id}-${index}`}
            transaction={transaction}
            inventoryItem={inventoryItem}
          />
        ))}
        <ItemCreatedCard inventoryItem={inventoryItem} />
      </div>
    </div>
  );
}
