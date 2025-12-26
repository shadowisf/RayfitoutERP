import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

// Define the interface for batch details with MR
interface BatchDetailsWithMRRow extends RowDataPacket {
  // Stock Entry Details
  stock_id: number;
  batch_id: number;
  stock_quantity: number;
  stock_location: string;
  stock_received_by: string;
  entry_date: string;
  reason_for_entry: string | null;
  stock_notes: string | null;

  // Material Request Header
  mr_header_id: number;
  date_requested: string;
  required_date: string;
  requested_by: string;
  purpose: string;
  progress: string;
  department: string;

  // Material Request Line
  mr_line_id: number;
  requested_quantity: number;
  material_description: string;
  material_unit: string;
  material_category: string;
  material_subcategory: string;

  // Project Details
  project_id: number | null;
  project_name: string | null;

  // BOQ Details
  boq_line_id: number | null;
  boq_item_name: string | null;
  boq_quantity: number | null;

  // Supplier Details
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;

  // LPO Details
  lpo_id: number | null;
  lpo_code: string | null;
  delivery_date: string | null;
  unit_price: number | null;
  line_total_price: number | null;
  lpo_subtotal: number | null;
  lpo_discount: number | null;
  lpo_vat: number | null;
  lpo_total: number | null;
  payment_status: string | null;
  invoice_file: string | null;
  lpo_signed_file: string | null;

  // GRN Details
  grn_id: number | null;
  grn_date: string | null;
  grn_received_by: string | null;
  received_quantity: number | null;
  grn_notes: string | null;

  // QC Details
  qc_id: number | null;
  qc_checked_by: string | null;
  qc_accepted_quantity: number | null;
  qc_status: string | null;

  // QC Resolution
  qc_resolution_id: number | null;
  resolution_type: string | null;
}

// Define interface for manual stock entry (without MR)
interface ManualStockDetailsRow extends RowDataPacket {
  stock_id: number;
  batch_id: number;
  stock_quantity: number;
  stock_location: string;
  stock_received_by: string;
  entry_date: string;
  reason_for_entry: string | null;
  stock_notes: string | null;
  stock_condition: string | null;
  stock_attachment: string | null;

  // Project Details
  project_id: number | null;
  project_name: string | null;

  // BOQ Details
  boq_line_id: number | null;
  boq_header_id: number | null;
  boq_item_name: string | null;
  boq_quantity: number | null;

  // Supplier Details
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventoryItemId } = body;

    if (!inventoryItemId) {
      return NextResponse.json(
        { error: "Inventory item ID is required" },
        { status: 400 }
      );
    }

    // First, get the stock entry to check if it has mr_header_id and mr_line_id
    const stockQuery = `
      SELECT 
        id,
        batch_id,
        mr_header_id,
        mr_line_id,
        supplier_id,
        received_by,
        quantity,
        location,
        reason_for_entry,
        notes,
        project_id,
        boq_line_id,
        item_condition,
        attachment,
        created_at
      FROM stocks
      WHERE inventory_item_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const [stockRows] = await db.query<RowDataPacket[]>(stockQuery, [
      inventoryItemId,
    ]);

    if (stockRows.length === 0) {
      return NextResponse.json(
        { error: "No stock entry found" },
        { status: 404 }
      );
    }

    const stock = stockRows[0];
    const { mr_header_id, mr_line_id } = stock;

    // Check if this is a manual entry (no MR references)
    if (!mr_header_id || !mr_line_id) {
      // Manual stock entry - simplified query
      const manualStockQuery = `
        SELECT 
          s.id as stock_id,
          s.batch_id,
          s.quantity as stock_quantity,
          s.location as stock_location,
          s.received_by as stock_received_by,
          s.created_at as entry_date,
          s.reason_for_entry,
          s.notes as stock_notes,
          s.item_condition as stock_condition,
          s.attachment as stock_attachment,
          s.unit_price as unit_price,
          
          -- Project Details
          p.id as project_id,
          p.name as project_name,
          
          -- BOQ Details
          bl.id as boq_line_id,
          bh.id as boq_header_id,
          bl.item_name as boq_item_name,
          bl.quantity as boq_quantity,
          
          -- Supplier Details
          sup.id as supplier_id,
          sup.name as supplier_name,
          sup.contact_person_name as supplier_contact,
          sup.email as supplier_email,
          sup.phone as supplier_phone
          
        FROM stocks s
        
        -- Join Project (may be null)
        LEFT JOIN projects p ON s.project_id = p.id
        
        -- Join BOQ Line (may be null)
        LEFT JOIN boq_lines bl ON s.boq_line_id = bl.id
        LEFT JOIN boq_headers bh ON bl.boq_id = bh.id
        
        -- Join Supplier (may be null)
        LEFT JOIN suppliers sup ON s.supplier_id = sup.id
        
        WHERE s.inventory_item_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
      `;

      const [manualRows] = await db.query<ManualStockDetailsRow[]>(
        manualStockQuery,
        [inventoryItemId]
      );

      if (manualRows.length > 0) {
        const manualDetails = manualRows[0];

        const response = {
          type: "manual",
          ...manualDetails,
          stock_attachment: (() => {
            const att = manualDetails.stock_attachment;

            if (!att) return null;

            // If MySQL already returned parsed JSON
            if (Array.isArray(att) || typeof att === "object") {
              return att;
            }

            // If returned as stringified JSON
            if (typeof att === "string") {
              try {
                return JSON.parse(att);
              } catch {
                return null;
              }
            }

            return null;
          })(),
        };

        return NextResponse.json(response);
      }
    } else {
      // Stock entry with MR - full detailed query
      const detailsQuery = `
        SELECT 
            -- Stock Entry Details
            s.id as stock_id,
            s.batch_id,
            s.quantity as stock_quantity,
            s.location as stock_location,
            s.received_by as stock_received_by,
            s.created_at as entry_date,
            s.reason_for_entry,
            s.notes as stock_notes,
            
            -- Material Request Header
            mrh.id as mr_header_id,
            mrh.date_requested,
            mrh.required_date,
            mrh.requested_by,
            mrp.value as purpose,
            prog.value as progress,
            dept.value as department,
            
            -- Material Request Line
            mrl.id as mr_line_id,
            mrl.quantity as requested_quantity,
            mrl.material_description,
            mrl.unit as material_unit,
            mc.value as material_category,
            msc.value as material_subcategory,
            
            -- Project Details
            p.id as project_id,
            p.name as project_name,
            
            -- BOQ Details
            bl.id as boq_line_id,
            bh.id as boq_header_id,
            bl.item_name as boq_item_name,
            bl.quantity as boq_quantity,
            
            -- Supplier Details
            sup.id as supplier_id,
            sup.name as supplier_name,
            sup.contact_person_name as supplier_contact,
            sup.email as supplier_email,
            sup.phone as supplier_phone,
            
            -- LPO Details (via lpo_mr_line junction)
            lpo.id as lpo_id,
            lpo.quotation_code as lpo_code,
            lpo.delivery_date,
            lml.unit_price,
            lml.total_price as line_total_price,
            lpo.subtotal as lpo_subtotal,
            lpo.discount as lpo_discount,
            lpo.vat as lpo_vat,
            lpo.total as lpo_total,
            lpo.payment_status,
            lpo.invoice_file,
            lpo.signed_file as lpo_signed_file,
            
            -- GRN Details (via grn_mr_line)
            grn.id as grn_id,
            grn.received_date as grn_date,
            grn.received_by as grn_received_by,
            gml.received_quantity,
            gml.notes as grn_notes,
            
            -- QC Details (via qc_mr_line)
            qc.id as qc_id,
            qc.checked_by as qc_checked_by,
            qc.accepted_quantity as qc_accepted_quantity,
            qc.qc_status,
            
            -- QC Resolution
            qcr.id as qc_resolution_id,
            qcr.resolution_type
            
        FROM stocks s
        
        -- Join MR Header
        INNER JOIN mr_headers mrh ON s.mr_header_id = mrh.id
        INNER JOIN lut_mr_headers_purpose mrp ON mrh.purpose_id = mrp.id
        INNER JOIN lut_mr_headers_progress prog ON mrh.progress_id = prog.id
        INNER JOIN lut_mr_headers_departments dept ON mrh.department_id = dept.id
        
        -- Join MR Line
        INNER JOIN mr_lines mrl ON s.mr_line_id = mrl.id
        INNER JOIN lut_material_categories mc ON mrl.material_category_id = mc.id
        INNER JOIN lut_material_subcategories msc ON mrl.material_subcategory_id = msc.id
        
        -- Join Project (may be null for non-project MRs)
        LEFT JOIN projects p ON mrh.project_id = p.id
        
        -- Join BOQ Line (may be null)
        LEFT JOIN boq_lines bl ON mrl.boq_line_id = bl.id
        LEFT JOIN boq_headers bh ON bl.boq_id = bh.id
        
        -- Join Supplier
        LEFT JOIN suppliers sup ON s.supplier_id = sup.id
        
        -- Join LPO via lpo_mr_line junction table
        LEFT JOIN lpo_mr_line lml ON mrl.id = lml.mr_line_id
        LEFT JOIN lpo ON lml.lpo_id = lpo.id
        
        -- Join GRN via grn_mr_line (connected through lpo_mr_line)
        LEFT JOIN grn_mr_line gml ON lml.id = gml.lpo_mr_line_id
        LEFT JOIN grn ON gml.grn_id = grn.id
        
        -- Join QC via qc_mr_line (connected through lpo_mr_line)
        LEFT JOIN qc_mr_line qc ON lml.id = qc.lpo_mr_line_id
        
        -- Join QC Resolution
        LEFT JOIN qc_resolutions qcr ON mrl.id = qcr.mr_line_id
        
        WHERE s.mr_header_id = ? AND s.mr_line_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
      `;

      const [rows] = await db.query<BatchDetailsWithMRRow[]>(detailsQuery, [
        mr_header_id,
        mr_line_id,
      ]);

      if (rows.length > 0) {
        const batchDetails = rows[0];

        const response = {
          type: "mr",
          ...batchDetails,
          invoice_file: batchDetails.invoice_file
            ? Array.isArray(batchDetails.invoice_file)
              ? batchDetails.invoice_file
              : [batchDetails.invoice_file]
            : null,
          lpo_signed_file: batchDetails.lpo_signed_file
            ? Array.isArray(batchDetails.lpo_signed_file)
              ? batchDetails.lpo_signed_file
              : [batchDetails.lpo_signed_file]
            : null,
        };

        return NextResponse.json(response);
      }
    }

    return NextResponse.json(
      { error: "Batch details not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching batch details:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch details" },
      { status: 500 }
    );
  }
}
