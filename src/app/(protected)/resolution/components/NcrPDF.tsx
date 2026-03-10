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
  infoItem: {
    /* flex: 1, */
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

  // Status
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
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
  colMaterial: {
    width: "30%",
    paddingRight: 4,
  },
  colQtyDelivered: {
    width: "16%",
    paddingRight: 4,
  },
  colQtyFailed: {
    width: "16%",
    paddingRight: 4,
  },
  colFailedReason: {
    width: "35%",
    paddingRight: 4,
  },
  colAttachment: {
    width: "18%",
    alignItems: "center",
    justifyContent: "center",
  },

  // Failed reason item
  reasonItem: {
    marginBottom: 4,
    fontSize: 8,
    lineHeight: 1.4,
  },
  reasonLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
  },
  reasonNotes: {
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

// Map checkpoint names to friendly failure reason names
const FAILURE_REASON_MAP: { [key: string]: string } = {
  "Item matches purchase specifications": "Wrong Specification",
  "Dimensions as per approved drawings": "Dimension Issues",
  "Material grade confirmed": "Material Grade Issues",
  "Visual inspection - no damage": "Physical Damage",
  "Finishing quality acceptable": "Finishing Issues",
  "No corrosion / scratches": "Quality Issues",
  "Color matches approved sample": "Color Mismatch",
  "Assembly/Functional test": "Functional Failure",
};

export type NcrData = {
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
  failed_quantity: number;
  checked_by: string;
  supplier: {
    id: number;
    name: string;
    contact_person: string;
    address: string;
    email: string;
  };
  failed_checkpoints: {
    checkpoint_number: number;
    checkpoint_name: string;
    notes: string;
    attachments: any;
  }[];
};

type NcrPDFProps = {
  data: NcrData;
  attachmentImages: { [key: number]: string }; // checkpoint_number -> base64 image
};

export function NcrPDF({ data, attachmentImages }: NcrPDFProps) {
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

  // Get the first valid attachment image across all failed checkpoints
  const getFirstAttachmentImage = (): string | null => {
    for (const cp of data.failed_checkpoints) {
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
            NON-COMPLIANCE <Text style={styles.titleBold}>REPORT</Text>{" "}
          </Text>
        </View>

        {/* Document Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(data.qc_date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>NCR NUMBER</Text>
            <Text style={styles.infoValue}>
              NCR-
              {String(data.qc_id).padStart(5, "0")}
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
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>NON COMPLIANT</Text>
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
            <Text style={styles.colMaterial}>ITEM</Text>
            <Text style={styles.colQtyDelivered}>DELIVERED QTY</Text>
            <Text style={styles.colQtyFailed}>FAILED QTY</Text>
            <Text style={styles.colFailedReason}>FAILED REASON(S)</Text>
            <Text style={styles.colAttachment}>ATTACHEMENT(S)</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colMaterial}>{data.material_description}</Text>
            <Text style={styles.colQtyDelivered}>
              {formatQuantity(data.received_quantity)} {data.unit}
            </Text>
            <Text style={styles.colQtyFailed}>
              {formatQuantity(data.failed_quantity)} {data.unit}
            </Text>
            <View style={styles.colFailedReason}>
              {data.failed_checkpoints.map((cp) => {
                const friendlyName =
                  FAILURE_REASON_MAP[cp.checkpoint_name] || cp.checkpoint_name;
                return (
                  <View key={cp.checkpoint_number} style={styles.reasonItem}>
                    <Text>
                      <Text style={styles.reasonLabel}>{friendlyName}:</Text>{" "}
                      <Text style={styles.reasonNotes}>{cp.notes || "-"}</Text>
                    </Text>
                  </View>
                );
              })}
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
