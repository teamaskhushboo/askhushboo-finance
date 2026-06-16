import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, REVENUE_COLLECTION, isAdminAvailable } from "@/lib/firebase-admin";
import type { Revenue } from "@/lib/types";

/**
 * GET /api/revenue
 * Returns all revenue entries, sorted by date desc.
 * If Admin SDK is unavailable, returns 503 with a clear message.
 */
export async function GET() {
  try {
    if (!isAdminAvailable()) {
      return NextResponse.json(
        {
          error: "Server-side Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars in Vercel.",
          needsConfig: true,
        },
        { status: 503 }
      );
    }

    const db = getAdminDb()!;
    const snapshot = await db.collection(REVENUE_COLLECTION).orderBy("date", "desc").get();

    const revenue: Revenue[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Revenue, "id">),
    }));

    return NextResponse.json({ revenue, firebaseConnected: true });
  } catch (error) {
    console.error("[API /revenue GET] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to fetch revenue", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/revenue
 * Creates a new revenue entry. Body: { revenue: Revenue }
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const revenue: Revenue = body.revenue;

    if (!revenue || !revenue.date || !revenue.source || typeof revenue.amount !== "number") {
      return NextResponse.json({ error: "Invalid revenue data" }, { status: 400 });
    }

    const db = getAdminDb()!;
    const { id, ...data } = revenue;
    const docRef = await db.collection(REVENUE_COLLECTION).add({
      ...data,
      createdAt: new Date(),
    });

    return NextResponse.json({
      revenue: { ...revenue, id: docRef.id },
      firebaseConnected: true,
    });
  } catch (error) {
    console.error("[API /revenue POST] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to add revenue", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
