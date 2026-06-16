import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, EXPENSES_COLLECTION, isAdminAvailable } from "@/lib/firebase-admin";
import { PRELOADED_EXPENSES } from "@/lib/data";

/**
 * POST /api/expenses/reseed
 * Clears all existing expenses and re-inserts the 39 preloaded items
 * (total Rs 189,530). Used by the "Restore Pre-loaded Expenses" button.
 */
export async function POST(_req: NextRequest) {
  try {
    if (!isAdminAvailable()) {
      return NextResponse.json(
        {
          error: "Server-side Firebase not configured.",
          needsConfig: true,
        },
        { status: 503 }
      );
    }

    const db = getAdminDb()!;

    // 1. Delete all existing expenses
    const snapshot = await db.collection(EXPENSES_COLLECTION).get();
    const deleteBatch = db.batch();
    snapshot.docs.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    // 2. Insert all preloaded expenses
    const insertBatch = db.batch();
    PRELOADED_EXPENSES.forEach((expense) => {
      const { id, ...data } = expense;
      const ref = db.collection(EXPENSES_COLLECTION).doc();
      insertBatch.set(ref, { ...data, createdAt: new Date() });
    });
    await insertBatch.commit();

    return NextResponse.json({
      success: true,
      count: PRELOADED_EXPENSES.length,
      totalAmount: 189530,
      message: `Restored ${PRELOADED_EXPENSES.length} pre-loaded expenses (Rs 189,530)`,
    });
  } catch (error) {
    console.error("[API /expenses/reseed POST] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        error: "Failed to reseed expenses",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
