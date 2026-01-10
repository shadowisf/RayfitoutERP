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
    paddingBottom: 60, // ✅ Added bottom padding to prevent overlap
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

  // Summary Section Title
  summaryTitle: {
    fontSize: 16,
    fontFamily: "Mont-SemiBold",
    marginBottom: 10,
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
    fontSize: 8,
    color: "#333333",
    minHeight: 40,
    alignItems: "flex-start",
  },
  // Alternating row styles for summary table
  tableRowEven: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 8,
    color: "#333333",
    minHeight: 40,
    alignItems: "flex-start",
    backgroundColor: "#f5f5f5",
    border: "1px solid #f5f5f5",
  },
  tableRowOdd: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 8,
    color: "#333333",
    minHeight: 40,
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    border: "1px solid #f5f5f5",
  },
  tableColItemNo: {
    width: "10%",
    paddingRight: 8,
  },
  tableColDescription: {
    width: "70%",
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

  // ✅ Subtotal Row - Inside table with aligned columns
  subtotalRow: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 6,
    paddingRight: 12,
    paddingLeft: 12,
    backgroundColor: "white",
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    alignItems: "flex-start",
    marginBottom: 40, // ✅ Increased margin to give more space before next section
    border: "1px solid #f5f5f5",
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

  // Detail Page Styles - Subcategory Title
  subCategoryTitle: {
    fontSize: 16,
    fontFamily: "Mont-SemiBold",
    marginBottom: 10,
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
    border: "1px solid #f5f5f5",
  },
  detailTableRow: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
  },
  // Alternating row styles for detail table
  detailTableRowEven: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
    backgroundColor: "#f5f5f5",
    border: "1px solid #f5f5f5",
  },
  detailTableRowOdd: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 7,
    color: "#333333",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    border: "1px solid #f5f5f5",
  },
  detailColItemNo: {
    width: "5%",
    paddingRight: 4,
  },
  detailColCategory: {
    width: "45%",
    paddingRight: 4,
    fontSize: 7,
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
    width: "15%",
    paddingRight: 4,
    fontSize: 7,
  },
  detailColAttachment: {
    width: "17%",
  },

  // Attachment Image
  attachmentImage: {
    width: 30,
    height: 30,
    objectFit: "contain",
  },
  attachmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  attachmentWrapper: {
    width: 30,
    height: 30,
  },

  // Location and Scope styles - same line
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

export function BoqPDFWithNoPrice({ boqLines, boqHeader }: BoqPDFProps) {
  const logo = "/icons/logo.jpg";
  const locationIcon = "/icons/location-boq.png";

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
            <Text style={styles.infoLabel}>DATE</Text>
            <Text style={styles.infoValue}>
              {boqHeader.boq_date
                ? new Date(boqHeader.boq_date).toLocaleDateString()
                : new Date().toLocaleDateString()}
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
        </View>

        {/* Summary Title */}
        <Text style={styles.summaryTitle}>SUMMARY</Text>

        {/* Items Table - Summary - Only Categories */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColItemNo}>ITEM NO</Text>
            <Text style={styles.tableColDescription}>DESCRIPTION</Text>
          </View>

          {categories.map((category, categoryIndex) => {
            const categoryTotal = Object.values(
              categoryTotals[category]
            ).reduce((sum, val) => sum + val, 0);

            const rowStyle =
              categoryIndex % 2 === 0
                ? styles.tableRowOdd
                : styles.tableRowEven;

            return (
              <View key={categoryIndex} style={rowStyle}>
                <Text style={styles.tableColItemNo}>{categoryIndex + 1}.0</Text>
                <Text style={styles.tableColDescription}>
                  {category.toUpperCase()}
                </Text>
              </View>
            );
          })}
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
            <Text style={styles.termsTitle}>COMPLETION</Text>
            <Text style={styles.termsText}>TBD</Text>
          </View>

          {/* Terms and Conditions */}
          <Text style={styles.conditionsTitle}>TERMS & CONDITIONS</Text>
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
              {/* Loop through subcategories */}
              {subCategories.map(([subCategory, items], subIndex) => {
                // Calculate subcategory total
                const subCategoryTotal = items.reduce(
                  (sum, item) => sum + (item.total_cost || 0),
                  0
                );

                return (
                  <View key={subIndex}>
                    {/* Subcategory Title */}
                    <View wrap={false}>
                      <Text
                        style={styles.subCategoryTitle}
                        hyphenationCallback={(word) => [word]}
                      >
                        {categoryIndex + 1}.{subIndex + 1}{" "}
                        {category.toUpperCase()} / {subCategory.toUpperCase()}
                      </Text>

                      {/* Table Header */}
                      <View style={styles.detailTableHeader}>
                        <Text style={styles.detailColItemNo}>#</Text>
                        <Text style={styles.detailColCategory}>ITEM</Text>
                        <Text style={styles.detailColQty}>QTY</Text>
                        <Text style={styles.detailColAttachment}>
                          ATTACHMENT(S)
                        </Text>
                      </View>
                    </View>

                    {/* BOQ Line Items */}
                    {items.map((item, itemIndex) => {
                      const rowStyle =
                        itemIndex % 2 === 0
                          ? styles.detailTableRowOdd
                          : styles.detailTableRowEven;

                      return (
                        <View key={item.id} style={rowStyle} wrap={false}>
                          <Text style={styles.detailColItemNo}>
                            {categoryIndex + 1}.{subIndex + 1}.{itemIndex + 1}
                          </Text>

                          <View style={styles.detailColCategory}>
                            {/* Item Name */}
                            <Text
                              style={{
                                fontFamily: "Mont-Bold",
                                marginBottom: 5,
                              }}
                              hyphenationCallback={(word) => [word]}
                            >
                              {item.item_name}
                            </Text>

                            {/* Item Description */}
                            {item.item_description && (
                              <Text
                                style={{ marginBottom: 5 }}
                                hyphenationCallback={(word) => [word]}
                              >
                                {item.item_description}
                              </Text>
                            )}

                            {/* Location and Scope on same line */}
                            {(item.location || item.scope_of_work) && (
                              <View style={styles.locationScopeRow}>
                                {/* Location with Icon */}
                                {item.location && (
                                  <View style={styles.locationContainer}>
                                    <Image
                                      src={locationIcon}
                                      style={styles.locationIcon}
                                    />
                                    <Text
                                      style={styles.locationText}
                                      hyphenationCallback={(word) => [word]}
                                    >
                                      {item.location}
                                    </Text>
                                  </View>
                                )}

                                {/* Scope of Work Badge */}
                                {item.scope_of_work && (
                                  <View style={styles.scopeBadge}>
                                    <Text
                                      style={styles.scopeText}
                                      hyphenationCallback={(word) => [word]}
                                    >
                                      {item.scope_of_work}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>

                          <Text style={styles.detailColQty}>
                            {item.quantity} {item.unit}
                          </Text>

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
                      );
                    })}
                  </View>
                );
              })}
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
