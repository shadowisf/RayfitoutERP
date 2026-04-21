"use client";

import { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { LpoPDF } from "./LpoPDF";
import { GrnData, GrnPDF } from "./GrnPDF";
import { LpoHeader } from "../../../types/lpoHeader";
import { MrHeader } from "../../../types/mrHeader";

type DocumentsPopupProps = {
  lpoId: number;
};

export default function DocumentsPopup({ lpoId }: DocumentsPopupProps) {
  const fileIcon = "/icons/file.svg";
  const lpoIcon = "/icons/search-lpo.svg";
  const invIcon = "/icons/search-inv.svg";
  const prIcon = "/icons/search-pr.svg";
  const grnIcon = "/icons/search-grn.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [lpoDetails, setLpoDetails] = useState<LpoHeader | null>(null);
  const [mrHeader, setMrHeader] = useState<MrHeader | null>(null);
  const [grnId, setGrnId] = useState<number | null>(null);
  const [isLoadingLpo, setIsLoadingLpo] = useState(false);
  const [isLoadingGrn, setIsLoadingGrn] = useState(false);

  useEffect(() => {
    async function fetchLpoAndMr() {
      setIsLoadingLpo(true);
      try {
        const lpoRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );
        const lpoData = await lpoRes.json();

        if (lpoData.data) {
          setLpoDetails(lpoData.data as LpoHeader);

          if (lpoData.data.mr_header_id) {
            const mrRes = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: lpoData.data.mr_header_id }),
              },
            );
            const mrData = await mrRes.json();
            if (mrData?.id) {
              setMrHeader(mrData as MrHeader);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching LPO/MR details:", err);
      } finally {
        setIsLoadingLpo(false);
      }
    }

    async function fetchGrn() {
      setIsLoadingGrn(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );
        const data = await res.json();
        if (data.success && data.data?.id) {
          setGrnId(data.data.id);
        }
      } catch (err) {
        console.error("Error fetching GRN details:", err);
      } finally {
        setIsLoadingGrn(false);
      }
    }

    if (lpoId) {
      fetchLpoAndMr();
      fetchGrn();
    }
  }, [lpoId]);

  // ── helpers ───────────────────────────────────────────────────────────────

  function parseFileUrl(raw: string | string[] | null | undefined | any): string | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed[0] || null;
        if (typeof parsed === "string") return parsed;
      } catch {
        return raw;
      }
    }
    return null;
  }

  async function downloadFromUrl(url: string, filename: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }

  async function urlToBase64(url: string): Promise<string> {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.success && data.dataUrl ? data.dataUrl : "";
    } catch (err) {
      console.error("Failed to convert image:", url, err);
      return "";
    }
  }

  // ── download handlers ─────────────────────────────────────────────────────

  async function handleDownloadLpo() {
    const lpo = lpoDetails;
    const mr = mrHeader;
    if (!lpo || !mr) {
      toast("LPO data is still loading", "error");
      return;
    }
    try {
      const blob = await pdf(<LpoPDF lpo={lpo} mr={mr} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `LPO-${String(lpo.id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating LPO PDF:", err);
      toast("Failed to generate LPO PDF", "error");
    }
  }

  async function handleDownloadInvoice() {
    const invoiceUrl = parseFileUrl(lpoDetails?.invoice_file);
    if (!invoiceUrl) {
      toast("No invoice file available", "error");
      return;
    }
    try {
      await downloadFromUrl(
        invoiceUrl,
        `Invoice-LPO-${String(lpoId).padStart(5, "0")}`,
      );
    } catch (err) {
      console.error("Error downloading invoice:", err);
      toast("Failed to download invoice", "error");
    }
  }

  async function handleDownloadPaymentReceipt() {
    const prUrl = parseFileUrl(lpoDetails?.payment_file);
    if (!prUrl) {
      toast("No payment receipt available", "error");
      return;
    }
    try {
      await downloadFromUrl(
        prUrl,
        `Payment-Receipt-LPO-${String(lpoId).padStart(5, "0")}`,
      );
    } catch (err) {
      console.error("Error downloading payment receipt:", err);
      toast("Failed to download payment receipt", "error");
    }
  }

  async function handleDownloadGrn() {
    if (!grnId) {
      toast("No GRN available", "error");
      return;
    }
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGrnData`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grn_id: grnId }),
        },
      );
      const result = await res.json();
      if (!result.success || !result.data) {
        toast("Failed to fetch GRN data", "error");
        return;
      }

      const grnData: GrnData & {
        items: (GrnData["items"][0] & { attachment_url?: string })[];
      } = result.data;

      for (const item of grnData.items) {
        const rawUrl = (item as any).attachment_url;
        if (rawUrl) {
          const url = parseFileUrl(rawUrl) || rawUrl;
          const base64 = await urlToBase64(url);
          if (base64) item.attachment_image = base64;
        }
      }

      const blob = await pdf(<GrnPDF data={grnData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GRN-${String(grnData.grn_id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating GRN PDF:", err);
      toast("Failed to generate GRN PDF", "error");
    }
  }

  // ── document card config ──────────────────────────────────────────────────

  const hasLpo = !!(lpoDetails && mrHeader);
  const hasInvoice = !!parseFileUrl(lpoDetails?.invoice_file);
  const hasPaymentReceipt = !!parseFileUrl(lpoDetails?.payment_file);
  const hasGrn = !!grnId;

  const documents = [
    {
      key: "lpo",
      icon: lpoIcon,
      label: "LPO",
      available: hasLpo,
      loading: isLoadingLpo,
      onClick: handleDownloadLpo,
    },
    {
      key: "inv",
      icon: invIcon,
      label: "INVOICE",
      available: hasInvoice,
      loading: isLoadingLpo,
      onClick: handleDownloadInvoice,
    },
    {
      key: "pr",
      icon: prIcon,
      label: "PAYMENT RECEIPT",
      available: hasPaymentReceipt,
      loading: isLoadingLpo,
      onClick: handleDownloadPaymentReceipt,
    },
    {
      key: "grn",
      icon: grnIcon,
      label: "GRN",
      available: hasGrn,
      loading: isLoadingGrn,
      onClick: handleDownloadGrn,
    },
  ];

  return (
    <>
      <Button
        componentType="button"
        bgColor="white"
        borderColor="rgba(207, 207, 207, 1)"
        textColor="black"
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", borderRadius: "25px" }}
      >
        <img src={fileIcon} alt="documents" />
        Documents
      </Button>

      {isOpen && (
        <FormPopUp
          header="DOCUMENTS"
          setIsOpen={setIsOpen}
          style={{ width: "600px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
            }}
          >
            {documents.map((doc) => (
              <div
                key={doc.key}
                onClick={doc.available && !doc.loading ? doc.onClick : undefined}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "14px",
                  padding: "24px 12px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(245, 245, 245, 1)",
                  cursor: doc.loading
                    ? "wait"
                    : doc.available
                      ? "pointer"
                      : "not-allowed",
                  opacity: doc.loading ? 0.6 : doc.available ? 1 : 0.35,
                  transition: "opacity 0.15s",
                }}
              >
                <img
                  src={doc.icon}
                  alt={doc.label}
                  style={{ width: "72px", height: "auto" }}
                />
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "12px",
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  {doc.label}
                </span>
              </div>
            ))}
          </div>
        </FormPopUp>
      )}
    </>
  );
}
