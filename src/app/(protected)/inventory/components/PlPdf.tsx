import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  Svg,
  Line,
  Rect,
} from "@react-pdf/renderer";

Font.register({
  family: "Mont",
  src: "/fonts/Mont-Regular.otf",
});

Font.register({
  family: "Mont-SemiBold",
  src: "/fonts/Mont-SemiBold.otf",
});

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 60,
    fontFamily: "Mont",
    textTransform: "uppercase",
  },

  // Header Section
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

  // Info Row
  infoRow: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 25,
  },
  infoItem: {
    /* flex: 1, */
  },
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

  // Section Headers Row
  sectionHeadersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },

  // Section Header
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
    flex: 1,
  },

  // Dotted line between headers
  dottedLine: {
    width: 100,
    height: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // Two Column Layout
  twoColumn: {
    flexDirection: "row",
    gap: 125,
    marginBottom: 30,
  },
  column: {
    flex: 1,
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
    minHeight: 60,
    alignItems: "flex-start",
  },
  tableColPackageNo: {
    width: "17%",
  },
  tableColMarkAndNumbers: {
    width: "25%",
  },
  tableColDescription: {
    width: "35%",
  },
  tableColQuantity: {
    width: "20%",
  },
  tableColSerial: {
    width: "20%",
  },

  // Attachment Image Styles
  attachmentImage: {
    width: 40,
    height: 40,
    objectFit: "contain",
  },
  attachmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  attachmentWrapper: {
    width: 40,
    height: 40,
  },

  // Bottom Section
  bottomSection: {
    marginTop: 100,
  },

  // Signature Row - side by side layout
  signatureRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },

  // Left side - checkbox and text
  confirmationSection: {
    flex: 1,
  },

  // Signature Box
  signatureBox: {
    border: "1 solid rgba(217, 217, 217, 1)",
    borderRadius: 5,
    padding: 10,
    height: 100,
    width: 250,
    position: "relative",
  },

  // Confirmation Row
  confirmationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  confirmationText: {
    fontSize: 7,
    fontFamily: "Mont",
    color: "#000000",
    flex: 1,
    textTransform: "none",
  },

  signatureLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
  },
  receiverName: {
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    position: "absolute",
    bottom: 10,
    left: 10,
  },
});

type props = {
  transaction: any;
};

export function PlPdf({ transaction }: props) {
  const logo = "/icons/logo.jpg";
  const items = transaction?.items || [];

  // Calculate dynamic margin based on number of items
  const calculateBottomMargin = () => {
    const itemCount = items.length;
    const isIssue = transaction?.type?.toLowerCase().includes("issue");

    // Base margin
    let margin = isIssue ? 0 : 0;

    // Reduce margin by 30 for each additional item beyond 1
    if (itemCount > 1) {
      margin -= (itemCount - 1) * 30;
    }

    // Ensure margin doesn't go below 20
    return Math.max(margin, 20);
  };

  function formatQuantity(qty: number | string | undefined | null) {
    if (qty == null) return "0"; // handles undefined or null
    const num = Number(qty);
    if (isNaN(num)) return "0"; // fallback if it's not a valid number
    return Number.isInteger(num)
      ? num.toString()
      : num.toFixed(3).replace(/\.?0+$/, "");
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            PACKING <Text style={styles.titleBold}>LIST</Text>
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>INVOICE ID</Text>
            <Text style={styles.infoValue}>
              INV/-{String(transaction?.id).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRANSFER DATE</Text>
            <Text style={styles.infoValue}>
              {new Date(transaction?.created_on).toLocaleDateString("en-GB")}
            </Text>
          </View>
        </View>

        {/* Section Headers with Dotted Line */}
        <View style={styles.sectionHeadersRow}>
          <Text style={styles.sectionHeader}>FROM</Text>

          {/* Dotted Line */}
          <View style={styles.dottedLine}>
            <Svg height="2" width="100">
              <Line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                strokeWidth="1.5"
                stroke="#CCCCCC"
                strokeDasharray="2,3"
              />
            </Svg>
          </View>

          <Text style={styles.sectionHeader}>TO</Text>
        </View>

        {/* From and To Content */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>LOCATION</Text>
              <Text style={styles.infoValue}>{transaction?.from_location}</Text>
            </View>
          </View>
          <View style={styles.column}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>RECIPIENT</Text>
              <Text style={styles.infoValue}>{transaction?.receiver_name}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColPackageNo}>PACKAGE NO.</Text>
            <Text style={styles.tableColMarkAndNumbers}>MARKS & NUMBERS</Text>
            <Text style={styles.tableColDescription}>ITEM</Text>
            <Text style={styles.tableColQuantity}>QUANTITY</Text>
            <Text style={styles.tableColDescription}>SPECIFICATION</Text>
          </View>

          {/* Map through all items */}
          {items.length > 0 ? (
            items.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableColPackageNo}>1-{index + 1}</Text>
                <Text style={styles.tableColMarkAndNumbers}>
                  RF/PL/00{index + 1}
                </Text>
                <Text
                  style={styles.tableColDescription}
                  hyphenationCallback={(word) => [word]}
                >
                  {item.description}
                </Text>
                <Text style={styles.tableColQuantity}>
                  {formatQuantity(item.quantity)} {item.unit}
                </Text>
                <Text style={styles.tableColDescription}>
                  {item.specification}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={{ width: "100%", textAlign: "center" }}>
                No items found
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
