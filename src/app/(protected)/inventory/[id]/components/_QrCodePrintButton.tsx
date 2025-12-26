"use client";

import { useRef } from "react";
import Button from "@/app/components/Button";
import { pdf } from "@react-pdf/renderer";
import { QrCodePDF } from "./QrCodePDF";
import { QRCodeSVG } from "qrcode.react";
import { InventoryItem } from "../../types/inventoryItem";

type QrCodePrintButtonProps = {
  item: InventoryItem;
};

export default function QrCodePrintButton({ item }: QrCodePrintButtonProps) {
  const printIcon = "/icons/printer.svg";
  const qrcodeRef = useRef<HTMLDivElement>(null);

  const svgToPngDataUrl = async (
    svg: SVGElement,
    width: number,
    height: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG"));
      };
      img.src = url;
    });
  };

  async function handlePrint() {
    if (!item.id) {
      console.log("No itemID");
      return;
    }

    try {
      // Get SVG element
      const qrcodeSvg = qrcodeRef.current?.querySelector("svg");

      if (!qrcodeSvg) {
        console.error("SVG element not found");
        alert("SVG element not found. Please try again.");
        return;
      }

      // Convert to PNG data URL
      const qrcodeDataUrl = await svgToPngDataUrl(qrcodeSvg, 300, 300);

      // Generate PDF blob
      const blob = await pdf(
        <QrCodePDF inventoryItem={item} qrcodeDataUrl={qrcodeDataUrl} />
      ).toBlob();

      console.log("PDF blob size:", blob.size);

      // Create blob URL
      const url = URL.createObjectURL(blob);

      // Open in new window/tab for printing
      const printWindow = window.open(url, "_blank");

      if (!printWindow) {
        alert("Please allow pop-ups to print");
        URL.revokeObjectURL(url);
        return;
      }

      // Wait for PDF to load, then trigger print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

      // Cleanup after a delay (to allow printing to complete)
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      console.log("Print dialog opened!");
    } catch (error) {
      console.error("Error generating PDF for print:", error);
      alert(`Error: ${error}`);
    }
  }

  return (
    <>
      {/* Hidden element to render QR code */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          visibility: "hidden",
        }}
      >
        <div ref={qrcodeRef} id="qrcode-container">
          <QRCodeSVG value={`/inventory/${item.id}`} size={150} />
        </div>
      </div>

      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        style={{ padding: "7px 7px" }}
        onClick={handlePrint}
      >
        <img src={printIcon} alt="print" />
      </Button>
    </>
  );
}
