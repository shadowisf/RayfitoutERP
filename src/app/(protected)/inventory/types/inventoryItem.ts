export type InventoryItem = {
  id: number;
  category_id: number;
  category_name: string;
  subcategory_id: number;
  subcategory_name: string;
  description: string;
  type: string;
  unit: string;
  stockable: boolean;
  minimum_stock_quantity: number;
  brand: string;
  country_of_origin: string;
  specification: string;
  image: string;
  created_at: string;
  created_by: string;
};
