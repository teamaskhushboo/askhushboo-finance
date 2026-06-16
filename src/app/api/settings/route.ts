import { NextRequest, NextResponse } from "next/server";
import {
  getAdminDb,
  SETTINGS_COLLECTION,
  SETTINGS_DOC,
  isAdminAvailable,
} from "@/lib/firebase-admin";

/**
 * GET /api/settings
 * Returns the app settings (AI provider config).
 * Uses server-side Admin SDK to bypass locked-down Firestore rules.
 */
export async function GET() {
  try {
    if (!isAdminAvailable()) {
      // Return defaults if Admin SDK not configured
      return NextResponse.json({
        id: SETTINGS_DOC,
        aiApiKey: "",
        aiProvider: "groq",
        aiModelName: "llama-3.3-70b-versatile",
        aiCustomEndpoint: "",
        updatedAt: null,
        firebaseConnected: false,
        error: "Server-side Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars in Vercel.",
      });
    }

    const db = getAdminDb()!;
    const docRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      const data = snapshot.data()!;
      return NextResponse.json({
        id: snapshot.id,
        aiApiKey: data.aiApiKey || "",
        aiProvider: data.aiProvider || "groq",
        aiModelName: data.aiModelName || "llama-3.3-70b-versatile",
        aiCustomEndpoint: data.aiCustomEndpoint || "",
        updatedAt: data.updatedAt || null,
        firebaseConnected: true,
      });
    }

    return NextResponse.json({
      id: SETTINGS_DOC,
      aiApiKey: "",
      aiProvider: "groq",
      aiModelName: "llama-3.3-70b-versatile",
      aiCustomEndpoint: "",
      updatedAt: null,
      firebaseConnected: true,
    });
  } catch (error) {
    console.error("[API /settings GET] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      id: SETTINGS_DOC,
      aiApiKey: "",
      aiProvider: "groq",
      aiModelName: "llama-3.3-70b-versatile",
      aiCustomEndpoint: "",
      updatedAt: null,
      firebaseConnected: false,
      error: "Settings fetch failed",
    });
  }
}

/**
 * POST /api/settings
 * Saves app settings to Firestore via Admin SDK.
 * Body: { aiApiKey, aiProvider, aiModelName, aiCustomEndpoint }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAdminAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: "Server-side Firebase not configured. Ask the developer to set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars in Vercel.",
          needsConfig: true,
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { aiApiKey, aiProvider, aiModelName, aiCustomEndpoint } = body;

    const db = getAdminDb()!;
    const docRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);

    await docRef.set(
      {
        aiApiKey: aiApiKey || "",
        aiProvider: aiProvider || "groq",
        aiModelName: aiModelName || "llama-3.3-70b-versatile",
        aiCustomEndpoint: aiCustomEndpoint || "",
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      firebaseConnected: true,
      message: "Settings saved to Firebase cloud (secure)",
    });
  } catch (error) {
    console.error("[API /settings POST] Error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
