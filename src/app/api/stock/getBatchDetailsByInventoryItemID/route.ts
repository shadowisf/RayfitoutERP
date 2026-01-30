import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventoryItemId, batchId } = body;

    if (!inventoryItemId) {
      return NextResponse.json(
        { error: "Inventory item ID is required" },
        { status: 400 },
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
        item_condition,
        grn_file,
        qc_report_file,
        lpo_file,
        dn_file,
        created_at,
        unit_price
      FROM stocks
      WHERE inventory_item_id = ?
      ${batchId ? "AND batch_id = ?" : ""}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const stockParams = batchId
      ? [inventoryItemId, batchId]
      : [inventoryItemId];
    const [stockRows] = await db.query<RowDataPacket[]>(
      stockQuery,
      stockParams,
    );

    if (stockRows.length === 0) {
      return NextResponse.json(
        { error: "No stock entry found" },
        { status: 404 },
      );
    }

    const stock = stockRows[0];
    const { mr_header_id, mr_line_id } = stock;

    // Helper function to parse attachment fields
    const parseAttachment = (att: any) => {
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
    };

    // ✅ Helper function to fetch BOQ details for a stock entry
    const fetchBoqDetails = async (stockId: number) => {
      const boqQuery = `
        SELECT 
          bl.id as boq_line_id,
          bl.item_name as boq_item_name,
          bl.item_description as boq_item_description,
          bl.quantity as boq_quantity,
          bl.unit as boq_unit,
          bl.rate_per_quantity as boq_rate,
          bl.total_cost as boq_total_cost,
          bh.id as boq_header_id,
          bh.project_id as boq_project_id
        FROM jt_stocks_boq_lines jt
        INNER JOIN boq_lines bl ON jt.boq_line_id = bl.id
        INNER JOIN boq_headers bh ON bl.boq_id = bh.id
        WHERE jt.stock_id = ?
      `;

      const [boqRows] = await db.query<RowDataPacket[]>(boqQuery, [stockId]);
      return boqRows;
    };

    // Check if this is a manual entry (no MR references)
    if (!mr_header_id || !mr_line_id) {
      // Manual stock entry - simplified query with batch_id filter
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
          s.grn_file,
          s.qc_report_file,
          s.lpo_file,
          s.dn_file,
          s.unit_price,
          
          -- Project Details
          p.id as project_id,
          p.name as project_name,
          
          -- Supplier Details
          sup.id as supplier_id,
          sup.name as supplier_name,
          sup.contact_person_name as supplier_contact,
          sup.email as supplier_email,
          sup.phone as supplier_phone
          
        FROM stocks s
        
        -- Join Project (may be null)
        LEFT JOIN projects p ON s.project_id = p.id
        
        -- Join Supplier (may be null)
        LEFT JOIN suppliers sup ON s.supplier_id = sup.id
        
        WHERE s.inventory_item_id = ?
        ${batchId ? "AND s.batch_id = ?" : ""}
        ORDER BY s.created_at DESC
        LIMIT 1
      `;

      const manualParams = batchId
        ? [inventoryItemId, batchId]
        : [inventoryItemId];
      const [manualRows] = await db.query<any[]>(
        manualStockQuery,
        manualParams,
      );

      if (manualRows.length > 0) {
        const manualDetails = manualRows[0];

        // ✅ Fetch BOQ details for this stock entry
        const boqDetails = await fetchBoqDetails(manualDetails.stock_id);

        const response = {
          type: "manual",
          ...manualDetails,
          grn_file: parseAttachment(manualDetails.grn_file),
          qc_report_file: parseAttachment(manualDetails.qc_report_file),
          lpo_file: parseAttachment(manualDetails.lpo_file),
          dn_file: parseAttachment(manualDetails.dn_file),
          boq_items: boqDetails,
        };

        return NextResponse.json(response);
      }
    } else {
      // ✅ Helper function to fetch BOQ details for an MR line
      const fetchMrBoqDetails = async (mrLineId: number) => {
        const boqQuery = `
          SELECT 
            bl.id as boq_line_id,
            bl.item_name as boq_item_name,
            bl.item_description as boq_item_description,
            bl.quantity as boq_quantity,
            bl.unit as boq_unit,
            bl.rate_per_quantity as boq_rate,
            bl.total_cost as boq_total_cost,
            bh.id as boq_header_id,
            bh.project_id as boq_project_id
          FROM jt_mr_lines_boq_lines jt
          INNER JOIN boq_lines bl ON jt.boq_line_id = bl.id
          INNER JOIN boq_headers bh ON bl.boq_id = bh.id
          WHERE jt.mr_line_id = ?
        `;

        const [boqRows] = await db.query<RowDataPacket[]>(boqQuery, [mrLineId]);
        return boqRows;
      };

      // ✅ Helper function to get material subcategory from view
      const fetchMaterialSubcategory = async (mrLineId: number) => {
        const subcatQuery = `
          SELECT material_subcategory
          FROM vw_mr_lines
          WHERE id = ?
          LIMIT 1
        `;

        const [rows] = await db.query<RowDataPacket[]>(subcatQuery, [mrLineId]);
        return rows.length > 0 ? rows[0].material_subcategory : null;
      };

      // Stock entry with MR - full detailed query (WITHOUT subcategory join)
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
            mrl.specification,
            mrl.brand,
            mrl.attachment as mr_line_attachment,
            mc.value as material_category,
            
            -- Project Details
            p.id as project_id,
            p.name as project_name,
            
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
            gml.attachment as grn_attachment,
            
            -- QC Details (via qc_mr_line)
            qc.id as qc_id,
            qc.checked_by as qc_checked_by,
            qc.accepted_quantity as qc_accepted_quantity,
            qc.qc_status,
            qc.reason_for_added_protection,
            
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
        
        -- Join Project (may be null for non-project MRs)
        LEFT JOIN projects p ON mrh.project_id = p.id
        
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

      const [rows] = await db.query<any[]>(detailsQuery, [
        mr_header_id,
        mr_line_id,
      ]);

      if (rows.length > 0) {
        const batchDetails = rows[0];

        // ✅ Fetch BOQ details for this MR line
        const boqDetails = await fetchMrBoqDetails(batchDetails.mr_line_id);

        // ✅ Fetch material subcategory from view
        const materialSubcategory = await fetchMaterialSubcategory(
          batchDetails.mr_line_id,
        );

        const response = {
          type: "mr",
          ...batchDetails,
          material_subcategory: materialSubcategory, // ✅ Add subcategory
          invoice_file: parseAttachment(batchDetails.invoice_file),
          lpo_signed_file: parseAttachment(batchDetails.lpo_signed_file),
          mr_line_attachment: parseAttachment(batchDetails.mr_line_attachment),
          grn_attachment: parseAttachment(batchDetails.grn_attachment),
          boq_items: boqDetails,
        };

        return NextResponse.json(response);
      }
    }

    return NextResponse.json(
      { error: "Batch details not found" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error fetching batch details:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch details" },
      { status: 500 },
    );
  }
}
