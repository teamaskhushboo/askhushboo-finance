import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, EXPENSES_COLLECTION, isAdminAvailable } from "@/lib/firebase-admin";
import { PRELOADED_EXPENSES } from "@/lib/data";
import type { Expense } from "@/lib/types";

/**
 * GET /api/expenses
 * Returns all expenses, sorted by date desc.
 * If ?seed=true is passed and Firestore is empty, preloads default expenses.
 * If Admin SDK is unavailable, returns 503 with a clear message.
 */
export async function GET(req: NextRequest) {
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
    const snapshot = await db.collection(EXPENSES_COLLECTION).orderBy("date", "desc").get();

    let expenses: Expense[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Expense, "id">),
    }));

    const shouldSeed = req.nextUrl.searchParams.get("seed") === "true";
    if (expenses.length === 0 && shouldSeed) {
      const batch = db.batch();
      PRELOADED_EXPENSES.forEach((expense) => {
        const { id, ...data } = expense;
        const ref = db.collection(EXPENSES_COLLECTION).doc();
        batch.set(ref, { ...data, createdAt: new Date() });
      });
      await batch.commit();

      const newSnapshot = await db.collection(EXPENSES_COLLECTION).orderBy("date", "desc").get();
      expenses = newSnapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Expense, "id">),
      }));
    }

    return NextResponse.json({ expenses, firebaseConnected: true });
  } catch (error) {
    console.error("[API /expenses GET] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to fetch expenses", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Creates a new expense. Body: { expense: Expense }
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
    const expense: Expense = body.expense;

    if (!expense || !expense.date || !expense.category || typeof expense.amount !== "number") {
      return NextResponse.json({ error: "Invalid expense data" }, { status: 400 });
    }

    const db = getAdminDb()!;
    const { id, ...data } = expense;
    const docRef = await db.collection(EXPENSES_COLLECTION).add({
      ...data,
      createdAt: new Date(),
    });

    return NextResponse.json({
      expense: { ...expense, id: docRef.id },
      firebaseConnected: true,
    });
  } catch (error) {
    console.error("[API /expenses POST] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to add expense", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
