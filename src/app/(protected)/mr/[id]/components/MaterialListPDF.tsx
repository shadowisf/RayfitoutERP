import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

Font.register({ family: "Mont",          src: "/fonts/Mont-Regular.otf" });
Font.register({ family: "Mont-SemiBold", src: "/fonts/Mont-SemiBold.otf" });
Font.registerHyphenationCallback((word) => [word]);

export type MaterialListItem = {
  id: number;
  category_name: string;
  subcategory_name: string;
  material_description: string;
  unit: string | null;
};

type Props = {
  items: MaterialListItem[];
  exportDate: string;
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    fontFamily: "Mont",
  },

  // ── Header ────────────────────────────────────────────────────────────────
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

  // ── Info Row ──────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 30,
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

  // ── Table ─────────────────────────────────────────────────────────────────
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

  // ── Columns ───────────────────────────────────────────────────────────────
  colNum:      { width: "5%",  paddingRight: 4 },
  colCategory: { width: "20%", paddingRight: 4 },
  colSub:      { width: "20%", paddingRight: 4 },
  colMaterial: { width: "45%", paddingRight: 4 },
  colUnit:     { width: "10%", paddingRight: 4 },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#aaaaaa",
    fontFamily: "Mont",
  },
});

export function MaterialListPDF({ items, exportDate }: Props) {
  const logo = "/icons/logo.jpg";

  const sorted = [...items].sort((a, b) => {
    const catCmp = (a.category_name || "").localeCompare(b.category_name || "");
    if (catCmp !== 0) return catCmp;
    const subCmp = (a.subcategory_name || "").localeCompare(b.subcategory_name || "");
    if (subCmp !== 0) return subCmp;
    return (a.material_description || "").localeCompare(b.material_description || "");
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            MATERIAL <Text style={styles.titleBold}>LIST</Text>
          </Text>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View>
            <Text style={styles.infoLabel}>Export Date</Text>
            <Text style={styles.infoValue}>{exportDate}</Text>
          </View>
          <View>
            <Text style={styles.infoLabel}>Total Items</Text>
            <Text style={styles.infoValue}>{items.length.toLocaleString()}</Text>
          </View>
        </View>

        {/* Table */}
        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colCategory}>CATEGORY</Text>
            <Text style={styles.colSub}>SUBCATEGORY</Text>
            <Text style={styles.colMaterial}>MATERIAL</Text>
            <Text style={styles.colUnit}>UNIT</Text>
          </View>

          {sorted.map((item, idx) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <Text style={styles.colCategory}>{item.category_name || "-"}</Text>
              <Text style={styles.colSub}>{item.subcategory_name || "-"}</Text>
              <Text style={styles.colMaterial}>{item.material_description}</Text>
              <Text style={styles.colUnit}>{item.unit || "-"}</Text>
            </View>
          ))}
        </View>

      </Page>
    </Document>
  );
}
