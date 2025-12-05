import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
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
    (supplier_id, mr_line_id, quotation_file, rating, unit_price, total_price) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

      const insertedIds = [];

      for (const quotation of quotations) {
        const { supplier_id, quotation_file, rating, unit_price, total_price } =
          quotation;

        const [result]: any = await db.query(insertQuery, [
          supplier_id,
          mr_line_id,
          JSON.stringify([quotation_file]), // Store as JSON array
          rating || null,
          unit_price,
          total_price,
        ]);

        insertedIds.push(result.insertId);
      }

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "createSupplier") {
      const query = `
      INSERT INTO suppliers 
      (name, trn_number, avg_lead_time, supplier_rating, currency, status, contact_person_name, phone, email, address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        body.name,
        body.trn_number,
        body.avg_lead_time || null,
        body.supplier_rating || null,
        body.currency,
        body.status,
        body.contact_person_name,
        body.phone,
        body.email,
        body.address,
        body.notes || null,
      ];

      const [result]: any = await db.query(query, values);
      const supplierId = result.insertId;

      if (body.material_categories && body.material_categories.length > 0) {
        const categoryValues = body.material_categories.map(
          (categoryId: number) => [supplierId, categoryId]
        );

        await db.query(
          `INSERT INTO jt_supplier_material_category (supplier_id, material_category_id) VALUES ?`,
          [categoryValues]
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
                [subcategoryId]
              );

              if (subcat.length > 0) {
                // Check for common column name variations
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
                err
              );
              return null;
            }
          }
        );

        const subcategoryValues = (
          await Promise.all(subcategoryPromises)
        ).filter((item) => item !== null);

        if (subcategoryValues.length > 0) {
          await db.query(
            `INSERT INTO jt_supplier_material_subcategory (supplier_id, material_category_id, material_subcategory_id) VALUES ?`,
            [subcategoryValues]
          );
        }
      }

      return NextResponse.json({ success: true, id: supplierId });
    }
  } catch (err: any) {
    console.error("Database error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
