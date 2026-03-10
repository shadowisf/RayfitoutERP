import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  Svg,
  Line,
} from "@react-pdf/renderer";

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

  // Info Row
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 20,
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

  // Section Headers Row - FULL WIDTH (same as LPO PDF)
  sectionHeadersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },
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
    flex: 1,
  },
  dottedLine: {
    width: 100,
    height: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // Two Column Layout (same as LPO PDF)
  twoColumn: {
    flexDirection: "row",
    gap: 150,
    marginBottom: 30,
  },
  column: {
    flex: 1,
  },

  // Party Info
  partyName: {
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    marginBottom: 6,
    color: "#000000",
  },
  partyContact: {
    fontSize: 8,
    color: "#333333",
    lineHeight: 1.6,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  partyId: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 8,
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
  },
  colMaterial: {
    width: "35%",
    paddingRight: 4,
  },
  colDeliveredQty: {
    width: "20%",
    paddingRight: 4,
  },
  colFailedQty: {
    width: "20%",
    paddingRight: 4,
  },
  colReturnedFrom: {
    width: "25%",
    paddingRight: 4,
  },
});

export type RtvData = {
  resolution_id: number;
  qc_mr_line_id: number;
  qc_id: number;
  mr_line_id: number;
  mr_header_id: number;
  lpo_id: number;
  lpo_number: number;
  resolution_created_at: string;
  created_by: string;
  return_required: string;
  pickup_type: string | null;
  return_quantity: number;
  expected_refund: number;
  actual_refund: number;
  variance_amount: number;
  eta_delivery_date: string | null;
  material_description: string;
  unit: string;
  delivery_location: string | null;
  received_quantity: number;
  failed_quantity: number;
  supplier: {
    id: number;
    name: string;
    contact_person: string;
    address: string;
    email: string;
  };
};

type RtvPDFProps = {
  data: RtvData;
};

export function RtvPDF({ data }: RtvPDFProps) {
  const logo = "/icons/logo.jpg";

  const formatDate = (dateStr: string | null) => {
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

  const rtvNumber = `RTV-${String(data.resolution_id).padStart(5, "0")}`;
  const resolutionNumber = `QC-RR-${String(data.resolution_id).padStart(5, "0")}`;
  const lpoNumber = `LPO-${String(data.lpo_number).padStart(5, "0")}`;
  const ncrNumber = `NCR-${String(data.mr_line_id).padStart(5, "0")}`;
  const mrNumber = `MR-${String(data.mr_header_id).padStart(5, "0")}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            RETURN TO <Text style={styles.titleBold}>VENDOR</Text>
          </Text>
        </View>

        {/* Document Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {formatDate(data.resolution_created_at)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>RTV Number</Text>
            <Text style={styles.infoValue}>{rtvNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Resolution Number</Text>
            <Text style={styles.infoValue}>{resolutionNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LPO Number</Text>
            <Text style={styles.infoValue}>{lpoNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>NCR Number</Text>
            <Text style={styles.infoValue}>{ncrNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>MR Number</Text>
            <Text style={styles.infoValue}>{mrNumber}</Text>
          </View>
        </View>

        {/* Section Headers with Dotted Line - FULL WIDTH */}
        <View style={styles.sectionHeadersRow}>
          <Text style={styles.sectionHeader}>RETURN INFORMATION</Text>

          {/* Dotted Line */}
          <View style={styles.dottedLine}>
            <Svg height="2" width="100">
              <Line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                strokeWidth="1.5"
                stroke="#CCCCCC"
                strokeDasharray="2,3"
              />
            </Svg>
          </View>

          <Text style={styles.sectionHeader}>VENDOR INFORMATION</Text>
        </View>

        {/* Return Info and Vendor Info - Two Columns */}
        <View style={styles.twoColumn}>
          {/* Left Column - Return Information */}
          <View style={styles.column}>
            <Text style={styles.infoLabel}>Prepared By</Text>
            <Text style={styles.partyName}>{data.created_by || "-"}</Text>

            <Text style={styles.infoLabel}>Reason for Return</Text>
            <Text style={styles.partyName}>QC Failure</Text>

            <Text style={styles.infoLabel}>Expected Return Date</Text>
            <Text style={styles.partyName}>
              {formatDate(data.eta_delivery_date)}
            </Text>
          </View>

          {/* Right Column - Vendor Information */}
          <View style={styles.column}>
            <Text style={styles.infoLabel}>VENDOR NAME</Text>
            <Text style={styles.partyName}>{data.supplier.name}</Text>

            <Text style={styles.partyId}>
              VENDOR NUMBER: VEN-{String(data.supplier.id).padStart(5, "0")}
            </Text>
            <Text style={styles.partyContact}>
              {data.supplier.contact_person || "-"}
            </Text>
            <Text style={styles.partyContact}>
              {data.supplier.address || "-"}
            </Text>
            <Text style={styles.partyContact}>
              {data.supplier.email || "-"}
            </Text>
          </View>
        </View>

        <Text style={styles.partyName}>ITEM(S)</Text>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colMaterial}>ITEM</Text>
            <Text style={styles.colDeliveredQty}>DELIVERED QTY</Text>
            <Text style={styles.colFailedQty}>FAILED QTY</Text>
            <Text style={styles.colReturnedFrom}>RETURNED FROM</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colMaterial}>{data.material_description}</Text>
            <Text style={styles.colDeliveredQty}>
              {formatQuantity(data.received_quantity)} {data.unit}
            </Text>
            <Text style={styles.colFailedQty}>
              {formatQuantity(data.failed_quantity)} {data.unit}
            </Text>
            <Text style={styles.colReturnedFrom}>
              {data.delivery_location || "-"}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
