export type Project = {
  id: number;
  name: string;
  property_type_id: number;
  status: string;
  scope_ids: number;
  scope: string;
  size: number;
  type_of_work: string;
  quoted_budget: number;
  currency: string;
  allocated_budget: number;
  start_date: string;
  end_date: string;
  type: string;
  attachments: any[];
};
