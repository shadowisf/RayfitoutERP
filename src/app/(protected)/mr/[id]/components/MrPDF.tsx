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
import { MrLine } from "../types/mrLine";

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

Font.registerHyphenationCallback((word) => [word]);

// Define style keys type for column widths
type ColumnWidthKey =
  | "colNum"
  | "colItem"
  | "colItemWide"
  | "colItemFull"
  | "colRequestedQty"
  | "colRequestedQtyWide"
  | "colCategory"
  | "colSubCategory"
  | "colBrandSpecs"
  | "colAttachment";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 60,
    fontFamily: "Mont",
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

  // Section Title
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Mont-SemiBold",
    marginBottom: 10,
    marginTop: 10,
    color: "#000000",
  },

  // Table
  table: {
    marginBottom: 15,
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
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
    minHeight: 50,
  },
  tableRowEven: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
    backgroundColor: "#f5f5f5",
    border: "1px solid #f5f5f5",
    minHeight: 50,
  },
  tableRowOdd: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    border: "1px solid #f5f5f5",
    minHeight: 50,
  },

  // Base column widths
  colNum: {
    width: "4%",
    paddingRight: 4,
  },
  colCategory: {
    width: "15%",
    paddingRight: 4,
  },
  colSubCategory: {
    width: "15%",
    paddingRight: 4,
  },
  colItem: {
    width: "22%",
    paddingRight: 4,
  },
  colItemWide: {
    width: "32%",
    paddingRight: 4,
  },
  colItemFull: {
    width: "46%",
    paddingRight: 4,
  },
  colRequestedQty: {
    width: "10%",
    paddingRight: 4,
  },
  colRequestedQtyWide: {
    width: "12%",
    paddingRight: 4,
  },
  colBrandSpecs: {
    width: "18%",
    paddingRight: 4,
  },
  colAttachment: {
    width: "12%",
    paddingRight: 4,
  },

  // Attachment Image
  attachmentImage: {
    height: 40,
    objectFit: "contain",
  },
  attachmentContainer: {
    flexDirection: "row",
    gap: 3,
    flexWrap: "wrap",
  },
  attachmentWrapper: {
    height: 40,
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#000000",
    color: "#ffffff",
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 5,
    borderRadius: 10,
    alignSelf: "flex-end",
    width: 280,
    marginTop: 20,
  },
  summaryLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
  },

  // Page Number
  pageNumber: {
    position: "absolute",
    fontSize: 8,
    bottom: 20,
    right: 20,
    color: "#666666",
  },
});

type props = {
  mrHeader: MrHeader;
  mrLines: MrLine[];
};

export function MrPDF({ mrHeader, mrLines }: props) {
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

  const formatDate = (dateStr: string): string => {
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

  // Check if any lines have brand/specs (optional)
  const hasAnyBrandSpecs = mrLines.some(
    (line) =>
      (line.brand && line.brand.trim() !== "") ||
      (line.specification && line.specification.trim() !== ""),
  );

  // Check if any lines have attachments (optional)
  const hasAnyAttachments = mrLines.some(
    (line) =>
      line.attachment &&
      Array.isArray(line.attachment) &&
      line.attachment.length > 0 &&
      line.attachment.some((url) => url && url.trim() !== ""),
  );

  // Count how many optional columns are shown
  const optionalColumnCount = [hasAnyBrandSpecs, hasAnyAttachments].filter(
    Boolean,
  ).length;

  // Determine which column width keys to use based on how many optional columns
  const getItemColKey = (): ColumnWidthKey => {
    if (optionalColumnCount === 0) return "colItemFull";
    if (optionalColumnCount === 1) return "colItemWide";
    return "colItem";
  };

  const getQtyColKey = (): ColumnWidthKey => {
    if (optionalColumnCount === 0) return "colRequestedQtyWide";
    return "colRequestedQty";
  };

  const itemColKey = getItemColKey();
  const qtyColKey = getQtyColKey();

  // Calculate totals
  const totalItems = mrLines.length;
  const totalQuantity = mrLines.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    return sum + qty;
  }, 0);

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

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>MR NUMBER</Text>
            <Text style={styles.infoValue}>
              MR-{String(mrHeader.id).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>DATE</Text>
            <Text style={styles.infoValue}>
              {mrHeader.date_requested
                ? formatDate(mrHeader.date_requested)
                : new Date().toLocaleDateString("en-GB")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PROJECT</Text>
            <Text style={styles.infoValue}>{mrHeader.project_name || "-"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>REQUESTED BY</Text>
            <Text style={styles.infoValue}>{mrHeader.requested_by || "-"}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PURPOSE</Text>
            <Text style={styles.infoValue}>{mrHeader.purpose_name || "-"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>DEPARTMENT</Text>
            <Text style={styles.infoValue}>
              {mrHeader.department_name || "-"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>REQUIRED DATE</Text>
            <Text style={styles.infoValue}>
              {mrHeader.required_date
                ? formatDate(mrHeader.required_date)
                : "-"}
            </Text>
          </View>
        </View>

        {/* MR Lines Table */}
        <Text style={styles.sectionTitle}>MATERIAL(S)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colCategory}>CATEGORY</Text>
            <Text style={styles.colSubCategory}>SUBCATEGORY</Text>
            <Text style={styles[itemColKey]}>ITEM</Text>
            <Text style={styles[qtyColKey]}>QTY</Text>

            {hasAnyBrandSpecs && (
              <Text style={styles.colBrandSpecs}>BRAND & SPECS</Text>
            )}

            {hasAnyAttachments && (
              <Text style={styles.colAttachment}>ATTACHMENT(S)</Text>
            )}
          </View>

          {mrLines.map((line, index) => {
            const rowStyle =
              index % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven;

            return (
              <View key={line.id} style={rowStyle} wrap={false}>
                <Text style={styles.colNum}>{index + 1}</Text>

                <Text style={styles.colCategory}>
                  {line.material_category || "-"}
                </Text>

                <Text style={styles.colSubCategory}>
                  {line.material_subcategory || "-"}
                </Text>

                <Text
                  style={styles[itemColKey]}
                  hyphenationCallback={(word) => [word]}
                >
                  {line.material_description || "-"}
                </Text>

                <Text style={styles[qtyColKey]}>
                  {formatQuantity(line.quantity)} {line.unit || ""}
                </Text>

                {hasAnyBrandSpecs && (
                  <Text style={styles.colBrandSpecs}>
                    {line.brand || line.specification ? (
                      <>
                        {line.brand && `Brand: ${line.brand}`}
                        {line.brand && line.specification && ", "}
                        {line.specification && `Specs: ${line.specification}`}
                      </>
                    ) : (
                      "-"
                    )}
                  </Text>
                )}

                {hasAnyAttachments && (
                  <View style={styles.colAttachment}>
                    {line.attachment &&
                    Array.isArray(line.attachment) &&
                    line.attachment.length > 0 ? (
                      <View style={styles.attachmentContainer}>
                        {line.attachment.map((base64Url: string, i: number) => {
                          if (!base64Url || base64Url.trim() === "")
                            return null;

                          return (
                            <View key={i} style={styles.attachmentWrapper}>
                              <Image
                                src={base64Url}
                                style={styles.attachmentImage}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            TOTAL ITEMS: {totalItems} | TOTAL QTY:{" "}
            {formatQuantity(totalQuantity)}
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber }) => `${String(pageNumber).padStart(2, "0")}`}
          fixed
        />
      </Page>
    </Document>
  );
}
