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

export type MaterialRow = {
  material_description: string;
  top_supplier: string;
  qty_order: number;
  avg_price: number;
  lowest_price: number;
  total_spent: number;
};

export type CategoryRow = {
  category_name: string;
  item_count: number;
  total_spent: number;
};

type Props = {
  materials: MaterialRow[];
  categories: CategoryRow[];
  dateLabel: string;
  totalItems: number;
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

// ── Shared styles ─────────────────────────────────────────────────────────────

const shared = StyleSheet.create({
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

  infoRow: { flexDirection: "row", marginBottom: 30, gap: 50 },
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

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.3,
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
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 7,
    color: "#333333",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #f0f0f0",
  },
  tableRowEven: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 7,
    color: "#333333",
    backgroundColor: "#f9f9f9",
    borderBottom: "1px solid #f0f0f0",
  },

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

// ── Summary page styles ───────────────────────────────────────────────────────

const sum = StyleSheet.create({
  colCategory: { flex: 1, paddingRight: 6 },
  colItems: { width: "18%", paddingRight: 6 },
  colSpent: { width: "25%", textAlign: "right" },
});

// ── Materials table styles ────────────────────────────────────────────────────

const mat = StyleSheet.create({
  colNum: { width: "4%", paddingRight: 4 },
  colMaterial: { width: "28%", paddingRight: 6 },
  colSupplier: { width: "22%", paddingRight: 6 },
  colQty: { width: "15%", paddingRight: 6 },
  colAvg: { width: "12%", paddingRight: 6 },
  colLowest: { width: "12%", paddingRight: 6 },
  colSpent: { width: "12%", textAlign: "right" },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function MaterialsPDF({
  materials,
  categories,
  dateLabel,
  totalItems,
}: Props) {
  const logo = "/icons/logo.jpg";

  return (
    <Document>
      {/* ── Page 1: Summary ────────────────────────────────────────────────── */}
      <Page size="A4" style={shared.page}>
        <View style={shared.header}>
          <Image src={logo} style={shared.logo} />
          <Text style={shared.title}>MATERIALS</Text>
        </View>

        <View style={shared.infoRow}>
          {/* <View>
            <Text style={shared.infoLabel}>Date</Text>
            <Text style={shared.infoValue}>{dateLabel || "-"}</Text>
          </View> */}
          <View>
            <Text style={shared.infoLabel}>Total MATERIALS</Text>
            <Text style={shared.infoValue}>
              {totalItems.toLocaleString("en-GB")}{" "}
              <Text style={shared.infoValue}>ITEMS</Text>
            </Text>
          </View>
        </View>

        <Text style={shared.sectionTitle}>Category Summary</Text>

        <View>
          <View style={shared.tableHeader}>
            <Text style={sum.colCategory}>Category</Text>
            <Text style={sum.colItems}>Total Items</Text>
            <Text style={sum.colSpent}>Total Spent</Text>
          </View>

          {categories.map((cat, index) => {
            const rowStyle =
              index % 2 === 0 ? shared.tableRowOdd : shared.tableRowEven;
            return (
              <View key={cat.category_name} style={rowStyle} wrap={false}>
                <Text style={sum.colCategory}>{cat.category_name || "-"}</Text>
                <Text style={sum.colItems}>
                  {cat.item_count.toLocaleString()}
                </Text>
                <Text style={sum.colSpent}>{formatAED(cat.total_spent)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={shared.companyLabel} fixed>
          RAYFITOUT
        </Text>
        <Text
          style={shared.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* ── Page 2+: Materials table ────────────────────────────────────────── */}
      <Page size="A4" style={shared.page}>
        <Text style={shared.sectionTitle}>Materials</Text>

        <View>
          <View style={shared.tableHeader}>
            <Text style={mat.colNum}>#</Text>
            <Text style={mat.colMaterial}>Material</Text>
            <Text style={mat.colSupplier}>Top Vendor</Text>
            <Text style={mat.colQty}>Qty Ordered</Text>
            <Text style={mat.colAvg}>Avg. Price</Text>
            <Text style={mat.colLowest}>Lowest Price</Text>
            <Text style={mat.colSpent}>Total Spent</Text>
          </View>

          {materials.map((row, index) => {
            const rowStyle =
              index % 2 === 0 ? shared.tableRowOdd : shared.tableRowEven;
            return (
              <View
                key={row.material_description}
                style={rowStyle}
                wrap={false}
              >
                <Text style={mat.colNum}>{index + 1}</Text>
                <Text style={mat.colMaterial}>
                  {row.material_description || "-"}
                </Text>
                <Text style={mat.colSupplier}>{row.top_supplier || "-"}</Text>
                <Text style={mat.colQty}>{row.qty_order.toLocaleString()}</Text>
                <Text style={{ ...mat.colAvg, color: "rgba(198, 169, 0, 1)" }}>
                  {formatAED(row.avg_price)}
                </Text>
                <Text
                  style={{ ...mat.colLowest, color: "rgba(2, 122, 70, 1)" }}
                >
                  {formatAED(row.lowest_price)}
                </Text>
                <Text style={mat.colSpent}>{formatAED(row.total_spent)}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
