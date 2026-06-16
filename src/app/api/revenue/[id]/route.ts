import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, REVENUE_COLLECTION, isAdminAvailable } from "@/lib/firebase-admin";
import type { Revenue } from "@/lib/types";

/**
 * PUT /api/revenue/[id]
 * Updates an existing revenue entry. Body: { revenue: Revenue }
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
    const revenue: Revenue = body.revenue;

    if (!revenue || !id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getAdminDb()!;
    const { id: _ignoredId, ...data } = revenue;
    await db.collection(REVENUE_COLLECTION).doc(id).update({
      ...data,
      updatedAt: new Date(),
    });

    return NextResponse.json({ revenue, firebaseConnected: true });
  } catch (error) {
    console.error("[API /revenue/[id] PUT] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to update revenue", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/revenue/[id]
 * Deletes a revenue entry.
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
    await db.collection(REVENUE_COLLECTION).doc(id).delete();

    return NextResponse.json({ success: true, firebaseConnected: true });
  } catch (error) {
    console.error("[API /revenue/[id] DELETE] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to delete revenue", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
