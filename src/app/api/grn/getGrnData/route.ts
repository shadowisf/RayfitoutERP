import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const { grn_id } = body;

    if (!grn_id) {
      return NextResponse.json(
        { success: false, message: "GRN ID is required" },
        { status: 400 },
      );
    }

    // Fetch GRN header with LPO and MR details (include project_id for BOQ numbering)
    const [grnRows] = await db.query<RowDataPacket[]>(
      `SELECT
        g.id as grn_id,
        g.lpo_id,
        g.received_date,
        g.received_by,
        lpo.delivery_date,
        lpo.supplier_id,
        sup.name as vendor_name,
        mrh.id as mr_header_id,
        mrh.project_id
       FROM grn g
       INNER JOIN lpo ON g.lpo_id = lpo.id
       INNER JOIN suppliers sup ON lpo.supplier_id = sup.id
       LEFT JOIN lpo_mr_line lml ON lml.lpo_id = lpo.id
       LEFT JOIN vw_mr_lines mrl ON lml.mr_line_id = mrl.id
       LEFT JOIN mr_headers mrh ON mrl.mr_header_id = mrh.id
       WHERE g.id = ?
       LIMIT 1`,
      [grn_id],
    );

    if (grnRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "GRN not found" },
        { status: 404 },
      );
    }

    const grn = grnRows[0];

    // Check if this GRN is a replacement GRN (referenced from qc_resolution_replace)
    const [replacementCheck] = await db.query<RowDataPacket[]>(
      `SELECT
        rep.id as resolution_id,
        rep.replacement_type,
        rep.new_material_name,
        rep.replaced_quantity
       FROM qc_resolution_replace rep
       WHERE rep.replacement_grn_id = ?
       LIMIT 1`,
      [grn_id],
    );

    const isReplacementGrn = replacementCheck.length > 0;
    const replacementData = isReplacementGrn ? replacementCheck[0] : null;

    // Build BOQ numbering map for this project
    const boqNumbering = new Map<number, string>();
    if (grn.project_id) {
      const [boqRows] = await db.query<RowDataPacket[]>(
        `SELECT bl.id, bl.category, bl.sub_category
         FROM boq_lines bl
         JOIN boq_headers bh ON bl.boq_id = bh.id
         WHERE bh.project_id = ?
         ORDER BY bl.category_order ASC, bl.subcategory_order ASC, bl.item_order ASC`,
        [grn.project_id],
      );

      const categoryMap = new Map<string, number>();
      const subCategoryMap = new Map<string, number>();
      const itemCountMap = new Map<string, number>();

      for (const row of boqRows) {
        const category = row.category;
        const subCategory = row.sub_category;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, categoryMap.size + 1);
        }
        const categoryNumber = categoryMap.get(category)!;

        const subCategoryKey = `${category}-${subCategory}`;
        if (!subCategoryMap.has(subCategoryKey)) {
          const subCategoriesInCategory = Array.from(
            subCategoryMap.keys(),
          ).filter((key) => key.startsWith(`${category}-`)).length;
          subCategoryMap.set(subCategoryKey, subCategoriesInCategory + 1);
        }
        const subCategoryNumber = subCategoryMap.get(subCategoryKey)!;

        const itemKey = `${category}-${subCategory}`;
        const currentCount = itemCountMap.get(itemKey) || 0;
        itemCountMap.set(itemKey, currentCount + 1);
        const itemNumber = currentCount + 1;

        boqNumbering.set(
          row.id,
          `${categoryNumber}.${subCategoryNumber}.${itemNumber}`,
        );
      }
    }

    // Fetch GRN lines with material details, supplier quotation data
    const [lineRows] = await db.query<RowDataPacket[]>(
      `SELECT
        gml.id,
        gml.received_quantity,
        gml.notes,
        gml.attachment,
        lml.mr_line_id,
        mrl.material_description,
        mrl.unit,
        COALESCE(mlsq.proposed_quantity, mrl.approved_proposed_quantity) as ordered_qty,
        mlsq.unit_price as quotation_unit_price,
        mlsq.total_price as quotation_total_price
       FROM grn_mr_line gml
       INNER JOIN lpo_mr_line lml ON gml.lpo_mr_line_id = lml.id
       INNER JOIN vw_mr_lines mrl ON lml.mr_line_id = mrl.id
       LEFT JOIN mr_line_supplier_quotation mlsq
         ON lml.mr_line_id = mlsq.mr_line_id
         AND mlsq.supplier_id = ?
         AND mlsq.approval_status = 'Approved'
       WHERE gml.grn_id = ?`,
      [grn.supplier_id, grn_id],
    );

    // Fetch BOQ refs (numbers like "2.1.1") for each MR line
    const items = [];
    for (const line of lineRows) {
      // Get all BOQ line IDs for this MR line
      const [boqRows] = await db.query<RowDataPacket[]>(
        `SELECT jt.boq_line_id
         FROM jt_mr_lines_boq_lines jt
         WHERE jt.mr_line_id = ?`,
        [line.mr_line_id],
      );

      // Map boq_line_ids to their computed numbers and join with commas
      let boqRef: string | null = null;
      if (boqRows.length > 0) {
        const boqNumbers = boqRows
          .map((row) => boqNumbering.get(row.boq_line_id))
          .filter(Boolean);
        if (boqNumbers.length > 0) {
          boqRef = boqNumbers.join(", ");
        }
      }

      // For replacement GRN: use replacement item name and set ordered_qty = received_qty
      let materialDescription = line.material_description;
      let orderedQty = Number(line.ordered_qty);
      const receivedQty = Number(line.received_quantity);

      if (isReplacementGrn && replacementData) {
        if (
          replacementData.replacement_type === "Approved alternative" &&
          replacementData.new_material_name
        ) {
          materialDescription = replacementData.new_material_name;
        }
        orderedQty = receivedQty;
      }

      items.push({
        material_description: materialDescription,
        boq_ref: boqRef,
        ordered_qty: orderedQty,
        received_qty: receivedQty,
        unit: line.unit,
        unit_price: line.quotation_unit_price
          ? Number(line.quotation_unit_price)
          : null,
        total_price: line.quotation_total_price
          ? Number(line.quotation_total_price)
          : null,
        notes: line.notes || null,
        attachment_image: null, // Will be converted to base64 on the client
        attachment_url: line.attachment || null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        grn_id: grn.grn_id,
        lpo_id: grn.lpo_id,
        lpo_number: `LPO-${String(grn.lpo_id).padStart(5, "0")}`,
        mr_header_id: grn.mr_header_id,
        mr_number: `MR-${String(grn.mr_header_id).padStart(5, "0")}`,
        vendor_name: grn.vendor_name,
        delivery_date: grn.delivery_date,
        received_date: grn.received_date,
        received_by: grn.received_by,
        items,
      },
    });
  } catch (error: any) {
    console.error("Error fetching GRN data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch GRN data",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
