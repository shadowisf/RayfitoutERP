import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

Font.register({ family: "Mont", src: "/fonts/Mont-Regular.otf" });
Font.register({ family: "Mont-SemiBold", src: "/fonts/Mont-SemiBold.otf" });
Font.register({ family: "Mont-Bold", src: "/fonts/Mont-Bold.otf" });
Font.registerHyphenationCallback((word) => [word]);

// ── Types ─────────────────────────────────────────────────────────────────────

export type VendorRow = {
  supplier_id: number;
  supplier_name: string;
  payment_type: string;
  total_lpos: number;
  amount: number;
};

type Props = {
  vendors: VendorRow[];
  dateLabel: string;
  totalVendors: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAED(val: number): string {
  return (
    val.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " AED"
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 50,
    fontFamily: "Mont",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  logo: { width: 110, height: 36, objectFit: "contain" },
  title: { fontSize: 18, color: "#000000", fontFamily: "Mont-SemiBold" },

  infoRow: { flexDirection: "row", marginBottom: 24, gap: 50 },
  infoLabel: {
    fontSize: 7,
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  infoValue: { fontSize: 9, fontFamily: "Mont-SemiBold", color: "#000000" },
  infoValueLarge: {
    fontSize: 13,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
  },
  infoValueSub: { fontSize: 9, fontFamily: "Mont", color: "#000000" },

  sectionTitle: {
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },

  table: { marginBottom: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 7,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },
  tableRowOdd: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 7,
    color: "#333333",
    backgroundColor: "#ffffff",
  },
  tableRowEven: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 7,
    color: "#333333",
    backgroundColor: "#f9f9f9",
  },

  colNum: { width: "5%", paddingRight: 4 },
  colVendor: { width: "42%", paddingRight: 6 },
  colLpos: { width: "13%", paddingRight: 6 },
  colType: { width: "15%", paddingRight: 6 },
  colAmount: { width: "25%", textAlign: "right" },

  pageNumber: {
    position: "absolute",
    fontSize: 7,
    bottom: 18,
    right: 20,
    color: "#999999",
  },
  companyLabel: {
    position: "absolute",
    fontSize: 7,
    bottom: 18,
    left: 20,
    color: "#999999",
    fontFamily: "Mont-SemiBold",
  },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function VendorsPDF({ vendors, dateLabel, totalVendors }: Props) {
  const logo = "/icons/logo.jpg";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>VENDORS</Text>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          {/* <View>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{dateLabel || "-"}</Text>
          </View> */}
          <View>
            <Text style={styles.infoLabel}>Total VENDORS</Text>
            <Text style={styles.infoValue}>
              {totalVendors.toLocaleString("en-GB")}{" "}
              <Text style={styles.infoValueSub}>VENDORS</Text>
            </Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={styles.sectionTitle}>Transactions</Text>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colVendor}>Vendors</Text>
            <Text style={styles.colLpos}>Total LPOs</Text>
            <Text style={styles.colType}>Type</Text>
            <Text style={styles.colAmount}>Total Spent</Text>
          </View>

          {vendors.map((v, index) => {
            const rowStyle =
              index % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven;
            return (
              <View key={v.supplier_id} style={rowStyle} wrap={false}>
                <Text style={styles.colNum}>{index + 1}</Text>
                <Text style={styles.colVendor}>{v.supplier_name || "-"}</Text>
                <Text style={styles.colLpos}>
                  {v.total_lpos.toLocaleString()}
                </Text>
                <Text style={styles.colType}>
                  {v.payment_type
                    ? v.payment_type.charAt(0).toUpperCase() +
                      v.payment_type.slice(1).toLowerCase()
                    : "-"}
                </Text>
                <Text style={styles.colAmount}>{formatAED(v.amount)}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
