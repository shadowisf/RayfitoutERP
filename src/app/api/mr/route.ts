import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT vw.*,
        mh.payment_jo_reference_id,
        CASE
          WHEN vw.type = 'job' THEN (SELECT COUNT(*) FROM jo_lines jl WHERE jl.mr_header_id = vw.id)
          WHEN vw.type = 'payment' THEN (SELECT COUNT(*) FROM pr_lines pl WHERE pl.mr_header_id = vw.id)
          ELSE (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw.id)
        END AS item_count
      FROM vw_mr_headers vw
      LEFT JOIN mr_headers mh ON mh.id = vw.id
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "getMrHeaders") {
      const [rows]: any = await db.query(
        `SELECT * FROM vw_mr_headers WHERE department_id = ?`,
        [body.department_id],
      );

      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "getTableViewItems") {
      // LPO stage progress IDs — material MRs at these stages are shown as LPOs
      // 26 = Segregated (MR split into multiple LPOs), also include LPO workflow stages
      const LPO_STAGE_IDS = [13, 14, 15, 16, 17, 24, 25, 26];

      // MR lines NOT yet at LPO stage (still in MR workflow)
      const [mrLines]: any = await db.query(`
        SELECT
          ml.id AS line_id,
          ml.mr_header_id,
          NULL AS lpo_id,
          ml.material_description,
          ml.quantity,
          ml.unit,
          mc.value AS material_category,
          mh.type,
          mh.requested_by,
          mh.department_id,
          vw.project_name,
          vw.progress_name,
          vw.progress_id,
          (SELECT COUNT(*) FROM mr_line_supplier_quotation sq WHERE sq.mr_line_id = ml.id) > 0 AS has_quotation,
          ml.delivery_location
        FROM mr_lines ml
        JOIN mr_headers mh ON mh.id = ml.mr_header_id
        JOIN vw_mr_headers vw ON vw.id = mh.id
        LEFT JOIN lut_material_categories mc ON mc.id = ml.material_category_id
        WHERE mh.type = 'material'
          AND vw.progress_id NOT IN (${LPO_STAGE_IDS.join(",")})
        ORDER BY mc.value ASC, ml.material_description ASC
      `);

      // LPO lines — material MRs that have been segregated into LPOs (progress 26)
      // or are at an LPO workflow stage. Use each LPO's own progress_name, not the MR's.
      const [lpoLines]: any = await db.query(`
        SELECT
          ml.id AS line_id,
          ml.mr_header_id,
          l.id AS lpo_id,
          ml.material_description,
          ml.quantity,
          ml.unit,
          mc.value AS material_category,
          'material' AS type,
          mh.requested_by,
          mh.department_id,
          vw.project_name,
          lpo_pr.value AS progress_name,
          l.progress_id,
          ml.delivery_location
        FROM lpo_mr_line lml
        JOIN lpo l ON l.id = lml.lpo_id
        JOIN mr_lines ml ON ml.id = lml.mr_line_id
        JOIN mr_headers mh ON mh.id = ml.mr_header_id
        JOIN vw_mr_headers vw ON vw.id = mh.id
        LEFT JOIN lut_material_categories mc ON mc.id = ml.material_category_id
        LEFT JOIN lut_mr_headers_progress lpo_pr ON lpo_pr.id = l.progress_id
        WHERE mh.type = 'material'
          AND vw.progress_id IN (${LPO_STAGE_IDS.join(",")})
        ORDER BY mc.value ASC, ml.material_description ASC
      `);

      // Get all JO lines — grouped by BOQ line
      // BOQ ref numbers (e.g. "1.1.1") are computed dynamically from vw_boq_lines
      // using DENSE_RANK/ROW_NUMBER over category_order, subcategory_order, item_order
      const [joLines]: any = await db.query(`
        WITH boq_refs AS (
          SELECT
            id,
            item_name,
            CONCAT(
              DENSE_RANK() OVER (PARTITION BY project_id ORDER BY category_order),
              '.',
              DENSE_RANK() OVER (PARTITION BY project_id, category ORDER BY subcategory_order),
              '.',
              ROW_NUMBER() OVER (PARTITION BY project_id, category, sub_category ORDER BY item_order)
            ) AS boq_ref_number
          FROM vw_boq_lines
        )
        SELECT
          jl.id AS line_id,
          jl.mr_header_id,
          jl.job_description AS material_description,
          jl.quantity,
          jl.unit,
          COALESCE(br.boq_ref_number, 'No BOQ Ref') AS material_category,
          jtjlbl.boq_line_id AS boq_line_id,
          br.boq_ref_number AS boq_item_number,
          br.item_name AS boq_description,
          mh.type,
          mh.requested_by,
          mh.department_id,
          vw.project_name,
          vw.progress_name,
          vw.progress_id
        FROM jo_lines jl
        JOIN mr_headers mh ON mh.id = jl.mr_header_id
        JOIN vw_mr_headers vw ON vw.id = mh.id
        LEFT JOIN jt_jo_lines_boq_lines jtjlbl ON jtjlbl.jo_line_id = jl.id
        LEFT JOIN boq_refs br ON br.id = jtjlbl.boq_line_id
        WHERE mh.type = 'job'
        ORDER BY mh.id ASC, br.boq_ref_number ASC, jl.job_description ASC
      `);

      // Get all PR lines — grouped by JO reference (job order the PR was raised against)
      const [prLines]: any = await db.query(`
        SELECT
          pl.id AS line_id,
          pl.mr_header_id,
          jl.job_description AS material_description,
          jl.quantity,
          jl.unit,
          CONCAT('JO-', LPAD(jo_mh.id, 5, '0'), ' — ', LEFT(jl.job_description, 40)) AS material_category,
          mh.type,
          mh.requested_by,
          mh.department_id,
          vw.project_name,
          vw.progress_name,
          vw.progress_id
        FROM pr_lines pl
        JOIN mr_headers mh ON mh.id = pl.mr_header_id
        JOIN vw_mr_headers vw ON vw.id = mh.id
        JOIN jo_lines jl ON jl.id = pl.jo_line_id
        JOIN mr_headers jo_mh ON jo_mh.id = jl.mr_header_id
        WHERE mh.type = 'payment'
        ORDER BY mh.id ASC, jl.job_description ASC
      `);

      return NextResponse.json(
        {
          material: [...mrLines, ...lpoLines],
          job: joLines,
          payment: prLines,
        },
        { status: 200 },
      );
    }

    if (body.action === "createMrHeader") {
      if (body.type === "payment") {
        // Payment request: only needs department_id, requested_by, and jo reference
        const headerQuery = `
          INSERT INTO mr_headers
          (type, project_id, department_id, requested_by, required_date, payment_jo_reference_id)
          VALUES ('payment', ?, ?, ?, NOW(), ?)
        `;
        const headerValues = [
          Number(body.project_id) || null,
          Number(body.department_id),
          body.requested_by,
          Number(body.payment_jo_reference_id),
        ];
        const [headerResult] = await db.query<ResultSetHeader>(
          headerQuery,
          headerValues,
        );
        const mrHeaderId = headerResult.insertId;
        return NextResponse.json({ success: true, mrHeaderId });
      }

      const headerQuery = `
      INSERT INTO mr_headers
      (type, project_id, department_id, requested_by, required_date, purpose_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

      const headerValues = [
        body.type || "material",
        Number(body.project_id) || null,
        Number(body.department_id),
        body.requested_by,
        body.required_date,
        Number(body.purpose_id),
      ];

      const [headerResult] = await db.query<ResultSetHeader>(
        headerQuery,
        headerValues,
      );
      const mrHeaderId = headerResult.insertId;

      return NextResponse.json({
        success: true,
        mrHeaderId: mrHeaderId,
      });
    }

    if (body.action === "createMrLine") {
      try {
        // ✅ Insert the main mr_line WITHOUT boq_line_id
        const lineQuery = `
      INSERT INTO mr_lines 
      (mr_header_id, material_category_id, material_description, quantity, unit, notes, specification, brand, delivery_location, attachment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const lineValues = [
          Number(body.mr_header_id),
          Number(body.material_category_id),
          body.material_description || "",
          body.quantity && !isNaN(Number(body.quantity))
            ? Number(body.quantity)
            : 0,
          body.unit || "",
          body.notes || null,
          body.specification || null,
          body.brand || null,
          body.delivery_location || null,
          body.attachment || null,
        ];

        const [lineResult] = await db.query<ResultSetHeader>(
          lineQuery,
          lineValues,
        );
        const mrLineId = lineResult.insertId;

        // ✅ Insert subcategories into junction table
        const subcategoryIds = Array.isArray(body.material_subcategory_ids)
          ? body.material_subcategory_ids
          : [body.material_subcategory_ids];

        const validSubcategoryIds = subcategoryIds.filter(
          (id: any) => id && !isNaN(Number(id)),
        );

        if (validSubcategoryIds.length > 0) {
          const junctionQuery = `
        INSERT INTO jt_mr_line_material_subcategory (mr_line_id, material_subcategory_id)
        VALUES ?
      `;

          const junctionValues = validSubcategoryIds.map((subcatId: any) => [
            mrLineId,
            Number(subcatId),
          ]);

          await db.query(junctionQuery, [junctionValues]);
        }

        // ✅ Insert BOQ line associations into junction table
        const boqLineIds = Array.isArray(body.boq_line_ids)
          ? body.boq_line_ids
          : body.boq_line_ids
            ? [body.boq_line_ids]
            : [];

        const validBoqLineIds = boqLineIds.filter(
          (id: any) => id && !isNaN(Number(id)),
        );

        if (validBoqLineIds.length > 0) {
          const boqJunctionQuery = `
        INSERT INTO jt_mr_lines_boq_lines (mr_line_id, boq_line_id)
        VALUES ?
      `;

          const boqJunctionValues = validBoqLineIds.map((boqId: any) => [
            mrLineId,
            Number(boqId),
          ]);

          await db.query(boqJunctionQuery, [boqJunctionValues]);
        }

        return NextResponse.json({
          success: true,
          mrLineId: mrLineId,
        });
      } catch (error: any) {
        console.error("Create MR Line Error:", error);
        return NextResponse.json(
          { error: error.message || "Failed to create MR line" },
          { status: 500 },
        );
      }
    }

    if (body.action === "createCategory") {
      const query = "INSERT INTO lut_material_categories (value) VALUES (?)";
      await db.query(query, [body.value]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "createSubCategory") {
      const query =
        "INSERT INTO lut_material_subcategories (category_id, value) VALUES (?, ?)";
      await db.query(query, [body.category_id, body.value]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // Helper: determine MR- or JO- prefix based on mr_headers.type
    let prefix = "MR";
    if (body.id) {
      try {
        const [typeRows]: any = await db.query(
          `SELECT type FROM mr_headers WHERE id = ?`,
          [body.id],
        );
        if (typeRows?.[0]?.type === "job") {
          prefix = "JO";
        } else if (typeRows?.[0]?.type === "payment") {
          prefix = "PR";
        }
      } catch {
        // fallback to MR
      }
    }
    const formattedId = `${prefix}-${String(body.id).padStart(5, "0")}`;

    if (body.action === "cancelMaterialRequest") {
      const lpoId = body.lpo_id ? Number(body.lpo_id) : null;

      if (lpoId) {
        const rollbackId = Number(body.rollback_progress_id);

        if (rollbackId >= 14) {
          // Rolling back within LPO stages (14, 17, 24): only update LPO's progress_id
          await db.query(`UPDATE lpo SET progress_id = ? WHERE id = ?`, [
            rollbackId,
            lpoId,
          ]);

          await db.query(
            `INSERT INTO mr_header_progress_log
     (mr_header_id, lpo_id, progress_id, from_progress_id, changed_by, rollback_reason, is_rollback)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              body.id,
              lpoId,
              rollbackId,
              body.current_progress_id || null,
              body.changed_by,
              body.rollback_reason,
            ],
          );
        } else {
          // Rolling back past LPO start (< 14): reset LPO to 12, update MR to rollback stage
          await db.query(`UPDATE lpo SET progress_id = 12 WHERE id = ?`, [lpoId]);
          await db.query(`UPDATE mr_headers SET progress_id = ? WHERE id = ?`, [
            rollbackId,
            body.id,
          ]);

          // Log LPO reset to 12
          await db.query(
            `INSERT INTO mr_header_progress_log
     (mr_header_id, lpo_id, progress_id, from_progress_id, changed_by, rollback_reason, is_rollback)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              body.id,
              lpoId,
              12,
              body.current_progress_id || null,
              body.changed_by,
              body.rollback_reason,
            ],
          );

          // Log MR rollback to target stage
          await db.query(
            `INSERT INTO mr_header_progress_log
     (mr_header_id, progress_id, from_progress_id, changed_by, rollback_reason, is_rollback)
     VALUES (?, ?, ?, ?, ?, 1)`,
            [
              body.id,
              rollbackId,
              body.current_progress_id || null,
              body.changed_by,
              body.rollback_reason,
            ],
          );
        }
      } else {
        // MR-level rollback: update the MR header's progress
        await db.query(`UPDATE mr_headers SET progress_id = ? WHERE id = ?`, [
          body.rollback_progress_id,
          body.id,
        ]);

        await db.query(
          `INSERT INTO mr_header_progress_log
     (mr_header_id, progress_id, from_progress_id, changed_by, rollback_reason, is_rollback)
     VALUES (?, ?, ?, ?, ?, 1)`,
          [
            body.id,
            body.rollback_progress_id,
            body.current_progress_id || null,
            body.changed_by,
            body.rollback_reason,
          ],
        );
      }

      const lpoLabel = lpoId ? ` (LPO-${String(lpoId).padStart(5, "0")})` : "";

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          `Rolled Back ${prefix}`,
          `${formattedId}${lpoLabel} was moved to the ${body.rollback_progress_name} stage`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `Rolled Back ${prefix}`,
          `Your ${formattedId}${lpoLabel} was moved to the ${body.rollback_progress_name} stage`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQSPricingApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 9 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 9, 7, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          16,
          "QS Price Approval Required",
          `${formattedId} is awaiting your review`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForLPOSegregation") {
      await db.query(`UPDATE mr_headers SET progress_id = 26 WHERE id = ?`, [
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQSInitialApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 2 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 2, 1, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          16,
          "QS Initial Approval Required",
          `${formattedId} is awaiting your review`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Submitted`,
          `Your ${formattedId} is awaiting QS approval`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action == "submitForLPO") {
      await db.query(`UPDATE mr_headers SET progress_id = 12 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 12, 10, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "LPO Required",
          `${formattedId} is awaiting LPO & invoice`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPricingResubmission") {
      // Auto-query rejected quotations for the reject_reason
      // Use GROUP BY to deduplicate (one row per item, not per vendor)
      const [rejectedQuotations]: any = await db.query(
        `SELECT ml.material_description, MAX(sq.reject_comment) as reject_comment
         FROM mr_line_supplier_quotation sq
         JOIN mr_lines ml ON sq.mr_line_id = ml.id
         WHERE ml.mr_header_id = ? AND sq.approval_status = 'Rejected'
         GROUP BY ml.id, ml.material_description`,
        [body.id],
      );

      const rejectReason =
        rejectedQuotations.length > 0
          ? JSON.stringify(
              rejectedQuotations.map((item: any) => ({
                item: item.material_description,
                reason: item.reject_comment || "",
              })),
            )
          : null;

      await db.query(`UPDATE mr_headers SET progress_id = 11 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by, reject_reason) VALUES (?, 11, 10, ?, ?)`,
        [body.id, body.changed_by, rejectReason],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Quotations Rejected",
          `${formattedId} was rejected by ${body.user_name}, ${body.user_role}`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQC") {
      await db.query(`UPDATE mr_headers SET progress_id = 21 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 21, 17, ?)`,
        [body.id, body.changed_by],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForStockEntry") {
      await db.query(`UPDATE mr_headers SET progress_id = 24 WHERE id = ?`, [
        body.id,
      ]);

      // TEMPORARILY DISABLED QC - allow from_progress_id 17 (was hardcoded 21)
      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 24, ?, ?)`,
        [body.id, body.from_progress_id || 17, body.changed_by],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForInitialApproval") {
      // Manager Approval stage (3) commented out — QS now submits directly to Quotations (7)
      await db.query(`UPDATE mr_headers SET progress_id = 7 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 7, ?, ?)`,
        [body.id, body.from_progress_id || 2, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Quotations Required",
          `${formattedId} is awaiting your review`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Submitted`,
          `Your ${formattedId} is awaiting quotations`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    // Payment Request: Submit for QS Review (1 → 2)
    if (body.action === "submitForQsReview") {
      await db.query(`UPDATE mr_headers SET progress_id = 2 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 2, ?, ?)`,
        [body.id, body.from_progress_id || 1, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          16,
          "QS Review Required",
          `${formattedId} is awaiting your review`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Submitted`,
          `Your ${formattedId} is awaiting QS review`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    // Payment Request: QS submits for Manager Approval (2 → 3)
    if (body.action === "submitPrForManagerApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 3 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 3, 2, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          "Manager Approval Required",
          `${formattedId} is awaiting your approval`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    // Payment Request: Manager approves → Payment stage (3 → 14)
    if (body.action === "submitPrForPayment") {
      await db.query(`UPDATE mr_headers SET progress_id = 14 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 14, 3, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [body.id, 10, "Payment Required", `${formattedId} is awaiting payment`],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Approved`,
          `Your ${formattedId} has been approved by manager`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    // Payment Request: Manager rejects → Rejected (3 → 5)
    if (body.action === "submitPrForRejection") {
      const [rejectedItems]: any = await db.query(
        `SELECT pl.id, pl.reject_comment FROM pr_lines pl
         WHERE pl.mr_header_id = ? AND pl.approval_status = 'Rejected'`,
        [body.id],
      );

      const rejectReason =
        rejectedItems.length > 0
          ? JSON.stringify(
              rejectedItems.map((item: any) => ({
                item: `PR Line ${item.id}`,
                reason: item.reject_comment || "",
              })),
            )
          : null;

      await db.query(`UPDATE mr_headers SET progress_id = 5 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by, reject_reason) VALUES (?, 5, ?, ?, ?)`,
        [body.id, body.from_progress_id || 3, body.changed_by, rejectReason],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Rejected`,
          `${formattedId} was rejected`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    // Payment Request: QS rejects → Rejected (2 → 5)
    if (body.action === "submitPrQsRejection") {
      const [rejectedItems]: any = await db.query(
        `SELECT pl.id, pl.qs_reject_comment FROM pr_lines pl
         WHERE pl.mr_header_id = ? AND pl.qs_approval_status = 'Rejected'`,
        [body.id],
      );

      const rejectReason =
        rejectedItems.length > 0
          ? JSON.stringify(
              rejectedItems.map((item: any) => ({
                item: `PR Line ${item.id}`,
                reason: item.qs_reject_comment || "",
              })),
            )
          : null;

      await db.query(`UPDATE mr_headers SET progress_id = 5 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by, reject_reason) VALUES (?, 5, 2, ?, ?)`,
        [body.id, body.changed_by, rejectReason],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Rejected by QS`,
          `${formattedId} was rejected by QS`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    // Payment Request: Finance proceeds with payment (14 → 25)
    if (body.action === "completePrPayment") {
      await db.query(`UPDATE mr_headers SET progress_id = 25 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 25, 14, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Completed`,
          `${formattedId} payment has been completed`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    // Payment Request: Finance rejects payment (14 → 5)
    if (body.action === "rejectPrPayment") {
      await db.query(`UPDATE mr_headers SET progress_id = 5 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by, reject_reason) VALUES (?, 5, 14, ?, ?)`,
        [body.id, body.changed_by, body.reject_reason || null],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Payment Rejected`,
          `${formattedId} payment was rejected`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "approveItemQS") {
      await db.query(
        `UPDATE mr_lines SET qs_approval_status = 'Approved' WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "approveItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Approved' WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "rejectItemQS") {
      await db.query(
        `UPDATE mr_lines SET qs_approval_status = 'Rejected', qs_reject_comment = ? WHERE id = ?`,
        [body.comment, body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "rejectItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Rejected', reject_comment = ? WHERE id = ?`,
        [body.comment, body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "resetItemQS") {
      await db.query(
        `UPDATE mr_lines SET qs_approval_status = null, qs_reject_comment = null WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "setQSReviewItemAvailable") {
      await db.query(
        `UPDATE mr_lines SET qs_review_type = 'item_available', linked_inventory_item_id = ?, qs_approval_status = 'Approved' WHERE id = ?`,
        [body.linked_inventory_item_id, body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "setQSReviewNeedOrder") {
      await db.query(
        `UPDATE mr_lines SET qs_review_type = 'need_order', linked_inventory_item_id = NULL, qs_approval_status = 'Approved' WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "resetQSReview") {
      await db.query(
        `UPDATE mr_lines SET qs_review_type = NULL, linked_inventory_item_id = NULL, qs_approval_status = NULL WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "linkStockTransferToMrLine") {
      await db.query(`UPDATE mr_lines SET stock_transfer_id = ? WHERE id = ?`, [
        body.stock_transfer_id,
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateMrLineSignedDn") {
      await db.query(`UPDATE mr_lines SET signed_dn_file = ? WHERE id = ?`, [
        body.signed_dn_file,
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitStockTransferCompletion") {
      // Check if all item_available items have stock_transfer_id and signed_dn_file
      const [incompleteItems]: any = await db.query(
        `SELECT COUNT(*) as cnt FROM mr_lines
         WHERE mr_header_id = ? AND qs_review_type = 'item_available'
         AND (stock_transfer_id IS NULL OR signed_dn_file IS NULL)`,
        [body.id],
      );

      if (incompleteItems[0].cnt > 0) {
        return NextResponse.json(
          {
            error:
              "Not all item available lines have been transferred and signed",
          },
          { status: 400 },
        );
      }

      // Check if there are any need_order lines
      const [needOrderLines]: any = await db.query(
        `SELECT COUNT(*) as cnt FROM mr_lines
         WHERE mr_header_id = ? AND qs_review_type = 'need_order'`,
        [body.id],
      );

      const hasNeedOrder = needOrderLines[0].cnt > 0;

      if (hasNeedOrder) {
        // Mixed MR: some item_available, some need_order → go to quotations
        await db.query(`UPDATE mr_headers SET progress_id = 7 WHERE id = ?`, [
          body.id,
        ]);

        await db.query(
          `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 7, 4, ?)`,
          [body.id, body.changed_by],
        );

        await db.query(
          `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.id,
            9,
            "Quotations Required",
            `${formattedId} is awaiting quotations`,
          ],
        );

        await db.query(
          `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.id,
            body.department_id,
            "Stock Transfer Completed",
            `${formattedId} stock transfer has been completed and submitted for quotations`,
          ],
        );
      } else {
        // All lines are item_available → go directly to completed
        await db.query(`UPDATE mr_headers SET progress_id = 25 WHERE id = ?`, [
          body.id,
        ]);

        await db.query(
          `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 25, 4, ?)`,
          [body.id, body.changed_by],
        );

        await db.query(
          `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.id,
            body.department_id,
            "Material Received",
            `Your ${formattedId} was fulfilled successfully via stock transfer`,
          ],
        );

        await db.query(
          `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.id,
            11,
            "Stock Transfer Completed",
            `${formattedId} stock transfer completed and ${prefix} marked as fulfilled`,
          ],
        );
      }

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "resetItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = null, reject_comment = null WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForResubmission") {
      // Auto-query rejected items for the reject_reason (both manager and QS rejections)
      const [rejectedItems]: any = await db.query(
        `SELECT material_description, reject_comment, qs_reject_comment FROM mr_lines
         WHERE mr_header_id = ? AND (approval_status = 'Rejected' OR qs_approval_status = 'Rejected')`,
        [body.id],
      );

      const rejectReason =
        rejectedItems.length > 0
          ? JSON.stringify(
              rejectedItems.map((item: any) => ({
                item: item.material_description,
                reason: item.reject_comment || item.qs_reject_comment || "",
              })),
            )
          : null;

      await db.query(`UPDATE mr_headers SET progress_id = 5 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by, reject_reason) VALUES (?, 5, ?, ?, ?)`,
        [body.id, body.from_progress_id || 2, body.changed_by, rejectReason],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Rejected`,
          `${formattedId} was rejected by ${body.user_name}, ${body.user_role}`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQuotations") {
      // Check item types for split logic
      const [lineTypes]: any = await db.query(
        `SELECT qs_review_type FROM mr_lines WHERE mr_header_id = ? AND qs_approval_status = 'Approved'`,
        [body.id],
      );

      const hasItemAvailable = lineTypes.some(
        (l: any) => l.qs_review_type === "item_available",
      );

      // If ANY items have item_available → always go through stock transfer first
      // If ALL items are need_order (none item_available) → skip stock transfer, go to quotation directly
      let targetProgressId = hasItemAvailable ? 4 : 7;

      await db.query(`UPDATE mr_headers SET progress_id = ? WHERE id = ?`, [
        targetProgressId,
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          targetProgressId,
          body.from_progress_id || 3,
          body.changed_by,
        ],
      );

      if (targetProgressId === 4) {
        // Has item_available items → stock transfer first
        await db.query(
          `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.id,
            11,
            "Stock Transfer Required",
            `${formattedId} requires stock transfer`,
          ],
        );
      } else {
        // Pure need_order → goes directly to quotations
        await db.query(
          `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.id,
            9,
            "Quotations Required",
            `${formattedId} is awaiting quotations`,
          ],
        );
      }

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Approved`,
          `Your ${formattedId} has been approved`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPricingApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 10 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 10, ?, ?)`,
        [body.id, body.from_progress_id || 7, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          "Manager Price Approval Required",
          `${formattedId} is awaiting your review`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPayment") {
      await db.query(`UPDATE mr_headers SET progress_id = 14 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 14, 12, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          10,
          "Pending Payment",
          `${formattedId} is awaiting payment (AED ${body.payment_value})`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForDelivery") {
      await db.query(`UPDATE mr_headers SET progress_id = 17 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 17, 14, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          10,
          "Payment Successful",
          `A payment (AED ${body.payment_value}) was made against ${formattedId}`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          `${prefix} Awaiting Delivery`,
          `${formattedId} is awaiting delivery (ETA: ${body.delivery_date})`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          `${prefix} Awaiting Delivery`,
          `${formattedId} is awaiting delivery (ETA: ${body.delivery_date})`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          16,
          `${prefix} Awaiting Delivery`,
          `${formattedId} is awaiting delivery (ETA: ${body.delivery_date})`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          `${prefix} Awaiting Delivery`,
          `${formattedId} is awaiting delivery (ETA: ${body.delivery_date})`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForLPOResubmission") {
      // Auto-query payment rejection info
      const [rejectedPayments]: any = await db.query(
        `SELECT l.id, l.payment_reject_comment
         FROM lpo l WHERE l.mr_header_id = ? AND l.payment_status = 'Rejected'`,
        [body.id],
      );

      const rejectReason =
        rejectedPayments.length > 0
          ? JSON.stringify(
              rejectedPayments.map((lpo: any) => ({
                item: `LPO-${String(lpo.id).padStart(5, "0")}`,
                reason: lpo.payment_reject_comment || "",
              })),
            )
          : body.reject_reason || null;

      await db.query(`UPDATE mr_headers SET progress_id = 13 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by, reject_reason) VALUES (?, 13, 14, ?, ?)`,
        [body.id, body.changed_by, rejectReason],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Payment Rejected",
          `Payment for LPO-${String(body.id).padStart(5, "0")} was rejected`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForLPOResubmissionGRNFail") {
      await db.query(`UPDATE mr_headers SET progress_id = 16 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by, reject_reason) VALUES (?, 16, 17, ?, ?)`,
        [body.id, body.changed_by, body.reject_reason || null],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForProcurementResolution") {
      await db.query(`UPDATE mr_headers SET progress_id = 23 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by, reject_reason) VALUES (?, 23, 21, ?, ?)`,
        [body.id, body.changed_by, body.reject_reason || null],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForCompletion") {
      await db.query(`UPDATE mr_headers SET progress_id = 25 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 25, 24, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "Material Received",
          `Your ${formattedId} was fulfilled successfully`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Material Received",
          `${formattedId} was fulfilled successfully`,
        ],
      );

      if (body.mr_line_items && Array.isArray(body.mr_line_items)) {
        const notificationPromises = body.mr_line_items.map(
          async (item: any) => {
            await db.query(
              `
      INSERT INTO notification
      (mr_header_id, department_id, header, message)
      VALUES (?, ?, ?, ?)
      `,
              [
                body.id,
                11,
                "Stock Added",
                `${Number.isInteger(+item.quantity) ? +item.quantity : +item.quantity} ${item.unit} was added to ${item.material_description}`,
              ],
            );

            await db.query(
              `
      INSERT INTO notification
      (mr_header_id, department_id, header, message)
      VALUES (?, ?, ?, ?)
      `,
              [
                body.id,
                8,
                "Stock Added",
                `${Number.isInteger(+item.quantity) ? +item.quantity : +item.quantity} ${item.unit} was added to ${item.material_description}`,
              ],
            );

            await db.query(
              `
      INSERT INTO notification
      (mr_header_id, department_id, header, message)
      VALUES (?, ?, ?, ?)
      `,
              [
                body.id,
                16,
                "Stock Added",
                `${Number.isInteger(+item.quantity) ? +item.quantity : +item.quantity} ${item.unit} was added to ${item.material_description}`,
              ],
            );
          },
        );

        await Promise.all(notificationPromises);
      }

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForJoCompletion") {
      // Manager approved subcontractor → move to LPO & Invoice stage (12)
      await db.query(`UPDATE mr_headers SET progress_id = 12 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 12, 10, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Job Order Awaiting Invoice",
          `JO-${String(body.id).padStart(5, "0")} requires invoice upload`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateJoInvoice") {
      await db.query(`UPDATE mr_headers SET jo_invoice_file = ? WHERE id = ?`, [
        body.jo_invoice_file,
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateJoPaymentReceipt") {
      await db.query(
        `UPDATE mr_headers SET jo_payment_receipt = ?, jo_paid_at = NOW() WHERE id = ?`,
        [body.jo_payment_receipt, body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateJoContract") {
      await db.query(
        `UPDATE mr_headers SET jo_contract_file = ? WHERE id = ?`,
        [body.jo_contract_file, body.id],
      );
      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateJoOtherDocs") {
      await db.query(
        `UPDATE mr_headers SET jo_other_docs_file = ? WHERE id = ?`,
        [body.jo_other_docs_file, body.id],
      );
      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitJoForFinalCompletion") {
      await db.query(`UPDATE mr_headers SET progress_id = 25 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, from_progress_id, changed_by) VALUES (?, 25, 12, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "Job Order Completed",
          `Your JO-${String(body.id).padStart(5, "0")} was completed successfully`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Job Order Completed",
          `JO-${String(body.id).padStart(5, "0")} was completed successfully`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          "Job Order Completed",
          `JO-${String(body.id).padStart(5, "0")} was completed successfully`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateMrHeader") {
      await db.query(
        `UPDATE mr_headers 
     SET project_id = ?, 
         required_date = ?, 
         purpose_id = ? 
     WHERE id = ?`,
        [body.project_id || null, body.required_date, body.purpose_id, body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateAll") {
      try {
        // ✅ Update the main mr_line WITHOUT boq_line_id
        const query = `
      UPDATE mr_lines 
      SET material_category_id = ?, 
          material_description = ?, 
          quantity = ?, 
          unit = ?, 
          notes = ?,
          specification = ?,
          brand = ?,
          delivery_location = ?,
          approval_status = NULL,
          reject_comment = NULL,
          qs_approval_status = NULL,
          qs_reject_comment = NULL
      WHERE id = ?
    `;

        const values = [
          Number(body.material_category_id),
          body.material_description,
          Number(body.quantity),
          body.unit,
          body.notes,
          body.specification,
          body.brand,
          body.delivery_location,
          Number(body.id),
        ];

        await db.query(query, values);

        // ✅ Delete existing subcategory associations
        await db.query(
          `DELETE FROM jt_mr_line_material_subcategory WHERE mr_line_id = ?`,
          [Number(body.id)],
        );

        // ✅ Insert new subcategory associations
        const subcategoryIds = Array.isArray(body.material_subcategory_id)
          ? body.material_subcategory_id
          : [body.material_subcategory_id];

        const validSubcategoryIds = subcategoryIds.filter(
          (id: any) => id && !isNaN(Number(id)),
        );

        if (validSubcategoryIds.length > 0) {
          const junctionQuery = `
        INSERT INTO jt_mr_line_material_subcategory (mr_line_id, material_subcategory_id)
        VALUES ?
      `;

          const junctionValues = validSubcategoryIds.map((subcatId: number) => [
            Number(body.id),
            Number(subcatId),
          ]);

          await db.query(junctionQuery, [junctionValues]);
        }

        // ✅ Delete existing BOQ line associations
        await db.query(
          `DELETE FROM jt_mr_lines_boq_lines WHERE mr_line_id = ?`,
          [Number(body.id)],
        );

        // ✅ Insert new BOQ line associations
        const boqLineIds = Array.isArray(body.boq_line_ids)
          ? body.boq_line_ids
          : body.boq_line_ids
            ? [body.boq_line_ids]
            : [];

        const validBoqLineIds = boqLineIds.filter(
          (id: any) => id && !isNaN(Number(id)),
        );

        if (validBoqLineIds.length > 0) {
          const boqJunctionQuery = `
        INSERT INTO jt_mr_lines_boq_lines (mr_line_id, boq_line_id)
        VALUES ?
      `;

          const boqJunctionValues = validBoqLineIds.map((boqId: any) => [
            Number(body.id),
            Number(boqId),
          ]);

          await db.query(boqJunctionQuery, [boqJunctionValues]);
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        throw error;
      }
    }

    if (body.action === "updateSubCategory") {
      const query = `
    UPDATE mr_lines 
    SET material_subcategory_id = ?
    WHERE id IN (?)
  `;

      const values = [Number(body.new_material_subcategory_id), body.item_ids];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { error: `Unknown action: ${body.action}` },
      { status: 400 },
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message || err);
    return NextResponse.json(
      { error: err.sqlMessage || err.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "deleteItem") {
      // ✅ Cascading deletes will handle junction table entries automatically
      const query = "DELETE FROM mr_lines WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteSubCategory") {
      // ✅ Cascading deletes will handle junction table entries automatically
      const query = `
    DELETE FROM mr_lines 
    WHERE id IN (?)
  `;

      const values = [body.item_ids];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteMrHeader") {
      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          null,
          8,
          `MR Deleted`,
          `MR-${String(body.id).padStart(5, "0")} has been deleted by ${body.deleted_by}.`,
        ],
      );

      await db.query("DELETE FROM mr_headers WHERE id = ?", [Number(body.id)]);

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
