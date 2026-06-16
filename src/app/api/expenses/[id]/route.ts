import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, EXPENSES_COLLECTION, isAdminAvailable } from "@/lib/firebase-admin";
import type { Expense } from "@/lib/types";

/**
 * PUT /api/expenses/[id]
 * Updates an existing expense. Body: { expense: Expense }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminAvailable()) {
      return NextResponse.json(
        { error: "Server-side Firebase not configured.", needsConfig: true },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const expense: Expense = body.expense;

    if (!expense || !id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getAdminDb()!;
    const { id: _ignoredId, ...data } = expense;
    await db.collection(EXPENSES_COLLECTION).doc(id).update({
      ...data,
      updatedAt: new Date(),
    });

    return NextResponse.json({ expense, firebaseConnected: true });
  } catch (error) {
    console.error("[API /expenses/[id] PUT] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to update expense", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expenses/[id]
 * Deletes an expense.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminAvailable()) {
      return NextResponse.json(
        { error: "Server-side Firebase not configured.", needsConfig: true },
        { status: 503 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const db = getAdminDb()!;
    await db.collection(EXPENSES_COLLECTION).doc(id).delete();

    return NextResponse.json({ success: true, firebaseConnected: true });
  } catch (error) {
    console.error("[API /expenses/[id] DELETE] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to delete expense", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
