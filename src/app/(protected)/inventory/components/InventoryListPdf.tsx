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

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 40,
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
    fontFamily: "Mont-SemiBold",
  },

  // Info Row (active filters)
  infoRow: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 25,
    flexWrap: "wrap",
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
    textTransform: "uppercase",
  },

  // Table
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: "8 12",
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },
  tableRowOdd: {
    flexDirection: "row",
    padding: "6 12",
    fontSize: 8,
    color: "#333333",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #f0f0f0",
    minHeight: 40,
  },
  tableRowEven: {
    flexDirection: "row",
    padding: "6 12",
    fontSize: 8,
    color: "#333333",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderBottom: "1px solid #f0f0f0",
    minHeight: 40,
  },

  // Column widths
  colNum: {
    width: "5%",
    paddingRight: 4,
  },
  colItemNumber: {
    width: "15%",
    paddingRight: 4,
    fontFamily: "Mont-SemiBold",
  },
  colMaterial: {
    width: "45%",
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colTotalQty: {
    width: "15%",
    paddingRight: 4,
    fontFamily: "Mont-SemiBold",
  },
  colStatus: {
    width: "20%",
    paddingRight: 4,
  },

  // Status pills
  statusPill: {
    paddingBottom: 3,
    paddingTop: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    fontSize: 7,
    fontFamily: "Mont-SemiBold",
    textAlign: "center",
    alignSelf: "flex-start",
  },

  // Material image
  materialImage: {
    width: 30,
    height: 30,
    objectFit: "cover",
    borderRadius: 3,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#999999",
  },

  // Date
  dateText: {
    fontSize: 8,
    color: "#666666",
  },

  titleBold: {
    fontFamily: "Mont-SemiBold",
  },
});

type InventoryListItem = {
  id: number;
  description: string;
  image: string | null;
  imageBase64?: string | null;
  unit: string;
  availableQty: number;
  minimumStockQuantity: number;
};

type ActiveFilters = {
  subcategories?: string[];
  stockAddedIn?: string;
  stockStatuses?: string[];
  projects?: string[];
  locations?: string[];
};

type InventoryListPdfProps = {
  items: InventoryListItem[];
  activeFilters: ActiveFilters;
  generatedDate: string;
};

function getStockStatus(availableQty: number, minimumStock: number) {
  if (availableQty === 0) {
    return {
      label: "EMPTY STOCK",
      bgColor: "rgba(255, 181, 181, 1)",
      textColor: "rgba(248, 77, 77, 1)",
    };
  } else if (availableQty <= minimumStock) {
    return {
      label: "LOW STOCK",
      bgColor: "rgba(255, 250, 189, 1)",
      textColor: "rgba(134, 83, 47, 1)",
    };
  } else {
    return {
      label: "IN-STOCK",
      bgColor: "rgba(149, 222, 189, 1)",
      textColor: "rgba(0, 108, 60, 1)",
    };
  }
}

export function InventoryListPdf({
  items,
  activeFilters,
  generatedDate,
}: InventoryListPdfProps) {
  const hasFilters =
    (activeFilters.subcategories && activeFilters.subcategories.length > 0) ||
    (activeFilters.stockAddedIn && activeFilters.stockAddedIn !== "all") ||
    (activeFilters.stockStatuses && activeFilters.stockStatuses.length > 0) ||
    (activeFilters.projects && activeFilters.projects.length > 0) ||
    (activeFilters.locations && activeFilters.locations.length > 0);

  // Split items into chunks for pagination (fit ~25 items per page)
  const ITEMS_PER_PAGE = 25;
  const pages: InventoryListItem[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <Document>
      {pages.map((pageItems, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header - only on first page */}
          {pageIndex === 0 && (
            <>
              <View style={styles.header}>
                <Image style={styles.logo} src="/icons/logo.jpg" />
                <Text style={styles.title}>
                  INVENTORY <Text style={styles.titleBold}>LIST</Text>
                </Text>
              </View>

              {/* Active Filters */}
              {hasFilters && (
                <View style={styles.infoRow}>
                  {activeFilters.subcategories &&
                    activeFilters.subcategories.length > 0 && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>SUBCATEGORIES</Text>
                        <Text style={styles.infoValue}>
                          {activeFilters.subcategories.join(", ")}
                        </Text>
                      </View>
                    )}

                  {activeFilters.stockAddedIn &&
                    activeFilters.stockAddedIn !== "all" && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>STOCK ADDED IN</Text>
                        <Text style={styles.infoValue}>
                          {activeFilters.stockAddedIn}
                        </Text>
                      </View>
                    )}

                  {activeFilters.stockStatuses &&
                    activeFilters.stockStatuses.length > 0 && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>STOCK STATUS</Text>
                        <Text style={styles.infoValue}>
                          {activeFilters.stockStatuses.join(", ")}
                        </Text>
                      </View>
                    )}

                  {activeFilters.projects &&
                    activeFilters.projects.length > 0 && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>PROJECTS</Text>
                        <Text style={styles.infoValue}>
                          {activeFilters.projects.join(", ")}
                        </Text>
                      </View>
                    )}

                  {activeFilters.locations &&
                    activeFilters.locations.length > 0 && (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>LOCATION</Text>
                        <Text style={styles.infoValue}>
                          {activeFilters.locations.join(", ")}
                        </Text>
                      </View>
                    )}
                </View>
              )}
            </>
          )}

          {/* Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.colNum}>#</Text>
              <Text style={styles.colItemNumber}>ITEM NUMBER</Text>
              <View style={styles.colMaterial}>
                <Text>MATERIAL</Text>
              </View>
              <Text style={styles.colTotalQty}>TOTAL QTY</Text>
              <Text style={styles.colStatus}>STATUS</Text>
            </View>

            {/* Table Rows */}
            {pageItems.map((item, index) => {
              const globalIndex = pageIndex * ITEMS_PER_PAGE + index;
              const status = getStockStatus(
                item.availableQty,
                item.minimumStockQuantity,
              );
              const rowStyle =
                index % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven;

              return (
                <View key={item.id} style={rowStyle} wrap={false}>
                  <Text style={styles.colNum}>{globalIndex + 1}</Text>
                  <Text style={styles.colItemNumber}>
                    INV-{String(item.id).padStart(5, "0")}
                  </Text>
                  <View style={styles.colMaterial}>
                    {item.imageBase64 ? (
                      <Image
                        style={styles.materialImage}
                        src={item.imageBase64}
                      />
                    ) : null}
                    <Text style={{ flex: 1 }}>{item.description}</Text>
                  </View>
                  <Text style={styles.colTotalQty}>
                    {item.availableQty} {item.unit || ""}
                  </Text>
                  <View style={styles.colStatus}>
                    <Text
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: status.bgColor,
                          color: status.textColor,
                        },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>
              );
            })}

            {pageItems.length === 0 && (
              <View style={styles.tableRowOdd}>
                <Text
                  style={{ width: "100%", textAlign: "center", fontSize: 9 }}
                >
                  No items found.
                </Text>
              </View>
            )}
          </View>
        </Page>
      ))}
    </Document>
  );
}
