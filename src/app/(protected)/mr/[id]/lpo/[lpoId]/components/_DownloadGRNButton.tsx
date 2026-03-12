"use client";

import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { GrnData, GrnPDF } from "./GrnPDF";

type DownloadGRNButtonProps = {
  grnId: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  bgColor?: string;
  label?: string;
};

export default function DownloadGRNButton({
  grnId,
  children,
  style,
  bgColor = "rgba(239, 239, 239, 1)",
  label = "GRN",
}: DownloadGRNButtonProps) {
  const downloadIcon = "/icons/download.svg";

  async function urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  function parseAttachmentUrl(raw: any): string | null {
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        if (typeof parsed === "string") return parsed;
      } catch {
        // Plain URL string
        return raw;
      }
    }
    if (Array.isArray(raw) && raw.length > 0) return raw[0];
    return null;
  }

  async function handleDownload() {
    try {
      // 1. Fetch GRN data
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGrnData`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grn_id: grnId }),
        },
      );

      const result = await response.json();

      if (!result.success || !result.data) {
        console.error("Failed to fetch GRN data:", result.message);
        return;
      }

      const grnData: GrnData & {
        items: (GrnData["items"][0] & { attachment_url?: string })[];
      } = result.data;

      // 2. Convert attachment images to base64
      for (const item of grnData.items) {
        const url = parseAttachmentUrl((item as any).attachment_url);
        if (url) {
          const base64 = await urlToBase64(url);
          if (base64) {
            item.attachment_image = base64;
          }
        }
      }

      // 3. Generate PDF
      const blob = await pdf(<GrnPDF data={grnData} />).toBlob();

      // 4. Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GRN-${String(grnData.grn_id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating GRN PDF:", error);
    }
  }

  if (label || children) {
    return (
      <Button
        componentType={"none"}
        bgColor={bgColor}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        style={style || { padding: "7px 7px" }}
      >
        <>
          {label || children}{" "}
          <img src={downloadIcon} alt="download" onClick={handleDownload} />
        </>
      </Button>
    );
  }

  return (
    <Button
      componentType={"none"}
      bgColor={bgColor}
      borderColor={"rgba(207, 207, 207, 1)"}
      textColor={"black"}
      style={style || { padding: "7px 7px" }}
    >
      <img src={downloadIcon} alt="download" onClick={handleDownload} />
    </Button>
  );
}
