import type { MrViewInitialData } from "../types/mrViewInitialData";

type GroupedMrLines = {
  [category: string]: {
    [subCategory: string]: {
      [supplier: string]: any[];
    };
  };
};

function flatItems(mrLines: GroupedMrLines): any[] {
  const out: any[] = [];
  for (const cat in mrLines)
    for (const sub in mrLines[cat])
      for (const sup in mrLines[cat][sub])
        out.push(...mrLines[cat][sub][sup]);
  return out;
}

function uniqueSuppliers(
  mrLines: GroupedMrLines,
): Map<number, { name: string; type: string }> {
  const map = new Map<number, { name: string; type: string }>();
  for (const cat in mrLines)
    for (const sub in mrLines[cat])
      for (const sup in mrLines[cat][sub]) {
        const items = mrLines[cat][sub][sup];
        if (items.length > 0 && items[0].approved_supplier_id)
          map.set(items[0].approved_supplier_id, {
            name: sup,
            type: items[0].approved_supplier_type || "",
          });
      }
  return map;
}

async function safeFetch(url: string, opts?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function prefetchMrViewData(
  mrLines: GroupedMrLines,
  mrHeaderId: number,
  progressId: number,
  baseUrl: string,
): Promise<MrViewInitialData> {
  const items = flatItems(mrLines);
  const suppliers = uniqueSuppliers(mrLines);

  const data: MrViewInitialData = {};

  // ── progress_id = 1: inventory status ────────────────────────────────────
  if (progressId === 1 && items.length > 0) {
    const descriptions: string[] = [];
    const predefinedIds: number[] = [];
    const descToId = new Map<string, number | null>();
    const aliasToDisplay = new Map<string, string>();

    for (const item of items) {
      if (item.material_description && !descriptions.includes(item.material_description)) {
        descriptions.push(item.material_description);
        descToId.set(item.material_description, item.predefined_item_id ?? null);
      }
      if (
        item.db_material_description &&
        item.db_material_description !== item.material_description &&
        !descriptions.includes(item.db_material_description)
      ) {
        descriptions.push(item.db_material_description);
        descToId.set(item.db_material_description, null);
        aliasToDisplay.set(item.db_material_description, item.material_description);
      }
    }
    for (const desc of descriptions) predefinedIds.push(descToId.get(desc) ?? 0);

    const encoded = encodeURIComponent(descriptions.join("||"));
    const encodedIds = encodeURIComponent(predefinedIds.join("||"));
    const invData = await safeFetch(
      `${baseUrl}/api/mr/getInventoryStatus?materials=${encoded}&predefined_ids=${encodedIds}`,
    );
    if (invData) {
      for (const [alias, primaryDesc] of aliasToDisplay.entries()) {
        const aliasMatches = invData[alias] ?? [];
        if (aliasMatches.length > 0) {
          const primary = invData[primaryDesc] ?? [];
          const merged = [...primary];
          for (const m of aliasMatches)
            if (!merged.find((x: any) => x.inventory_item_id === m.inventory_item_id))
              merged.push(m);
          invData[primaryDesc] = merged;
        }
        delete invData[alias];
      }
      data.itemInventoryStatus = invData;
    }
  }

  // ── progress_id = 7 or 10: material price stats ───────────────────────────
  if (progressId === 7 || progressId === 10) {
    const mats: string[] = [];
    for (const item of items)
      if (item.material_description && !mats.includes(item.material_description))
        mats.push(item.material_description);
    if (mats.length > 0) {
      const encoded = encodeURIComponent(mats.join("||"));
      const statsData = await safeFetch(
        `${baseUrl}/api/mr/getMaterialPriceStats?materials=${encoded}`,
      );
      if (statsData) data.materialPriceStats = statsData;
    }
  }

  // ── progress_id = 10: quotation price ranges ──────────────────────────────
  if (progressId === 10) {
    const rangesData = await safeFetch(
      `${baseUrl}/api/supplier/getQuotationPriceRangesByMrHeaderID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mr_header_id: mrHeaderId }),
      },
    );
    if (rangesData) data.quotationPriceRanges = rangesData;
  }

  // ── progress_id = 7 or 11: items with quotations ─────────────────────────
  if (progressId === 7 || progressId === 11) {
    const withQuotes: number[] = [];
    await Promise.all(
      items.map(async (item) => {
        const res = await safeFetch(
          `${baseUrl}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id }),
          },
        );
        if (Array.isArray(res) && res.length >= 1) withQuotes.push(item.id);
      }),
    );
    data.itemsWithQuotations = withQuotes;
  }

  // ── progress_id = 10 or 11: supplier approval status ─────────────────────
  if (progressId === 10 || progressId === 11) {
    const statusMap: Record<number, "approved" | "rejected" | "pending"> = {};
    await Promise.all(
      items.map(async (item) => {
        const res = await safeFetch(
          `${baseUrl}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id }),
          },
        );
        if (Array.isArray(res) && res.length > 0) {
          const hasApproved = res.some((q: any) => q.approval_status === "Approved");
          const allRejected = res.every((q: any) => q.approval_status === "Rejected");
          statusMap[item.id] = hasApproved ? "approved" : allRejected ? "rejected" : "pending";
        } else {
          statusMap[item.id] = "pending";
        }
      }),
    );
    data.supplierApprovalStatus = statusMap;
  }

  // ── progress_id = 9 or 11: QS approval status ────────────────────────────
  if (progressId === 9 || progressId === 11) {
    const statusMap: Record<number, "approved" | "rejected" | "pending"> = {};
    await Promise.all(
      items.map(async (item) => {
        const res = await safeFetch(
          `${baseUrl}/api/supplier/getAllSupplierAndQuotationByMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id }),
          },
        );
        if (Array.isArray(res) && res.length > 0) {
          const hasApproved = res.some((q: any) => q.qs_approval_status === "Approved");
          const allRejected = res.every((q: any) => q.qs_approval_status === "Rejected");
          statusMap[item.id] = hasApproved ? "approved" : allRejected ? "rejected" : "pending";
        } else {
          statusMap[item.id] = "pending";
        }
      }),
    );
    data.supplierQSApprovalStatus = statusMap;
  }

  // ── progress_id = 12, 13, or 16: LPO / invoice status ────────────────────
  if (progressId === 12 || progressId === 13 || progressId === 16) {
    const statusMap: Record<number, { hasLpo: boolean; hasInvoice: boolean; hasSignedFile: boolean; supplierType: string }> = {};
    await Promise.all(
      Array.from(suppliers.entries()).map(async ([supplierId, info]) => {
        const res = await safeFetch(`${baseUrl}/api/lpo/getLPOByMrHeaderID`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mr_header_id: mrHeaderId, supplier_id: supplierId }),
        });
        if (res?.success && res.data?.length > 0) {
          const lpo = res.data[0];
          let hasInvoice = false;
          try {
            const f = typeof lpo.invoice_file === "string" ? JSON.parse(lpo.invoice_file) : lpo.invoice_file;
            hasInvoice = Array.isArray(f) && f.length > 0;
          } catch {}
          let hasSignedFile = false;
          try {
            const f = typeof lpo.signed_file === "string" ? JSON.parse(lpo.signed_file) : lpo.signed_file;
            hasSignedFile = Array.isArray(f) && f.length > 0;
          } catch {}
          statusMap[supplierId] = { hasLpo: true, hasInvoice, hasSignedFile, supplierType: info.type };
        } else {
          statusMap[supplierId] = { hasLpo: false, hasInvoice: false, hasSignedFile: false, supplierType: info.type };
        }
      }),
    );
    data.lpoInvoiceStatus = statusMap;
  }

  // ── progress_id = 14: payment status ─────────────────────────────────────
  if (progressId === 14) {
    const statusMap: Record<number, "approved" | "rejected" | "pending"> = {};
    await Promise.all(
      Array.from(suppliers.keys()).map(async (supplierId) => {
        const res = await safeFetch(`${baseUrl}/api/lpo/getLPOByMrHeaderID`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mr_header_id: mrHeaderId, supplier_id: supplierId }),
        });
        if (res?.success && res.data?.length > 0) {
          const ps = res.data[0].payment_status?.toLowerCase();
          statusMap[supplierId] = ps === "approved" ? "approved" : ps === "rejected" ? "rejected" : "pending";
        } else {
          statusMap[supplierId] = "pending";
        }
      }),
    );
    data.lpoPaymentStatus = statusMap;
  }

  // ── progress_id = 17: GRN status ─────────────────────────────────────────
  if (progressId === 17) {
    const statusMap: Record<number, boolean> = {};
    await Promise.all(
      Array.from(suppliers.keys()).map(async (supplierId) => {
        const lpoRes = await safeFetch(`${baseUrl}/api/lpo/getLPOByMrHeaderID`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mr_header_id: mrHeaderId, supplier_id: supplierId }),
        });
        if (lpoRes?.success && lpoRes.data?.length > 0) {
          const grnRes = await safeFetch(`${baseUrl}/api/grn/getGRNDetailsByLPOID`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoRes.data[0].id }),
          });
          statusMap[supplierId] = !!(grnRes?.success && grnRes.data?.id);
        } else {
          statusMap[supplierId] = false;
        }
      }),
    );
    data.grnStatus = statusMap;
  }

  // ── progress_id = 21: QC status ───────────────────────────────────────────
  if (progressId === 21) {
    const statusMap: Record<number, "passed" | "failed" | "pending"> = {};
    await Promise.all(
      items.map(async (item) => {
        const lpoRes = await safeFetch(`${baseUrl}/api/lpo/getLPOByMrHeaderID`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mr_header_id: mrHeaderId, supplier_id: item.approved_supplier_id }),
        });
        if (lpoRes?.success && lpoRes.data?.length > 0) {
          const detailsRes = await safeFetch(`${baseUrl}/api/lpo/getLPODetails`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoRes.data[0].id }),
          });
          if (detailsRes?.success && detailsRes.data?.lpo_mr_lines) {
            const lpoLine = detailsRes.data.lpo_mr_lines.find((l: any) => l.mr_line_id === item.id);
            if (lpoLine) {
              const qcRes = await safeFetch(`${baseUrl}/api/qc/getQCByLPOMrLineID`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lpo_mr_line_id: lpoLine.id }),
              });
              statusMap[item.id] = qcRes?.success && qcRes.data ? qcRes.data.qc_status : "pending";
              return;
            }
          }
        }
        statusMap[item.id] = "pending";
      }),
    );
    data.qcStatus = statusMap;
  }

  // ── progress_id = 24: stock/inventory status ──────────────────────────────
  if (progressId === 24) {
    const statusMap: Record<number, boolean> = {};
    await Promise.all(
      items.map(async (item) => {
        const res = await safeFetch(`${baseUrl}/api/stock/getStockByMrLineID`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mr_line_id: item.id }),
        });
        statusMap[item.id] = !!(res?.success && res.data?.id);
      }),
    );
    data.inventoryStatus = statusMap;
  }

  return data;
}
