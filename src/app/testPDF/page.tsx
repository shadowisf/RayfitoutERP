// app/pdf-preview/page.tsx
"use client";

import dynamic from "next/dynamic";
import { LPOPDF } from "./components/LPOPDF";

// Dynamically import PDF components with no SSR
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

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

          {/* <PDFDownloadLink
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
          </PDFDownloadLink> */}
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
          {/* <PDFViewer width="100%" height="800px">
            <PurchaseOrderPDF data={sampleData} />
          </PDFViewer> */}
        </div>
      </div>
    </div>
  );
}
