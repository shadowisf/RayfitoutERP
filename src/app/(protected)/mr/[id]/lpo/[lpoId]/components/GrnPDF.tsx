import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

Font.register({
  family: "Mont",
  src: "/fonts/Mont-Regular.otf",
});

Font.register({
  family: "Mont-SemiBold",
  src: "/fonts/Mont-SemiBold.otf",
});

Font.register({
  family: "Mont-Bold",
  src: "/fonts/Mont-Bold.otf",
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
    marginBottom: 30,
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
  titleLight: {
    color: "#999999",
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 30,
  },
  infoItem: {},
  infoLabel: {
    fontSize: 8,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
  },

  // Section Header (black pill)
  sectionHeader: {
    backgroundColor: "#000000",
    color: "#ffffff",
    paddingTop: 6,
    paddingBottom: 3,
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    borderRadius: 25,
    textAlign: "center",
    marginBottom: 15,
    marginTop: 10,
  },

  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: "8 12",
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: "8 12",
    borderBottom: "1 solid #e0e0e0",
    fontSize: 8,
    color: "#333333",
    minHeight: 50,
    alignItems: "center",
  },

  // Table columns
  colNumber: {
    width: "4%",
    paddingRight: 4,
  },
  colMaterial: {
    width: "26%",
    paddingRight: 4,
  },
  colBoqRef: {
    width: "10%",
    paddingRight: 4,
  },
  colOrderedQty: {
    width: "15%",
    paddingRight: 4,
  },
  colReceivedQty: {
    width: "15%",
    paddingRight: 4,
  },
  colNotes: {
    width: "14%",
    paddingRight: 4,
  },
  colAttachment: {
    width: "16%",
    alignItems: "center",
    justifyContent: "center",
  },

  // Quantity match indicators
  matchIndicator: {
    fontSize: 10,
    marginLeft: 4,
  },
  matchGreen: {
    color: "#2E7D32",
  },
  matchRed: {
    color: "#D32F2F",
  },

  // Received qty container
  receivedQtyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Attachment image
  attachmentImage: {
    width: 80,
    height: 80,
    objectFit: "cover",
    borderRadius: 4,
  },

  // Footer note
  footerNote: {
    fontSize: 8,
    color: "#D32F2F",
    marginTop: 10,
  },
});

export type GrnData = {
  grn_id: number;
  lpo_id: number;
  lpo_number: string;
  mr_header_id: number;
  mr_number: string;
  vendor_name: string;
  delivery_date: string;
  received_date: string;
  received_by: string;
  items: {
    material_description: string;
    boq_ref: string | null;
    ordered_qty: number;
    received_qty: number;
    unit: string;
    unit_price: number | null;
    total_price: number | null;
    notes: string | null;
    attachment_image: string | null; // base64 data URL
  }[];
};

export function GrnPDF({ data }: { data: GrnData }) {
  const logo = "/icons/logo.jpg";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .toUpperCase();
  };

  const formatQuantity = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) return num.toLocaleString("en-US");
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  };

  const hasExcessQuantity = data.items.some(
    (item) => item.received_qty > item.ordered_qty,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            <Text>GOOD RECEIVED</Text>{" "}
            <Text style={styles.titleBold}>NOTE</Text>
          </Text>
        </View>

        {/* First Info Row: GRN NO, LPO NUMBER, MR NUMBER, VENDOR */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>GRN NUMBER</Text>
            <Text style={styles.infoValue}>
              GRN-{String(data.grn_id).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LPO NUMBER</Text>
            <Text style={styles.infoValue}>{data.lpo_number}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>MR NUMBER</Text>
            <Text style={styles.infoValue}>{data.mr_number}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>VENDOR</Text>
            <Text style={styles.infoValue}>{data.vendor_name}</Text>
          </View>
        </View>

        {/* Second Info Row: DELIVERY DATE, RECEIVED DATE, RECEIVED BY */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>DELIVERY DATE</Text>
            <Text style={styles.infoValue}>
              {new Date(data.delivery_date).toLocaleDateString("en-GB")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>RECEIVED DATE</Text>
            <Text style={styles.infoValue}>
              {new Date(data.received_date).toLocaleDateString("en-GB")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>RECEIVED BY</Text>
            <Text style={styles.infoValue}>{data.received_by}</Text>
          </View>
        </View>

        <Text style={{ ...styles.infoValue, marginBottom: 10, marginTop: 30 }}>
          ITEM(S)
        </Text>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNumber}>#</Text>
            <Text style={styles.colMaterial}>ITEM</Text>
            <Text style={styles.colBoqRef}>BOQ REF.</Text>
            <Text style={styles.colOrderedQty}>ORDERED QTY</Text>
            <Text style={styles.colReceivedQty}>RECEIVED QTY</Text>
            <Text style={styles.colNotes}>NOTES</Text>
            <Text style={styles.colAttachment}>ATTACHMENT(S)</Text>
          </View>

          {data.items.map((item, index) => {
            const qtyMatch = item.received_qty === item.ordered_qty;

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colNumber}>{index + 1}</Text>
                <Text style={styles.colMaterial}>
                  {item.material_description}
                </Text>
                <Text style={styles.colBoqRef}>{item.boq_ref || "-"}</Text>
                <Text style={styles.colOrderedQty}>
                  {formatQuantity(item.ordered_qty)} {item.unit}
                </Text>
                <View
                  style={[styles.colReceivedQty, styles.receivedQtyContainer]}
                >
                  <Text>
                    {formatQuantity(item.received_qty)} {item.unit}
                  </Text>
                  {qtyMatch ? (
                    <Text style={[styles.matchIndicator, styles.matchGreen]}>
                      {"\u2713"}
                    </Text>
                  ) : (
                    <Text style={[styles.matchIndicator, styles.matchRed]}>
                      {"\u26A0"}
                    </Text>
                  )}
                </View>
                <Text style={styles.colNotes}>{item.notes || "-"}</Text>
                <View style={styles.colAttachment}>
                  {item.attachment_image ? (
                    <Image
                      src={item.attachment_image}
                      style={styles.attachmentImage}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer note for excess quantity */}
        {hasExcessQuantity && (
          <Text style={styles.footerNote}>
            {"\u26A0"} Excess quantity beyond the request
          </Text>
        )}
      </Page>
    </Document>
  );
}
