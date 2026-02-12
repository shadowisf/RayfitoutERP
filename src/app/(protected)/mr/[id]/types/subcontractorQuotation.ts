export type SubcontractorQuotation = {
  id: number;
  subcontractor_id: number;
  jo_line_id: number;
  quotation_file: string[];
  rating: number;
  total_price: number;
  approval_status: string;
  reject_comment: string;
  created_by: string;
  subcontractor_name: string;
  subcontractor_trn_number: string;
  subcontractor_contact_person: string;
  subcontractor_phone: string;
  subcontractor_email: string;
  subcontractor_address: string;
  subcontractor_notes: string;
  subcontractor_material_categories: string;
};
