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

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
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
  },
  tableColIndex: {
    width: "5%",
  },
  tableColDescription: {
    width: "50%",
  },
  tableColBatchID: {
    width: "17.5%",
  },
  tableColQuantity: {
    width: "25%",
  },

  // Bottom Section
  bottomSection: {
    marginTop: 275,
  },

  // Signature Box
  signatureBox: {
    border: "1 solid rgba(217, 217, 217, 1)",
    borderRadius: 5,
    padding: 10,
    height: 150,
    position: "relative",
    width: "50%",
  },

  // Confirmation Row
  confirmationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  confirmationText: {
    fontSize: 7,
    fontFamily: "Mont",
    color: "#000000",
    flex: 1,
    maxWidth: 300,
  },

  signatureLabel: {
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
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

type TsnPDFProps = {
  transaction: any;
};

export function TsnPDF({ transaction }: TsnPDFProps) {
  const logo = "/icons/logo.jpg";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            TRANSFER STOCK <Text style={styles.titleBold}>NOTE</Text>
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRANSFER ID</Text>
            <Text style={styles.infoValue}>
              TR-{String(transaction?.id).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRANSFER DATE</Text>
            <Text style={styles.infoValue}>
              {new Date(transaction?.created_on).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRANSFER TYPE</Text>
            <Text style={styles.infoValue}>{transaction?.type}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PURPOSE OF TRANSFER</Text>
            <Text style={styles.infoValue}>{transaction?.purpose}</Text>
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
            <Text style={styles.infoLabel}>LOCATION</Text>
            <Text style={styles.infoValue}>{transaction?.from_location}</Text>
          </View>
          <View style={styles.column}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>LOCATION</Text>
              <Text style={styles.infoValue}>
                {transaction?.to_location || "-"}
              </Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>RECEIVER</Text>
              <Text style={styles.infoValue}>
                {transaction?.full_name_of_receiver}
              </Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColIndex}>#</Text>
            <Text style={styles.tableColDescription}>MATERIAL DESCRIPTION</Text>
            <Text style={styles.tableColBatchID}>BATCH ID</Text>
            <Text style={styles.tableColQuantity}>QUANTITY TRANSFERRED</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColIndex}>1</Text>
            <Text style={styles.tableColDescription}>
              {transaction?.description}
            </Text>
            <Text style={styles.tableColBatchID}>
              BA-{String(transaction?.batch_id).padStart(5, "0")}
            </Text>
            <Text style={styles.tableColQuantity}>
              {transaction?.quantity} {transaction?.unit}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.confirmationRow}>
            <Svg height="16" width="16">
              <Rect
                x="1"
                y="1"
                width="14"
                height="14"
                fill="#10b981" // green background
                rx="3"
                ry="3"
              />
              <Line
                x1="4"
                y1="8"
                x2="7"
                y2="11"
                stroke="white"
                strokeWidth="1.5"
              />
              <Line
                x1="7"
                y1="11"
                x2="12"
                y2="5"
                stroke="white"
                strokeWidth="1.5"
              />
            </Svg>

            <Text style={styles.confirmationText}>
              I confirm that I have received the above-mentioned
              equipment/tool(s).{"\n"}I understand that I am responsible for
              this and if anything is stolen and I have not adhered to this, I
              may be liable for some/all of the costs.
            </Text>
          </View>
        </View>

        {/* Bottom Section - Signature */}
        <View>
          {/* Signature Box */}
          <View style={styles.signatureBox}>
            {/* Confirmation Checkbox and Text - AT THE TOP */}

            <Text style={styles.signatureLabel}>ELECTRONIC SIGNATURE</Text>
            <Text style={styles.receiverName}>
              {transaction?.full_name_of_receiver || ""}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
