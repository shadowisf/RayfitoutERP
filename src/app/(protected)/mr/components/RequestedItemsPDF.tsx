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

Font.registerHyphenationCallback((word) => [word]);

export type RequestedItem = {
  line_id: number;
  mr_header_id: number;
  material_description: string;
  quantity: number;
  unit: string;
  delivery_location?: string;
  progress_name: string;
  requested_by: string;
  project_name: string;
  lpo_id?: number | null;
  type: string;
};

type Props = {
  items: RequestedItem[];
  showMrRef: boolean;
  showRequester: boolean;
  showProject: boolean;
  exportDate: string;
};

function getItemRef(item: RequestedItem): string {
  if (item.lpo_id) return `LPO-${String(item.lpo_id).padStart(5, "0")}`;
  return `MR-${String(item.mr_header_id).padStart(5, "0")}`;
}

// ── Fixed column widths (adjust these values as needed) ──
const COL_NUM = "5%";
const COL_DELIVERY = "30%";
const COL_ITEM = "30%";
const COL_QTY = "18%";
const COL_MR_REF = "18%";
const COL_REQUESTER = "20%";
const COL_PROJECT = "25%";
/* const COL_STAGE = "25%"; */

const col = (width: string) => ({ width, paddingRight: 10 });

export default function RequestedItemsPDF({
  items,
  showMrRef,
  showRequester,
  showProject,
  exportDate,
}: Props) {
  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/icons/logo.jpg" style={styles.logo} />
          <Text style={styles.title}>
            REQUESTED <Text style={styles.titleBold}>ITEMS</Text>
          </Text>
        </View>

        {/* Date Export */}
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>EXPORT DATE</Text>
          <Text style={styles.dateValue}>{exportDate}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={col(COL_NUM)}>#</Text>
            <Text style={col(COL_DELIVERY)}>DELIVERY LOCATION</Text>
            <Text style={col(COL_ITEM)}>ITEM</Text>
            <Text style={col(COL_QTY)}>REQ. QTY</Text>
            {showMrRef && <Text style={col(COL_MR_REF)}>MR REF.</Text>}
            {showRequester && <Text style={col(COL_REQUESTER)}>REQUESTER</Text>}
            {showProject && <Text style={col(COL_PROJECT)}>PROJECT</Text>}
            {/* <Text style={col(COL_STAGE)}>STAGE</Text> */}
          </View>

          {/* Table Rows */}
          {items.map((item, index) => (
            <View
              key={`${item.mr_header_id}-${item.line_id}`}
              style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}
              wrap={false}
            >
              <Text style={col(COL_NUM)}>{index + 1}</Text>
              <Text style={col(COL_DELIVERY)}>
                {item.delivery_location || "-"}
              </Text>
              <Text style={col(COL_ITEM)}>
                {item.material_description || "-"}
              </Text>
              <Text style={col(COL_QTY)}>
                {item.quantity && Number(item.quantity) !== 0
                  ? `${Number.isInteger(Number(item.quantity)) ? Number(item.quantity) : Number(item.quantity).toFixed(2)} ${item.unit || ""}`
                  : "-"}
              </Text>
              {showMrRef && (
                <Text style={col(COL_MR_REF)}>{getItemRef(item)}</Text>
              )}
              {showRequester && (
                <Text style={col(COL_REQUESTER)}>
                  {item.requested_by || "-"}
                </Text>
              )}
              {showProject && (
                <Text style={col(COL_PROJECT)}>{item.project_name || "-"}</Text>
              )}

              {/* <View style={col(COL_STAGE)}>
                <View style={getStageBadgeStyle(item.progress_name)}>
                  <Text
                    style={[
                      styles.stageBadgeText,
                      { color: getStageTextColor(item.progress_name) },
                    ]}
                  >
                    {item.progress_name}
                  </Text>
                </View>
              </View> */}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

function getStageTextColor(progressName: string): string {
  const name = progressName?.toLowerCase() || "";
  if (name.includes("completed")) return "rgba(31, 101, 71, 1)";
  return "rgba(134, 83, 47, 1)";
}

function getStageBadgeStyle(progressName: string) {
  const name = progressName?.toLowerCase() || "";
  let bgColor = "rgba(225, 225, 225, 1)";

  if (name.includes("completed")) {
    bgColor = "rgba(87, 244, 176, 1)";
  } else {
    bgColor = "rgba(255, 250, 189, 1)";
  }

  return {
    backgroundColor: bgColor,
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 2,
    alignSelf: "flex-start" as const,
  };
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 30,
    paddingBottom: 60,
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
  dateRow: {
    marginBottom: 25,
  },
  dateLabel: {
    fontSize: 8,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 11,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
  },
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
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableRowEven: {
    flexDirection: "row",
    padding: "10 12",
    fontSize: 8,
    color: "#333333",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderBottom: "1px solid #f0f0f0",
    minHeight: 36,
  },
  tableRowOdd: {
    flexDirection: "row",
    padding: "10 12",
    fontSize: 8,
    color: "#333333",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #f0f0f0",
    minHeight: 36,
  },
  stageBadgeText: {
    fontSize: 7,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },
});
