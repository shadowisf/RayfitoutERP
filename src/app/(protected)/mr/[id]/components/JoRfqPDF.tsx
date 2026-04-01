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

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 60,
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

  // Job purpose banner
  purposeBanner: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: "12 16",
    marginBottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  purposeLabel: {
    fontSize: 8,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  purposeValue: {
    fontSize: 12,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },

  // Job item card
  jobCard: {
    marginBottom: 25,
  },
  jobCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  jobNumber: {
    backgroundColor: "transparent",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000000",
    width: 22,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  jobNumberText: {
    fontSize: 10,
    fontFamily: "Mont-SemiBold",
    marginTop: 4,
  },
  jobScopeLabel: {
    fontSize: 8,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  jobScopeValue: {
    fontSize: 12,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },

  // Description section
  descriptionSection: {
    marginBottom: 15,
    marginTop: 5,
    marginLeft: 32,
  },
  descriptionLabel: {
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  descriptionText: {
    fontSize: 9,
    color: "#333333",
    lineHeight: 1.5,
  },

  // BOQ Table
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: "8 12",
    fontSize: 8,
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
  },
  tableRowOdd: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
  },

  // BOQ table columns
  colHash: {
    width: "8%",
    paddingRight: 4,
  },
  colBoqItem: {
    width: "72%",
    paddingRight: 8,
  },
  colSubQty: {
    width: "20%",
  },

  // Location and Scope styles (matching BOQ PDF)
  locationScopeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  locationIcon: {
    width: 10,
    marginBottom: 3,
  },
  locationText: {
    color: "rgba(105, 105, 105, 1)",
    fontSize: 7,
    marginTop: 3,
  },
  scopeBadge: {
    paddingTop: 3,
    paddingBottom: 1,
    paddingRight: 8,
    paddingLeft: 8,
    borderRadius: 50,
    backgroundColor: "rgba(225, 225, 225, 1)",
  },
  scopeText: {
    fontFamily: "Mont-Bold",
    fontSize: 6,
  },

  // Terms & Conditions / Submission sections
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Mont-SemiBold",
    marginBottom: 10,
    marginTop: 25,
    textTransform: "uppercase",
  },
  sectionBody: {
    fontSize: 9,
    color: "#333333",
    lineHeight: 1.6,
  },

  // Page number
  pageNumber: {
    position: "absolute",
    fontSize: 8,
    bottom: 20,
    right: 20,
    color: "#666666",
  },
});

type BoqItemDetail = {
  boq_line_id: number;
  item_number: string;
  item_name: string;
  item_description?: string;
  location?: string;
  scope_of_work?: string;
  quantity: number;
  unit: string;
  subcontracted_qty: number;
};

type JoLineWithBoq = {
  id: number;
  job_scope_name?: string;
  job_scope?: string;
  contract_type?: string;
  job_description: string;
  boq_items: BoqItemDetail[];
};

type JoRfqPDFProps = {
  purposeName: string;
  joLines: JoLineWithBoq[];
  submissionDeadline?: string;
  termsAndConditions?: string;
  submissionInstructions?: string;
};

export function JoRfqPDF({
  purposeName,
  joLines,
  submissionDeadline,
  termsAndConditions,
  submissionInstructions,
}: JoRfqPDFProps) {
  const logo = "/icons/logo.jpg";
  const locationIconSrc = "/icons/location-boq.png";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header — only once at the top, not fixed/repeated */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            REQUEST FOR <Text style={styles.titleBold}>QUOTATION</Text>
          </Text>
        </View>

        {/* Job Purpose Banner */}
        {purposeName && (
          <View style={styles.purposeBanner}>
            <View>
              <Text style={styles.purposeLabel}>JOB PURPOSE</Text>
              <Text style={styles.purposeValue}>{purposeName}</Text>
            </View>
            {submissionDeadline && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.purposeLabel}>SUBMISSION DEADLINE</Text>
                <Text style={styles.purposeValue}>
                  {(() => {
                    try {
                      return new Date(submissionDeadline).toLocaleDateString(
                        "en-GB",
                        { day: "2-digit", month: "2-digit", year: "numeric" },
                      );
                    } catch {
                      return submissionDeadline;
                    }
                  })()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Job Items — continuous, no page break per item */}
        {joLines.map((line, lineIndex) => (
          <View key={line.id} style={styles.jobCard}>
            {/* Job Scope Header */}
            <View style={styles.jobCardHeader} wrap={false}>
              <View style={styles.jobNumber}>
                <Text style={styles.jobNumberText}>{lineIndex + 1}</Text>
              </View>
              <View>
                <Text style={styles.jobScopeLabel}>JOB SCOPE</Text>
                <Text style={styles.jobScopeValue}>
                  {line.job_scope_name || line.job_scope || "-"}
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>DESCRIPTION</Text>
              <Text style={styles.descriptionText}>
                {line.job_description || "-"}
              </Text>
            </View>

            {/* BOQ Items Table */}
            {line.boq_items && line.boq_items.length > 0 && (
              <View style={styles.table}>
                <View style={styles.tableHeader} wrap={false}>
                  <Text style={styles.colHash}>#</Text>
                  <Text style={styles.colBoqItem}>BOQ ITEM</Text>
                  <Text style={styles.colSubQty}>SUBCONTRACTED QTY</Text>
                </View>

                {line.boq_items.map((boq, boqIndex) => {
                  const rowStyle =
                    boqIndex % 2 === 0
                      ? styles.tableRowOdd
                      : styles.tableRowEven;

                  return (
                    <View
                      key={`${line.id}-${boq.boq_line_id}-${boqIndex}`}
                      style={rowStyle}
                      wrap={false}
                    >
                      <Text style={styles.colHash}>
                        {boq.item_number || "-"}
                      </Text>
                      <View style={styles.colBoqItem}>
                        {/* Item Name */}
                        <Text
                          style={{
                            fontFamily: "Mont-Bold",
                            marginBottom: 5,
                          }}
                          hyphenationCallback={(word) => [word]}
                        >
                          {boq.item_name}
                        </Text>

                        {/* Item Description */}
                        {boq.item_description && (
                          <Text
                            style={{ marginBottom: 5 }}
                            hyphenationCallback={(word) => [word]}
                          >
                            {boq.item_description}
                          </Text>
                        )}

                        {/* Location and Scope on same line */}
                        {(boq.location || boq.scope_of_work) && (
                          <View style={styles.locationScopeRow}>
                            {boq.location && (
                              <View style={styles.locationContainer}>
                                <Image
                                  src={locationIconSrc}
                                  style={styles.locationIcon}
                                />
                                <Text
                                  style={styles.locationText}
                                  hyphenationCallback={(word) => [word]}
                                >
                                  {boq.location}
                                </Text>
                              </View>
                            )}

                            {boq.scope_of_work && (
                              <View style={styles.scopeBadge}>
                                <Text
                                  style={styles.scopeText}
                                  hyphenationCallback={(word) => [word]}
                                >
                                  {boq.scope_of_work}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      <Text style={styles.colSubQty}>
                        {boq.subcontracted_qty
                          ? parseFloat(String(boq.subcontracted_qty))
                          : "-"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {/* Terms & Conditions */}
        {termsAndConditions && (
          <View>
            <Text style={styles.sectionHeading}>TERMS & CONDITIONS</Text>
            <Text style={styles.sectionBody}>{termsAndConditions}</Text>
          </View>
        )}

        {/* Submission Instructions */}
        {submissionInstructions && (
          <View>
            <Text style={styles.sectionHeading}>SUBMISSION INSTRUCTIONS</Text>
            <Text style={styles.sectionBody}>{submissionInstructions}</Text>
          </View>
        )}

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber }) => `${String(pageNumber).padStart(2, "0")}`}
          fixed
        />
      </Page>
    </Document>
  );
}
