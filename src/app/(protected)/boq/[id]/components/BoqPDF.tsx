"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import { BoqLine } from "../types/boqLine";
import { BoqHeader } from "../types/boqHeader";
import { useAuth } from "@/app/context/AuthContext";

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
    gap: 30,
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

  // Summary Section Title
  summaryTitle: {
    fontSize: 16,
    fontFamily: "Mont-SemiBold",
    marginBottom: 15,
    marginTop: 10,
    color: "#000000",
  },

  // Table
  table: {
    marginBottom: 30,
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
    minHeight: 40,
    alignItems: "flex-start",
  },
  tableColItemNo: {
    width: "10%",
    paddingRight: 8,
  },
  tableColDescription: {
    width: "55%",
    paddingRight: 8,
  },
  tableColPageRef: {
    width: "15%",
    paddingRight: 8,
  },
  tableColAmount: {
    width: "20%",
    textAlign: "right",
  },

  // Total Row
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "#000000",
    color: "#ffffff",
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 5,
    borderRadius: 10,
    alignSelf: "flex-end",
  },
  totalLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
    textTransform: "uppercase",
    paddingRight: 50,
  },
  totalValue: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
  },

  // Bottom Section
  bottomSection: {
    marginTop: "auto",
    paddingTop: 20,
  },

  // Terms
  termsSection: {
    marginBottom: 15,
  },
  termsTitle: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
    marginBottom: 3,
    color: "#000000",
  },
  termsText: {
    fontSize: 8,
    color: "#333333",
    lineHeight: 1.5,
  },

  // Terms and Conditions List
  conditionsTitle: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
    marginBottom: 6,
    marginTop: 15,
    color: "#000000",
  },
  conditionItem: {
    fontSize: 8,
    color: "#333333",
    lineHeight: 1.5,
    marginBottom: 3,
  },

  // Detail Page Styles - Subcategory Title (was categoryTitle)
  subCategoryTitle: {
    fontSize: 16,
    fontFamily: "Mont-SemiBold",
    marginBottom: 20,
    marginTop: 30,
    color: "#000000",
    textTransform: "uppercase",
  },

  // Detailed Table
  detailTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: "8 12",
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },
  detailTableRow: {
    flexDirection: "row",
    padding: "8 12",
    borderBottom: "1 solid #e0e0e0",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
  },
  detailColItemNo: {
    width: "5%",
    paddingRight: 4,
  },
  detailColCategory: {
    width: "15%",
    paddingRight: 4,
  },
  detailColDescription: {
    width: "28%",
    paddingRight: 4,
  },
  detailColLocation: {
    width: "10%",
    paddingRight: 4,
  },
  detailColQty: {
    width: "10%",
    paddingRight: 4,
  },
  detailColRate: {
    width: "10%",
    paddingRight: 4,
  },
  detailColTotal: {
    width: "10%",
    paddingRight: 4,
  },
  detailColAttachment: {
    width: "17%",
  },

  // Attachment Image
  attachmentImage: {
    width: 40,
    height: 40,
    objectFit: "contain",
  },
  attachmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  attachmentWrapper: {
    width: 40,
    height: 40,
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

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

type BoqPDFProps = {
  boqLines: GroupedBoqLines;
  boqHeader: BoqHeader;
};

export function BoqPDF({ boqLines, boqHeader }: BoqPDFProps) {
  const { userInfo } = useAuth();

  const logo = "/icons/logo.jpg";

  // Calculate totals for each category and subcategory
  const categoryTotals: {
    [category: string]: { [subCategory: string]: number };
  } = {};
  let grandTotal = 0;

  Object.entries(boqLines).forEach(([category, subCategories]) => {
    categoryTotals[category] = {};
    Object.entries(subCategories).forEach(([subCategory, items]) => {
      const subTotal = items.reduce(
        (sum, item) => sum + (item.total_cost || 0),
        0
      );
      categoryTotals[category][subCategory] = subTotal;
      grandTotal += subTotal;
    });
  });

  const categories = Object.keys(boqLines);

  return (
    <Document>
      {/* Summary Page */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            BILL OF <Text style={styles.titleBold}>QUANTITY</Text>
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>BOQ NUMBER</Text>
            <Text style={styles.infoValue}>
              BOQ-{String(boqHeader.id).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PROJECT</Text>
            <Text style={styles.infoValue}>{boqHeader.project_name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CLIENT</Text>
            <Text style={styles.infoValue}>
              {boqHeader.client_name || "N/A"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>DATE</Text>
            <Text style={styles.infoValue}>
              {boqHeader.boq_date
                ? new Date(boqHeader.boq_date).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
        </View>

        {/* Summary Title */}
        <Text style={styles.summaryTitle}>SUMMARY</Text>

        {/* Items Table - Summary */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColItemNo}>ITEM NO</Text>
            <Text style={styles.tableColDescription}>DESCRIPTION</Text>
            <Text style={styles.tableColPageRef}>PAGE REF</Text>
            <Text style={styles.tableColAmount}>AMOUNT (AED)</Text>
          </View>

          {categories.map((category, categoryIndex) => {
            const subCategories = Object.entries(boqLines[category]);
            const categoryTotal = Object.values(
              categoryTotals[category]
            ).reduce((sum, val) => sum + val, 0);

            return (
              <View key={categoryIndex}>
                {/* Category Row with first subcategory combined */}
                <View style={styles.tableRow}>
                  <Text style={styles.tableColItemNo}>
                    {categoryIndex + 1}
                    {"\n\n"}
                    {categoryIndex + 1}.1
                  </Text>
                  <Text style={styles.tableColDescription}>
                    BILL NO {categoryIndex + 1} - {category.toUpperCase()}
                    {"\n\n"}
                    {subCategories[0]?.[0]?.toUpperCase()}
                  </Text>
                  <Text style={styles.tableColPageRef}></Text>
                  <Text style={styles.tableColAmount}>
                    AED {categoryTotal.toLocaleString()}
                  </Text>
                </View>

                {/* Remaining Subcategory Rows (starting from index 1) */}
                {subCategories
                  .slice(1)
                  .map(([subCategory, items], subIndex) => (
                    <View key={subIndex + 1} style={styles.tableRow}>
                      <Text style={styles.tableColItemNo}>
                        {categoryIndex + 1}.{subIndex + 2}
                      </Text>
                      <Text style={styles.tableColDescription}>
                        {subCategory.toUpperCase()}
                      </Text>
                      <Text style={styles.tableColPageRef}></Text>
                      <Text style={styles.tableColAmount}>
                        AED{" "}
                        {categoryTotals[category][subCategory].toLocaleString()}
                      </Text>
                    </View>
                  ))}
              </View>
            );
          })}
        </View>

        {/* Total Row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>
            AED {grandTotal.toLocaleString()}
          </Text>
        </View>

        {/* Bottom Section - Terms */}
        <View style={styles.bottomSection}>
          {/* Payment Terms */}
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>PAYMENT TERMS</Text>
            <Text style={styles.termsText}>
              {boqHeader.payment_terms || "N/A"}
            </Text>
          </View>

          {/* Validity */}
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>VALIDITY TERMS</Text>
            <Text style={styles.termsText}>
              {boqHeader.validity_terms || "N/A"}
            </Text>
          </View>

          {/* Completion */}
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Completion</Text>
            <Text style={styles.termsText}>TBD</Text>
          </View>

          {/* Terms and Conditions */}
          <Text style={styles.conditionsTitle}>Terms and condition</Text>
          <Text style={styles.conditionItem}>
            {boqHeader.terms_and_conditions || "N/A"}
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber }) => `${String(pageNumber).padStart(2, "0")}`}
        />
      </Page>

      {/* Detail Pages - Subcategories as main headers */}
      <Page size="A4" style={styles.page} wrap>
        {categories.map((category, categoryIndex) => {
          const subCategories = Object.entries(boqLines[category]);

          return (
            <View key={categoryIndex}>
              {/* ✅ Loop through subcategories - each is now the main header */}
              {subCategories.map(([subCategory, items], subIndex) => (
                <View key={subIndex}>
                  {/* ✅ Subcategory Title (1.1 GENERAL REQUIREMENTS) */}
                  <View wrap={false}>
                    <Text style={styles.subCategoryTitle}>
                      {categoryIndex + 1}.{subIndex + 1}{" "}
                      {subCategory.toUpperCase()}
                    </Text>

                    {/* Table Header */}
                    <View style={styles.detailTableHeader}>
                      <Text style={styles.detailColItemNo}>#</Text>
                      <Text style={styles.detailColCategory}>ITEM</Text>
                      <Text style={styles.detailColDescription}>
                        DESCRIPTION
                      </Text>
                      <Text style={styles.detailColLocation}>LOCATION</Text>
                      <Text style={styles.detailColQty}>QUANTITY</Text>
                      {(userInfo?.departmentID === 8 ||
                        userInfo?.departmentID === 12 ||
                        userInfo?.departmentID === 10) && (
                        <>
                          <Text style={styles.detailColRate}>RATE</Text>
                          <Text style={styles.detailColTotal}>TOTAL PRICE</Text>
                        </>
                      )}
                      <Text style={styles.detailColAttachment}>
                        ATTACHMENT(S)
                      </Text>
                    </View>
                  </View>

                  {/* ✅ BOQ Line Items (1.1.1, 1.1.2, etc.) */}
                  {items.map((item, itemIndex) => (
                    <View
                      key={item.id}
                      style={styles.detailTableRow}
                      wrap={false}
                    >
                      <Text style={styles.detailColItemNo}>
                        {categoryIndex + 1}.{subIndex + 1}.{itemIndex + 1}
                      </Text>
                      <Text style={styles.detailColCategory}>
                        {item.item_name}
                      </Text>
                      <Text style={styles.detailColDescription}>
                        {item.item_description || ""}
                      </Text>
                      <Text style={styles.detailColLocation}>
                        {item.location?.split("-").pop()}
                      </Text>
                      <Text style={styles.detailColQty}>
                        {item.quantity} {item.unit}
                      </Text>
                      {(userInfo?.departmentID === 8 ||
                        userInfo?.departmentID === 12 ||
                        userInfo?.departmentID === 10) && (
                        <>
                          <Text style={styles.detailColRate}>
                            AED {item.rate_per_quantity?.toLocaleString()}
                          </Text>
                          <Text style={styles.detailColTotal}>
                            AED {item.total_cost?.toLocaleString()}
                          </Text>
                        </>
                      )}

                      <View style={styles.detailColAttachment}>
                        {item.attachments &&
                          Array.isArray(item.attachments) &&
                          item.attachments.length > 0 && (
                            <View style={styles.attachmentContainer}>
                              {item.attachments.map(
                                (base64Url: string, i: number) => {
                                  if (!base64Url || base64Url.trim() === "")
                                    return null;

                                  return (
                                    <View
                                      key={i}
                                      style={styles.attachmentWrapper}
                                    >
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
                  ))}
                </View>
              ))}
            </View>
          );
        })}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber }) => `${String(pageNumber).padStart(2, "0")}`}
          fixed
        />
      </Page>
    </Document>
  );
}
