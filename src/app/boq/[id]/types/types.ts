export type BoqLine = {
  id: number;
  boq_id: number;
  item_name: string;
  category: string;
  sub_category: string;
  /* item_code: string; */
  scope_of_work: string;
  location_id: number;
  location_name: string;
  quantity: number;
  unit: string;
  rate_per_quantity: number;
  total_cost: number;
  item_description: string;
  attachments: string[];
};
