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

  // Section Header (black pill)
  sectionHeader: {
    backgroundColor: "#000000",
    color: "#ffffff",
    paddingTop: 6,
    paddingBottom: 3,
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    borderRadius: 25,
    textAlign: "center",
    marginBottom: 15,
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
    marginBottom: 5,
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
    minHeight: 50,
  },

  // CR table columns
  colItem: {
    width: "20%",
    paddingRight: 4,
  },
  colQtyDelivered: {
    width: "11%",
    paddingRight: 4,
  },
  colAcceptedQty: {
    width: "11%",
    paddingRight: 4,
  },
  colQcCode: {
    width: "11%",
    paddingRight: 4,
  },
  colStatus: {
    width: "10%",
    paddingRight: 4,
  },
  colNotes: {
    width: "22%",
    paddingRight: 4,
  },
  colAttachment: {
    width: "15%",
    alignItems: "center",
    justifyContent: "center",
  },

  // Status badges
  statusBadgePassed: {
    backgroundColor: "#E8F5E9",
    color: "#2E7D32",
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    paddingTop: 3,
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 10,
    textAlign: "center",
  },
  statusBadgeFailed: {
    backgroundColor: "#FFEBEE",
    color: "#D32F2F",
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    paddingTop: 3,
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 10,
    textAlign: "center",
  },

  // Notes
  noteItem: {
    marginBottom: 3,
    fontSize: 8,
    lineHeight: 1.4,
  },
  noteLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
  },
  noteText: {
    fontSize: 8,
    color: "#333333",
  },

  // Attachment image
  attachmentImage: {
    width: 80,
    height: 80,
    objectFit: "cover",
    borderRadius: 4,
  },
});

// Map checkpoint names to short codes
const CHECKPOINT_CODE_MAP: { [key: string]: string } = {
  "Item matches purchase specifications": "SPEC",
  "Dimensions as per approved drawings": "DIM",
  "Material grade confirmed": "GRADE",
  "Visual inspection - no damage": "VISUAL",
  "Finishing quality acceptable": "FINISH",
  "No corrosion / scratches": "SURFACE",
  "Color matches approved sample": "COLOR",
  "Assembly/Functional test": "FUNC",
};

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
    return date.toLocaleDateString("en-GB");
  };

  const formatQuantity = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) return num.toLocaleString("en-US");
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  };

  const isCompliant = data.qc_status === "passed";

  // Build notes from checkpoints that have notes
  const getNotesContent = () => {
    const failedCheckpoints = data.checkpoints.filter(
      (cp) => cp.response === "no",
    );

    if (failedCheckpoints.length === 0) {
      return null;
    }

    return failedCheckpoints;
  };

  const notesCheckpoints = getNotesContent();

  // Get first available attachment image
  const getFirstAttachmentImage = (): string | null => {
    for (const cp of data.checkpoints) {
      if (attachmentImages[cp.checkpoint_number]) {
        return attachmentImages[cp.checkpoint_number];
      }
    }
    return null;
  };

  const firstImage = getFirstAttachmentImage();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            COMPLIANCE <Text style={styles.titleBold}>REPORT</Text>{" "}
          </Text>
        </View>

        {/* Document Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(data.qc_date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CR NUMBER</Text>
            <Text style={styles.infoValue}>
              CR-{String(data.qc_id).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LPO Number</Text>
            <Text style={styles.infoValue}>
              LPO-{String(data.lpo_number).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>MR Number</Text>
            <Text style={styles.infoValue}>
              MR-{String(data.mr_header_id).padStart(5, "0")}
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

        {/* Vendor Section Header */}
        <View style={{ width: 100 }}>
          <Text style={styles.sectionHeader}>VENDOR</Text>
        </View>

        {/* Vendor Details */}
        <View style={styles.vendorSection}>
          <Text style={styles.vendorName}>{data.supplier.name}</Text>
          <Text style={styles.vendorId}>
            VENDOR NUMBER: VEN-{String(data.supplier.id).padStart(5, "0")}
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
            <Text style={styles.colItem}>ITEM</Text>
            <Text style={styles.colQtyDelivered}>QTY DELIVERED</Text>
            <Text style={styles.colAcceptedQty}>ACCEPTED QTY</Text>
            <Text style={styles.colQcCode}>QC CODE</Text>
            <Text style={styles.colStatus}>STATUS</Text>
            <Text style={styles.colNotes}>NOTES</Text>
            <Text style={styles.colAttachment}>ATTACHMENT(S)</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colItem}>{data.material_description}</Text>
            <Text style={styles.colQtyDelivered}>
              {formatQuantity(data.received_quantity)} {data.unit}
            </Text>
            <Text style={styles.colAcceptedQty}>
              {formatQuantity(data.accepted_quantity)} {data.unit}
            </Text>
            <Text style={styles.colQcCode}>
              CR-{String(data.qc_id).padStart(5, "0")}
            </Text>
            <View style={styles.colStatus}>
              <Text
                style={
                  isCompliant
                    ? styles.statusBadgePassed
                    : styles.statusBadgeFailed
                }
              >
                {isCompliant ? "PASSED" : "FAILED"}
              </Text>
            </View>
            <View style={styles.colNotes}>
              {notesCheckpoints && notesCheckpoints.length > 0 ? (
                notesCheckpoints.map((cp) => {
                  const code =
                    CHECKPOINT_CODE_MAP[cp.checkpoint_name] ||
                    cp.checkpoint_name;
                  return (
                    <View key={cp.checkpoint_number} style={styles.noteItem}>
                      <Text>
                        <Text style={styles.noteLabel}>{code}:</Text>{" "}
                        <Text style={styles.noteText}>{cp.notes || "-"}</Text>
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noteText}>All checkpoints passed</Text>
              )}
            </View>
            <View style={styles.colAttachment}>
              {firstImage ? (
                <Image src={firstImage} style={styles.attachmentImage} />
              ) : null}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
