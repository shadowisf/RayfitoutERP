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
import { LpoHeader } from "@/app/(protected)/mr/[id]/types/lpoHeader";
import { MrHeader } from "../../../types/mrHeader";

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

  // Section Headers Row - FULL WIDTH
  sectionHeadersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },

  // Section Header - FULL WIDTH
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

  // Delivery Date
  deliveryDate: {
    marginBottom: 30,
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
  tableColDescription: {
    width: "65%",
    paddingRight: 4,
  },
  tableColDescriptionWide: {
    width: "75%",
    paddingRight: 4,
  },
  tableColBrandAndSpecs: {
    width: "30%",
    paddingRight: 4,
  },
  tableColQty: {
    width: "20%",
    paddingRight: 4,
  },
  tableColUnitPrice: {
    width: "17.5%",
    paddingRight: 4,
  },
  tableColTotalPrice: {
    width: "17.5%",
    paddingRight: 4,
  },

  // Bottom Section - Two columns
  bottomSection: {
    flexDirection: "row",
    gap: 30,
    marginBottom: 20,
    alignItems: "flex-end",
  },

  // Left Column - Terms
  termsColumn: {
    flex: 1,
    fontSize: 8,
    color: "#333333",
  },
  termsTitle: {
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    fontSize: 8,
    marginBottom: 6,
    marginTop: 0,
  },
  termItem: {
    marginBottom: 5,
    fontSize: 8,
    lineHeight: 1.4,
  },
  paymentTermsText: {
    fontSize: 8,
    lineHeight: 1.4,
  },

  // Right Column - Summary + Signature
  summarySignatureColumn: {
    flex: 1,
  },

  // Summary Table with borders
  summaryTable: {
    border: "1 solid #e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingTop: 5,
    paddingBottom: 2,
    paddingRight: 10,
    fontSize: 8,
    borderBottom: "1 solid #e0e0e0",
  },
  summaryRowLast: {
    borderBottom: "none",
  },
  summaryLabel: {
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    fontSize: 8,
  },
  summaryValue: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
    textAlign: "right",
  },
  totalRow: {
    backgroundColor: "#000000",
    color: "#ffffff",
    paddingLeft: 10,
    paddingTop: 5,
    paddingBottom: 2,
    paddingRight: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 5,
    marginBottom: 25,
  },
  totalLabel: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
  },
  totalValue: {
    fontFamily: "Mont-SemiBold",
    fontSize: 8,
    textAlign: "right",
  },

  // Signature Box
  signatureBox: {
    border: "1 solid #000000",
    borderRadius: 8,
    padding: 10,
    height: 150,
  },
  signatureLabel: {
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    fontSize: 8,
  },
});

type LpoPDFProps = {
  lpo: LpoHeader;
  mr: MrHeader;
};

export function LpoPDF({ lpo, mr }: LpoPDFProps) {
  const logo = "/icons/logo.jpg";

  const formatQuantity = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return "0";

    if (Number.isInteger(num)) {
      return num.toLocaleString("en-US");
    }

    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  };

  const formatMoney = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return "0.00";

    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const vatRate = Number(lpo.vat_rate) || 0;
  const discountRate = Number(lpo.discount) || 0;
  const shipping = Number(lpo.shipping_and_handling) || 0;

  const subtotal = lpo.lpo_mr_lines.reduce((sum, item) => {
    const unitPrice = Number(item.unit_price) || 0;
    const quantity = Number(item.approved_proposed_quantity) || 0;
    return sum + unitPrice * quantity;
  }, 0);

  const discountAmount = subtotal * (discountRate / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const subtotalWithShipping = subtotalAfterDiscount + shipping;
  const vatAmount = subtotalWithShipping * (vatRate / 100);
  const total = subtotalWithShipping + vatAmount;

  // Check if any line has brand or specification
  const hasAnyBrandOrSpecs = lpo.lpo_mr_lines.some(
    (item) =>
      (item.brand && item.brand.trim() !== "") ||
      (item.specification && item.specification.trim() !== ""),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <Text style={styles.title}>
            LOCAL PURCHASE <Text style={styles.titleBold}>ORDER</Text>
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {new Date(mr.date_requested).toLocaleDateString("en-GB")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LPO Number</Text>
            <Text style={styles.infoValue}>
              LPO-{String(lpo.id).padStart(5, "0")}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Quotation Reference</Text>
            <Text style={styles.infoValue}>
              {String(lpo.quotation_code).padStart(5, "0")}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRN</Text>
            <Text style={styles.infoValue}>
              {lpo.supplier_trn_number || "-"}
            </Text>
          </View>
        </View>

        {/* Section Headers with Dotted Line - FULL WIDTH */}
        <View style={styles.sectionHeadersRow}>
          <Text style={styles.sectionHeader}>VENDOR</Text>

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

          <Text style={styles.sectionHeader}>SHIP TO</Text>
        </View>

        {/* Vendor and Ship To Content */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.partyName}>{lpo.supplier_name}</Text>
            <Text style={styles.partyContact}>
              {lpo.supplier_contact_person_name}
            </Text>
            <Text style={styles.partyContact}>{lpo.supplier_address}</Text>
            <Text style={styles.partyContact}>{lpo.supplier_email}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.partyName}>RAY FITOUT CONTRACTING LLC</Text>
            <Text style={styles.partyContact}>
              STREET 34, AL QUSAIS INDUSTRIAL 5, DUBAI, UNITED ARAB EMIRATES
            </Text>
            <Text style={styles.partyContact}>+97142633392</Text>
          </View>
        </View>

        {/* Delivery Date */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Delivery Date</Text>
            <Text style={styles.infoValue}>
              {new Date(lpo.delivery_date).toLocaleDateString("en-GB")}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Project</Text>
            <Text style={styles.infoValue}>{lpo.project_name}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text
              style={
                hasAnyBrandOrSpecs
                  ? styles.tableColDescription
                  : styles.tableColDescriptionWide
              }
            >
              ITEM
            </Text>
            {hasAnyBrandOrSpecs && (
              <Text style={styles.tableColBrandAndSpecs}>BRAND & SPECS</Text>
            )}
            <Text style={styles.tableColQty}>QTY</Text>
            <Text style={styles.tableColUnitPrice}>UNIT PRICE</Text>
            <Text style={styles.tableColTotalPrice}>TOTAL PRICE</Text>
          </View>
          {lpo.lpo_mr_lines.map((item, index) => {
            const unitPrice = Number(item.unit_price) || 0;
            const quantity = Number(item.approved_proposed_quantity) || 0;
            const lineTotal = unitPrice * quantity;

            return (
              <View key={index} style={styles.tableRow}>
                <Text
                  style={
                    hasAnyBrandOrSpecs
                      ? styles.tableColDescription
                      : styles.tableColDescriptionWide
                  }
                >
                  {item.material_description}
                </Text>
                {hasAnyBrandOrSpecs && (
                  <Text style={styles.tableColBrandAndSpecs}>
                    {item.brand && item.specification
                      ? `Brand: ${item.brand}, Specification: ${item.specification}`
                      : item.brand
                        ? `Brand: ${item.brand}`
                        : item.specification
                          ? `Specification: ${item.specification}`
                          : "-"}
                  </Text>
                )}
                <Text style={styles.tableColQty}>
                  {formatQuantity(quantity)} {item.unit}
                </Text>
                <Text style={styles.tableColUnitPrice}>
                  AED {formatMoney(unitPrice)}
                </Text>
                <Text style={styles.tableColTotalPrice}>
                  AED {formatMoney(lineTotal)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Bottom Section - Terms on Left, Summary + Signature on Right */}
        <View style={styles.bottomSection} wrap={false}>
          {/* Left Column - Terms */}
          <View style={styles.termsColumn}>
            {/* Delivery Terms */}
            <Text style={styles.termsTitle}>DELIVERY TERMS</Text>
            <Text style={styles.termItem}>{lpo.delivery_terms}</Text>

            {/* Payment Terms */}
            <Text style={[styles.termsTitle, { marginTop: 15 }]}>
              PAYMENT TERMS
            </Text>
            <Text style={styles.paymentTermsText}>{lpo.payment_terms}</Text>
          </View>

          {/* Right Column - Summary + Signature */}
          <View style={styles.summarySignatureColumn}>
            {/* Summary Table with Borders */}
            <View style={styles.summaryTable}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SUBTOTAL</Text>
                <Text style={styles.summaryValue}>
                  AED {formatMoney(subtotal)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  DISCOUNT ({discountRate}%)
                </Text>
                <Text style={styles.summaryValue}>
                  - AED {formatMoney(discountAmount)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>S&H</Text>
                <Text style={styles.summaryValue}>
                  AED {formatMoney(shipping)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>VAT ({vatRate}%)</Text>
                <Text style={styles.summaryValue}>
                  AED {formatMoney(vatAmount)}
                </Text>
              </View>

              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabel}>SUBTOTAL AFTER VAT</Text>
                <Text style={styles.summaryValue}>
                  AED {formatMoney(subtotalAfterDiscount + vatAmount)}
                </Text>
              </View>
            </View>

            {/* Total Row */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>AED {formatMoney(total)}</Text>
            </View>

            {/* Signature Box - Below Summary */}
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>SIGNATURE</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
