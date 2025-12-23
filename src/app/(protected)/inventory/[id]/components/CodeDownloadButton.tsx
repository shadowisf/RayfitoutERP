"use client";

import { useRef } from "react";
import Button from "@/app/components/Button";
import { pdf } from "@react-pdf/renderer";
import { CodePDF } from "./CodePDF";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { InventoryItem } from "../../types/inventoryItem";

type CodeDownloadButtonProps = {
  item: InventoryItem;
};

export default function CodeDownloadButton({ item }: CodeDownloadButtonProps) {
  const printerIcon = "/icons/printer.svg";
  const barcodeRef = useRef<HTMLDivElement>(null);
  const qrcodeRef = useRef<HTMLDivElement>(null);

  const svgToPngDataUrl = async (
    svg: SVGElement,
    width: number,
    height: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Create a canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Serialize SVG to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      // Create an image and draw it on canvas
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

  async function handleDownload() {
    if (!item.id) {
      console.log("No itemID");
      return;
    }

    try {
      // Get SVG elements
      const barcodeSvg = barcodeRef.current?.querySelector("svg");
      const qrcodeSvg = qrcodeRef.current?.querySelector("svg");

      if (!barcodeSvg || !qrcodeSvg) {
        console.error("SVG elements not found");
        alert("SVG elements not found. Please try again.");
        return;
      }

      // Convert to PNG data URLs

      const barcodeDataUrl = await svgToPngDataUrl(barcodeSvg, 400, 150);

      const qrcodeDataUrl = await svgToPngDataUrl(qrcodeSvg, 300, 300);

      const blob = await pdf(
        <CodePDF
          itemCategory={item.category_name}
          itemDescription={item.description}
          barcodeDataUrl={barcodeDataUrl}
          qrcodeDataUrl={qrcodeDataUrl}
        />
      ).toBlob();

      console.log("PDF blob size:", blob.size);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MRT-${String(item.id).padStart(5, "0")}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("Download complete!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Error: ${error}`);
    }
  }

  return (
    <>
      {/* Hidden elements to render barcode and QR code */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          visibility: "hidden",
        }}
      >
        <div ref={barcodeRef} id="barcode-container">
          <Barcode
            value={`MRT-${item.id.toString().padStart(5, "0")}`}
            format="CODE128"
            width={2}
            height={75}
            displayValue={true}
          />
        </div>
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
        onClick={handleDownload}
      >
        <img src={printerIcon} alt="printer" />
      </Button>
    </>
  );
}
