import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import { MrHeader } from "../types/mrHeader";

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
  },
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
  infoRow: {
    flexDirection: "row",
    marginBottom: 20,
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
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: "8 12",
    fontSize: 7,
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
  colNum: {
    width: "4%",
    paddingRight: 2,
  },
  colScope: {
    width: "14%",
    paddingRight: 4,
  },
  colDescription: {
    width: "20%",
    paddingRight: 4,
  },
  colBoqRef: {
    width: "10%",
    paddingRight: 4,
  },
  colOrderedQty: {
    width: "10%",
    paddingRight: 4,
  },
  colCompletedQty: {
    width: "12%",
    paddingRight: 4,
  },
  colRetention: {
    width: "10%",
    paddingRight: 4,
  },
  colTotalPrice: {
    width: "12%",
    paddingRight: 4,
    textAlign: "right",
  },
  colAttachment: {
    width: "8%",
    paddingRight: 2,
  },
  summaryTable: {
    border: "1 solid #e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10,
    width: "50%",
    alignSelf: "flex-end",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingTop: 5,
    paddingBottom: 2,
    paddingRight: 10,
    fontSize: 8,
    borderBottom: "1 solid #e0e0e0",
  },
  summaryRowLast: {
    borderBottom: "none",
  },
  summaryLabel: {
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    fontSize: 8,
  },
  summaryValue: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
    textAlign: "right",
  },
  totalRow: {
    backgroundColor: "#000000",
    color: "#ffffff",
    paddingLeft: 10,
    paddingTop: 5,
    paddingBottom: 2,
    paddingRight: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 5,
  },
  totalLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
  },
  totalValue: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
    textAlign: "right",
  },
  attachmentPage: {
    backgroundColor: "#ffffff",
    padding: 20,
    fontFamily: "Mont",
  },
  attachmentHeader: {
    fontSize: 14,
    fontFamily: "Mont-SemiBold",
    marginBottom: 15,
  },
  attachmentLineHeader: {
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    marginBottom: 8,
    marginTop: 10,
    color: "#333333",
  },
  attachmentImage: {
    maxWidth: "100%",
    maxHeight: 300,
    objectFit: "contain",
    marginBottom: 10,
  },
  attachmentLink: {
    fontSize: 8,
    color: "#0066cc",
    marginBottom: 5,
  },
});

export type PrPDFLine = {
  id: number;
  jo_line_id: number;
  job_scope_name: string;
  job_description: string;
  boq_item_numbers: string;
  quantity: number;
  unit: string;
  completed_qty: number;
  retention: number;
  approved_total_price: number;
  attachment: string | null;
};

type PrPDFProps = {
  mrHeader: MrHeader;
  prLines: PrPDFLine[];
};

const parseAttachments = (attachment: any): string[] => {
  if (!attachment) return [];
  if (Array.isArray(attachment)) return attachment;
  if (typeof attachment === "string") {
    try {
      const parsed = JSON.parse(attachment);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const isImageUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.includes("image")
  );
};

const formatMoney = (value: number | string): string => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatNumber = (value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return "0";
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(3)).toString();
};

export function PrPDF({ mrHeader, prLines }: PrPDFProps) {
  const logo = "/icons/logo.jpg";

  const formattedId = `PR-${String(mrHeader.id).padStart(5, "0")}`;
  const joRefId = mrHeader.payment_jo_reference_id
    ? `JO-${String(mrHeader.payment_jo_reference_id).padStart(5, "0")}`
    : "-";

  const subtotalBeforeRetention = prLines.reduce(
    (sum, l) => sum + (Number(l.approved_total_price) || 0),
    0,
  );

  const totalRetention = prLines.reduce((sum, l) => {
    const orderedQty = l.quantity || 0;
    const completedQty = l.completed_qty || 0;
    const retentionPct =
      orderedQty > 0
        ? Math.min((completedQty / orderedQty) * 100, 100)
        : 0;
    const lineTotal = Number(l.approved_total_price) || 0;
    return sum + lineTotal * (retentionPct / 100);
  }, 0);

  const subtotalAfterRetention = subtotalBeforeRetention - totalRetention;

  // Collect all attachment data for image pages
  const linesWithAttachments = prLines
    .map((line, index) => ({
      lineIndex: index + 1,
      scope: line.job_scope_name || "-",
      attachments: parseAttachments(line.attachment),
    }))
    .filter((l) => l.attachments.length > 0);

  const imageAttachments = linesWithAttachments.flatMap((l) =>
    l.attachments
      .filter((url) => isImageUrl(url))
      .map((url) => ({
        lineIndex: l.lineIndex,
        scope: l.scope,
        url,
      })),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            PAYMENT <Text style={styles.titleBold}>REQUEST</Text>
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {new Date(mrHeader.date_requested).toLocaleDateString("en-GB")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PR Number</Text>
            <Text style={styles.infoValue}>{formattedId}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>JO Reference</Text>
            <Text style={styles.infoValue}>{joRefId}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Project</Text>
            <Text style={styles.infoValue}>{mrHeader.project_name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Requested By</Text>
            <Text style={styles.infoValue}>{mrHeader.requested_by}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{mrHeader.department_name}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colScope}>SCOPE</Text>
            <Text style={styles.colDescription}>DESCRIPTION</Text>
            <Text style={styles.colBoqRef}>BOQ REF.</Text>
            <Text style={styles.colOrderedQty}>ORDERED QTY</Text>
            <Text style={styles.colCompletedQty}>COMPLETED QTY</Text>
            <Text style={styles.colRetention}>RETENTION (%)</Text>
            <Text style={styles.colTotalPrice}>TOTAL PRICE</Text>
            <Text style={styles.colAttachment}>ATTACH.</Text>
          </View>

          {prLines.map((line, index) => {
            const orderedQty = line.quantity || 0;
            const completedQty = line.completed_qty || 0;
            const retention =
              orderedQty > 0
                ? Math.min((completedQty / orderedQty) * 100, 100)
                : 0;
            const lineAttachments = parseAttachments(line.attachment);

            return (
              <View style={styles.tableRow} key={line.id} wrap={false}>
                <Text style={styles.colNum}>{index + 1}</Text>
                <Text style={styles.colScope}>
                  {line.job_scope_name || "-"}
                </Text>
                <Text style={styles.colDescription}>
                  {line.job_description || "-"}
                </Text>
                <Text style={styles.colBoqRef}>
                  {line.boq_item_numbers || "-"}
                </Text>
                <Text style={styles.colOrderedQty}>
                  {formatNumber(orderedQty)} {line.unit}
                </Text>
                <Text style={styles.colCompletedQty}>
                  {formatNumber(completedQty)} {line.unit}
                </Text>
                <Text style={styles.colRetention}>{retention.toFixed(1)}%</Text>
                <Text style={styles.colTotalPrice}>
                  {Number(line.approved_total_price) > 0
                    ? `AED ${formatMoney(line.approved_total_price)}`
                    : "-"}
                </Text>
                <Text style={styles.colAttachment}>
                  {lineAttachments.length > 0
                    ? `${lineAttachments.length} file${lineAttachments.length > 1 ? "s" : ""}`
                    : "-"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summaryTable}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Before Retention</Text>
            <Text style={styles.summaryValue}>
              AED {formatMoney(subtotalBeforeRetention)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Retention</Text>
            <Text style={styles.summaryValue}>
              - AED {formatMoney(totalRetention)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>Subtotal After Retention</Text>
            <Text style={styles.summaryValue}>
              AED {formatMoney(subtotalAfterRetention)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>
              AED {formatMoney(subtotalAfterRetention)}
            </Text>
          </View>
        </View>
      </Page>

      {/* Attachment pages — display images inline */}
      {imageAttachments.length > 0 && (
        <Page size="A4" style={styles.attachmentPage}>
          <Text style={styles.attachmentHeader}>Attachments</Text>
          {imageAttachments.map((att, i) => (
            <View key={i} wrap={false}>
              <Text style={styles.attachmentLineHeader}>
                Line {att.lineIndex} — {att.scope}
              </Text>
              <Image src={att.url} style={styles.attachmentImage} />
            </View>
          ))}
        </Page>
      )}
    </Document>
  );
}
