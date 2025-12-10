// components/PurchaseOrderPDF.tsx

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Line,
} from "@react-pdf/renderer";

// types/purchase-order.ts

export interface PurchaseOrderItem {
  description: string;
  quantity: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Vendor {
  name: string;
  contact: string;
  address: string;
  email: string;
}

export interface ShipTo {
  name: string;
  address: string;
  phone: string;
}

export interface Summary {
  subtotal: number;
  discount: number;
  taxable: number;
  vatRate: number;
  vat: number;
  shipping: number;
  total: number;
}

export interface PurchaseOrder {
  id?: number;
  date: string;
  lpoNumber: string;
  quotation: string;
  trn: string;
  vendor: Vendor;
  shipTo: ShipTo;
  deliveryDate: string;
  items: PurchaseOrderItem[];
  summary: Summary;
  deliveryTerms: string[];
  paymentTerms: string;
}

interface PurchaseOrderPDFProps {
  data: PurchaseOrder;
}

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
    fontSize: 36,
    fontFamily: "Mont-SemiBold",
    color: "#000000",
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
    padding: "5 10",
    fontSize: 8,
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: "5 10",
    borderBottom: "1 solid #e0e0e0",
    fontSize: 8,
    color: "#333333",
  },
  tableColDescription: {
    width: "50%",
  },
  tableColQty: {
    width: "15%",
    textAlign: "center",
  },
  tableColUnitPrice: {
    width: "17.5%",
    textAlign: "right",
  },
  tableColTotalPrice: {
    width: "17.5%",
    textAlign: "right",
  },

  // Bottom Section - Two columns
  bottomSection: {
    flexDirection: "row",
    gap: 30,
    marginBottom: 20,
    alignItems: "flex-end", // Align terms to bottom
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
    height: 120,
  },
  signatureLabel: {
    fontFamily: "Mont-SemiBold",
    textTransform: "uppercase",
    fontSize: 8,
  },
});

export const PurchaseOrderPDF: React.FC<PurchaseOrderPDFProps> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Rayfitout</Text>
          <Text style={styles.title}>
            PURCHASE <Text style={styles.titleBold}>ORDER</Text>
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{data.date}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>LPO Number</Text>
            <Text style={styles.infoValue}>{data.lpoNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Quotation</Text>
            <Text style={styles.infoValue}>{data.quotation}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>TRN</Text>
            <Text style={styles.infoValue}>{data.trn}</Text>
          </View>
        </View>

        {/* Section Headers with Dotted Line - FULL WIDTH */}
        <View style={styles.sectionHeadersRow}>
          <Text style={styles.sectionHeader}>VENDOR/SUPPLIER</Text>

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
            <Text style={styles.partyName}>{data.vendor.name}</Text>
            <Text style={styles.partyContact}>{data.vendor.contact}</Text>
            <Text style={styles.partyContact}>{data.vendor.address}</Text>
            <Text style={styles.partyContact}>{data.vendor.email}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.partyName}>{data.shipTo.name}</Text>
            <Text style={styles.partyContact}>{data.shipTo.address}</Text>
            <Text style={styles.partyContact}>{data.shipTo.phone}</Text>
          </View>
        </View>

        {/* Delivery Date */}
        <View style={styles.deliveryDate}>
          <Text style={styles.infoLabel}>Delivery Date</Text>
          <Text style={styles.infoValue}>{data.deliveryDate}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColDescription}>MATERIAL DESCRIPTION</Text>
            <Text style={styles.tableColQty}>QTY</Text>
            <Text style={styles.tableColUnitPrice}>UNIT PRICE</Text>
            <Text style={styles.tableColTotalPrice}>TOTAL PRICE</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableColDescription}>{item.description}</Text>
              <Text style={styles.tableColQty}>{item.quantity}</Text>
              <Text style={styles.tableColUnitPrice}>{item.unitPrice} AED</Text>
              <Text style={styles.tableColTotalPrice}>
                {item.totalPrice} AED
              </Text>
            </View>
          ))}
        </View>

        {/* Bottom Section - Terms on Left, Summary + Signature on Right */}
        <View style={styles.bottomSection}>
          {/* Left Column - Terms */}
          <View style={styles.termsColumn}>
            {/* Delivery Terms */}
            <Text style={styles.termsTitle}>DELIVERY TERMS</Text>
            {data.deliveryTerms.map((term, index) => (
              <Text key={index} style={styles.termItem}>
                • {term}
              </Text>
            ))}

            {/* Payment Terms */}
            <Text style={[styles.termsTitle, { marginTop: 15 }]}>
              PAYMENT TERMS
            </Text>
            <Text style={styles.paymentTermsText}>{data.paymentTerms}</Text>
          </View>

          {/* Right Column - Summary + Signature */}
          <View style={styles.summarySignatureColumn}>
            {/* Summary Table with Borders */}
            <View style={styles.summaryTable}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SUB TOTAL</Text>
                <Text style={styles.summaryValue}>
                  {data.summary.subtotal} AED
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>DISCOUNT</Text>
                <Text style={styles.summaryValue}>
                  {data.summary.discount === 0
                    ? "-"
                    : `${data.summary.discount} AED`}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>S&H</Text>
                <Text style={styles.summaryValue}>{data.summary.shipping}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>TAXABLE</Text>
                <Text style={styles.summaryValue}>
                  {data.summary.taxable} AED
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>VAT RATE</Text>
                <Text style={styles.summaryValue}>{data.summary.vatRate}%</Text>
              </View>

              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabel}>VAT</Text>
                <Text style={styles.summaryValue}>{data.summary.vat} AED</Text>
              </View>
            </View>

            {/* Total Row */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{data.summary.total} AED</Text>
            </View>

            {/* Signature Box - Below Summary */}
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>SIGNATRURE</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
