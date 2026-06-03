import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export async function GET(req: NextRequest) {
  try {
    const archived = req.nextUrl.searchParams.get("archived");
    const whereClause = archived === "1"
      ? "pi.is_archived = 1"
      : "(pi.is_archived = 0 OR pi.is_archived IS NULL)";

    const [rows] = await db.query(
      `SELECT
        pi.id,
        pi.item_code,
        pi.category_id,
        pi.subcategory_id,
        pi.material_description,
        pi.brand,
        pi.unit,
        pi.added_by,
        pi.database_id,
        ld.name AS \`database\`,
        pi.is_archived,
        mc.value AS category_name,
        msc.value AS subcategory_name,
        (
          SELECT MAX(mh.date_requested)
          FROM mr_lines ml
          JOIN mr_headers mh ON mh.id = ml.mr_header_id
          WHERE ml.predefined_item_id = pi.id
        ) AS last_purchase
      FROM lut_predefined_items pi
      LEFT JOIN lut_material_categories mc ON mc.id = pi.category_id
      LEFT JOIN lut_material_subcategories msc ON msc.id = pi.subcategory_id
      LEFT JOIN lut_predefined_databases ld ON ld.id = pi.database_id
      WHERE ${whereClause}
      ORDER BY pi.material_description ASC`,
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item_code, category_id, subcategory_id, unit, brand, added_by, database_id, source_item_id, action_type, changed_by } = body;
    const material_description = body.material_description
      ? toTitleCase(body.material_description)
      : body.material_description;

    if (!material_description || !category_id || !subcategory_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Use provided item_code or auto-generate MAT-XXXXX
    let itemCode = item_code?.trim();
    if (!itemCode) {
      const [maxRows]: any = await db.query(
        `SELECT MAX(id) as max_id FROM lut_predefined_items`,
      );
      const nextId = (maxRows[0]?.max_id || 0) + 1;
      itemCode = `MAT-${String(nextId).padStart(5, "0")}`;
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO lut_predefined_items
        (item_code, category_id, subcategory_id, material_description, brand, unit, added_by, database_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemCode,
        Number(category_id),
        Number(subcategory_id),
        material_description,
        brand || null,
        unit || null,
        added_by || null,
        database_id ? Number(database_id) : null,
      ],
    );

    const newItemId = result.insertId;

    // Fetch the inserted item with all joined fields
    const [rows]: any = await db.query(
      `SELECT
        pi.id, pi.item_code, pi.category_id, pi.subcategory_id,
        pi.material_description, pi.brand, pi.unit, pi.added_by,
        pi.database_id, ld.name AS \`database\`, pi.is_archived,
        mc.value AS category_name,
        msc.value AS subcategory_name,
        NULL AS last_purchase
      FROM lut_predefined_items pi
      LEFT JOIN lut_material_categories mc ON mc.id = pi.category_id
      LEFT JOIN lut_material_subcategories msc ON msc.id = pi.subcategory_id
      LEFT JOIN lut_predefined_databases ld ON ld.id = pi.database_id
      WHERE pi.id = ?`,
      [newItemId],
    );

    const newItem = rows[0];

    // Log copy/duplicate on the source item
    if (source_item_id && action_type) {
      const action = action_type === "copy" ? "copied_to" : "duplicated";
      const newValue = action_type === "copy"
        ? (newItem?.database ?? "Unknown Database")
        : newItem?.item_code;
      await db.query(
        `INSERT INTO lut_predefined_item_changelog
           (predefined_item_id, action, old_value, new_value, changed_by)
         VALUES (?, ?, ?, ?, ?)`,
        [Number(source_item_id), action, null, newValue ?? null, changed_by ?? null],
      );
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, unit, material_description, category_id, subcategory_id, is_archived, database_id, action, changed_by } = body;

    // ── Rename database (updates lut_predefined_databases name) ────────────────────────
    if (action === "renameDatabase") {
      const { db_id, new_name } = body;
      if (!db_id || !new_name) {
        return NextResponse.json({ error: "Missing db_id or new_name" }, { status: 400 });
      }
      try {
        await db.query(
          `UPDATE lut_predefined_databases SET name = ? WHERE id = ?`,
          [new_name.trim(), db_id],
        );
      } catch (err: any) {
        if (err.code === "ER_DUP_ENTRY") {
          return NextResponse.json({ error: "A database with this name already exists." }, { status: 409 });
        }
        throw err;
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── Archive all items in a database ─────────────────────────────────────
    if (action === "archiveDatabase") {
      const { db_id } = body;
      if (!db_id) {
        return NextResponse.json({ error: "Missing db_id" }, { status: 400 });
      }
      await db.query(
        `UPDATE lut_predefined_items SET is_archived = 1 WHERE database_id = ?`,
        [db_id],
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Fetch current item values for changelog comparison
    const [oldRows]: any = await db.query(
      `SELECT pi.material_description, pi.unit, pi.category_id, pi.subcategory_id,
              pi.database_id, pi.is_archived,
              ld.name AS database_name,
              mc.value AS category_name,
              msc.value AS subcategory_name
       FROM lut_predefined_items pi
       LEFT JOIN lut_predefined_databases ld ON ld.id = pi.database_id
       LEFT JOIN lut_material_categories mc ON mc.id = pi.category_id
       LEFT JOIN lut_material_subcategories msc ON msc.id = pi.subcategory_id
       WHERE pi.id = ?`,
      [id],
    );
    const old = oldRows[0];

    // Build a dynamic SET clause from whichever fields were supplied
    const setClauses: string[] = [];
    const values: any[] = [];

    if (unit !== undefined) {
      setClauses.push("unit = ?");
      values.push(unit);
    }
    if (material_description !== undefined) {
      setClauses.push("material_description = ?");
      values.push(material_description);
    }
    if (category_id !== undefined) {
      setClauses.push("category_id = ?");
      values.push(Number(category_id));
    }
    if (subcategory_id !== undefined) {
      setClauses.push("subcategory_id = ?");
      values.push(Number(subcategory_id));
    }
    if (is_archived !== undefined) {
      setClauses.push("is_archived = ?");
      values.push(is_archived);
    }
    if (database_id !== undefined) {
      setClauses.push("database_id = ?");
      values.push(database_id !== null ? Number(database_id) : null);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    await db.query(
      `UPDATE lut_predefined_items SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    // Build changelog entries from detected changes
    if (old) {
      const entries: [string, string | null, string | null][] = [];

      if (material_description !== undefined && material_description !== old.material_description) {
        entries.push(["renamed", old.material_description, material_description]);
      }
      if (unit !== undefined && (unit || null) !== (old.unit || null)) {
        entries.push(["changed_unit", old.unit ?? null, unit ?? null]);
      }
      if (is_archived !== undefined) {
        if (Number(is_archived) === 1 && !old.is_archived) {
          entries.push(["archived", null, null]);
        } else if (Number(is_archived) === 0 && old.is_archived) {
          entries.push(["unarchived", null, null]);
        }
      }
      if (database_id !== undefined) {
        const newDbId = database_id !== null ? Number(database_id) : null;
        if (newDbId !== (old.database_id ?? null)) {
          // Fetch new database name
          let newDbName: string | null = null;
          if (newDbId) {
            const [dbRows]: any = await db.query(
              `SELECT name FROM lut_predefined_databases WHERE id = ?`,
              [newDbId],
            );
            newDbName = dbRows[0]?.name ?? null;
          }
          entries.push(["moved_to", old.database_name ?? null, newDbName]);
        }
      }
      if (category_id !== undefined && Number(category_id) !== old.category_id) {
        const [catRows]: any = await db.query(
          `SELECT value FROM lut_material_categories WHERE id = ?`,
          [Number(category_id)],
        );
        entries.push(["changed_category", old.category_name ?? null, catRows[0]?.value ?? null]);
      }
      if (subcategory_id !== undefined && Number(subcategory_id) !== old.subcategory_id) {
        const [subRows]: any = await db.query(
          `SELECT value FROM lut_material_subcategories WHERE id = ?`,
          [Number(subcategory_id)],
        );
        entries.push(["changed_subcategory", old.subcategory_name ?? null, subRows[0]?.value ?? null]);
      }

      if (entries.length > 0) {
        const placeholders = entries.map(() => "(?, ?, ?, ?, ?)").join(", ");
        const entryValues = entries.flatMap(([act, oldVal, newVal]) => [
          Number(id), act, oldVal, newVal, changed_by ?? null,
        ]);
        await db.query(
          `INSERT INTO lut_predefined_item_changelog
             (predefined_item_id, action, old_value, new_value, changed_by)
           VALUES ${placeholders}`,
          entryValues,
        );
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }
    const placeholders = ids.map(() => "?").join(", ");
    await db.query(
      `DELETE FROM lut_predefined_item_changelog WHERE predefined_item_id IN (${placeholders})`,
      ids,
    );
    await db.query(
      `DELETE FROM lut_predefined_items WHERE id IN (${placeholders})`,
      ids,
    );
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
