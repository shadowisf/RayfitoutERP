import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) : str;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const addedBy = formData.get("added_by") as string | null;
    const customDbName = (formData.get("database_name") as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // ── Parse file ──────────────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // Skip header row, drop fully-empty rows
    const dataRows = rows.slice(1).filter((row) =>
      row.some((cell) => String(cell).trim() !== ""),
    );

    if (dataRows.length === 0) {
      return NextResponse.json({ error: "No data rows found in the file." }, { status: 400 });
    }

    // ── Create database (named or auto "Imported MM/DD/YYYY") ───────────────
    let importedDbName: string;
    if (customDbName) {
      importedDbName = customDbName;
    } else {
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
      importedDbName = `Imported ${dateStr}`;
      // Handle duplicate name (same-day re-imports)
      const [existingDbs]: any = await db.query(
        "SELECT name FROM lut_predefined_databases WHERE name LIKE ?",
        [`Imported ${dateStr}%`],
      );
      if (existingDbs.length > 0) {
        importedDbName = `Imported ${dateStr} (${existingDbs.length + 1})`;
      }
    }

    let dbResult: ResultSetHeader;
    try {
      [dbResult] = await db.query<ResultSetHeader>(
        "INSERT INTO lut_predefined_databases (name) VALUES (?)",
        [importedDbName],
      );
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: `A database named "${importedDbName}" already exists.` },
          { status: 409 },
        );
      }
      throw err;
    }
    const importDbId = dbResult.insertId;

    // ── Load existing LUT maps ───────────────────────────────────────────────
    const [categoryRows]: any = await db.query(
      "SELECT id, value FROM lut_material_categories",
    );
    const [subCategoryRows]: any = await db.query(
      "SELECT id, value, category_id FROM lut_material_subcategories",
    );

    // category: value_lower → id
    const categoryMap = new Map<string, number>(
      categoryRows.map((r: any) => [r.value.toLowerCase().trim(), r.id]),
    );
    // subcategory: `${category_id}::value_lower` → id
    const subCategoryMap = new Map<string, number>(
      subCategoryRows.map((r: any) => [
        `${r.category_id}::${r.value.toLowerCase().trim()}`,
        r.id,
      ]),
    );

    // ── Get base ID for item code generation ────────────────────────────────
    const [maxRows]: any = await db.query(
      "SELECT COALESCE(MAX(id), 0) AS max_id FROM lut_predefined_items",
    );
    let nextId = (maxRows[0]?.max_id || 0) + 1;

    // ── Process rows ────────────────────────────────────────────────────────
    // Expected columns: item_code | category | subcategory | material | brand | unit
    const imported: string[] = [];
    const failed: { row: number; name: string; reason: string }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;

      const rawItemCode   = String(row[0] ?? "").trim();
      const categoryName  = String(row[1] ?? "").trim();
      const subCatName    = String(row[2] ?? "").trim();
      const materialName  = String(row[3] ?? "").trim();
      const brand         = String(row[4] ?? "").trim() || null;
      const unit          = String(row[5] ?? "").trim() || null;

      if (!materialName) {
        failed.push({ row: rowNum, name: "(empty)", reason: "Material name is required." });
        continue;
      }
      if (!categoryName) {
        failed.push({ row: rowNum, name: materialName, reason: "Category is required." });
        continue;
      }
      if (!subCatName) {
        failed.push({ row: rowNum, name: materialName, reason: "Subcategory is required." });
        continue;
      }

      // ── Resolve or create category ─────────────────────────────────────
      let categoryId = categoryMap.get(categoryName.toLowerCase());
      if (!categoryId) {
        const catValue = truncate(toTitleCase(categoryName), 45);
        const [catResult] = await db.query<ResultSetHeader>(
          "INSERT INTO lut_material_categories (level_1, level_2, value) VALUES (?, ?, ?)",
          [catValue, catValue, catValue],
        );
        categoryId = catResult.insertId;
        categoryMap.set(categoryName.toLowerCase(), categoryId);
      }

      // ── Resolve or create subcategory (scoped to category) ─────────────
      const subKey = `${categoryId}::${subCatName.toLowerCase()}`;
      let subCategoryId = subCategoryMap.get(subKey);
      if (!subCategoryId) {
        const subValue = truncate(toTitleCase(subCatName), 100);
        const [subResult] = await db.query<ResultSetHeader>(
          "INSERT INTO lut_material_subcategories (category_id, value) VALUES (?, ?)",
          [categoryId, subValue],
        );
        subCategoryId = subResult.insertId;
        subCategoryMap.set(subKey, subCategoryId);
      }

      // ── Item code ──────────────────────────────────────────────────────
      const itemCode = rawItemCode || `MAT-${String(nextId).padStart(5, "0")}`;
      const description = toTitleCase(materialName);

      try {
        await db.query<ResultSetHeader>(
          `INSERT INTO lut_predefined_items
             (item_code, category_id, subcategory_id, material_description, brand, unit, added_by, database_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemCode, categoryId, subCategoryId, description, brand, unit, addedBy, importDbId],
        );
        imported.push(description);
        nextId++;
      } catch (err: any) {
        failed.push({
          row: rowNum,
          name: materialName,
          reason: err.sqlMessage ?? "Insert failed.",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        imported: imported.length,
        failed,
        database_name: importedDbName,
        database_id: importDbId,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Import failed." }, { status: 500 });
  }
}
