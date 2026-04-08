export type JoLine = {
  id: number;
  mr_header_id: number;
  job_scope_id: number;
  job_scope_name: string;
  job_scope: string;
  contract_type: string;
  job_description: string;
  quantity: number;
  unit: string;
  budget_estimate: number;
  subcontracted_works_value: number;
  start_date: string;
  end_date: string;
  attachment: string;
  approval_status: string | null;
  reject_comment: string | null;
  boq_line_ids: string;
  boq_line_names: string;
  boq_item_numbers: string;
  approved_subcontractor_quotation_id: number;
  approved_subcontractor_id: number;
  approved_subcontractor_name: string;
  approved_unit_price: number;
  approved_total_price: number;
  approved_quotation_file: string;
  jo_attachments?: JoLineAttachment[];
};

export type JoLineAttachment = {
  id: number;
  jo_line_id: number;
  attachment_type: string;
  file_url: string;
  file_name: string;
};

export const ATTACHMENT_TYPES = [
  {
    key: "design_drawings",
    label: "DESIGN & DRAWINGS",
    description: "e.g., Architectural drawings, structural Drawings, etc.",
    icon: "/icons/attachment-design-and-drawings.svg",
  },
  {
    key: "hse_compliance",
    label: "HSE & COMPLIANCE",
    description: "e.g., Site HSE plan, insurance requirements",
    icon: "/icons/attachment-normal-file.svg",
  },
  {
    key: "scope_pricing",
    label: "SCOPE & PRICING",
    description:
      "e.g., BOQ bid form, scope of work document, rate schedule etc",
    icon: "/icons/attachment-scope-and-pricing.svg",
  },
  {
    key: "contract_commercial",
    label: "CONTRACT & COMMERCIAL",
    description:
      "e.g., Draft subcontract agreement, payment terms schedule, etc",
    icon: "/icons/attachment-normal-file.svg",
  },
  {
    key: "technical_specifications",
    label: "TECHNICAL SPECIFICATIONS",
    description: "e.g., Project specification, material approval schedule",
    icon: "/icons/attachment-normal-file.svg",
  },
  {
    key: "surveys_existing_conditions",
    label: "SURVEYS & EXISTING CONDITIONS",
    description: "e.g., Topographical survey, soil investigation report",
    icon: "/icons/attachment-surveys-and-existing-conditions.svg",
  },
  {
    key: "programme_logistics",
    label: "PROGRAMME & LOGISTICS",
    description: "e.g., Master programme, subcontract programme",
    icon: "/icons/attachment-programme-and-logistics.svg",
  },
  {
    key: "prequalification_admin",
    label: "PRE-QUALIFICATION & ADMIN",
    description: "e.g., Pre-qualification questionnaire, NDA",
    icon: "/icons/attachment-prequalification-and-admin.svg",
  },
];