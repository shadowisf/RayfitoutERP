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
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";

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
    marginBottom: 20,
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
  tableRowEven: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 8,
    color: "#333333",
    alignItems: "flex-start",
    backgroundColor: "#f5f5f5",
    border: "1px solid #f5f5f5",
  },
  tableRowOdd: {
    flexDirection: "row",
    padding: "8 12",
    fontSize: 8,
    color: "#333333",
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
  // Unpriced table columns
  tableColItemNoUnpriced: {
    width: "10%",
    paddingRight: 8,
  },
  tableColDescriptionUnpriced: {
    width: "90%",
    paddingRight: 8,
  },

  // Total Row
  totalRow: {
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
    width: 200,
    marginBottom: 5,
  },
  totalRowAlt: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    color: "black",
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 5,
    borderRadius: 10,
    alignSelf: "flex-end",
    width: 200,
    marginBottom: 5,
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

  // Subtotal Row
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
    marginBottom: 40,
    border: "1px solid #f5f5f5",
  },

  // Bottom Section
  bottomSection: {
    marginTop: 30,
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
    fontSize: 12,
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

  // Base column styles
  detailColItemNo: {
    width: "5%",
    paddingRight: 4,
  },
  detailColCategory: {
    width: "50%",
    paddingRight: 4,
  },
  detailColCategoryUnpriced: {
    width: "60%",
    paddingRight: 4,
  },
  detailColCategoryWithRemarks: {
    width: "40%",
    paddingRight: 4,
  },
  detailColCategoryUnpricedWithRemarks: {
    width: "50%",
    paddingRight: 4,
  },
  detailColCategoryWithDN: {
    width: "35%",
    paddingRight: 4,
  },
  detailColCategoryUnpricedWithDN: {
    width: "45%",
    paddingRight: 4,
  },
  detailColCategoryWithRemarksNoAttach: {
    width: "57%",
    paddingRight: 4,
  },
  detailColCategoryUnpricedWithRemarksNoAttach: {
    width: "67%",
    paddingRight: 4,
  },
  detailColCategoryWithDNNoAttach: {
    width: "50%",
    paddingRight: 4,
  },
  detailColCategoryUnpricedWithDNNoAttach: {
    width: "60%",
    paddingRight: 4,
  },
  detailColCategoryNoAttach: {
    width: "67%",
    paddingRight: 4,
  },
  detailColCategoryUnpricedNoAttach: {
    width: "77%",
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
    width: "15%",
    paddingRight: 4,
  },
  detailColAttachment: {
    width: "17%",
    paddingRight: 4,
  },
  detailColAttachmentWithRemarks: {
    width: "17%",
    paddingRight: 4,
  },
  detailColAttachmentWithDN: {
    width: "15%",
    paddingRight: 4,
  },
  detailColRemarks: {
    width: "15%",
  },
  detailColRemarksNoAttach: {
    width: "18%",
  },
  detailColDNNumber: {
    width: "17%",
    paddingRight: 4,
  },
  detailColDNDate: {
    width: "12%",
    paddingRight: 4,
  },

  // Attachment Image
  attachmentImage: {
    height: 40,
    objectFit: "contain",
  },
  attachmentContainer: {
    flexDirection: "row",
    gap: 3,
  },
  attachmentWrapper: {
    height: 40,
  },

  // Location and Scope styles
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
  showPrices?: boolean;
  showDN?: boolean;
  isReference?: boolean;
  mrHeader?: MrHeader;
  itemName?: string;
};

export function BoqPDF({
  boqLines,
  boqHeader,
  showPrices = true,
  showDN = false,
  isReference = false,
  mrHeader,
  itemName,
}: BoqPDFProps) {
  const logo = "/icons/logo.jpg";
  const locationIcon = "/icons/location-boq.png";

  // Helper functions for formatting
  const formatMoney = (amount: number | string | undefined | null): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

    if (numAmount === undefined || numAmount === null || isNaN(numAmount))
      return "0.00";

    // Check if we need 3 decimals (third decimal is non-zero)
    const with3Decimals = numAmount.toFixed(3);
    const thirdDecimal = with3Decimals.split(".")[1]?.[2];

    if (thirdDecimal && thirdDecimal !== "0") {
      return numAmount.toLocaleString(undefined, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
    }

    return numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatQuantity = (
    quantity: number | string | undefined | null,
  ): string => {
    const numQuantity =
      typeof quantity === "string" ? parseFloat(quantity) : quantity;

    if (numQuantity === undefined || numQuantity === null || isNaN(numQuantity))
      return "0";

    // Check if it's a whole number
    if (Number.isInteger(numQuantity)) {
      return numQuantity.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      });
    }

    // Check if we need 3 decimals
    const with3Decimals = numQuantity.toFixed(3);
    const thirdDecimal = with3Decimals.split(".")[1]?.[2];

    if (thirdDecimal && thirdDecimal !== "0") {
      return numQuantity.toLocaleString(undefined, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
    }

    return numQuantity.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate line total from rate × quantity
  const calculateLineTotal = (
    rate: number | string | undefined,
    qty: number | string | undefined,
  ): number => {
    const numRate = parseFloat(String(rate)) || 0;
    const numQty = parseFloat(String(qty)) || 0;
    return numRate * numQty;
  };

  // Calculate totals for each category and subcategory
  const categoryTotals: {
    [category: string]: { [subCategory: string]: number };
  } = {};
  let grandTotal = 0;

  Object.entries(boqLines).forEach(([category, subCategories]) => {
    categoryTotals[category] = {};
    Object.entries(subCategories).forEach(([subCategory, items]) => {
      const subTotal = items.reduce(
        (sum, item) =>
          sum + calculateLineTotal(item.rate_per_quantity, item.quantity),
        0,
      );
      categoryTotals[category][subCategory] = subTotal;
      grandTotal += subTotal;
    });
  });

  const categories = Object.keys(boqLines);

  // Check if any items have remarks across all categories/subcategories
  const hasAnyRemarks = Object.values(boqLines).some((subCategories) =>
    Object.values(subCategories).some((items) =>
      items.some((item) => item.remarks && item.remarks.trim() !== ""),
    ),
  );

  // Check if any items have attachments across all categories/subcategories
  const hasAnyAttachments = Object.values(boqLines).some((subCategories) =>
    Object.values(subCategories).some((items) =>
      items.some((item) => {
        if (!item.attachments) return false;
        if (Array.isArray(item.attachments)) return item.attachments.length > 0;
        if (typeof item.attachments === "string") {
          try {
            if (item.attachments.trim() === "") return false;
            const parsed = JSON.parse(item.attachments);
            return Array.isArray(parsed) && parsed.length > 0;
          } catch {
            return false;
          }
        }
        return false;
      }),
    ),
  );

  // Get dynamic column styles based on configuration
  const getColStyles = () => {
    // DN mode - no pricing, show DN columns
    if (showDN) {
      if (hasAnyAttachments) {
        return {
          category: hasAnyRemarks
            ? styles.detailColCategoryWithRemarks
            : styles.detailColCategoryWithDN,
          attachment: hasAnyRemarks
            ? styles.detailColAttachmentWithRemarks
            : styles.detailColAttachmentWithDN,
          remarks: styles.detailColRemarks,
        };
      } else {
        return {
          category: hasAnyRemarks
            ? styles.detailColCategoryWithRemarksNoAttach
            : styles.detailColCategoryWithDNNoAttach,
          attachment: undefined,
          remarks: hasAnyRemarks ? styles.detailColRemarksNoAttach : undefined,
        };
      }
    }

    // Normal priced/unpriced mode
    if (showPrices) {
      if (hasAnyAttachments) {
        return {
          category: hasAnyRemarks
            ? styles.detailColCategoryWithRemarks
            : styles.detailColCategory,
          attachment: hasAnyRemarks
            ? styles.detailColAttachmentWithRemarks
            : styles.detailColAttachment,
          remarks: styles.detailColRemarks,
        };
      } else {
        return {
          category: hasAnyRemarks
            ? styles.detailColCategoryWithRemarksNoAttach
            : styles.detailColCategoryNoAttach,
          attachment: undefined,
          remarks: hasAnyRemarks ? styles.detailColRemarksNoAttach : undefined,
        };
      }
    } else {
      if (hasAnyAttachments) {
        return {
          category: hasAnyRemarks
            ? styles.detailColCategoryUnpricedWithRemarks
            : styles.detailColCategoryUnpriced,
          attachment: hasAnyRemarks
            ? styles.detailColAttachmentWithRemarks
            : styles.detailColAttachment,
          remarks: styles.detailColRemarks,
        };
      } else {
        return {
          category: hasAnyRemarks
            ? styles.detailColCategoryUnpricedWithRemarksNoAttach
            : styles.detailColCategoryUnpricedNoAttach,
          attachment: undefined,
          remarks: hasAnyRemarks ? styles.detailColRemarksNoAttach : undefined,
        };
      }
    }
  };

  const colStyles = getColStyles();

  // Format date for DN display
  const formatDNDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Helper: renders all subcategories + items for a given category
  const renderCategoryContent = (category: string, categoryIndex: number) => {
    const subCategories = Object.entries(boqLines[category]);

    return subCategories.map(([subCategory, items], subIndex) => {
      const subCategoryTotal = items.reduce(
        (sum, item) =>
          sum + calculateLineTotal(item.rate_per_quantity, item.quantity),
        0,
      );

      return (
        <View key={subIndex}>
          {/* Subcategory Title + Table Header — kept together */}
          <View wrap={false}>
            <Text
              style={styles.subCategoryTitle}
              hyphenationCallback={(word) => [word]}
            >
              {categoryIndex + 1}.{subIndex + 1} {category.toUpperCase()} /{" "}
              {subCategory.toUpperCase()}
            </Text>

            <View style={styles.detailTableHeader}>
              <Text style={styles.detailColItemNo}>#</Text>

              {showDN && (
                <Text style={styles.detailColDNNumber}>DN NUMBER & DATE</Text>
              )}

              <Text style={colStyles.category}>ITEM</Text>
              <Text style={styles.detailColQty}>QTY</Text>

              {showPrices && !showDN && (
                <>
                  <Text style={styles.detailColRate}>RATE</Text>
                  <Text style={styles.detailColTotal}>TOTAL PRICE</Text>
                </>
              )}

              {hasAnyAttachments && (
                <Text style={colStyles.attachment}>ATTACHMENT(S)</Text>
              )}

              {hasAnyRemarks && <Text style={colStyles.remarks}>REMARKS</Text>}
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

                {showDN && (
                  <Text style={styles.detailColDNNumber}>
                    {item.dn_number_and_date || "-"}
                  </Text>
                )}

                <View style={colStyles.category}>
                  <Text
                    style={{ fontFamily: "Mont-Bold", marginBottom: 5 }}
                    hyphenationCallback={(word) => [word]}
                  >
                    {item.item_name}
                  </Text>

                  {item.item_description && (
                    <Text
                      style={{ marginBottom: 5 }}
                      hyphenationCallback={(word) => [word]}
                    >
                      {item.item_description}
                    </Text>
                  )}

                  {(item.location || item.scope_of_work) && (
                    <View style={styles.locationScopeRow}>
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
                  {formatQuantity(item.quantity)} {item.unit}
                </Text>

                {showPrices && !showDN && (
                  <>
                    <Text style={styles.detailColRate}>
                      {formatMoney(item.rate_per_quantity)}
                    </Text>
                    <Text style={styles.detailColTotal}>
                      {boqHeader.currency}{" "}
                      {formatMoney(
                        calculateLineTotal(
                          item.rate_per_quantity,
                          item.quantity,
                        ),
                      )}
                    </Text>
                  </>
                )}

                {hasAnyAttachments && (
                  <View style={colStyles.attachment}>
                    {item.attachments &&
                      Array.isArray(item.attachments) &&
                      item.attachments.length > 0 && (
                        <View style={styles.attachmentContainer}>
                          {item.attachments.map(
                            (base64Url: string, i: number) => {
                              if (!base64Url || base64Url.trim() === "")
                                return null;
                              return (
                                <View key={i} style={styles.attachmentWrapper}>
                                  <Image
                                    src={base64Url}
                                    style={styles.attachmentImage}
                                  />
                                </View>
                              );
                            },
                          )}
                        </View>
                      )}
                  </View>
                )}

                {hasAnyRemarks && (
                  <Text style={colStyles.remarks}>{item.remarks || ""}</Text>
                )}
              </View>
            );
          })}

          {/* Subtotal Row — priced mode only */}
          {showPrices && !showDN && (
            <View style={styles.subtotalRow} wrap={false}>
              <Text style={styles.detailColItemNo}></Text>
              <Text
                style={colStyles.category}
                hyphenationCallback={(word) => [word]}
              >
                SUBTOTAL
              </Text>
              <Text style={styles.detailColQty}></Text>
              <Text style={styles.detailColRate}></Text>
              <Text style={styles.detailColTotal}>
                {boqHeader.currency} {formatMoney(subCategoryTotal)}
              </Text>
              {hasAnyAttachments && <Text style={colStyles.attachment}></Text>}
              {hasAnyRemarks && <Text style={colStyles.remarks}></Text>}
            </View>
          )}
        </View>
      );
    });
  };

  // When unpriced/DN: items start on page 1 (no summary page).
  // When priced: summary is page 1, items each get their own page.
  const detailCategories = showPrices ? categories : categories.slice(1);
  const firstCategoryForPage1 =
    !showPrices && categories.length > 0 ? categories[0] : null;

  return (
    <Document>
      {/* Page 1 — Header + Document Info + (priced: Summary | unpriced: first category items) */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            {isReference ? (
              <>
                BILL OF QUANTITY <Text style={styles.titleBold}>REFERENCE</Text>
              </>
            ) : (
              <>
                BILL OF <Text style={styles.titleBold}>QUANTITY</Text>
              </>
            )}
          </Text>
        </View>

        {/* Document Info */}
        {isReference && mrHeader ? (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>MR NUMBER</Text>
                <Text style={styles.infoValue}>
                  MR-{String(mrHeader.id).padStart(5, "0")}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>BOQ NUMBER</Text>
                <Text style={styles.infoValue}>
                  BOQ-{String(boqHeader.id).padStart(5, "0")}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>BOQ NAME</Text>
                <Text style={styles.infoValue}>{boqHeader.name || "-"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>DATE</Text>
                <Text style={styles.infoValue}>
                  {mrHeader.date_requested
                    ? new Date(mrHeader.date_requested).toLocaleDateString(
                        "en-GB",
                      )
                    : new Date().toLocaleDateString("en-GB")}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>PROJECT</Text>
                <Text style={styles.infoValue}>
                  {mrHeader.project_name || "-"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>REQUESTED BY</Text>
                <Text style={styles.infoValue}>
                  {mrHeader.requested_by || "-"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>PURPOSE</Text>
                <Text style={styles.infoValue}>
                  {mrHeader.purpose_name || "-"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
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
                    ? new Date(mrHeader.required_date).toLocaleDateString(
                        "en-GB",
                      )
                    : "-"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>ITEM</Text>
                <Text style={styles.infoValue}>{itemName || "-"}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
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
                    ? new Date(boqHeader.boq_date).toLocaleDateString("en-GB")
                    : new Date().toLocaleDateString("en-GB")}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>PROJECT</Text>
                <Text style={styles.infoValue}>{boqHeader.project_name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>BOQ NAME</Text>
                <Text style={styles.infoValue}>{boqHeader.name || "-"}</Text>
              </View>
            </View>
          </>
        )}

        {/* ── PRICED: Summary table + totals + terms ── */}
        {showPrices && (
          <>
            <View style={styles.table}>
              <Text style={styles.summaryTitle}>SUMMARY</Text>

              <View style={styles.tableHeader}>
                <Text style={styles.tableColItemNo}>ITEM NO</Text>
                <Text style={styles.tableColDescription}>CATEGORY</Text>
                <Text style={styles.tableColAmount}>AMOUNT</Text>
              </View>

              {categories.map((category, categoryIndex) => {
                const categoryTotal = Object.values(
                  categoryTotals[category],
                ).reduce((sum, val) => sum + val, 0);

                const rowStyle =
                  categoryIndex % 2 === 0
                    ? styles.tableRowOdd
                    : styles.tableRowEven;

                return (
                  <View key={categoryIndex} style={rowStyle} wrap={false}>
                    <Text style={styles.tableColItemNo}>
                      {categoryIndex + 1}.0
                    </Text>
                    <Text style={styles.tableColDescription}>
                      {category.toUpperCase()}
                    </Text>
                    <Text style={styles.tableColAmount}>
                      {boqHeader.currency} {formatMoney(categoryTotal)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Keep all total rows together — advance as a unit if they don't fit */}
            <View wrap={false}>
              <View style={styles.totalRowAlt}>
                <Text style={styles.totalLabel}>SUBTOTAL</Text>
                <Text style={styles.totalValue}>
                  {boqHeader.currency} {formatMoney(grandTotal)}
                </Text>
              </View>

              {Number(boqHeader.discount) > 0 && (
                <View style={styles.totalRowAlt}>
                  <Text style={styles.totalLabel}>SPECIAL DISCOUNT</Text>
                  <Text style={styles.totalValue}>
                    {boqHeader.currency} {formatMoney(boqHeader.discount)}
                  </Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GRAND TOTAL</Text>
                <Text style={styles.totalValue}>
                  {boqHeader.currency}{" "}
                  {formatMoney(grandTotal - (Number(boqHeader.discount) || 0))}
                </Text>
              </View>
            </View>

            {/* Terms — only in standard (non-reference) mode */}
            {!isReference && (
              <View style={styles.bottomSection}>
                {boqHeader.payment_terms && (
                  <View style={styles.termsSection}>
                    <Text style={styles.termsTitle}>PAYMENT TERMS</Text>
                    <Text style={styles.termsText}>
                      {boqHeader.payment_terms}
                    </Text>
                  </View>
                )}
                {boqHeader.validity_terms && (
                  <View style={styles.termsSection}>
                    <Text style={styles.termsTitle}>VALIDITY TERMS</Text>
                    <Text style={styles.termsText}>
                      {boqHeader.validity_terms}
                    </Text>
                  </View>
                )}
                {boqHeader.warranty && (
                  <View style={styles.termsSection}>
                    <Text style={styles.termsTitle}>WARRANTY</Text>
                    <Text style={styles.termsText}>{boqHeader.warranty}</Text>
                  </View>
                )}
                {boqHeader.completion && (
                  <View style={styles.termsSection}>
                    <Text style={styles.termsTitle}>COMPLETION</Text>
                    <Text style={styles.termsText}>{boqHeader.completion}</Text>
                  </View>
                )}
                {boqHeader.exclusion && (
                  <View style={styles.termsSection}>
                    <Text style={styles.termsTitle}>EXCLUSIONS</Text>
                    <Text style={styles.termsText}>{boqHeader.exclusion}</Text>
                  </View>
                )}
                {boqHeader.terms_and_conditions && (
                  <View style={styles.termsSection}>
                    <Text style={styles.termsTitle}>TERMS & CONDITIONS</Text>
                    <Text style={styles.termsText}>
                      {boqHeader.terms_and_conditions}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* ── UNPRICED / DN: first category items start directly on page 1 ── */}
        {firstCategoryForPage1 &&
          renderCategoryContent(firstCategoryForPage1, 0)}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber }) => `${String(pageNumber).padStart(2, "0")}`}
          fixed
        />
      </Page>

      {/* Detail Pages — all categories (priced) or categories[1+] (unpriced/DN) */}
      {detailCategories.map((category, idx) => {
        // For priced: categoryIndex = idx (0-based over all categories)
        // For unpriced: categoryIndex = idx + 1 (categories[0] was on page 1)
        const categoryIndex = showPrices ? idx : idx + 1;

        return (
          <Page key={categoryIndex} size="A4" style={styles.page}>
            {renderCategoryContent(category, categoryIndex)}
            <Text
              style={styles.pageNumber}
              render={({ pageNumber }) =>
                `${String(pageNumber).padStart(2, "0")}`
              }
              fixed
            />
          </Page>
        );
      })}
    </Document>
  );
}
