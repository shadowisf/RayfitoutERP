type Notif = {
  id: number;
  mr_header_id: number;
  lpo_id: number;
  inventory_item_id: number;
  boq_header_id: number;
  transfer_id: number;
  progress_id: number;
  department_id: number;
  header: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
