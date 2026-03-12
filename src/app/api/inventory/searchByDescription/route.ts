import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "in",
  "on",
  "to",
  "with",
  "is",
  "at",
  "by",
  "from",
  "as",
  "it",
  "no",
  "not",
  "be",
  "was",
  "are",
  "has",
  "had",
  "do",
  "does",
  "did",
  "but",
  "if",
  "so",
  "up",
  "out",
  "all",
  "per",
  "set",
  "qty",
  "pcs",
  "nos",
  "mm",
  "cm",
  "m",
  "kg",
  "g",
  "ml",
  "l",
  "x",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { descriptions } = body;

    if (
      !descriptions ||
      !Array.isArray(descriptions) ||
      descriptions.length === 0
    ) {
      return NextResponse.json(
        { success: false, message: "Missing descriptions array" },
        { status: 400 },
      );
    }

    // Get all active inventory items
    const [inventoryItems] = await db.query<RowDataPacket[]>(
      `SELECT id, description, category_name, subcategory_name
       FROM vw_inventory WHERE is_archived = 0`,
    );

    const results: {
      [description: string]: {
        id: number;
        description: string;
        category_name: string;
        subcategory_name: string;
        score: number;
      } | null;
    } = {};

    for (const desc of descriptions) {
      if (!desc || typeof desc !== "string") {
        results[desc] = null;
        continue;
      }

      // Split description into keywords, filter stop words and short words
      const keywords = desc
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

      if (keywords.length === 0) {
        results[desc] = null;
        continue;
      }

      let bestMatch: (typeof results)[string] = null;
      let bestScore = 0;

      for (const item of inventoryItems) {
        const itemDesc = (item.description || "").toLowerCase();
        let matchCount = 0;

        for (const keyword of keywords) {
          if (itemDesc.includes(keyword)) {
            matchCount++;
          }
        }

        // Only consider matches with at least 2 keywords matching (or 1 if only 1 keyword)
        const minMatches = keywords.length === 1 ? 1 : 2;
        if (matchCount >= minMatches && matchCount > bestScore) {
          bestScore = matchCount;
          bestMatch = {
            id: item.id,
            description: item.description,
            category_name: item.category_name,
            subcategory_name: item.subcategory_name,
            score: matchCount,
          };
        }
      }

      results[desc] = bestMatch;
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Error searching inventory:", error);
    return NextResponse.json(
      { success: false, error: error.sqlMessage || error.message },
      { status: 500 },
    );
  }
}
