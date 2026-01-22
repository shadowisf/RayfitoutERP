"use client";

import { useRef } from "react";
import Button from "@/app/components/Button";
import { pdf } from "@react-pdf/renderer";
import { QrCodePDF } from "./QrCodePDF";
import { QRCodeSVG } from "qrcode.react";
import { InventoryItem } from "../../types/inventoryItem";

type QrCodeDownloadButtonProps = {
  item: InventoryItem;
};

export default function QrCodeDownloadButton({
  item,
}: QrCodeDownloadButtonProps) {
  const downloadIcon = "/icons/download.svg";
  const qrcodeRef = useRef<HTMLDivElement>(null);

  const svgToPngDataUrl = async (
    svg: SVGElement,
    width: number,
    height: number,
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

  // URL to Base64 converter using API route
  async function urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.dataUrl) {
        throw new Error("Invalid response from proxy");
      }

      return data.dataUrl;
    } catch (error) {
      console.error("Failed to convert image:", url, error);
      return "";
    }
  }

  const getImageUrl = (image: string | null | undefined) => {
    if (!image) return null;
    try {
      const parsed = JSON.parse(image);
      return parsed;
    } catch (e) {
      return image;
    }
  };

  async function handleDownload() {
    if (!item.id) {
      console.log("No itemID");
      return;
    }

    try {
      // Get SVG elements
      const qrcodeSvg = qrcodeRef.current?.querySelector("svg");

      if (!qrcodeSvg) {
        console.error("SVG elements not found");
        alert("SVG elements not found. Please try again.");
        return;
      }

      console.log("Converting QR code to PNG...");
      // Convert QR code to PNG data URL
      const qrcodeDataUrl = await svgToPngDataUrl(qrcodeSvg, 300, 300);

      // Convert inventory image to base64 if exists
      let inventoryImageDataUrl: string | null = null;
      const imageUrl = getImageUrl(item.image);

      if (imageUrl) {
        try {
          console.log("Converting inventory image to base64...");
          inventoryImageDataUrl = await urlToBase64(imageUrl);

          if (inventoryImageDataUrl === "") {
            console.warn(
              "Failed to convert inventory image, continuing without it",
            );
          } else {
            console.log("Successfully converted inventory image");
          }
        } catch (error) {
          console.error("Error converting inventory image:", error);
          // Continue without the image
        }
      }

      console.log("Generating PDF...");
      const blob = await pdf(
        <QrCodePDF
          inventoryItem={item}
          qrcodeDataUrl={qrcodeDataUrl}
          inventoryImageDataUrl={inventoryImageDataUrl}
        />,
      ).toBlob();

      console.log("PDF blob size:", blob.size);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `INV-${String(item.id).padStart(5, "0")}.pdf`;

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
      {/* Hidden elements to render QR code */}
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
        onClick={handleDownload}
      >
        <img src={downloadIcon} alt="printer" />
      </Button>
    </>
  );
}
