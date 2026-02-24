import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";

Font.register({
  family: "Mont",
  src: "/fonts/Mont-Regular.otf",
});

Font.register({
  family: "Mont-SemiBold",
  src: "/fonts/Mont-SemiBold.otf",
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    fontFamily: "Mont",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  title: {
    fontSize: 20,
    color: "#000000",
  },
  titleBold: {
    fontFamily: "Mont-SemiBold",
  },

  // Info Grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 20,
  },
  infoItem: {},
  infoLabel: {
    fontSize: 7,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
  },

  // Pill container for date/time
  pillContainer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  pill: {
    backgroundColor: "rgba(228, 228, 228, 1)",
    borderRadius: 50,
    paddingLeft: 6,
    paddingRight: 6,
    paddingBottom: 1,
    paddingTop: 3,
  },
  pillText: {
    fontSize: 7,
    fontFamily: "Mont-SemiBold",
    color: "rgba(85, 80, 80, 1)",
  },

  // Section Title
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    color: "#000000",
    marginBottom: 8,
    marginTop: 8,
  },

  // Table
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: "6 8",
    fontSize: 7,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: "5 8",
    borderBottom: "1 solid #e0e0e0",
    fontSize: 7,
    color: "#333333",
  },

  // Timeline table columns
  timelineColStage: {
    width: "40%",
  },
  timelineColDateTime: {
    width: "35%",
  },
  timelineColSubmittedBy: {
    width: "25%",
  },

  // LPO lines table columns
  colNum: {
    width: "5%",
  },
  colItem: {
    width: "30%",
  },
  colQtyForUse: {
    width: "12%",
  },
  colQtyForStocks: {
    width: "16%",
  },
  colTotalQty: {
    width: "12%",
  },
  colUnitPrice: {
    width: "14.5%",
    textAlign: "right",
  },
  colTotalPrice: {
    width: "14.5%",
    textAlign: "right",
  },

  // Summary
  summaryTable: {
    border: "1 solid #e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 5,
    width: "40%",
    alignSelf: "flex-end",
    marginTop: 5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 8,
    paddingTop: 4,
    paddingBottom: 2,
    paddingRight: 8,
    fontSize: 7,
    borderBottom: "1 solid #e0e0e0",
  },
  summaryRowLast: {
    borderBottom: "none",
  },
  summaryLabel: {
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    fontSize: 7,
  },
  summaryValue: {
    fontFamily: "Mont-SemiBold",
    fontSize: 7,
    textAlign: "right",
  },
  totalRow: {
    backgroundColor: "#000000",
    color: "#ffffff",
    paddingLeft: 8,
    paddingTop: 4,
    paddingBottom: 2,
    paddingRight: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 4,
    width: "40%",
    alignSelf: "flex-end",
  },
  totalLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 7,
  },
  totalValue: {
    fontFamily: "Mont-SemiBold",
    fontSize: 7,
    textAlign: "right",
  },
});

type ProgressLogEntry = {
  id: number;
  mr_header_id: number;
  lpo_id: number | null;
  progress_id: number;
  from_progress_id: number | null;
  changed_by: string;
  changed_at: string;
  progress_name: string;
  from_progress_name: string | null;
};

type props = {
  mrHeader: MrHeader;
  lpo: any;
  flatLines: any[];
  progressLog: ProgressLogEntry[];
};

export function CompletedMrLpoPDF({
  mrHeader,
  lpo,
  flatLines,
  progressLog,
}: props) {
  const logo = "/icons/logo.jpg";

  const formatQuantity = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) {
      return num.toLocaleString("en-US");
    }
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  };

  const formatMoney = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format date only (DD/MM/YYYY)
  const formatDateOnly = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr || "-";
    }
  };

  // Format time only (HH:MM)
  const formatTimeOnly = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "-";
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr || "-";
    }
  };

  // Calculate subtotal from flatLines
  const subtotal = flatLines.reduce((sum, line) => {
    const unitPrice = Number(line.lpo_unit_price) || 0;
    const proposedQty = Number(line.approved_proposed_quantity) || 0;
    const requestedQty = Number(line.quantity) || 0;
    const totalQty = proposedQty > 0 ? proposedQty : requestedQty;
    return sum + unitPrice * totalQty;
  }, 0);

  const vatRate = Number(lpo?.vat_rate) || 0;
  const discountRate = Number(lpo?.discount) || 0;
  const shipping = Number(lpo?.shipping_and_handling) || 0;

  const discountAmount = subtotal * (discountRate / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const subtotalWithShipping = subtotalAfterDiscount + shipping;
  const vatAmount = subtotalWithShipping * (vatRate / 100);
  const total = subtotalWithShipping + vatAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            MATERIAL <Text style={styles.titleBold}>REQUEST</Text>
          </Text>
        </View>

        {/* MR Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>MR Number</Text>
            <Text style={styles.infoValue}>
              MR-{String(mrHeader.id).padStart(5, "0")}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Project</Text>
            <Text style={styles.infoValue}>{mrHeader.project_name || "-"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Purpose</Text>
            <Text style={styles.infoValue}>{mrHeader.purpose_name || "-"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Requested By</Text>
            <Text style={styles.infoValue}>{mrHeader.requested_by || "-"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>
              {mrHeader.department_name || "-"}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Required Date</Text>
            <Text style={styles.infoValue}>
              {mrHeader.required_date
                ? formatDate(mrHeader.required_date)
                : "-"}
            </Text>
          </View>
        </View>

        {/* Requisition Timeline */}
        <Text style={styles.sectionTitle}>REQUISITION TIMELINE</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.timelineColStage}>STAGE</Text>
            <Text style={styles.timelineColDateTime}>DATE & TIME</Text>
            <Text style={styles.timelineColSubmittedBy}>SUBMITTED BY</Text>
          </View>
          {progressLog.map((entry, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.timelineColStage}>
                {entry.progress_name || "-"}
              </Text>
              <View style={styles.timelineColDateTime}>
                {entry.changed_at ? (
                  <View style={styles.pillContainer}>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>
                        {formatDateOnly(entry.changed_at)}
                      </Text>
                    </View>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>
                        {formatTimeOnly(entry.changed_at)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text>-</Text>
                )}
              </View>
              <Text style={styles.timelineColSubmittedBy}>
                {entry.changed_by || "-"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}></Text>
        <Text style={styles.sectionTitle}></Text>
        <Text style={styles.sectionTitle}></Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>VENDOR NAME</Text>
            <Text style={styles.infoValue}>{lpo.supplier_name || "-"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LPO Number</Text>
            <Text style={styles.infoValue}>
              LPO-{String(lpo.id).padStart(5, "0")}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TOTAL ITEMS</Text>
            <Text style={styles.infoValue}>{flatLines.length}</Text>
          </View>
        </View>

        {/* LPO Lines Table */}
        <Text style={styles.sectionTitle}>MATERIAL ITEMS</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colItem}>ITEM</Text>
            <Text style={styles.colQtyForUse}>QTY FOR USE</Text>
            <Text style={styles.colQtyForStocks}>QTY FOR STOCKS</Text>
            <Text style={styles.colTotalQty}>TOTAL QTY</Text>
            <Text style={styles.colUnitPrice}>UNIT PRICE</Text>
            <Text style={styles.colTotalPrice}>TOTAL PRICE</Text>
          </View>
          {flatLines.map((line, index) => {
            const unitPrice = Number(line.lpo_unit_price) || 0;
            const proposedQty = Number(line.approved_proposed_quantity) || 0;
            const requestedQty = Number(line.quantity) || 0;
            const totalQty = proposedQty > 0 ? proposedQty : requestedQty;
            const stockQty =
              proposedQty > requestedQty ? proposedQty - requestedQty : 0;
            const lineTotal = unitPrice * totalQty;

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colNum}>{index + 1}</Text>
                <Text style={styles.colItem}>
                  {line.material_description || "-"}
                </Text>
                <Text style={styles.colQtyForUse}>
                  {formatQuantity(requestedQty)} {line.unit || ""}
                </Text>
                <Text style={styles.colQtyForStocks}>
                  {stockQty > 0
                    ? `${formatQuantity(stockQty)} ${line.unit || ""}`
                    : "-"}
                </Text>
                <Text style={styles.colTotalQty}>
                  {formatQuantity(totalQty)} {line.unit || ""}
                </Text>
                <Text style={styles.colUnitPrice}>
                  AED {formatMoney(unitPrice)}
                </Text>
                <Text style={styles.colTotalPrice}>
                  AED {formatMoney(lineTotal)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summaryTable}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SUBTOTAL</Text>
            <Text style={styles.summaryValue}>AED {formatMoney(subtotal)}</Text>
          </View>
          {discountRate > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                DISCOUNT ({discountRate}%)
              </Text>
              <Text style={styles.summaryValue}>
                - AED {formatMoney(discountAmount)}
              </Text>
            </View>
          )}
          {shipping > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>S&H</Text>
              <Text style={styles.summaryValue}>
                AED {formatMoney(shipping)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>VAT ({vatRate}%)</Text>
            <Text style={styles.summaryValue}>
              AED {formatMoney(vatAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>AED {formatMoney(total)}</Text>
        </View>
      </Page>
    </Document>
  );
}
