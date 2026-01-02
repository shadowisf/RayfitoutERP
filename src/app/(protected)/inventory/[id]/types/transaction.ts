type Transaction = {
  // Stock Transfer Issue fields
  id: number;
  project_id: number;
  boq_line_id: number;
  created_on: string;
  type: string;
  transferee: string;
  purpose: string;
  from_location: string;
  to_location: string;
  receiver_name: string;
  quantity: number;
  received: number;
  received_on: string | null;
  serial_number: string;
  signed_tsc_file: JSON;
  third_party_involved: boolean;
  attachment: any;

  // Inventory Item fields
  inventory_item_id: number;
  description: string;
  unit: string;
  category_id: number;
  subcategory_id: number;
  type_item: string;
  stockable: number;
  minimum_stock_quantity: number;
  brand: string | null;
  country_of_origin: string | null;
  specification: string | null;
  image: string | null;

  // Batch ID (from stocks table)
  batch_id: number | null;

  project_name: string | null;

  // BOQ line details
  boq_category: string | null;
  boq_sub_category: string | null;

  boq_item_number: string;
};
