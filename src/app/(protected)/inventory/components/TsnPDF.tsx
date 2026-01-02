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
  Rect,
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
    textTransform: "uppercase",
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
  infoItem: {
    flex: 1,
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

  // Section Headers Row
  sectionHeadersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },

  // Section Header
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

  // Dotted line between headers
  dottedLine: {
    width: 100,
    height: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // Two Column Layout
  twoColumn: {
    flexDirection: "row",
    gap: 125,
    marginBottom: 30,
  },
  column: {
    flex: 1,
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
    minHeight: 60,
  },
  tableColIndex: {
    width: "5%",
  },
  tableColDescription: {
    width: "25%",
  },
  tableColQuantity: {
    width: "25%",
  },
  tableColAttachments: {
    width: "25%",
  },

  // Attachment Image Styles
  attachmentImage: {
    width: 50,
    objectFit: "contain",
  },
  attachmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 130,
  },
  attachmentWrapper: {
    width: 50,
    marginRight: 5,
    marginBottom: 5,
  },

  // Bottom Section
  bottomSection: {
    marginTop: 100,
  },

  // Signature Row - side by side layout
  signatureRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },

  // Left side - checkbox and text
  confirmationSection: {
    flex: 1,
  },

  // Signature Box
  signatureBox: {
    border: "1 solid rgba(217, 217, 217, 1)",
    borderRadius: 5,
    padding: 10,
    height: 100,
    width: 250,
    position: "relative",
  },

  // Confirmation Row
  confirmationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  confirmationText: {
    fontSize: 7,
    fontFamily: "Mont",
    color: "#000000",
    flex: 1,
    textTransform: "none",
  },

  signatureLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
  },
  receiverName: {
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    position: "absolute",
    bottom: 10,
    left: 10,
  },
});

type TsnPDFProps = {
  transaction: any;
};

export function TsnPDF({ transaction }: TsnPDFProps) {
  const logo = "/icons/logo.jpg";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            TRANSFER STOCK <Text style={styles.titleBold}>CERTIFICATE</Text>
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRANSFER ID</Text>
            <Text style={styles.infoValue}>
              TR-{String(transaction?.id).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRANSFER DATE</Text>
            <Text style={styles.infoValue}>
              {new Date(transaction?.created_on).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRANSFER TYPE</Text>
            <Text style={styles.infoValue}>{transaction?.type}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PURPOSE OF TRANSFER</Text>
            <Text style={styles.infoValue}>{transaction?.purpose}</Text>
          </View>
        </View>

        {transaction.type.toLowerCase().includes("issue") && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}></Text>
              <Text style={styles.infoValue}></Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}></Text>
              <Text style={styles.infoValue}></Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>PROJECT</Text>
              <Text style={styles.infoValue}>
                {transaction.project_name || "N/A"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>BILL OF QUANTITY REFERENCE</Text>
              <Text style={styles.infoValue}>
                {transaction?.boq_item_number || "N/A"}
              </Text>
            </View>
          </View>
        )}

        {/* Section Headers with Dotted Line */}
        <View style={styles.sectionHeadersRow}>
          <Text style={styles.sectionHeader}>FROM</Text>

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

          <Text style={styles.sectionHeader}>TO</Text>
        </View>

        {/* From and To Content */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>LOCATION</Text>
              <Text style={styles.infoValue}>{transaction?.from_location}</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>TRANSFEREE</Text>
              <Text style={styles.infoValue}>
                {transaction?.transferee || "N/A"}
              </Text>
            </View>
          </View>
          <View style={styles.column}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>RECIPIENT</Text>
              <Text style={styles.infoValue}>{transaction?.receiver_name}</Text>
            </View>
            {(transaction.type.toLowerCase().includes("transfer") ||
              transaction.type.toLowerCase().includes("send")) && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.infoLabel}>CARRIER TYPE</Text>
                <Text style={styles.infoValue}>
                  {transaction.third_party_involved
                    ? "THIRD PARTY"
                    : "IN-HOUSE"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text
          style={{
            fontSize: 10,
            fontFamily: "Mont-SemiBold",
            color: "#000000",
            marginBottom: 10,
          }}
        >
          ITEM(S)
        </Text>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColIndex}>#</Text>
            <Text style={styles.tableColDescription}>MATERIAL DESCRIPTION</Text>
            <Text style={styles.tableColQuantity}>QUANTITY TRANSFERRED</Text>
            {transaction.type.toLowerCase().includes("issue") && (
              <Text style={styles.tableColQuantity}>MODEL / SERIAL NUMBER</Text>
            )}
            <Text style={styles.tableColAttachments}>ATTACHMENT(S)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColIndex}>1</Text>
            <Text style={styles.tableColDescription}>
              {transaction?.description}
            </Text>
            <Text style={styles.tableColQuantity}>
              {transaction?.quantity} {transaction?.unit}
            </Text>
            {transaction.type.toLowerCase().includes("issue") && (
              <Text style={styles.tableColQuantity}>
                {transaction.serial_number || "N/A"}
              </Text>
            )}
            <View style={styles.tableColAttachments}>
              {transaction.attachment &&
                Array.isArray(transaction.attachment) &&
                transaction.attachment.length > 0 && (
                  <View style={styles.attachmentContainer}>
                    {transaction.attachment.map(
                      (base64Url: string, i: number) => {
                        if (!base64Url || base64Url.trim() === "") return null;

                        return (
                          <View key={i} style={styles.attachmentWrapper}>
                            <Image
                              src={base64Url}
                              style={styles.attachmentImage}
                            />
                          </View>
                        );
                      }
                    )}
                  </View>
                )}
            </View>
          </View>
        </View>

        {/* Bottom Section - Two Signatures */}
        <View
          style={
            transaction.type.toLowerCase().includes("issue")
              ? {
                  marginTop: 175,
                }
              : {
                  marginTop: 125,
                }
          }
        >
          {/* Driver/Transport Custody Section */}
          {(transaction.type.toLowerCase().includes("transfer") ||
            transaction.type.toLowerCase().includes("send")) && (
            <View style={styles.signatureRow}>
              {/* Left: Checkbox and Text */}
              <View style={styles.confirmationSection}>
                <View style={styles.confirmationRow}>
                  <Svg height="16" width="16">
                    <Rect
                      x="1"
                      y="1"
                      width="14"
                      height="14"
                      stroke="rgba(217, 217, 217, 1)"
                      strokeWidth="1"
                      rx="3"
                      ry="3"
                    />
                  </Svg>

                  <Text style={styles.confirmationText}>
                    I confirm that I have taken custody of the listed
                    material(s) for transport and accept responsibility for
                    their safe handling and delivery to the specified
                    destination. I will ensure that the material(s) are
                    transported securely and protected from loss, damage, or
                    misuse while under my custody during transit.
                    {"\n\n"}I understand that any shortages, damages, or losses
                    occurring during transportation may be subject to
                    investigation and responsibility in accordance with
                    applicable company and contractual policies.
                  </Text>
                </View>
              </View>

              {/* Right: Signature Box */}
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>
                  SIGNATURE OF DRIVER / TRANSPORT CUSTODY
                </Text>
                <Text style={styles.receiverName}>
                  {transaction?.transferee || ""}
                </Text>
              </View>
            </View>
          )}

          {/* Site Recipient Section */}
          <View style={styles.signatureRow}>
            {/* Left: Checkbox and Text */}
            <View style={styles.confirmationSection}>
              <View style={styles.confirmationRow}>
                <Svg height="16" width="16">
                  <Rect
                    x="1"
                    y="1"
                    width="14"
                    height="14"
                    stroke="rgba(217, 217, 217, 1)"
                    strokeWidth="1"
                    rx="3"
                    ry="3"
                  />
                </Svg>

                <Text style={styles.confirmationText}>
                  I confirm that I have received the listed material(s) at the
                  designated site/location for the purpose of storage only. I
                  acknowledge that these material(s) will remain under my
                  custody while stored at this location, and I am responsible
                  for ensuring they are kept safe, secure, and protected against
                  loss, damage, or misuse.
                  {"\n\n"}I understand that this acknowledgement does not
                  authorize usage or consumption of the material(s), and any
                  issuance or utilization must be carried out through the proper
                  company procedures.
                </Text>
              </View>
            </View>

            {/* Right: Signature Box */}
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>
                SIGNATURE OF SITE RECIPIENT ({transaction?.receiver_name || ""})
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
