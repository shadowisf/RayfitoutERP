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

export type TransactionRow = {
  id: number;
  mr_header_id: number;
  display_id: string;
  vendor_name: string;
  vendor_type: string;
  requester: string;
  project_name: string;
  total: number;
  paid_at: string | null;
  created_at: string;
};

type Props = {
  transactions: TransactionRow[];
  dateLabel: string;
  totalTransactions: number;
  totalValue: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAED(val: number): string {
  return (
    "AED " +
    val.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(raw: string | null): string {
  if (!raw) return "Pending";
  return new Date(raw)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 50,
    fontFamily: "Mont",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    width: 110,
    height: 36,
    objectFit: "contain",
  },
  title: {
    fontSize: 18,
    color: "#000000",
    fontFamily: "Mont-SemiBold",
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 50,
  },
  infoItem: {},
  infoLabel: {
    fontSize: 7,
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
  },
  infoValueLarge: {
    fontSize: 13,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
  },
  infoValueSub: {
    fontSize: 9,
    fontFamily: "Mont",
    color: "#000000",
  },

  // Section label
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  // Table
  table: {
    marginBottom: 10,
  },
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

  // Columns  (landscape A4 = ~841pt wide, usable ~800pt minus 40pt padding each side = 760)
  colLpo: { width: "13%", paddingRight: 6 },
  colVendor: { width: "22%", paddingRight: 6 },
  colRequester: { width: "14%", paddingRight: 6 },
  colProject: { width: "26%", paddingRight: 6 },
  colType: { width: "9%", paddingRight: 6 },
  colAmount: { width: "16%", paddingRight: 6 },
  colDate: { width: "12%" },

  // Footer
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

export function TransactionsPDF({
  transactions,
  dateLabel,
  totalTransactions,
  totalValue,
}: Props) {
  const logo = "/icons/logo.jpg";

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>TRANSACTIONS</Text>
        </View>
        {/* ── Info row ───────────────────────────────────────────────────────── */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{dateLabel || "-"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Total Transaction</Text>
            <Text style={styles.infoValue}>
              {totalTransactions.toLocaleString("en-GB")}{" "}
              <Text style={styles.infoValue}>TRANSACTIONS</Text>
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Total Value</Text>
            <Text style={styles.infoValue}>{formatAED(totalValue)}</Text>
          </View>
        </View>
        {/* ── Section label ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Transactions</Text>
        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.tableHeader}>
            <Text style={styles.colLpo}>LPO NUMBER</Text>
            <Text style={styles.colVendor}>Vendor</Text>
            <Text style={styles.colRequester}>Requester</Text>
            <Text style={styles.colProject}>Project</Text>
            <Text style={styles.colType}>Type</Text>
            <Text style={styles.colAmount}>Total Amount</Text>
            <Text style={styles.colDate}>Payment Date</Text>
          </View>

          {/* Data rows */}
          {transactions.map((tx, index) => {
            const rowStyle =
              index % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven;
            return (
              <View key={tx.id} style={rowStyle} wrap={false}>
                <Text style={styles.colLpo}>{tx.display_id}</Text>
                <Text style={styles.colVendor}>{tx.vendor_name || "-"}</Text>
                <Text style={styles.colRequester}>{tx.requester || "-"}</Text>
                <Text style={styles.colProject}>{tx.project_name || "-"}</Text>
                <Text style={styles.colType}>
                  {tx.vendor_type
                    ? tx.vendor_type.charAt(0).toUpperCase() +
                      tx.vendor_type.slice(1).toLowerCase()
                    : "-"}
                </Text>
                <Text style={styles.colAmount}>{formatAED(tx.total)}</Text>
                <Text style={styles.colDate}>{formatDate(tx.paid_at)}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
