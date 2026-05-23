import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

Font.register({ family: "Mont",         src: "/fonts/Mont-Regular.otf" });
Font.register({ family: "Mont-SemiBold", src: "/fonts/Mont-SemiBold.otf" });
Font.register({ family: "Mont-Bold",    src: "/fonts/Mont-Bold.otf" });
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

const COL_NUM      = "5%";
const COL_CATEGORY = "20%";
const COL_SUB      = "20%";
const COL_MATERIAL = "45%";
const COL_UNIT     = "10%";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 24,
    paddingBottom: 60,
    fontFamily: "Mont",
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 34,
    objectFit: "contain",
  },
  titleBlock: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 16,
    fontFamily: "Mont-Bold",
    color: "#000000",
  },
  subtitle: {
    fontSize: 8,
    color: "#888888",
    marginTop: 3,
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#111111",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Mont-SemiBold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  rowOdd: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  rowEven: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cell: {
    fontSize: 7.5,
    color: "#222222",
    fontFamily: "Mont",
    paddingRight: 6,
  },
  cellBold: {
    fontSize: 7.5,
    color: "#000000",
    fontFamily: "Mont-SemiBold",
    paddingRight: 6,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 24,
    right: 24,
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

  // Sort by category → subcategory → material
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
          <View style={styles.titleBlock}>
            <Text style={styles.title}>MATERIAL LIST</Text>
            <Text style={styles.subtitle}>
              {sorted.length} items · Exported {exportDate}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: COL_NUM }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_CATEGORY }]}>Category</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_SUB }]}>Sub Category</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_MATERIAL }]}>Material</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_UNIT }]}>Unit</Text>
          </View>

          {/* Rows */}
          {sorted.map((item, idx) => {
            const rowStyle = idx % 2 === 0 ? styles.rowOdd : styles.rowEven;
            return (
              <View key={item.id} style={rowStyle}>
                <Text style={[styles.cell, { width: COL_NUM }]}>{idx + 1}</Text>
                <Text style={[styles.cell, { width: COL_CATEGORY }]}>{item.category_name || "-"}</Text>
                <Text style={[styles.cell, { width: COL_SUB }]}>{item.subcategory_name || "-"}</Text>
                <Text style={[styles.cellBold, { width: COL_MATERIAL }]}>{item.material_description}</Text>
                <Text style={[styles.cell, { width: COL_UNIT }]}>{item.unit || "-"}</Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>RAYFITOUT ERP · Material Library</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
