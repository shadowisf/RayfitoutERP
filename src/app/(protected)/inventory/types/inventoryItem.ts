export type InventoryItem = {
  id: number;
  batch_id: number;
  category: string;
  subcategory: string;
  item: string;
  location: string;
  total_quantity: number;
  unit: string;
  last_transaction: string;
  notes: string;
  barcode: string;
};
