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
import { JoLine } from "../types/joLine";

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

// Attachment type labels
const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  design_drawings: "Design & drawings",
  hse_compliance: "HSE & compliance",
  scope_pricing: "Scope & pricing",
  contract_commercial: "Contract & commercial",
  technical_specifications: "Technical specifications",
  surveys_existing_conditions: "Surveys & existing conditions",
  programme_logistics: "Programme & logistics",
  prequalification_admin: "Pre-qualification & admin",
};

// Image extensions for checking if an attachment is an image
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
];

const isImageUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext));
};

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
    fontSize: 7,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },
  tableRowEven: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
    backgroundColor: "#f5f5f5",
    minHeight: 50,
  },
  tableRowOdd: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    minHeight: 50,
  },

  // Column widths
  colNum: {
    width: "4%",
    paddingRight: 2,
  },
  colScope: {
    width: "10%",
    paddingRight: 4,
  },
  colContractType: {
    width: "13%",
    paddingRight: 4,
  },
  colDescription: {
    width: "20%",
    paddingRight: 4,
  },
  colBoqRef: {
    width: "8%",
    paddingRight: 4,
  },
  colSubWorksValue: {
    width: "13%",
    paddingRight: 4,
  },
  colBudget: {
    width: "13%",
    paddingRight: 4,
  },
  colTotalPrice: {
    width: "13%",
    paddingRight: 4,
  },
  colAttachment: {
    width: "16%",
    paddingRight: 4,
  },

  // Attachment styles
  attachmentContainer: {
    flexDirection: "column",
    gap: 4,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  attachmentLabel: {
    fontSize: 6,
    fontFamily: "Mont-SemiBold",
    color: "#666666",
  },
  attachmentImage: {
    height: 30,
    objectFit: "contain",
  },
  attachmentWrapper: {
    height: 30,
  },
  attachmentFileName: {
    fontSize: 5,
    color: "#333333",
    maxWidth: 80,
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
  joLines: JoLine[];
  showPrices?: boolean;
};

export function JoPDF({ mrHeader, joLines, showPrices = true }: props) {
  const logo = "/icons/logo.jpg";

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

  const formatMoney = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num) || num === 0) return "-";
    return `AED ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Check if any lines have typed attachments
  const hasAnyAttachments = joLines.some(
    (line) => line.jo_attachments && line.jo_attachments.length > 0,
  );

  // Check if any lines have budget
  const hasAnyBudget =
    showPrices &&
    joLines.some(
      (line) =>
        line.budget_estimate != null && Number(line.budget_estimate) > 0,
    );

  // Check if any lines have sub-contracted works value
  const hasAnySubWorksValue =
    showPrices &&
    joLines.some(
      (line) =>
        line.subcontracted_works_value != null &&
        Number(line.subcontracted_works_value) > 0,
    );

  // Check if any lines have approved total price (post-quotation)
  const hasAnyApprovedPrice =
    showPrices &&
    joLines.some(
      (line) =>
        line.approved_total_price != null &&
        Number(line.approved_total_price) > 0,
    );

  // Calculate totals
  const totalBudget = joLines.reduce(
    (sum, line) => sum + (Number(line.budget_estimate) || 0),
    0,
  );

  const totalApprovedPrice = joLines.reduce(
    (sum, line) => sum + (Number(line.approved_total_price) || 0),
    0,
  );

  // Use approved price subtotal if available, otherwise budget
  const useApprovedPrice = hasAnyApprovedPrice && totalApprovedPrice > 0;
  const subtotalValue = useApprovedPrice ? totalApprovedPrice : totalBudget;
  const subtotalLabel = useApprovedPrice ? "SUBTOTAL" : "SUBTOTAL (BUDGET)";
  const showSubtotal =
    showPrices && (hasAnyBudget || hasAnyApprovedPrice) && subtotalValue > 0;

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            JOB <Text style={styles.titleBold}>ORDER</Text>
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>JO NUMBER</Text>
            <Text style={styles.infoValue}>
              JO-{String(mrHeader.id).padStart(5, "0")}
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

        {/* JO Lines Table */}
        <Text style={styles.sectionTitle}>JOB ITEM(S)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colScope}>SCOPE</Text>
            <Text style={styles.colContractType}>CONTRACT TYPE</Text>
            <Text style={styles.colDescription}>DESCRIPTION</Text>
            {hasAnySubWorksValue && (
              <Text style={styles.colSubWorksValue}>WORKS VALUE</Text>
            )}
            {hasAnyBudget && <Text style={styles.colBudget}>BUDGET</Text>}
            {hasAnyApprovedPrice && (
              <Text style={styles.colTotalPrice}>TOTAL PRICE</Text>
            )}
          </View>

          {joLines.map((line, index) => {
            const rowStyle =
              index % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven;

            const typedAttachments = line.jo_attachments || [];

            return (
              <View key={line.id} style={rowStyle} wrap={false}>
                <Text style={styles.colNum}>{index + 1}</Text>

                <Text style={styles.colScope}>
                  {line.job_scope_name || line.job_scope || "-"}
                </Text>

                <Text style={styles.colContractType}>
                  {line.contract_type || "-"}
                </Text>

                <Text
                  style={styles.colDescription}
                  hyphenationCallback={(word) => [word]}
                >
                  {line.job_description || "-"}
                </Text>

                {hasAnySubWorksValue && (
                  <Text style={styles.colSubWorksValue}>
                    {formatMoney(line.subcontracted_works_value)}
                  </Text>
                )}

                {hasAnyBudget && (
                  <Text style={styles.colBudget}>
                    {formatMoney(line.budget_estimate)}
                  </Text>
                )}

                {hasAnyApprovedPrice && (
                  <Text style={styles.colTotalPrice}>
                    {formatMoney(line.approved_total_price)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Subtotal */}
        {showSubtotal && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{subtotalLabel}</Text>
            <Text style={styles.summaryValue}>
              AED{" "}
              {subtotalValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        )}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber }) => `${String(pageNumber).padStart(2, "0")}`}
          fixed
        />
      </Page>
    </Document>
  );
}
