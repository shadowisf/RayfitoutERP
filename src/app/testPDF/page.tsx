// app/pdf-preview/page.tsx
"use client";

import dynamic from "next/dynamic";
import { PurchaseOrderPDF } from "./components/PurchaseOrderPDF";

// Dynamically import PDF components with no SSR
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

const sampleData = {
  date: "DECEMBER 10, 2025",
  lpoNumber: "PO-00451",
  quotation: "QT-240092",
  trn: "100301561900003",
  vendor: {
    name: "ALRAHMANI GENERAL TRADING CO LLC.",
    contact: "MOHAMMAD YUSUF",
    address: "AL RAHMANI BUILDING, HOR AL ANZ STREET, DEIRA, DUBAI, UAE",
    email: "SALES@ALRAHMANI.COM",
  },
  shipTo: {
    name: "RAY FITOUT CONTRACTING LLC",
    address: "STREET 34, AL QUSAIS INDUSTRIAL 5, DUBAI, UNITED ARAB EMIRATES",
    phone: "+97142633392",
  },
  deliveryDate: "DECEMBER, 13, 2025",
  items: [
    {
      description: "12mm black profile",
      quantity: "7 pcs",
      unitPrice: 20,
      totalPrice: 140,
    },
    {
      description: "11mm black profile",
      quantity: "2 pcs",
      unitPrice: 20,
      totalPrice: 40,
    },
    {
      description: "10mm black profile",
      quantity: "6 pcs",
      unitPrice: 20,
      totalPrice: 120,
    },
  ],
  summary: {
    subtotal: 300,
    discount: 0,
    taxable: 300,
    vatRate: 5,
    vat: 15,
    shipping: 0,
    total: 315,
  },
  deliveryTerms: [
    "DELIVERY WILL BE MADE TO STREET 34, AL QUSAIS 5, DUBAI, UAE",
    "ANY DEVIATIONS OR DAMAGES WILL BE RESPONSIBILITY OF THE SUPPLIER",
  ],
  paymentTerms: "NET 30 DAYS VIA BANK TRANSFER / CHEQUE",
};

export default function PDFPreviewPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              marginBottom: "16px",
            }}
          >
            Purchase Order PDF
          </h1>

          <PDFDownloadLink
            document={<PurchaseOrderPDF data={sampleData} />}
            fileName={`${sampleData.lpoNumber}.pdf`}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#000",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            {({ loading }) =>
              loading ? "Generating PDF..." : "📄 Download PDF"
            }
          </PDFDownloadLink>
        </div>

        {/* PDF Preview */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
          }}
        >
          <PDFViewer width="100%" height="800px">
            <PurchaseOrderPDF data={sampleData} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}
