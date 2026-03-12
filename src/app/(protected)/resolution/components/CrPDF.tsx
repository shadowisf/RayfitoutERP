import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  Svg,
  Rect,
  Path,
} from "@react-pdf/renderer";

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

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    fontFamily: "Mont",
  },

  // Header
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
  titleLight: {
    color: "#999999",
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    marginBottom: 30,
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

  // Status
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDotCompliant: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2E7D32",
    marginBottom: 7,
  },
  statusDotNonCompliant: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D32F2F",
    marginBottom: 7,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
  },

  // Vendor details
  vendorSection: {
    marginBottom: 30,
  },
  vendorName: {
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    marginBottom: 4,
    color: "#000000",
  },
  vendorDetail: {
    fontSize: 8,
    color: "#333333",
    lineHeight: 1.6,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  vendorId: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 8,
  },

  // Item Inspection Section
  inspectionHeader: {
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    marginBottom: 10,
    color: "#000000",
    textTransform: "uppercase",
  },

  // Table
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
    padding: "6 12",
    borderBottom: "1 solid #e0e0e0",
    fontSize: 8,
    color: "#333333",
    minHeight: 40,
    alignItems: "flex-start",
  },

  // CR table columns
  colMaterial: {
    width: "15%",
    paddingRight: 4,
  },
  colQtyDelivered: {
    width: "10%",
    paddingRight: 4,
  },
  colAcceptedQty: {
    width: "10%",
    paddingRight: 4,
  },
  colQcCode: {
    width: "18%",
    paddingRight: 4,
  },
  colChecklist: {
    width: "10%",
    paddingRight: 4,
    alignItems: "center",
  },
  colNotes: {
    width: "17%",
    paddingRight: 4,
  },
  colAttachment: {
    width: "20%",
    alignItems: "center",
    justifyContent: "center",
  },

  // Attachment image
  attachmentImage: {
    width: 70,
    height: 70,
    objectFit: "cover",
    borderRadius: 4,
  },

  // Section labels
  vendorSectionLabel: {
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 5,
  },
});

// Checkbox component for passed checkpoints
function CheckboxChecked() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Rect
        x={0.5}
        y={0.5}
        width={11}
        height={11}
        rx={2}
        fill="#000000"
        stroke="#000000"
        strokeWidth={1}
      />
      <Path d="M3 6 L5 8 L9 4" stroke="#ffffff" strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

// Checkbox with X for failed checkpoints
function CheckboxFailed() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Rect
        x={0.5}
        y={0.5}
        width={11}
        height={11}
        rx={2}
        fill="#ffffff"
        stroke="#000000"
        strokeWidth={1}
      />
      <Path d="M3.5 3.5 L8.5 8.5" stroke="#000000" strokeWidth={1.5} />
      <Path d="M8.5 3.5 L3.5 8.5" stroke="#000000" strokeWidth={1.5} />
    </Svg>
  );
}

export type CrData = {
  qc_id: number;
  qc_date: string;
  lpo_id: number;
  lpo_number: number;
  mr_line_id: number;
  mr_header_id: number;
  material_description: string;
  unit: string;
  received_quantity: number;
  accepted_quantity: number;
  qc_status: "passed" | "failed";
  checked_by: string;
  supplier: {
    id: number;
    name: string;
    contact_person: string;
    address: string;
    email: string;
  };
  checkpoints: {
    checkpoint_number: number;
    checkpoint_name: string;
    response: string;
    notes: string;
    attachments: any;
  }[];
};

type CrPDFProps = {
  data: CrData;
  attachmentImages: { [key: number]: string }; // checkpoint_number -> base64 image
};

export function CrPDF({ data, attachmentImages }: CrPDFProps) {
  const logo = "/icons/logo.jpg";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      })
      .toUpperCase();
  };

  const formatQuantity = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
  };

  const isCompliant = data.qc_status === "passed";
  const checkpoints = data.checkpoints;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            <Text style={styles.titleBold}>COMPLIANCE REPORT </Text>
            <Text style={styles.titleLight}>(CR)</Text>
          </Text>
        </View>

        {/* Document Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(data.qc_date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CR No</Text>
            <Text style={styles.infoValue}>
              CR-{new Date(data.qc_date).getFullYear()}-
              {String(data.qc_id).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LPO Number</Text>
            <Text style={styles.infoValue}>
              PO-{String(data.lpo_number).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>MR Number</Text>
            <Text style={styles.infoValue}>
              {data.mr_header_id
                ? `MR-${String(data.mr_header_id).padStart(5, "0")}`
                : "-"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusContainer}>
              <View
                style={
                  isCompliant
                    ? styles.statusDotCompliant
                    : styles.statusDotNonCompliant
                }
              />
              <Text style={styles.statusText}>
                {isCompliant ? "COMPLIANT" : "NON COMPLIANT"}
              </Text>
            </View>
          </View>
        </View>

        {/* Vendor Section */}
        <View style={styles.vendorSection}>
          <Text style={styles.vendorSectionLabel}>VENDOR/VENDOR</Text>
          <Text style={styles.vendorName}>{data.supplier.name}</Text>
          <Text style={styles.vendorId}>
            VENDOR ID: SUP{String(data.supplier.id).padStart(4, "0")}
          </Text>

          <Text style={styles.vendorName}>
            {data.supplier.contact_person || "-"}
          </Text>
          <Text style={styles.vendorDetail}>
            {data.supplier.address || "-"}
          </Text>
          <Text style={styles.vendorDetail}>{data.supplier.email || "-"}</Text>
        </View>

        {/* Item Inspection Details */}
        <Text style={styles.inspectionHeader}>ITEM INSPECTION DETAILS</Text>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colMaterial}>MATERIAL</Text>
            <Text style={styles.colQtyDelivered}>QTY DELIVERED</Text>
            <Text style={styles.colAcceptedQty}>ACCEPTED QTY</Text>
            <Text style={styles.colQcCode}>QC CODE</Text>
            <Text style={styles.colChecklist}>CHECKLIST</Text>
            <Text style={styles.colNotes}>NOTES</Text>
            <Text style={styles.colAttachment}>ATTACHEMENT</Text>
          </View>

          {/* One row per checkpoint, item info only on first row */}
          {checkpoints.map((cp, index) => (
            <View
              key={cp.checkpoint_number}
              style={styles.tableRow}
              wrap={false}
            >
              {/* Material info - only first row */}
              <Text style={styles.colMaterial}>
                {index === 0 ? data.material_description : ""}
              </Text>
              <Text style={styles.colQtyDelivered}>
                {index === 0
                  ? `${formatQuantity(data.received_quantity)} ${data.unit}`
                  : ""}
              </Text>
              <Text style={styles.colAcceptedQty}>
                {index === 0
                  ? `${formatQuantity(data.accepted_quantity)} ${data.unit}`
                  : ""}
              </Text>

              {/* Checkpoint name */}
              <View style={styles.colQcCode}>
                <Text style={{ fontSize: 7 }}>{cp.checkpoint_name}</Text>
              </View>

              {/* Checklist - checkbox */}
              <View style={styles.colChecklist}>
                {cp.response === "yes" ? (
                  <CheckboxChecked />
                ) : cp.response === "no" ? (
                  <CheckboxFailed />
                ) : (
                  <Text style={{ fontSize: 7, color: "#999999" }}>N/A</Text>
                )}
              </View>

              {/* Notes */}
              <View style={styles.colNotes}>
                <Text style={{ fontSize: 7 }}>
                  {cp.notes ? cp.notes : "-"}
                </Text>
              </View>

              {/* Attachment */}
              <View style={styles.colAttachment}>
                {attachmentImages[cp.checkpoint_number] ? (
                  <Image
                    src={attachmentImages[cp.checkpoint_number]}
                    style={styles.attachmentImage}
                  />
                ) : (
                  <Text style={{ fontSize: 7, color: "#999999" }}>-</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
