import type { InventoryMatch } from "../components/department/_InventoryStatusCell";

export type MrViewInitialData = {
  // progress_id = 1
  itemInventoryStatus?: Record<string, InventoryMatch[]> | null;

  // progress_id = 7 or 10
  materialPriceStats?: Record<
    string,
    {
      lowest_price: number | null;
      highest_price: number | null;
      avg_price: number | null;
      prev_price: number | null;
    }
  >;

  // progress_id = 10
  quotationPriceRanges?: Record<number, { min: number; max: number }>;

  // progress_id = 7 or 11
  itemsWithQuotations?: number[];

  // progress_id = 10 or 11
  supplierApprovalStatus?: Record<
    number,
    "approved" | "rejected" | "pending"
  >;

  // progress_id = 9 or 11
  supplierQSApprovalStatus?: Record<
    number,
    "approved" | "rejected" | "pending"
  >;

  // progress_id = 12, 13, or 16
  lpoInvoiceStatus?: Record<
    number,
    {
      hasLpo: boolean;
      hasInvoice: boolean;
      hasSignedFile: boolean;
      supplierType: string;
    }
  >;

  // progress_id = 14
  lpoPaymentStatus?: Record<
    number,
    "approved" | "rejected" | "pending"
  >;

  // progress_id = 17
  grnStatus?: Record<number, boolean>;

  // progress_id = 21
  qcStatus?: Record<number, "passed" | "failed" | "pending">;

  // progress_id = 24
  inventoryStatus?: Record<number, boolean>;
};
