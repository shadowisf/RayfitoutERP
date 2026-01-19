import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, type } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid items array" },
        { status: 400 },
      );
    }

    if (type === "category") {
      const updatePromises = items.map(
        (item: { category: string; order: number; boqId: number }) =>
          db.query(
            "UPDATE boq_lines SET category_order = ? WHERE boq_id = ? AND category = ?",
            [item.order, item.boqId, item.category],
          ),
      );
      await Promise.all(updatePromises);
    } else if (type === "subcategory") {
      const updatePromises = items.map(
        (item: {
          category: string;
          subCategory: string;
          order: number;
          boqId: number;
        }) =>
          db.query(
            "UPDATE boq_lines SET subcategory_order = ? WHERE boq_id = ? AND category = ? AND sub_category = ?",
            [item.order, item.boqId, item.category, item.subCategory],
          ),
      );
      await Promise.all(updatePromises);
    } else if (type === "item") {
      console.log("Updating item order:", items); // Add logging
      const updatePromises = items.map(
        (item: { id: number; item_order: number }) => {
          console.log(`Setting item ${item.id} to order ${item.item_order}`); // Debug log
          return db.query("UPDATE boq_lines SET item_order = ? WHERE id = ?", [
            item.item_order,
            item.id,
          ]);
        },
      );
      const results = await Promise.all(updatePromises);
      console.log("Update results:", results); // Check if updates actually happened
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}
