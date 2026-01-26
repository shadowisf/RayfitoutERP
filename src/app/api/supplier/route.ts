import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM vw_suppliers");

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "addSupplierAndQuotation") {
      const { mr_line_id, quotations } = body;

      const insertQuery = `
        INSERT INTO mr_line_supplier_quotation 
        (supplier_id, mr_line_id, quotation_file, rating, unit_price, total_price, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const insertedIds = [];

      for (const quotation of quotations) {
        const {
          supplier_id,
          quotation_file,
          rating,
          unit_price,
          total_price,
          created_by,
        } = quotation;

        const [result]: any = await db.query(insertQuery, [
          supplier_id,
          mr_line_id,
          JSON.stringify([quotation_file]), // Store as JSON array
          rating || null,
          unit_price,
          total_price,
          created_by,
        ]);

        insertedIds.push(result.insertId);
      }

      return NextResponse.json(
        { message: "Quotations added successfully", ids: insertedIds },
        { status: 200 },
      );
    }

    if (body.action === "createSupplier") {
      const query = `
        INSERT INTO suppliers 
        (type, name, trn_number, trn_certificate, trade_license, avg_lead_time, supplier_rating, currency, status, credit_limit, payment_terms, opening_balance, contact_person_name, phone, email, website, address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        body.type,
        body.name,
        body.trn_number || null,
        body.trn_certificate || null,
        body.trade_license,
        body.avg_lead_time || null,
        body.supplier_rating || null,
        body.currency,
        body.status,
        body.credit_limit || null,
        body.payment_terms || null,
        body.opening_balance || null,
        body.contact_person_name,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.website || null,
        body.notes || null,
      ];

      const [result]: any = await db.query(query, values);
      const supplierId = result.insertId;

      if (body.material_categories && body.material_categories.length > 0) {
        const categoryValues = body.material_categories.map(
          (categoryId: number) => [supplierId, categoryId],
        );

        await db.query(
          `INSERT INTO jt_supplier_material_category (supplier_id, material_category_id) VALUES ?`,
          [categoryValues],
        );
      }

      if (
        body.material_subcategories &&
        body.material_subcategories.length > 0
      ) {
        const subcategoryPromises = body.material_subcategories.map(
          async (subcategoryId: number) => {
            try {
              const [subcat]: any = await db.query(
                `SELECT * FROM lut_material_subcategories WHERE id = ?`,
                [subcategoryId],
              );

              if (subcat.length > 0) {
                const categoryId =
                  subcat[0].material_category_id ||
                  subcat[0].category_id ||
                  subcat[0].parent_id ||
                  subcat[0].parent_category_id;

                if (categoryId) {
                  return [supplierId, categoryId, subcategoryId];
                }
              }
              return null;
            } catch (err) {
              console.error(
                `Error fetching subcategory ${subcategoryId}:`,
                err,
              );
              return null;
            }
          },
        );

        const subcategoryValues = (
          await Promise.all(subcategoryPromises)
        ).filter((item) => item !== null);

        if (subcategoryValues.length > 0) {
          await db.query(
            `INSERT INTO jt_supplier_material_subcategory (supplier_id, material_category_id, material_subcategory_id) VALUES ?`,
            [subcategoryValues],
          );
        }
      }

      return NextResponse.json({ success: true, id: supplierId });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "updateSupplier") {
      try {
        const {
          id,
          type,
          name,
          trn_number,
          trn_certificate,
          trade_license,
          avg_lead_time,
          supplier_rating,
          currency,
          status,
          credit_limit,
          payment_terms,
          opening_balance,
          contact_person_name,
          phone,
          email,
          website,
          address,
          notes,
        } = body;

        const query = `
          UPDATE suppliers
          SET
            type = ?,
            name = ?,
            trn_number = ?,
            trn_certificate = ?,
            trade_license = ?,
            avg_lead_time = ?,
            supplier_rating = ?,
            currency = ?,
            status = ?,
            credit_limit = ?,
            payment_terms = ?,
            opening_balance = ?,
            contact_person_name = ?,
            phone = ?,
            email = ?,
            website = ?,
            address = ?,
            notes = ?
          WHERE id = ?
        `;

        await db.query(query, [
          type,
          name,
          trn_number,
          trn_certificate,
          trade_license,
          avg_lead_time,
          supplier_rating,
          currency,
          status,
          credit_limit || 0,
          payment_terms,
          opening_balance || 0,
          contact_person_name,
          phone,
          email,
          website,
          address,
          notes,
          id,
        ]);

        return NextResponse.json({ success: true });
      } catch (err: any) {
        console.error(err.sqlMessage);
        return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
      }
    }

    if (body.action === "resetSupplierAndQuotation") {
      const query = `UPDATE mr_line_supplier_quotation SET approval_status = NULL WHERE mr_line_id = ?`;

      await db.query(query, [body.mr_line_id]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "resetSupplierAndQuotationQS") {
      const query = `UPDATE mr_line_supplier_quotation SET qs_approval_status = NULL WHERE mr_line_id = ?`;

      await db.query(query, [body.mr_line_id]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "rejectAllSupplierAndQuotation") {
      const query = `UPDATE mr_line_supplier_quotation SET approval_status = 'Rejected', reject_comment = ? WHERE mr_line_id = ?`;

      await db.query(query, [body.reject_comment, body.mr_line_id]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "rejectAllSupplierAndQuotationQS") {
      const query = `UPDATE mr_line_supplier_quotation SET qs_approval_status = 'Rejected', qs_reject_comment = ? WHERE mr_line_id = ?`;

      await db.query(query, [body.reject_comment, body.mr_line_id]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "approveSupplierAndQuotation") {
      const query = `UPDATE mr_line_supplier_quotation SET approval_status = 'Approved' WHERE mr_line_id = ? AND supplier_id = ?`;

      await db.query(query, [body.mr_line_id, body.supplier_id]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateSupplierAndQuotation") {
      const { mr_line_id, quotations } = body;

      if (!quotations || quotations.length === 0) {
        return NextResponse.json(
          { error: "No quotations provided" },
          { status: 400 },
        );
      }

      if (!mr_line_id) {
        return NextResponse.json(
          { error: "mr_line_id is required" },
          { status: 400 },
        );
      }

      // Get existing quotation IDs for this MR line
      const [existingRows] = await db.query<RowDataPacket[]>(
        "SELECT id FROM mr_line_supplier_quotation WHERE mr_line_id = ?",
        [mr_line_id],
      );

      const existingIds = existingRows.map((row) => row.id);
      const updatedIds: number[] = [];

      // Process each quotation
      for (const quotation of quotations) {
        if (quotation.id && existingIds.includes(quotation.id)) {
          // Update existing quotation
          await db.query(
            `UPDATE mr_line_supplier_quotation 
          SET supplier_id = ?, 
              quotation_file = ?, 
              rating = ?, 
              unit_price = ?, 
              total_price = ?,
              approval_status = NULL,
              reject_comment = NULL,
              qs_approval_status = NULL,
              qs_reject_comment = NULL,
              created_by = ?
          WHERE id = ?`,
            [
              quotation.supplier_id,
              JSON.stringify([quotation.quotation_file]),
              quotation.rating,
              quotation.unit_price,
              quotation.total_price,
              quotation.created_by,
              quotation.id,
            ],
          );
          updatedIds.push(quotation.id);
        } else {
          // Insert new quotation
          const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO mr_line_supplier_quotation 
          (supplier_id, mr_line_id, quotation_file, rating, unit_price, total_price, created_by) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              quotation.supplier_id,
              mr_line_id,
              JSON.stringify([quotation.quotation_file]),
              quotation.rating,
              quotation.unit_price,
              quotation.total_price,
              quotation.created_by,
            ],
          );
          updatedIds.push(result.insertId);
        }
      }

      // Delete quotations that were removed
      const idsToDelete = existingIds.filter((id) => !updatedIds.includes(id));

      if (idsToDelete.length > 0) {
        await db.query<RowDataPacket[]>(
          "SELECT quotation_file FROM mr_line_supplier_quotation WHERE id IN (?)",
          [idsToDelete],
        );

        await db.query(
          "DELETE FROM mr_line_supplier_quotation WHERE id IN (?)",
          [idsToDelete],
        );

        console.log("Deleted quotation IDs:", idsToDelete);
      }

      return NextResponse.json(
        {
          updated: updatedIds.length,
          deleted: idsToDelete.length,
        },
        { status: 200 },
      );
    }

    if (body.action === "approveAllSupplierAndQuotationQS") {
      const query = `UPDATE mr_line_supplier_quotation SET qs_approval_status = 'Approved' WHERE mr_line_id = ?`;

      await db.query(query, [body.mr_line_id]);

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "deleteSupplier") {
      const query = "DELETE FROM suppliers WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteNonApprovedQuotationFiles") {
      const { approved_suppliers } = body;

      let totalFilesDeleted = 0;
      let totalFilesFailed = 0;

      for (const item of approved_suppliers) {
        const { mr_line_id, quotation_id } = item;

        const quotationsResult = await db.query(
          `SELECT id, quotation_file 
             FROM mr_line_supplier_quotation 
             WHERE mr_line_id = ? AND id != ?`,
          [mr_line_id, quotation_id],
        );

        const quotationsToDelete: any[] = Array.isArray(quotationsResult[0])
          ? quotationsResult[0]
          : [];

        const filesToDelete: string[] = [];

        for (const quotation of quotationsToDelete) {
          if (quotation.quotation_file) {
            try {
              let fileUrls: string[] = [];

              if (typeof quotation.quotation_file === "string") {
                try {
                  const parsed = JSON.parse(quotation.quotation_file);
                  fileUrls = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                  fileUrls = [quotation.quotation_file];
                }
              } else if (Array.isArray(quotation.quotation_file)) {
                fileUrls = quotation.quotation_file;
              }

              const validUrls = fileUrls.filter(
                (url) => url && typeof url === "string" && url.trim() !== "",
              );
              filesToDelete.push(...validUrls);
            } catch (error) {
              console.error(
                `Error parsing quotation_file for quotation ${quotation.id}:`,
                error,
              );
            }
          }
        }

        if (filesToDelete.length > 0) {
          for (const fileUrl of filesToDelete) {
            try {
              const deleteResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "delete",
                    url: fileUrl,
                  }),
                },
              );

              if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                console.error(
                  `Failed to delete file from S3: ${fileUrl}`,
                  errorText,
                );
                totalFilesFailed++;
              } else {
                console.log(`Successfully deleted file from S3: ${fileUrl}`);
                totalFilesDeleted++;
              }
            } catch (error) {
              console.error(`Error deleting file ${fileUrl} from S3:`, error);
              totalFilesFailed++;
            }
          }
        }

        await db.query(
          `DELETE FROM mr_line_supplier_quotation 
             WHERE mr_line_id = ? AND id != ?`,
          [mr_line_id, quotation_id],
        );
      }

      return NextResponse.json(
        {
          message: "Non-approved quotations deleted successfully",
          totalFilesDeleted,
          totalFilesFailed,
        },
        { status: 200 },
      );
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
